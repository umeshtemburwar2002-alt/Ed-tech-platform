const express = require("express");
const router = express.Router();

const {
    capturePayment,
    sendPaymentSuccessEmail,
    getPaymentHistory,
    verifyPayment
} = require("../controllers/Payments");
const { auth, isStudent } = require("../middleware/auth");

// ─── LEGACY ROUTES (kept for backward compatibility) ──────────────────────────
// NOTE: /create-order and /verify are intentionally NOT registered here.
// They are handled by paymentSecureRoutes (PaymentSecure.js controller)
// which is registered at the same /api/v1/payment prefix in index.js.
// Since paymentSecureRoutes is mounted AFTER this router, Express will match
// the first registered handler — so we must NOT duplicate those routes here.

// Old capturePayment (courses-array based) — kept for any legacy clients
router.post("/capturePayment", auth, isStudent, capturePayment);
router.post("/verifyPayment", auth, isStudent, verifyPayment);

// Emails
router.post("/sendPaymentSuccessEmail", auth, isStudent, sendPaymentSuccessEmail);

module.exports = router;
