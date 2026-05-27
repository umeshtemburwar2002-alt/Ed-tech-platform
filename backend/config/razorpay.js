const Razorpay = require("razorpay");
require("dotenv").config();

const key_id = process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY;
const key_secret = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET;

if (!key_id || !key_secret) {
    console.error("ERROR: Missing Razorpay credentials in environment variables!");
    console.error("- RAZORPAY_KEY_ID / RAZORPAY_KEY:", key_id ? "✅" : "❌");
    console.error("- RAZORPAY_KEY_SECRET / RAZORPAY_SECRET:", key_secret ? "✅" : "❌");
}

const razorpayInstance = new Razorpay({
    key_id: key_id || "rzp_test_placeholder",
    key_secret: key_secret || "placeholder_secret"
});

module.exports = razorpayInstance;
