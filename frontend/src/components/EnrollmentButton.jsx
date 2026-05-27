// EnrollmentButton.jsx
// Place this in: src/components/EnrollmentButton.jsx
//
// USAGE on course detail page:
//
//   import EnrollmentButton from "../components/EnrollmentButton";
//
//   <EnrollmentButton
//     course={course}          // Full course object from Supabase
//     userId={currentUser.id}  // Logged-in user's ID
//     onEnrolled={() => navigate(`/learn/${course.id}`)}
//   />

import { useState, useEffect } from "react";
import PaymentModal from "./PaymentModal";
import { useEnrollment } from "../hooks/useEnrollment";
import { useNavigate } from "react-router-dom";

export default function EnrollmentButton({ course, userId, onEnrolled }) {
  const navigate = useNavigate();
  const { enrollFree, checkEnrollment, loading } = useEnrollment();
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const isFree = course.is_free || course.price === 0 || course.price === null;

  // Check if already enrolled on mount
  useEffect(() => {
    if (!userId || !course?.id) { setCheckingStatus(false); return; }
    checkEnrollment({ courseId: course.id, userId })
      .then((enrollment) => {
        setIsEnrolled(!!enrollment);
        setCheckingStatus(false);
      });
  }, [course.id, userId]);

  // ── Go to classroom if already enrolled ──────────────────────────────────
  if (!checkingStatus && isEnrolled) {
    return (
      <button
        onClick={() => navigate(`/learn/${course.id}`)}
        style={btnStyle("#7c3aed")}
      >
        Go to Classroom
      </button>
    );
  }

  // ── Free course handler ───────────────────────────────────────────────────
  const handleFreeEnroll = async () => {
    if (!userId) {
      navigate("/login");
      return;
    }
    setEnrolling(true);
    const result = await enrollFree({ courseId: course.id, userId });
    setEnrolling(false);

    if (result.success) {
      setIsEnrolled(true);
      onEnrolled?.();
      navigate(`/learn/${course.id}`);
    } else {
      alert(result.error || "Enrollment failed. Please try again.");
    }
  };

  // ── Paid course: open payment modal ──────────────────────────────────────
  const handlePaidEnroll = () => {
    if (!userId) {
      navigate("/login");
      return;
    }
    setShowPaymentModal(true);
  };

  // ── After successful payment + enrollment ─────────────────────────────────
  const handlePaymentSuccess = (enrollment) => {
    setShowPaymentModal(false);
    setIsEnrolled(true);
    onEnrolled?.();
    navigate(`/learn/${course.id}`);
  };

  if (checkingStatus) {
    return <button style={btnStyle("#4b4467")} disabled>Loading...</button>;
  }

  return (
    <>
      <button
        onClick={isFree ? handleFreeEnroll : handlePaidEnroll}
        disabled={enrolling || loading}
        style={btnStyle(enrolling || loading ? "#4b4467" : "#7c3aed")}
      >
        {enrolling || loading
          ? "Enrolling..."
          : isFree
            ? "Enroll Now — Free"
            : `Enroll Now — ₹${course.price}`}
      </button>

      {/* Payment modal for paid courses */}
      {showPaymentModal && (
        <PaymentModal
          course={course}
          userId={userId}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
}

// Shared button style
function btnStyle(bg) {
  return {
    width: "100%",
    padding: "14px 24px",
    background: bg,
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "16px",
    fontWeight: 600,
    cursor: bg === "#4b4467" ? "not-allowed" : "pointer",
    transition: "opacity 0.2s",
  };
}
