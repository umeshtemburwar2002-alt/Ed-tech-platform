import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

/**
 * OpenRoute — wraps public pages (Login, Signup, ForgotPassword).
 *
 * If a user IS authenticated, redirect them to the correct dashboard.
 *
 * Must wait for authInitialized before redirecting — otherwise a user who
 * lands on /login right after a page refresh would see a flash redirect
 * BEFORE onAuthStateChange fires (token is still null at that point).
 * Without the guard, token=null → show login form. Then 50ms later
 * onAuthStateChange fires → token set → OpenRoute redirects. That
 * 50ms "flash" of the login form is fine. The critical thing is we
 * never redirect prematurely.
 */
function OpenRoute({ children }) {
  const { token, authInitialized } = useSelector((s) => s.auth);
  const { user }                   = useSelector((s) => s.profile);

  // Auth not yet resolved — just render the page (harmless; login form
  // is visible for < 100ms, then if logged in it redirects)
  if (!authInitialized) return children;

  // Not logged in → show the login/signup page
  if (!token) return children;

  // Logged in → send to their dashboard (never stay on login/signup)
  const role = String(user?.accountType || "").toLowerCase();
  if (role === "instructor" || role === "teacher") return <Navigate to="/dashboard/instructor" replace />;
  if (role === "admin")                            return <Navigate to="/admin/dashboard"      replace />;
  return                                                 <Navigate to="/dashboard/my-profile" replace />;
}

export default OpenRoute;
