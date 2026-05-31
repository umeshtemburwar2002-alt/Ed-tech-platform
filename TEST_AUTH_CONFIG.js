/**
 * SUPABASE AUTHENTICATION CONFIGURATION TEST
 * Run this in browser console to diagnose auth issues
 */

console.log("═══════════════════════════════════════════════════════════════");
console.log("SUPABASE AUTH CONFIGURATION DIAGNOSTIC");
console.log("═══════════════════════════════════════════════════════════════");

// 1. CHECK ENVIRONMENT VARIABLES
console.log("\n1️⃣ ENVIRONMENT VARIABLES:");
const url = process.env.REACT_APP_SUPABASE_URL;
const key = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log("   REACT_APP_SUPABASE_URL:", url ? "✅ SET" : "❌ MISSING");
console.log("   REACT_APP_SUPABASE_ANON_KEY:", key ? "✅ SET" : "❌ MISSING");

if (url) console.log("   URL value:", url);
if (key) console.log("   Key preview:", key.substring(0, 50) + "...");

// 2. CHECK SUPABASE CLIENT
console.log("\n2️⃣ SUPABASE CLIENT:");
try {
  const { supabase } = require("./src/config/supabaseClient");
  console.log("   ✅ Supabase client imported successfully");
  console.log("   Client object:", supabase);
} catch (e) {
  console.error("   ❌ Error importing supabase client:", e.message);
}

// 3. TEST JWT FORMAT
console.log("\n3️⃣ JWT TOKEN FORMAT:");
if (key) {
  const parts = key.split(".");
  console.log("   JWT parts:", parts.length, parts.length === 3 ? "✅ VALID" : "❌ INVALID");
  
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(atob(parts[1]));
      console.log("   JWT Payload:", payload);
      console.log("   - iss (issuer):", payload.iss);
      console.log("   - role:", payload.role);
      console.log("   - exp (expires):", new Date(payload.exp * 1000).toLocaleString());
    } catch (e) {
      console.error("   ❌ Could not decode JWT:", e.message);
    }
  }
}

// 4. TEST SUPABASE CONNECTION
console.log("\n4️⃣ TESTING SUPABASE CONNECTION:");
console.log("   Attempting to fetch session...");

const { supabase } = require("./src/config/supabaseClient");

supabase.auth.getSession()
  .then(({ data, error }) => {
    if (error) {
      console.error("   ❌ Session fetch error:", error);
      console.error("   Error details:", {
        status: error.status,
        message: error.message,
        name: error.name
      });
    } else {
      console.log("   ✅ Session fetch successful");
      console.log("   Session data:", data);
    }
  })
  .catch(err => {
    console.error("   ❌ Unexpected error:", err);
  });

// 5. TEST SIMPLE LOGIN
console.log("\n5️⃣ TESTING LOGIN (use testUser@example.com / password123):");
console.log("   Paste this in console:");
console.log(`
supabase.auth.signInWithPassword({
  email: "testUser@example.com",
  password: "password123"
}).then(({ data, error }) => {
  if (error) {
    console.error("❌ Login error:", error);
    console.error("Status:", error.status);
    console.error("Message:", error.message);
  } else {
    console.log("✅ Login successful!");
    console.log("User:", data.user);
    console.log("Session:", data.session);
  }
});
`);

console.log("\n═══════════════════════════════════════════════════════════════");
console.log("DIAGNOSTIC COMPLETE");
console.log("═══════════════════════════════════════════════════════════════");
