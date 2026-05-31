// ═══════════════════════════════════════════════════════════════════════════════
// SECURE PAYMENT HOOK - PRODUCTION READY
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import axios from "axios";

// Use the same base URL as the rest of the app (set in frontend/.env)
const API_BASE =
    process.env.REACT_APP_BACKEND_URL ||
    process.env.REACT_APP_API_URL     ||
    process.env.REACT_APP_BASE_URL    ||
    "http://localhost:4000/api/v1";


/**
 * usePaymentSecure Hook
 *
 * Handles the complete secure payment flow:
 * 1. createOrder  → POST /api/v1/payment/create-order
 * 2. verifyPayment → POST /api/v1/payment/verify
 * 3. enrollFree   → POST /api/v1/enrollment/free
 *
 * Enrollment is ONLY created on the backend after signature verification.
 */
export function usePaymentSecure() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [paymentStep, setPaymentStep] = useState(null); // "creating" | "verifying"

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: CREATE RAZORPAY ORDER
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * Creates a Razorpay order on the backend.
     * Does NOT create an enrollment — only creates a payment order.
     *
     * @param {{ courseId: string, amount: number, token: string }}
     * @returns {{ success, orderId, amount, currency, totalAmount } | { success: false, error: string }}
     */
    const createOrder = async ({ courseId, amount, token }) => {
        console.log("[usePaymentSecure] createOrder called:", { courseId, amount });

        try {
            setLoading(true);
            setError(null);
            setPaymentStep("creating");

            if (!courseId) throw new Error("courseId is required");
            if (!amount || Number(amount) <= 0) throw new Error("A valid amount is required");
            if (!token) throw new Error("Authentication token not found. Please log in again.");

            console.log("[usePaymentSecure] Calling POST", `${API_BASE}/payment/create-order`);

            const response = await axios.post(
                `${API_BASE}/payment/create-order`,
                {
                    courseId,           // Primary field — backend accepts this directly
                    amount: Number(amount)
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            console.log("[usePaymentSecure] create-order response:", response.data);

            if (!response.data.success) {
                throw new Error(response.data.message || "Failed to create order");
            }

            setPaymentStep(null);
            setLoading(false);

            return {
                success: true,
                orderId: response.data.orderId,
                amount: response.data.amount,       // In paise
                currency: response.data.currency,
                totalAmount: response.data.totalAmount // In INR
            };

        } catch (err) {
            const errorMsg =
                err.response?.data?.message ||
                err.response?.data?.error  ||
                err.message                ||
                "Failed to create payment order";

            console.error("[usePaymentSecure] createOrder error:", errorMsg);
            console.error("[usePaymentSecure] Full error:", err.response?.data || err);

            setError(errorMsg);
            setPaymentStep(null);
            setLoading(false);

            return { success: false, error: errorMsg };
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: VERIFY PAYMENT & CREATE ENROLLMENT
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * Verifies Razorpay payment signature and creates enrollment on backend.
     * Enrollment is ONLY created after HMAC-SHA256 signature verification.
     *
     * @param {{ razorpayOrderId, razorpayPaymentId, razorpaySignature, courseId, token }}
     * @returns {{ success, enrollment, message } | { success: false, error: string }}
     */
    const verifyPayment = async ({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        courseId,
        token
    }) => {
        console.log("[usePaymentSecure] verifyPayment called:", { razorpayOrderId, courseId });

        try {
            setLoading(true);
            setError(null);
            setPaymentStep("verifying");

            if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !courseId || !token) {
                throw new Error("Missing required payment verification parameters");
            }

            console.log("[usePaymentSecure] Calling POST", `${API_BASE}/payment/verify`);

            const response = await axios.post(
                `${API_BASE}/payment/verify`,
                {
                    razorpayOrderId,      // PaymentSecure controller accepts camelCase
                    razorpayPaymentId,
                    razorpaySignature,
                    courseId
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            console.log("[usePaymentSecure] verify response:", response.data);

            if (!response.data.success) {
                throw new Error(response.data.message || "Payment verification failed");
            }

            setPaymentStep(null);
            setLoading(false);

            return {
                success: true,
                enrollment: response.data.enrollment,
                message: response.data.message
            };

        } catch (err) {
            const errorMsg =
                err.response?.data?.message ||
                err.response?.data?.error  ||
                err.message                ||
                "Payment verification failed";
            const errorCode = err.response?.data?.error;

            console.error("[usePaymentSecure] verifyPayment error:", errorMsg);
            console.error("[usePaymentSecure] Full error:", err.response?.data || err);

            setError(errorMsg);
            setPaymentStep(null);
            setLoading(false);

            return { success: false, error: errorMsg, errorCode };
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // ENROLL IN FREE COURSE
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * Enrolls a student in a free course directly (no payment).
     *
     * @param {{ courseId: string, token: string }}
     * @returns {{ success, enrollment, message } | { success: false, error: string }}
     */
    const enrollFree = async ({ courseId, token }) => {
        console.log("[usePaymentSecure] enrollFree called:", { courseId });

        try {
            setLoading(true);
            setError(null);

            if (!courseId || !token) {
                throw new Error("Missing required parameters: courseId, token");
            }

            const response = await axios.post(
                `${API_BASE}/enrollment/free`,
                { courseId },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            if (!response.data.success) {
                throw new Error(response.data.message || "Failed to enroll in course");
            }

            setLoading(false);

            return {
                success: true,
                enrollment: response.data.enrollment,
                message: response.data.message
            };

        } catch (err) {
            const errorMsg =
                err.response?.data?.message ||
                err.message                ||
                "Failed to enroll in course";

            console.error("[usePaymentSecure] enrollFree error:", errorMsg);
            setError(errorMsg);
            setLoading(false);

            return { success: false, error: errorMsg };
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // GET PAYMENT HISTORY
    // ─────────────────────────────────────────────────────────────────────────
    const getPaymentHistory = async (token) => {
        try {
            setLoading(true);
            setError(null);

            const response = await axios.get(
                `${API_BASE}/payment/history`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            if (!response.data.success) {
                throw new Error(response.data.message || "Failed to fetch payment history");
            }

            setLoading(false);
            return { success: true, payments: response.data.payments };

        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message || "Failed to fetch payment history";
            setError(errorMsg);
            setLoading(false);
            return { success: false, error: errorMsg, payments: [] };
        }
    };

    return {
        createOrder,
        verifyPayment,
        enrollFree,
        getPaymentHistory,
        loading,
        error,
        paymentStep,
        setError
    };
}
