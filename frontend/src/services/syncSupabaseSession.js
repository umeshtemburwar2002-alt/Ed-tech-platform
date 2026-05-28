import { supabase } from "../config/supabaseClient";
import { setToken, setAuthInitialized } from "../slices/authSlice";
import { setUser } from "../slices/profileSlice";
import {
  buildAppUserFromSession,
  persistClientSession,
  clearClientSessionStores,
} from "../utils/supabaseAuthHelpers";
import { OAUTH_ROLE_KEY } from "../services/operations/googleAuthAPI";
 
// ─── helpers ────────────────────────────────────────────────────────────────
 
function nuclearClear() {
  clearClientSessionStores();
 
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL ?? "";
  const projectRef  = supabaseUrl.split("//")[1]?.split(".")[0] ?? "";
  if (projectRef) {
    localStorage.removeItem(`sb-${projectRef}-auth-token`);
    localStorage.removeItem(`sb-${projectRef}-provider-token`);
  }
 
  sessionStorage.removeItem(OAUTH_ROLE_KEY);
}
 
/**
 * Fetch profile with a hard timeout so a hanging RLS / network issue never
 * blocks auth initialisation. Uses Promise.race — AbortController alone is
 * unreliable here because the PostgREST client may not always honour abort.
 */
async function fetchProfileWithTimeout(userId, timeoutMs = 10000) {
  const queryPromise = supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(Object.assign(new Error("Profile fetch timeout"), { name: "TimeoutError" }));
    }, timeoutMs);
  });

  try {
    const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

    clearTimeout(timeoutId);

    if (error) {
      console.error("[syncSupabaseSession] Profile fetch error:", error);
      return null;
    }

    return data ?? null;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err?.name === "TimeoutError") {
      return null;
    }
    console.error("[syncSupabaseSession] Profile fetch threw:", err);
    return null;
  }
}
 
// ─── deduplication guard ─────────────────────────────────────────────────────
// Prevents simultaneous INITIAL_SESSION + SIGNED_IN events from both trying
// to fetch the profile at the same time (race condition).
// Also: Supabase may emit SIGNED_IN again after INITIAL_SESSION with the same
// JWT. Dedup on (userId, event) would miss that (last event is INITIAL_SESSION),
// causing a second profile fetch that can time out and overwrite good Redux
// state with JWT-only data — so we skip redundant SIGNED_IN by access_token.
let _applySessionInFlight = false;
let _lastProcessedUserId   = null;
let _lastProcessedEvent    = null;
let _lastAppliedAccessToken = null;
 
// ─── core session handler ────────────────────────────────────────────────────
 
async function applySession(event, session, dispatch) {
  console.log("[syncSupabaseSession] applySession called:', {
    event,
    hasSession: !!session,
    hasToken: !!session?.access_token,
    userId: session?.user?.id
  });

  // ── 1. Signed-out / no token ──────────────────────────────────────────────
  if (event === "SIGNED_OUT" || !session?.access_token) {
    console.log("[syncSupabaseSession] Clearing session (SIGNED_OUT or no token)");
    nuclearClear();
    dispatch(setToken(null));
    dispatch(setUser(null));
    _lastProcessedUserId   = null;
    _lastProcessedEvent    = null;
    _lastAppliedAccessToken = null;
    return;
  }
 
  // ── 2. Password-recovery — just store the token, nothing else ────────────
  if (event === "PASSWORD_RECOVERY") {
    console.log("[syncSupabaseSession] PASSWORD_RECOVERY event - storing token only");
    dispatch(setToken(session.access_token));
    return;
  }
 
  // ── 3. Dedup: same event twice, in-flight, or redundant SIGNED_IN ─────────
  const userId = session.user.id;
  const token = session.access_token;
  const redundantSignedIn =
    event === "SIGNED_IN" &&
    userId === _lastProcessedUserId &&
    token === _lastAppliedAccessToken;

  if (
    _applySessionInFlight ||
    (userId === _lastProcessedUserId && event === _lastProcessedEvent) ||
    redundantSignedIn
  ) {
    console.log("[syncSupabaseSession] Skipping duplicate session application:', {
      inFlight: _applySessionInFlight,
      sameEvent: userId === _lastProcessedUserId && event === _lastProcessedEvent,
      redundantSignedIn
    });
    return;
  }
 
  _applySessionInFlight    = true;
  _lastProcessedUserId     = userId;
  _lastProcessedEvent      = event;
 
  try {
    console.log("[syncSupabaseSession] Processing session for user:', userId);

    // ── 4. Always set token immediately so UI doesn't flash logged-out ──────
    dispatch(setToken(session.access_token));
    console.log("[syncSupabaseSession] ✅ Token dispatched to Redux");
 
    // ── 5. Fetch profile (with timeout) ─────────────────────────────────────
    console.log("[syncSupabaseSession] Fetching profile...");
    const profile = await fetchProfileWithTimeout(userId);
    
    if (profile) {
      console.log("[syncSupabaseSession] ✅ Profile fetched:', {
        id: profile.id,
        email: profile.email,
        accountType: profile.account_type
      });
    } else {
      console.warn("[syncSupabaseSession] ⚠️ Profile fetch returned null (timeout or error)");
    }
 
    // ── 6. Build the app-level user object ───────────────────────────────────
    const appUser = buildAppUserFromSession(session, profile);
 
    if (!appUser) {
      console.error("[syncSupabaseSession] ❌ buildAppUserFromSession returned null — signing out");
      nuclearClear();
      dispatch(setToken(null));
      dispatch(setUser(null));
      await supabase.auth.signOut();
      return;
    }
 
    console.log("[syncSupabaseSession] ✅ App user built:', {
      id: appUser.id,
      email: appUser.email,
      accountType: appUser.accountType,
      firstName: appUser.firstName
    });

    // ── 7. Persist and dispatch ──────────────────────────────────────────────
    dispatch(setUser(appUser));
    persistClientSession(session.access_token, appUser);
    _lastAppliedAccessToken = session.access_token;
    console.log("[syncSupabaseSession] ✅ Session applied successfully");

  } catch (err) {
    console.error("[syncSupabaseSession] ❌ Error in applySession:', err);
  } finally {
    _applySessionInFlight = false;
  }
}
 
// ─── public API ─────────────────────────────────────────────────────────────
 
/**
 * Call once from your Redux store setup.
 * Returns an unsubscribe function.
 */
export function subscribeSupabaseAuthToStore(dispatch) {
  console.log("[syncSupabaseSession] Initializing Supabase auth subscription...");
  
  let disposed = false;
  let listener = null;

  // ── Initial session load ─────────────────────────────────────────────────
  async function initializeAuth() {
    try {
      console.log("[syncSupabaseSession] Getting initial session...");
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log("[syncSupabaseSession] ✅ Initial session found for user:', session.user.id);
      } else {
        console.log("[syncSupabaseSession] No initial session found");
      }
      
      await applySession("INITIAL_SESSION", session, dispatch);
    } catch (err) {
      console.error("[syncSupabaseSession] ❌ initializeAuth error:', err);
    } finally {
      if (!disposed) {
        dispatch(setAuthInitialized(true));
      }
    }
  }

  // Safety net if init hangs (covers getSession + profile fetch + edge cases).
  const safetyTimeout = setTimeout(() => {
    if (!disposed) {
      console.warn("[syncSupabaseSession] ⚠️ Safety timeout — forcing authInitialized true");
      dispatch(setAuthInitialized(true));
    }
  }, 14000);

  (async () => {
    try {
      await initializeAuth();
    } finally {
      if (!disposed) {
        clearTimeout(safetyTimeout);
      }
    }
    if (disposed) {
      return;
    }

    // Register only after init so `SIGNED_IN` cannot race ahead of INITIAL_SESSION
    // and trigger a duplicate profile fetch + timeout noise.
    console.log("[syncSupabaseSession] Registering auth state change listener...");
    
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[syncSupabaseSession] Auth state changed:', event);
      
      if (event === "INITIAL_SESSION") {
        if (!disposed) {
          dispatch(setAuthInitialized(true));
        }
        return;
      }

      try {
        await applySession(event, session, dispatch);
      } catch (err) {
        console.error("[syncSupabaseSession] ❌ applySession error:', err);
      } finally {
        if (!disposed) {
          dispatch(setAuthInitialized(true));
        }
      }
    });

    listener = data;
  })();

  return () => {
    console.log("[syncSupabaseSession] Unsubscribing from auth changes...");
    disposed = true;
    clearTimeout(safetyTimeout);
    listener?.subscription?.unsubscribe();
    listener = null;
  };
}
 
/**
 * Force-refresh Redux state from the live Supabase session.
 * Call after profile updates, role changes, etc.
 */
export async function refreshAuthStateInStore(dispatch) {
  console.log("[syncSupabaseSession] Refreshing auth state from Supabase...");
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    console.warn("[syncSupabaseSession] No active session to refresh");
    return;
  }
 
  console.log("[syncSupabaseSession] Fetching fresh profile...");
  const profile = await fetchProfileWithTimeout(session.user.id);
  const appUser = buildAppUserFromSession(session, profile);
  
  if (!appUser) {
    console.error("[syncSupabaseSession] Failed to build app user");
    return;
  }
 
  dispatch(setToken(session.access_token));
  dispatch(setUser(appUser));
  persistClientSession(session.access_token, appUser);
  console.log("[syncSupabaseSession] ✅ Auth state refreshed");
}
 
/**
 * Full logout — clears Supabase session, Redux state, and local storage.
 */
export async function performLogout(dispatch, navigate) {
  console.log("[syncSupabaseSession] Performing logout...");
  
  try {
    await supabase.auth.signOut({ scope: "global" });
    console.log("[syncSupabaseSession] ✅ Supabase signOut successful");
  } catch (err) {
    console.warn("[syncSupabaseSession] ⚠️ Supabase signOut error (continuing):', err);
    // ignore signOut errors — we clear local state regardless
  }
 
  nuclearClear();
  dispatch(setToken(null));
  dispatch(setUser(null));
  _lastProcessedUserId   = null;
  _lastProcessedEvent    = null;
  _lastAppliedAccessToken = null;

  console.log("[syncSupabaseSession] ✅ Local state cleared");

  if (navigate) {
    console.log("[syncSupabaseSession] Redirecting to login...");
    navigate("/login", { replace: true });
  }
}