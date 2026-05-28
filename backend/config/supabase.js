require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const ws = require("ws");

const SUPABASE_URL = process.env.SUPABASE_URL;
// CRITICAL: Use SERVICE_ROLE_KEY for backend (has admin privileges)
// NEVER use ANON_KEY in backend - it's for frontend only
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL) {
  console.error("❌ ERROR: SUPABASE_URL is missing from environment variables!");
  console.error("   Add to backend/.env: SUPABASE_URL=https://your-project.supabase.co");
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
  console.error("❌ ERROR: SUPABASE_SERVICE_ROLE_KEY is missing from environment variables!");
  console.error("   Add to backend/.env: SUPABASE_SERVICE_ROLE_KEY=your-service-role-key");
  console.error("   (Get this from Supabase Dashboard → Settings → API)");
  process.exit(1);
}

console.log("✅ Supabase Configuration:");
console.log("   - URL:", SUPABASE_URL);
console.log("   - Service Role Key: Loaded ✅");

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  {
    realtime: {
      transport: ws,
    },
  }
);

module.exports = supabase;
