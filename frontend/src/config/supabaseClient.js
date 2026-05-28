import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Enhanced validation with better error messages
if (!supabaseUrl) {
  console.error("[supabaseClient] ❌ REACT_APP_SUPABASE_URL is missing from environment variables");
  throw new Error(
    "REACT_APP_SUPABASE_URL is missing. " +
      "Check frontend/.env and restart your dev server."
  );
}

if (supabaseUrl.includes("your-project-id")) {
  console.error("[supabaseClient] ❌ REACT_APP_SUPABASE_URL is still a placeholder");
  throw new Error(
    "REACT_APP_SUPABASE_URL is still a placeholder. " +
      "Check frontend/.env and restart your dev server."
  );
}

if (!supabaseKey) {
  console.error("[supabaseClient] ❌ REACT_APP_SUPABASE_ANON_KEY is missing from environment variables");
  throw new Error(
    "REACT_APP_SUPABASE_ANON_KEY is missing. " +
      "Check frontend/.env and restart your dev server."
  );
}

if (supabaseKey.includes("your-anon")) {
  console.error("[supabaseClient] ❌ REACT_APP_SUPABASE_ANON_KEY is still a placeholder");
  throw new Error(
    "REACT_APP_SUPABASE_ANON_KEY is still a placeholder. " +
      "Check frontend/.env and restart your dev server."
  );
}

console.log("[supabaseClient] ✅ Supabase Configuration:");
console.log("[supabaseClient]    - URL:", supabaseUrl);
console.log("[supabaseClient]    - Anon Key: Loaded ✅");

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // Persist session in localStorage so it survives page refreshes
    persistSession: true,
    // Automatically refresh the JWT before it expires
    autoRefreshToken: true,
    // Read the session from the URL hash after OAuth redirect
    detectSessionInUrl: true,
    // Use pkce flow for better security (works with implicit too)
    flowType: "implicit",
  },
});

// Log current session on initialization
supabase.auth.getSession().then(({ data: { session }, error }) => {
  if (error) {
    console.warn("[supabaseClient] Error getting session:", error.message);
  } else if (session) {
    console.log("[supabaseClient] ✅ Session restored for user:", session.user.email);
  } else {
    console.log("[supabaseClient] No active session");
  }
});
