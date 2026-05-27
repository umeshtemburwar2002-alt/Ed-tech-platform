const express = require("express");
const router = express.Router();

const {
    capturePayment,
    verifyPayment,
    sendPaymentSuccessEmail,
    getPaymentHistory
} = require("../controllers/Payments");
const { auth, isStudent } = require("../middleware/auth");

// Order Creation
router.post("/capturePayment", auth, isStudent, capturePayment);
router.post("/create-order", auth, isStudent, capturePayment);

// Payment Verification
router.post("/verifyPayment", auth, isStudent, verifyPayment);
router.post("/verify", auth, isStudent, verifyPayment);

// Emails
router.post("/sendPaymentSuccessEmail", auth, isStudent, sendPaymentSuccessEmail);

// History Tracking
router.get("/history", auth, isStudent, getPaymentHistory);

module.exports = router;
