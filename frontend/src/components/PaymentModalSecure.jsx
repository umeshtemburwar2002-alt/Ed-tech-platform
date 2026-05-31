// ═══════════════════════════════════════════════════════════════════════════════
// SECURE PAYMENT MODAL - PRODUCTION READY
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { usePaymentSecure } from "../hooks/usePaymentSecure";
import { useSelector } from "react-redux";
import { supabase } from "../config/supabaseClient";

// Loads the Razorpay checkout SDK (idempotent — safe to call multiple times)
function loadRazorpayScript() {
    return new Promise((resolve) => {
        if (window.Razorpay) {
            resolve(true);
            return;
        }
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
}

/**
 * PaymentModalSecure Component
 *
 * SECURE PAYMENT FLOW:
 * 1. User clicks "Pay Now"
 * 2. Backend creates Razorpay order  (POST /payment/create-order)
 * 3. Razorpay checkout popup opens
 * 4. User completes payment
 * 5. Backend verifies HMAC-SHA256 signature (POST /payment/verify)
 * 6. Enrollment created ONLY after verification
 * 7. User redirected to course
 *
 * Props:
 * - course: { id, title, price, ... }
 * - onClose: callback when modal closes
 * - onSuccess: callback after successful enrollment (receives enrollment object)
 */
export default function PaymentModalSecure({ course, onClose, onSuccess }) {
    const { token } = useSelector(state => state.auth);
    const { user }  = useSelector(state => state.profile);
    const { createOrder, verifyPayment, loading, error, paymentStep } = usePaymentSecure();

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
        console.log("[PaymentModal] handlePayment called - course:", course?.id, "price:", course?.price);

        try {
            setStep("processing");
            setLocalError(null);

            // ─── AUTH CHECK: Always fetch a fresh token from Supabase ─────────
            // Avoids 401 "Token is invalid or malformed" from stale Redux tokens.
            let activeToken = token;
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.access_token) {
                    activeToken = session.access_token;
                    console.log("[PaymentModal] ✅ Fresh token obtained from Supabase session");
                } else {
                    console.warn("[PaymentModal] ⚠️ No live Supabase session — falling back to Redux token");
                }
            } catch (sessionErr) {
                console.warn("[PaymentModal] ⚠️ getSession failed, using Redux token:", sessionErr.message);
            }

            if (!activeToken) {
                throw new Error("Authentication token not found. Please log in again.");
            }

            // ─── LOAD RAZORPAY SDK ────────────────────────────────────────────
            console.log("[PaymentModal] Loading Razorpay SDK...");
            const sdkLoaded = await loadRazorpayScript();
            if (!sdkLoaded) {
                throw new Error("Razorpay SDK failed to load. Please check your internet connection.");
            }
            console.log("[PaymentModal] ✅ Razorpay SDK loaded");

            // ─── VALIDATE COURSE ──────────────────────────────────────────────
            if (!course?.id) {
                throw new Error("Course information is missing. Please refresh and try again.");
            }

            const coursePrice = Number(course.price);
            if (!coursePrice || coursePrice <= 0) {
                throw new Error("Invalid course price. Please refresh and try again.");
            }

            // ─── STEP 1: CREATE ORDER ON BACKEND ─────────────────────────────
            console.log("[PaymentModal] Creating order - courseId:", course.id, "amount:", coursePrice);

            const orderResult = await createOrder({
                courseId: course.id,
                amount:   coursePrice,
                token:    activeToken
            });

            console.log("[PaymentModal] createOrder result:", orderResult);

            if (!orderResult.success) {
                throw new Error(orderResult.error || "Failed to create payment order");
            }

            // ─── STEP 2: OPEN RAZORPAY CHECKOUT ──────────────────────────────
            const razorpayKey = process.env.REACT_APP_RAZORPAY_KEY_ID;
            if (!razorpayKey) {
                throw new Error("Razorpay Key ID not configured. Set REACT_APP_RAZORPAY_KEY_ID in .env");
            }
            console.log("[PaymentModal] Opening Razorpay with key:", razorpayKey.substring(0, 12) + "...");
            console.log("[PaymentModal] Order ID:", orderResult.orderId, "Amount (paise):", orderResult.amount);

            const options = {
                key:         razorpayKey,
                amount:      orderResult.amount,    // In paise (from backend)
                currency:    orderResult.currency || "INR",
                order_id:    orderResult.orderId,
                name:        "EdTech Platform",
                description: course.title,
                prefill: {
                    name:  user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Student",
                    email: user?.email || "",
                    contact: "9999999999"
                },
                notes: {
                    address: "Mumbai, Maharashtra, India"
                },
                theme: {
                    color: "#7C3AED"
                },
                handler: async function (response) {
                    // ─── PAYMENT CAPTURED → VERIFY ON BACKEND ────────────────
                    console.log("[PaymentModal] Razorpay payment captured:", {
                        order_id:   response.razorpay_order_id,
                        payment_id: response.razorpay_payment_id
                    });
                    await handlePaymentSuccess(response);
                },
                modal: {
                    ondismiss: function () {
                        console.log("[PaymentModal] Razorpay modal dismissed by user");
                        setStep("confirm");
                        setLocalError("Payment cancelled. You can try again.");
                    }
                }
            };

            const razorpay = new window.Razorpay(options);

            razorpay.on("payment.failed", function (response) {
                console.error("[PaymentModal] Razorpay payment.failed:", response.error);
                setStep("failed");
                setLocalError(
                    "Payment failed: " +
                    (response.error?.description || response.error?.reason || "Unknown error")
                );
            });

            razorpay.open();

        } catch (err) {
            console.error("[PaymentModal] handlePayment error:", err.message, err);
            setStep("failed");
            setLocalError(err.message || "Payment failed. Please try again.");
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // HANDLE PAYMENT SUCCESS — VERIFY ON BACKEND
    // ─────────────────────────────────────────────────────────────────────────
    const handlePaymentSuccess = async (razorpayResponse) => {
        console.log("[PaymentModal] handlePaymentSuccess - verifying signature...");

        try {
            setStep("processing");
            setLocalError(null);

            // Re-fetch the session for a fresh token for verify too
            let verifyToken = token;
            try {
                const { data: { session: vs } } = await supabase.auth.getSession();
                if (vs?.access_token) verifyToken = vs.access_token;
            } catch (_) {}

            const verifyResult = await verifyPayment({
                razorpayOrderId:   razorpayResponse.razorpay_order_id,
                razorpayPaymentId: razorpayResponse.razorpay_payment_id,
                razorpaySignature: razorpayResponse.razorpay_signature,
                courseId: course.id,
                token:    verifyToken
            });

            console.log("[PaymentModal] verifyPayment result:", verifyResult);

            if (!verifyResult.success) {
                throw new Error(verifyResult.error || "Payment verification failed");
            }

            // ─── PAYMENT VERIFIED — ENROLLMENT CREATED ────────────────────────
            console.log("[PaymentModal] ✅ Payment verified! Enrollment:", verifyResult.enrollment?.id);
            setStep("success");

            // Give user 2 seconds to see success screen, then callback
            setTimeout(() => {
                onSuccess?.(verifyResult.enrollment);
                onClose?.();
            }, 2000);

        } catch (err) {
            console.error("[PaymentModal] handlePaymentSuccess error:", err.message, err);
            setStep("failed");
            setLocalError(err.message || "Payment verification failed. Please contact support.");
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
            onClick={(e) => { if (e.target === e.currentTarget && step !== "processing") onClose?.(); }}
        >
            <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full border border-purple-500/50 shadow-2xl shadow-purple-500/20">

                {/* ── CONFIRM ── */}
                {step === "confirm" && (
                    <>
                        <h2 className="text-2xl font-bold text-white mb-6">Confirm Purchase</h2>

                        <div className="bg-gray-800 rounded-xl p-5 mb-6 border border-white/5">
                            <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Course</p>
                            <p className="text-white font-semibold text-lg leading-snug mb-5">{course?.title}</p>

                            <div className="border-t border-gray-700 pt-4 flex justify-between items-center">
                                <span className="text-gray-400">Total Amount</span>
                                <span className="text-white font-bold text-2xl">₹{course?.price}</span>
                            </div>
                        </div>

                        <div className="flex items-start gap-2 text-xs text-gray-500 mb-6">
                            <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <span>Secure payment via Razorpay. Your financial data is never stored on our servers.</span>
                        </div>

                        {(localError || error) && (
                            <div className="bg-red-900/50 border border-red-500/50 rounded-xl p-3 mb-5">
                                <p className="text-red-300 text-sm">{localError || error}</p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                id="payment-cancel-btn"
                                onClick={onClose}
                                disabled={loading}
                                className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 disabled:opacity-50 transition font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                id="payment-confirm-btn"
                                onClick={handlePayment}
                                disabled={loading}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:opacity-90 disabled:opacity-50 transition font-bold"
                            >
                                {loading ? "Processing..." : `Pay ₹${course?.price}`}
                            </button>
                        </div>
                    </>
                )}

                {/* ── PROCESSING ── */}
                {step === "processing" && (
                    <div className="text-center py-4">
                        <div className="flex justify-center mb-6">
                            <div className="animate-spin rounded-full h-14 w-14 border-[3px] border-purple-500/30 border-t-purple-500" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">
                            {paymentStep === "creating"  && "Creating order..."}
                            {paymentStep === "verifying" && "Verifying payment..."}
                            {!paymentStep               && "Processing payment..."}
                        </h2>
                        <p className="text-gray-400 text-sm">Please do not close this window</p>
                    </div>
                )}

                {/* ── SUCCESS ── */}
                {step === "success" && (
                    <div className="text-center py-4">
                        <div className="flex justify-center mb-5">
                            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Payment Successful!</h2>
                        <p className="text-gray-300 mb-1">You are now enrolled in</p>
                        <p className="text-purple-400 font-semibold mb-4">{course?.title}</p>
                        <p className="text-gray-500 text-sm animate-pulse">Redirecting to course...</p>
                    </div>
                )}

                {/* ── FAILED ── */}
                {step === "failed" && (
                    <div className="text-center py-4">
                        <div className="flex justify-center mb-5">
                            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Payment Failed</h2>
                        <p className="text-red-300 text-sm mb-6 max-w-xs mx-auto">
                            {localError || error || "Something went wrong. Please try again."}
                        </p>

                        <div className="flex gap-3">
                            <button
                                id="payment-close-btn"
                                onClick={onClose}
                                className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition font-medium"
                            >
                                Close
                            </button>
                            <button
                                id="payment-retry-btn"
                                onClick={() => { setStep("confirm"); setLocalError(null); }}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:opacity-90 transition font-bold"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
