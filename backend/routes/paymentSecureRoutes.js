// ═══════════════════════════════════════════════════════════════════════════════
// SECURE PAYMENT ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

const express = require("express");
const router = express.Router();

const { auth, isStudent } = require("../middleware/auth");
const paymentController = require("../controllers/PaymentSecure");

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/payment/create-order
 * 
 * Creates a Razorpay order for a paid course
 * CRITICAL: Does NOT create enrollment - only creates payment order
 * 
 * Request:
 * {
 *   courseId: UUID,
 *   amount: number (in INR)
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   orderId: string,
 *   amount: number (in paise),
 *   currency: string,
 *   totalAmount: number (in INR)
 * }
 */
router.post("/create-order", auth, isStudent, paymentController.createOrder);

/**
 * POST /api/v1/payment/verify
 * 
 * CRITICAL SECURITY ENDPOINT:
 * Verifies Razorpay signature and creates enrollment ONLY after verification
 * 
 * Request:
 * {
 *   razorpayOrderId: string,
 *   razorpayPaymentId: string,
 *   razorpaySignature: string,
 *   courseId: UUID
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   enrollment: { ... },
 *   message: string
 * }
 */
router.post("/verify", auth, isStudent, paymentController.verifyPayment);

/**
 * GET /api/v1/payment/history
 * 
 * Fetches payment history for logged-in student
 */
router.get("/history", auth, isStudent, paymentController.getPaymentHistory);

/**
 * POST /api/v1/payment/webhook
 * 
 * Razorpay webhook endpoint (optional but recommended)
 * Provides additional security layer
 */
router.post("/webhook", paymentController.handleWebhook);

// ─────────────────────────────────────────────────────────────────────────────
// ENROLLMENT ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/enrollment/free
 * 
 * Enrolls student in a free course
 * No payment verification needed
 * 
 * Request:
 * {
 *   courseId: UUID
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   enrollment: { ... },
 *   message: string
 * }
 */
router.post("/free", auth, isStudent, paymentController.enrollFree);

module.exports = router;
