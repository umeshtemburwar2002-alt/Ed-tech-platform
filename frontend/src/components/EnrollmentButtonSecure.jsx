// ═══════════════════════════════════════════════════════════════════════════════
// SECURE ENROLLMENT BUTTON - PRODUCTION READY
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import PaymentModalSecure from "./PaymentModalSecure";
import { usePaymentSecure } from "../hooks/usePaymentSecure";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1";

/**
 * EnrollmentButtonSecure Component
 * 
 * SECURE ENROLLMENT FLOW:
 * 
 * FREE COURSE:
 * 1. User clicks "Start Learning Free"
 * 2. Backend creates enrollment with payment_status = "not_required"
 * 3. User redirected to course
 * 
 * PAID COURSE:
 * 1. User clicks "Buy Now"
 * 2. PaymentModalSecure opens
 * 3. Backend creates Razorpay order
 * 4. Razorpay popup opens
 * 5. User completes payment
 * 6. Backend verifies signature
 * 7. Enrollment created ONLY after verification
 * 8. User redirected to course
 * 
 * Props:
 * - course: { id, title, price, is_free, ... }
 * - onEnrolled: callback after successful enrollment
 */
export default function EnrollmentButtonSecure({ course, onEnrolled }) {
    const navigate = useNavigate();
    const { token, user } = useSelector(state => state.auth);
    const { enrollFree, loading: paymentLoading } = usePaymentSecure();

    const [isEnrolled, setIsEnrolled] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(true);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [enrolling, setEnrolling] = useState(false);
    const [error, setError] = useState(null);

    const isFree = course?.is_free || course?.price === 0 || course?.price === null;

    // ─────────────────────────────────────────────────────────────────────────
    // CHECK ENROLLMENT STATUS ON MOUNT
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!user?.id || !course?.id || !token) {
            setCheckingStatus(false);
            return;
        }

        checkEnrollmentStatus();
    }, [course?.id, user?.id, token]);

    const checkEnrollmentStatus = async () => {
        try {
            setCheckingStatus(true);
            setError(null);

            const response = await axios.get(
                `${API_BASE}/enrollment/check/${course.id}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            if (response.data.success) {
                setIsEnrolled(response.data.isEnrolled);
            }
        } catch (err) {
            console.error("Error checking enrollment status:", err);
            // Don't show error - just assume not enrolled
        } finally {
            setCheckingStatus(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // HANDLE FREE COURSE ENROLLMENT
    // ─────────────────────────────────────────────────────────────────────────
    const handleFreeEnroll = async () => {
        if (!user?.id) {
            navigate("/login");
            return;
        }

        try {
            setEnrolling(true);
            setError(null);

            const result = await enrollFree({
                courseId: course.id,
                token
            });

            if (result.success) {
                setIsEnrolled(true);
                onEnrolled?.();
                
                // Redirect to course after 1 second
                setTimeout(() => {
                    navigate(`/learn/${course.id}`);
                }, 1000);
            } else {
                setError(result.error || "Enrollment failed. Please try again.");
            }
        } catch (err) {
            setError(err.message || "Enrollment failed. Please try again.");
        } finally {
            setEnrolling(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // HANDLE PAID COURSE - OPEN PAYMENT MODAL
    // ─────────────────────────────────────────────────────────────────────────
    const handlePaidEnroll = () => {
        if (!user?.id) {
            navigate("/login");
            return;
        }

        setShowPaymentModal(true);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // HANDLE PAYMENT SUCCESS
    // ─────────────────────────────────────────────────────────────────────────
    const handlePaymentSuccess = (enrollment) => {
        setIsEnrolled(true);
        setShowPaymentModal(false);
        onEnrolled?.();

        // Redirect to course
        setTimeout(() => {
            navigate(`/learn/${course.id}`);
        }, 500);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER BUTTON
    // ─────────────────────────────────────────────────────────────────────────

    // Loading state
    if (checkingStatus) {
        return (
            <button
                disabled
                className="px-6 py-2 bg-gray-600 text-white rounded-lg opacity-50 cursor-not-allowed"
            >
                Checking...
            </button>
        );
    }

    // Already enrolled - show "Go to Classroom" button
    if (isEnrolled) {
        return (
            <button
                onClick={() => navigate(`/learn/${course.id}`)}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
            >
                Go to Classroom
            </button>
        );
    }

    // Free course - show "Start Learning Free" button
    if (isFree) {
        return (
            <>
                <button
                    onClick={handleFreeEnroll}
                    disabled={enrolling || paymentLoading}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition font-semibold"
                >
                    {enrolling ? "Enrolling..." : "Start Learning Free"}
                </button>
                {error && (
                    <p className="text-red-400 text-sm mt-2">{error}</p>
                )}
            </>
        );
    }

    // Paid course - show "Buy Now" button
    return (
        <>
            <button
                onClick={handlePaidEnroll}
                disabled={paymentLoading}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition font-semibold"
            >
                {paymentLoading ? "Processing..." : `Buy Now - ₹${course.price}`}
            </button>

            {error && (
                <p className="text-red-400 text-sm mt-2">{error}</p>
            )}

            {/* Payment Modal */}
            {showPaymentModal && (
                <PaymentModalSecure
                    course={course}
                    onClose={() => setShowPaymentModal(false)}
                    onSuccess={handlePaymentSuccess}
                />
            )}
        </>
    );
}
