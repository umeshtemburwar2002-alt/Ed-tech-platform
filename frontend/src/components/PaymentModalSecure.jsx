// ═══════════════════════════════════════════════════════════════════════════════
// SECURE PAYMENT MODAL - PRODUCTION READY
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { usePaymentSecure } from "../hooks/usePaymentSecure";
import { useSelector } from "react-redux";

/**
 * PaymentModalSecure Component
 * 
 * SECURE PAYMENT FLOW:
 * 1. User clicks "Buy Now"
 * 2. Modal opens with course details
 * 3. User confirms payment
 * 4. Backend creates Razorpay order
 * 5. Razorpay popup opens
 * 6. User completes payment
 * 7. Backend verifies signature
 * 8. Enrollment created ONLY after verification
 * 9. User redirected to course
 * 
 * Props:
 * - course: { id, title, price, ... }
 * - onClose: callback when modal closes
 * - onSuccess: callback after successful enrollment
 */
export default function PaymentModalSecure({ course, onClose, onSuccess }) {
    const { token } = useSelector(state => state.auth);
    const { createOrder, verifyPayment, loading, error, paymentStep, setError } = usePaymentSecure();

    const [step, setStep] = useState("confirm"); // "confirm" | "processing" | "success" | "failed"
    const [localError, setLocalError] = useState(null);

    // Lock body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = "unset"; };
    }, []);

    // ─────────────────────────────────────────────────────────────────────────
    // HANDLE PAYMENT FLOW
    // ─────────────────────────────────────────────────────────────────────────
    const handlePayment = async () => {
        try {
            setStep("processing");
            setLocalError(null);

            if (!token) {
                throw new Error("Authentication token not found. Please log in again.");
            }

            // ─── STEP 1: CREATE RAZORPAY ORDER ────────────────────────────────
            const orderResult = await createOrder({
                courseId: course.id,
                amount: Number(course.price),
                token
            });

            if (!orderResult.success) {
                throw new Error(orderResult.error || "Failed to create payment order");
            }

            // ─── STEP 2: OPEN RAZORPAY CHECKOUT ───────────────────────────────
            const razorpayKey = process.env.REACT_APP_RAZORPAY_KEY_ID || "rzp_test_SuXSEK8nNcHwKe";

            const options = {
                key: razorpayKey,
                amount: orderResult.amount, // Already in paise
                currency: orderResult.currency,
                order_id: orderResult.orderId,
                name: "EdTech Platform",
                description: course.title,
                prefill: {
                    // Add user email/phone if available
                },
                theme: {
                    color: "#7C3AED" // Purple to match your UI
                },
                handler: async function (response) {
                    // ─── STEP 3: PAYMENT CAPTURED - VERIFY ON BACKEND ──────────
                    await handlePaymentSuccess(response);
                },
                modal: {
                    ondismiss: function () {
                        // User closed Razorpay without paying
                        setStep("confirm");
                        setLocalError("Payment cancelled. Please try again.");
                    }
                }
            };

            // Open Razorpay checkout
            if (window.Razorpay) {
                const razorpay = new window.Razorpay(options);
                razorpay.open();
            } else {
                throw new Error("Razorpay script not loaded. Please refresh the page.");
            }

        } catch (err) {
            console.error("Payment error:", err);
            setStep("failed");
            setLocalError(err.message || "Payment failed. Please try again.");
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // HANDLE PAYMENT SUCCESS - VERIFY ON BACKEND
    // ─────────────────────────────────────────────────────────────────────────
    const handlePaymentSuccess = async (razorpayResponse) => {
        try {
            setStep("processing");
            setLocalError(null);

            // ─── VERIFY PAYMENT SIGNATURE ON BACKEND ──────────────────────────
            // CRITICAL: Backend verifies signature BEFORE creating enrollment
            const verifyResult = await verifyPayment({
                razorpayOrderId: razorpayResponse.razorpay_order_id,
                razorpayPaymentId: razorpayResponse.razorpay_payment_id,
                razorpaySignature: razorpayResponse.razorpay_signature,
                courseId: course.id,
                token
            });

            if (!verifyResult.success) {
                throw new Error(verifyResult.error || "Payment verification failed");
            }

            // ─── PAYMENT VERIFIED - ENROLLMENT CREATED ────────────────────────
            setStep("success");

            // Wait 2 seconds to show success message
            setTimeout(() => {
                onSuccess?.(verifyResult.enrollment);
                onClose?.();
            }, 2000);

        } catch (err) {
            console.error("Payment verification error:", err);
            setStep("failed");
            setLocalError(err.message || "Payment verification failed. Please contact support.");
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER MODAL CONTENT
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-8 max-w-md w-full mx-4 border border-purple-500">
                {/* CONFIRM STEP */}
                {step === "confirm" && (
                    <>
                        <h2 className="text-2xl font-bold text-white mb-4">Confirm Purchase</h2>
                        
                        <div className="bg-gray-800 rounded-lg p-4 mb-6">
                            <p className="text-gray-300 text-sm mb-2">Course</p>
                            <p className="text-white font-semibold mb-4">{course.title}</p>
                            
                            <div className="border-t border-gray-700 pt-4">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-gray-300">Price</span>
                                    <span className="text-white font-bold text-lg">₹{course.price}</span>
                                </div>
                            </div>
                        </div>

                        {(localError || error) && (
                            <div className="bg-red-900 border border-red-700 rounded-lg p-3 mb-4">
                                <p className="text-red-200 text-sm">{localError || error}</p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePayment}
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition font-semibold"
                            >
                                {loading ? "Processing..." : "Pay Now"}
                            </button>
                        </div>
                    </>
                )}

                {/* PROCESSING STEP */}
                {step === "processing" && (
                    <>
                        <div className="text-center">
                            <div className="inline-block">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                            </div>
                            <h2 className="text-xl font-bold text-white mt-4 mb-2">
                                {paymentStep === "creating" && "Creating Order..."}
                                {paymentStep === "verifying" && "Verifying Payment..."}
                                {!paymentStep && "Processing Payment..."}
                            </h2>
                            <p className="text-gray-400">Please wait while we process your payment</p>
                        </div>
                    </>
                )}

                {/* SUCCESS STEP */}
                {step === "success" && (
                    <>
                        <div className="text-center">
                            <div className="inline-block mb-4">
                                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Payment Successful!</h2>
                            <p className="text-gray-300 mb-4">You are now enrolled in {course.title}</p>
                            <p className="text-gray-400 text-sm">Redirecting to course...</p>
                        </div>
                    </>
                )}

                {/* FAILED STEP */}
                {step === "failed" && (
                    <>
                        <div className="text-center">
                            <div className="inline-block mb-4">
                                <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Payment Failed</h2>
                            <p className="text-red-300 mb-4">{localError || error || "Something went wrong"}</p>
                            
                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => {
                                        setStep("confirm");
                                        setLocalError(null);
                                    }}
                                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
                                >
                                    Try Again
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
