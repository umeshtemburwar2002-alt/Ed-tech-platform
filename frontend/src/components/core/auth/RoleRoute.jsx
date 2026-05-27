import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

/**
 * RoleRoute — enforces account_type on already-authenticated routes.
 *
 * Only rendered INSIDE <PrivateRoute>, which guarantees:
 *   - authInitialized is true
 *   - token is truthy
 *
 * But user (profile) might still be briefly null if the profile fetch
 * takes longer than the token dispatch. Guard against that here too.
 *
 * Decision table:
 * ┌──────────────┬────────────────────────────────────────────────────────┐
 * │ user         │ Result                                                 │
 * ├──────────────┼────────────────────────────────────────────────────────┤
 * │ null         │ Spinner — profile fetch still in-flight                │
 * │ wrong role   │ Navigate to correct dashboard for their actual role    │
 * │ correct role │ Render children                                        │
 * └──────────────┴────────────────────────────────────────────────────────┘
 */

const Spinner = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[#000814] gap-4">
    <div className="w-10 h-10 border-2 border-white/10 border-t-[#00B4D8] rounded-full animate-spin" />
    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse">
      Loading profile…
    </p>
  </div>
);

/** Map accountType → their home dashboard path. */
function homePath(accountType) {
  const t = String(accountType ?? "").toLowerCase();
  if (t === "admin")                         return "/admin/dashboard";
  if (t === "instructor" || t === "teacher") return "/dashboard/instructor";
  return "/dashboard/my-profile"; // student default
}

export default function RoleRoute({ allow = [], children }) {
  const { user }           = useSelector((s) => s.profile);
  const { authInitialized } = useSelector((s) => s.auth);

  // Still waiting for profile — spin (don't redirect to /login)
  if (!authInitialized || !user) return <Spinner />;

  const accountType = String(user.accountType ?? "student").toLowerCase();
  const allowedRoles = allow.map((r) => String(r).toLowerCase());

  // User is allowed — pass through
  if (!allowedRoles.length || allowedRoles.includes(accountType)) return children;

  // User is authenticated but wrong role → send them to THEIR dashboard
  // (never to /login — they are logged in, just on the wrong page)
  return <Navigate to={homePath(accountType)} replace />;
}
