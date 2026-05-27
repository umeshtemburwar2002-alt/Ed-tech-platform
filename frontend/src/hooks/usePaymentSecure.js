// ═══════════════════════════════════════════════════════════════════════════════
// SECURE PAYMENT HOOK - PRODUCTION READY
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1";

/**
 * usePaymentSecure Hook
 * 
 * Handles secure payment flow:
 * 1. Create Razorpay order
 * 2. Open Razorpay checkout
 * 3. Verify payment signature on backend
 * 4. Create enrollment ONLY after verification
 * 
 * Usage:
 * const { createOrder, verifyPayment, loading, error } = usePaymentSecure();
 */
export function usePaymentSecure() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [paymentStep, setPaymentStep] = useState(null); // "creating" | "processing" | "verifying"

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: CREATE RAZORPAY ORDER
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * Creates a Razorpay order on the backend
     * CRITICAL: Does NOT create enrollment yet
     * 
     * @param {Object} params
     * @param {string} params.courseId - Course UUID
     * @param {number} params.amount - Amount in INR (not paise)
     * @param {string} params.token - JWT token
     * 
     * @returns {Object} { success, orderId, amount, currency, totalAmount }
     */
    const createOrder = async ({ courseId, amount, token }) => {
        try {
            setLoading(true);
            setError(null);
            setPaymentStep("creating");

            if (!courseId || !amount || !token) {
                throw new Error("Missing required parameters: courseId, amount, token");
            }

            if (amount <= 0) {
                throw new Error("Amount must be greater than 0");
            }

            const response = await axios.post(
                `${API_BASE}/payment/create-order`,
                {
                    courseId,
                    amount
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            if (!response.data.success) {
                throw new Error(response.data.message || "Failed to create order");
            }

            setPaymentStep(null);
            setLoading(false);

            return {
                success: true,
                orderId: response.data.orderId,
                amount: response.data.amount,
                currency: response.data.currency,
                totalAmount: response.data.totalAmount
            };

        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message || "Failed to create payment order";
            setError(errorMsg);
            setPaymentStep(null);
            setLoading(false);

            return {
                success: false,
                error: errorMsg
            };
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: VERIFY PAYMENT & CREATE ENROLLMENT
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * Verifies Razorpay payment signature and creates enrollment
     * CRITICAL: Backend verifies signature BEFORE creating enrollment
     * 
     * @param {Object} params
     * @param {string} params.razorpayOrderId - Order ID from Razorpay
     * @param {string} params.razorpayPaymentId - Payment ID from Razorpay
     * @param {string} params.razorpaySignature - Signature from Razorpay
     * @param {string} params.courseId - Course UUID
     * @param {string} params.token - JWT token
     * 
     * @returns {Object} { success, enrollment, message }
     */
    const verifyPayment = async ({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        courseId,
        token
    }) => {
        try {
            setLoading(true);
            setError(null);
            setPaymentStep("verifying");

            if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !courseId || !token) {
                throw new Error("Missing required payment verification parameters");
            }

            const response = await axios.post(
                `${API_BASE}/payment/verify`,
                {
                    razorpayOrderId,
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
            const errorMsg = err.response?.data?.message || err.message || "Payment verification failed";
            const errorCode = err.response?.data?.error;
            
            setError(errorMsg);
            setPaymentStep(null);
            setLoading(false);

            return {
                success: false,
                error: errorMsg,
                errorCode: errorCode
            };
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // ENROLL IN FREE COURSE
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * Enrolls student in a free course
     * 
     * @param {Object} params
     * @param {string} params.courseId - Course UUID
     * @param {string} params.token - JWT token
     * 
     * @returns {Object} { success, enrollment, message }
     */
    const enrollFree = async ({ courseId, token }) => {
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
            const errorMsg = err.response?.data?.message || err.message || "Failed to enroll in course";
            setError(errorMsg);
            setLoading(false);

            return {
                success: false,
                error: errorMsg
            };
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // GET PAYMENT HISTORY
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * Fetches payment history for logged-in student
     * 
     * @param {string} token - JWT token
     * 
     * @returns {Object} { success, payments }
     */
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

            return {
                success: true,
                payments: response.data.payments
            };

        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message || "Failed to fetch payment history";
            setError(errorMsg);
            setLoading(false);

            return {
                success: false,
                error: errorMsg,
                payments: []
            };
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
