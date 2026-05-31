import { createClient } from "@supabase/supabase-js";

// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE CLIENT INITIALIZATION WITH KEY ROTATION HANDLING
// ═══════════════════════════════════════════════════════════════════════════════

// 1. INVALIDATION: Only clear stale sessions when there is a confirmed invalid
//    session error — NOT on every page load. Clearing on every load was the
//    root cause of the "logout on refresh" bug because it wiped the Supabase
//    sb-*-auth-token key before the session could be restored.
function clearInvalidSupabaseSession() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("sb-")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    sessionStorage.clear();
    console.log("[supabaseClient] 🧹 Cleared invalid Supabase session keys:", keysToRemove.length);
  } catch (err) {
    console.warn("[supabaseClient] ⚠️ Error clearing invalid session:", err.message);
  }
}

// 2. READ ENVIRONMENT VARIABLES
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// 3. VALIDATE ENVIRONMENT VARIABLES
console.log("[supabaseClient] 🔍 Validating environment variables...");

if (!supabaseUrl) {
  console.error("[supabaseClient] ❌ REACT_APP_SUPABASE_URL is missing");
  console.error("[supabaseClient]    Expected: https://your-project.supabase.co");
  console.error("[supabaseClient]    Got: undefined");
  console.error("[supabaseClient]    Fix: Add REACT_APP_SUPABASE_URL to frontend/.env");
  throw new Error(
    "REACT_APP_SUPABASE_URL is missing. Check frontend/.env and restart dev server."
  );
}

if (supabaseUrl.includes("your-project-id") || supabaseUrl.includes("your-project")) {
  console.error("[supabaseClient] ❌ REACT_APP_SUPABASE_URL is still a placeholder");
  console.error("[supabaseClient]    Got:", supabaseUrl);
  console.error("[supabaseClient]    Fix: Replace with your actual Supabase URL");
  throw new Error(
    "REACT_APP_SUPABASE_URL is still a placeholder. Update frontend/.env with your real URL."
  );
}

if (!supabaseKey) {
  console.error("[supabaseClient] ❌ REACT_APP_SUPABASE_ANON_KEY is missing");
  console.error("[supabaseClient]    Expected: eyJhbGciOiJIUzI1NiIs...");
  console.error("[supabaseClient]    Got: undefined");
  console.error("[supabaseClient]    Fix: Add REACT_APP_SUPABASE_ANON_KEY to frontend/.env");
  throw new Error(
    "REACT_APP_SUPABASE_ANON_KEY is missing. Check frontend/.env and restart dev server."
  );
}

if (supabaseKey.includes("your-anon") || supabaseKey.includes("your-key")) {
  console.error("[supabaseClient] ❌ REACT_APP_SUPABASE_ANON_KEY is still a placeholder");
  console.error("[supabaseClient]    Got:", supabaseKey.substring(0, 50) + "...");
  console.error("[supabaseClient]    Fix: Replace with your actual Anon Key");
  throw new Error(
    "REACT_APP_SUPABASE_ANON_KEY is still a placeholder. Update frontend/.env with your real key."
  );
}

// 4. VALIDATE KEY FORMAT (should be JWT)
if (!supabaseKey.includes(".")) {
  console.error("[supabaseClient] ❌ REACT_APP_SUPABASE_ANON_KEY is not a valid JWT");
  console.error("[supabaseClient]    JWT should have format: header.payload.signature");
  console.error("[supabaseClient]    Got:", supabaseKey.substring(0, 50) + "...");
  console.error("[supabaseClient]    Fix: Ensure you copied the full key from Supabase Dashboard");
  throw new Error(
    "REACT_APP_SUPABASE_ANON_KEY is not a valid JWT token. Check frontend/.env."
  );
}

// 5. LOG SUCCESSFUL VALIDATION
console.log("[supabaseClient] ✅ Environment variables validated:");
console.log("[supabaseClient]    - REACT_APP_SUPABASE_URL: " + supabaseUrl);
console.log("[supabaseClient]    - REACT_APP_SUPABASE_ANON_KEY: " + supabaseKey.substring(0, 20) + "...");
console.log("[supabaseClient]    - Key length: " + supabaseKey.length + " characters");
console.log("[supabaseClient]    - Key preview (first 50 chars): " + supabaseKey.substring(0, 50));

// Decode JWT to verify it matches the project
try {
  const parts = supabaseKey.split(".");
  if (parts.length === 3) {
    const payload = JSON.parse(atob(parts[1]));
    console.log("[supabaseClient] ✅ JWT Payload decoded:");
    console.log("[supabaseClient]    - iss (issuer): " + payload.iss);
    console.log("[supabaseClient]    - ref (project): " + payload.ref);
    console.log("[supabaseClient]    - role: " + payload.role);
    console.log("[supabaseClient]    - exp (expires): " + new Date(payload.exp * 1000).toLocaleString());
    
    if (payload.ref !== "bjfwdidbkbmlhowzuklk") {
      console.warn("[supabaseClient] ⚠️ WARNING: Key is for project '" + payload.ref + "' but URL is for 'bjfwdidbkbmlhowzuklk'");
      console.warn("[supabaseClient]    This mismatch will cause 'Invalid API key' errors!");
    }
  }
} catch (e) {
  console.warn("[supabaseClient] ⚠️ Could not decode JWT payload:", e.message);
}

// 6. CREATE SUPABASE CLIENT
console.log("[supabaseClient] 🔧 Creating Supabase client...");

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // Persist session in localStorage so it survives page refreshes
    persistSession: true,
    // Automatically refresh the JWT before it expires
    autoRefreshToken: true,
    // Read the session from the URL hash after OAuth redirect
    detectSessionInUrl: true,
    // Use implicit flow (compatible with CRA)
    flowType: "implicit",
  },
});

console.log("[supabaseClient] ✅ Supabase client created successfully");

// 7. TEST INITIAL SESSION
console.log("[supabaseClient] 🔍 Checking for existing session...");

supabase.auth.getSession().then(({ data: { session }, error }) => {
  if (error) {
    console.warn("[supabaseClient] ⚠️ Error getting session:", error.message);
    // Only clear if the session is explicitly invalid (key rotation, etc.)
    if (error.message && (error.message.includes("invalid") || error.message.includes("expired"))) {
      console.log("[supabaseClient] 🧹 Detected invalid/expired session - clearing...");
      clearInvalidSupabaseSession();
    }
  } else if (session) {
    console.log("[supabaseClient] ✅ Session restored for user:", session.user.email);
    console.log("[supabaseClient]    - User ID:", session.user.id);
    console.log("[supabaseClient]    - Token expires at:", new Date(session.expires_at * 1000).toLocaleString());
  } else {
    console.log("[supabaseClient] ℹ️ No active session (user not logged in)");
  }
}).catch((err) => {
  console.error("[supabaseClient] ❌ Unexpected error checking session:", err);
});
