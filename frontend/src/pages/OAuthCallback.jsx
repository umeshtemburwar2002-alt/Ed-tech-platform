/**
 * OAuthCallback — /auth/callback
 *
 * Supabase redirects here after Google / GitHub OAuth.
 * sessionStorage["oauth_selected_role"] contains the role the user selected.
 *
 * Steps:
 *  1. Wait for Supabase to parse the session from the URL
 *  2. upsertOAuthProfile() — saves/updates profile with correct role
 *  3. Dispatch to Redux store (via syncSupabaseSession listener in App.js)
 *  4. Navigate to role-appropriate dashboard
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { supabase } from "../config/supabaseClient";
import {
  upsertOAuthProfile,
  getDashboardPath,
  OAUTH_ROLE_KEY,
} from "../services/operations/googleAuthAPI";
import { refreshAuthStateInStore } from "../services/syncSupabaseSession";

const OAuthCallback = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [status, setStatus]    = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [roleName, setRoleName] = useState("");

  useEffect(() => {
    let cancelled = false;
    console.log("[OAuthCallback] Component mounted, handling OAuth callback...");
    console.log("[OAuthCallback] Current URL:", window.location.href);
    console.log("[OAuthCallback] sessionStorage has OAUTH_ROLE_KEY:", !!sessionStorage.getItem(OAUTH_ROLE_KEY));

    async function handleCallback() {
      console.log("[OAuthCallback] handleCallback called");
      try {
        // Step 1: Get session (Supabase auto-parses hash/code from URL)
        console.log("[OAuthCallback] Calling supabase.auth.getSession()");
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        console.log("[OAuthCallback] getSession result:", { session: !!session, sessionError });

        if (sessionError) throw sessionError;

        if (!session) {
          console.warn("[OAuthCallback] No session found yet — waiting for onAuthStateChange");
          // Race condition: session not ready yet — wait for onAuthStateChange
          const { data: listener } = supabase.auth.onAuthStateChange(
            async (event, sess) => {
              if (cancelled) return;
              console.log("[OAuthCallback] onAuthStateChange fired:", { event, sess: !!sess });
              if (event === "SIGNED_IN" && sess) {
                console.log("[OAuthCallback] SIGNED_IN event received, unsubscribing and finalizing");
                listener.subscription.unsubscribe();
                await finalize(sess);
              } else if (event === "SIGNED_OUT") {
                console.warn("[OAuthCallback] SIGNED_OUT event received");
                listener.subscription.unsubscribe();
                throw new Error("OAuth sign-in was cancelled or denied.");
              }
            }
          );
          return;
        }

        console.log("[OAuthCallback] Session found immediately, calling finalize");
        await finalize(session);
      } catch (err) {
        if (cancelled) return;
        console.error("[OAuthCallback] Error in handleCallback:", err);
        setStatus("error");
        setErrorMsg(err.message || "Authentication failed. Please try again.");
        toast.error("Sign-in failed. Redirecting…");
        setTimeout(() => navigate("/login", { replace: true }), 3000);
      }
    }

    async function finalize(session) {
      console.log("[OAuthCallback] finalize called with session user:", session?.user?.email);
      if (cancelled) return;

      // ─── Step 2: Upsert profile with correct role ──────────────────────
      // upsertOAuthProfile reads sessionStorage["oauth_selected_role"]
      // for NEW users and writes account_type to the profiles table.
      // For RETURNING users it keeps the existing role.
      console.log("[OAuthCallback] Calling upsertOAuthProfile");
      const accountType = await upsertOAuthProfile(session.user);
      console.log("[OAuthCallback] upsertOAuthProfile returned accountType:", accountType);

      // ─── Step 3: Re-dispatch to Redux with the now-correct profile ─────
      // This explicitly fixes the race condition:
      //   syncSupabaseSession's onAuthStateChange already fired and
      //   dispatched the DEFAULT "Student" role before this upsert ran.
      //   We now force-refresh Redux with the real profile from DB.
      console.log("[OAuthCallback] Calling refreshAuthStateInStore");
      await refreshAuthStateInStore(dispatch);

      console.log("[OAuthCallback] Setting success state");
      setRoleName(accountType);
      setStatus("success");
      toast.success(`Welcome! Signed in as ${accountType} 🎉`);

      // ─── Step 4: Role-based redirect or intended redirect ──────────────
      const intended = sessionStorage.getItem("intended_redirect");
      sessionStorage.removeItem("intended_redirect");
      const dest = intended || getDashboardPath(accountType);
      console.log("[OAuthCallback] Redirecting to:", dest);
      setTimeout(() => navigate(dest, { replace: true }), 1000);
    }

    handleCallback();
    return () => { cancelled = true; };
  }, [navigate]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#000814] px-4 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-blue-900/20 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-violet-900/15 rounded-full blur-[130px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-10 text-center max-w-sm w-full glass-dark rounded-[2rem] p-10 border border-white/5 shadow-2xl"
      >
        <AnimatePresence mode="wait">

          {/* ── Loading ─────────────────────────────────────────────────── */}
          {status === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              {/* Concentric spinning rings */}
              <div className="relative w-20 h-20 mb-6">
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-[#00B4D8]/20 border-t-[#00B4D8]"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
                />
                <motion.div
                  className="absolute inset-3 rounded-full border-2 border-violet-500/20 border-t-violet-500"
                  animate={{ rotate: -360 }}
                  transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <i className="fas fa-shield-alt text-[#00B4D8] text-base" />
                </div>
              </div>

              <h2 className="text-xl font-bold text-white mb-1">Signing you in…</h2>
              <p className="text-slate-400 text-sm">Setting up your account</p>

              {/* Animated dots */}
              <div className="flex gap-1.5 mt-4">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-[#00B4D8]/60"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Success ─────────────────────────────────────────────────── */}
          {status === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0  }}
              className="flex flex-col items-center"
            >
              {/* Animated check */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 280, damping: 18 }}
                className="w-20 h-20 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mb-6"
              >
                <motion.i
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0   }}
                  transition={{ delay: 0.15, type: "spring", stiffness: 300 }}
                  className="fas fa-check text-green-400 text-3xl"
                />
              </motion.div>

              <h2 className="text-xl font-bold text-white mb-1">Login Successful!</h2>
              {roleName && (
                <span className={`
                  text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full mb-2
                  ${roleName.toLowerCase() === "instructor"
                    ? "bg-violet-500/20 text-violet-400"
                    : "bg-[#00B4D8]/20 text-[#00B4D8]"
                  }
                `}>
                  {roleName}
                </span>
              )}
              <p className="text-slate-400 text-sm mt-2">Redirecting to your dashboard…</p>
            </motion.div>
          )}

          {/* ── Error ───────────────────────────────────────────────────── */}
          {status === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0  }}
              className="flex flex-col items-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 280 }}
                className="w-20 h-20 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mb-6"
              >
                <i className="fas fa-exclamation-triangle text-red-400 text-2xl" />
              </motion.div>

              <h2 className="text-xl font-bold text-white mb-1">
                Authentication Failed
              </h2>
              <p className="text-slate-400 text-sm mb-4">{errorMsg}</p>
              <p className="text-slate-600 text-xs">Redirecting to login…</p>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default OAuthCallback;
