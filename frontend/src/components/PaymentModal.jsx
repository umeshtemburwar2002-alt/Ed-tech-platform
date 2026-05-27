// PaymentModal.jsx
// Place this in: src/components/PaymentModal.jsx
//
// SETUP:
//   1. Add Razorpay script to index.html:
//      <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
//   2. Set VITE_RAZORPAY_KEY_ID in your .env file
//   3. Backend endpoint needed: POST /api/create-razorpay-order
//      (see comment block at bottom of this file)

import { useState, useEffect } from "react";
import { useEnrollment } from "../hooks/useEnrollment";

export default function PaymentModal({ course, userId, onClose, onSuccess }) {
  const [step, setStep] = useState("confirm"); // "confirm" | "processing" | "success" | "failed"
  const [paymentError, setPaymentError] = useState(null);
  const { enrollPaid, loading } = useEnrollment();

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "unset"; };
  }, []);

  const handlePayment = async () => {
    setStep("processing");
    setPaymentError(null);

    try {
      // ── Step 1: Create Razorpay order from your backend ──────────────────
      // Dynamic base URL resolution to point directly to backend Express port if proxy is absent
      const backendBase = process.env.REACT_APP_BACKEND_URL 
        ? process.env.REACT_APP_BACKEND_URL.replace("/api/v1", "") 
        : "";
      const orderRes = await fetch(`${backendBase}/api/create-razorpay-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: course.price * 100,    // Razorpay takes paise (1 INR = 100 paise)
          currency: "INR",
          receipt: `course_${course.id}_user_${userId}`,
          notes: {
            course_id: course.id,
            course_title: course.title || course.courseName,
            user_id: userId,
          },
        }),
      });

      if (!orderRes.ok) throw new Error("Failed to create payment order");
      const order = await orderRes.json();

      // Resolve key securely supporting Vite, CRA React, or standard test credentials
      const razorpayKey = (typeof import.meta !== "undefined" && import.meta.env?.VITE_RAZORPAY_KEY_ID) ||
                           process.env.REACT_APP_RAZORPAY_KEY_ID ||
                           "rzp_test_SuXSEK8nNcHwKe";

      // ── Step 2: Open Razorpay checkout ───────────────────────────────────
      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency,
        name: "EdTech Platform",          // Change to your platform name
        description: course.title || course.courseName,
        order_id: order.id,
        prefill: {
          // Pass user's email/phone if you have it
          // email: currentUser.email,
          // contact: currentUser.phone,
        },
        theme: { color: "#7C3AED" },      // Purple to match your UI
        handler: async function (response) {
          // ── Step 3: Payment captured — enroll the student ─────────────
          const result = await enrollPaid({
            courseId: course.id,
            userId,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id,
            razorpaySignature: response.razorpay_signature,
            amountPaid: course.price * 100,
          });

          if (result.success) {
            setStep("success");
            setTimeout(() => {
              onSuccess?.(result.enrollment);
            }, 2000);
          } else {
            setStep("failed");
            setPaymentError(result.error || "Enrollment failed after payment");
          }
        },
        modal: {
          ondismiss: () => {
            // User closed Razorpay without paying
            setStep("confirm");
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response) => {
        setStep("failed");
        setPaymentError(response.error.description || "Payment failed");
      });
      rzp.open();

    } catch (err) {
      setStep("failed");
      setPaymentError(err.message);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        style={{
          background: "#1e1b2e",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "16px",
          padding: "2rem",
          width: "100%",
          maxWidth: "420px",
          color: "#fff",
        }}
      >
        {/* ── CONFIRM STEP ── */}
        {step === "confirm" && (
          <>
            <div style={{ marginBottom: "1.5rem" }}>
              <p style={{ fontSize: "12px", color: "#a78bfa", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
                Complete Purchase
              </p>
              <h2 style={{ fontSize: "20px", fontWeight: 600, margin: "0 0 8px" }}>
                {course.title || course.courseName}
              </h2>
              <p style={{ fontSize: "14px", color: "#9ca3af", margin: 0 }}>
                You're about to enroll in this course
              </p>
            </div>

            {/* Course summary */}
            <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "10px", padding: "1rem", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "14px", color: "#9ca3af" }}>Course</span>
                <span style={{ fontSize: "14px" }}>{course.title || course.courseName}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "14px", color: "#9ca3af" }}>Instructor</span>
                <span style={{ fontSize: "14px" }}>{course.instructor_name || "—"}</span>
              </div>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "8px", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "16px", fontWeight: 600 }}>Total</span>
                <span style={{ fontSize: "20px", fontWeight: 700, color: "#a78bfa" }}>₹{course.price}</span>
              </div>
            </div>

            {/* Benefits */}
            <div style={{ marginBottom: "1.5rem" }}>
              {["Lifetime access", "Certificate of completion", "30-day money-back guarantee"].map((benefit) => (
                <div key={benefit} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ color: "#10b981", fontSize: "16px" }}>✓</span>
                  <span style={{ fontSize: "14px", color: "#d1d5db" }}>{benefit}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={onClose}
                style={{ flex: 1, padding: "12px", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "#9ca3af", cursor: "pointer", fontSize: "14px" }}
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                style={{ flex: 2, padding: "12px", background: "#7c3aed", border: "none", borderRadius: "8px", color: "#fff", cursor: "pointer", fontSize: "15px", fontWeight: 600 }}
              >
                Pay ₹{course.price}
              </button>
            </div>

            <p style={{ fontSize: "12px", color: "#6b7280", textAlign: "center", marginTop: "12px" }}>
              Secured by Razorpay · UPI, Cards, Netbanking accepted
            </p>
          </>
        )}

        {/* ── PROCESSING STEP ── */}
        {step === "processing" && (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <div style={{ width: "48px", height: "48px", border: "3px solid #7c3aed", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 1rem" }} />
            <p style={{ fontSize: "16px", fontWeight: 500 }}>Processing payment...</p>
            <p style={{ fontSize: "14px", color: "#9ca3af", marginTop: "8px" }}>Please complete the payment in the Razorpay window</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* ── SUCCESS STEP ── */}
        {step === "success" && (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <div style={{ width: "64px", height: "64px", background: "rgba(16,185,129,0.15)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", fontSize: "32px" }}>
              ✓
            </div>
            <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "8px" }}>You're enrolled!</h2>
            <p style={{ fontSize: "14px", color: "#9ca3af" }}>
              Welcome to <strong>{course.title || course.courseName}</strong>. Redirecting to classroom...
            </p>
          </div>
        )}

        {/* ── FAILED STEP ── */}
        {step === "failed" && (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <div style={{ width: "64px", height: "64px", background: "rgba(239,68,68,0.15)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", fontSize: "32px" }}>
              ✕
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>Payment failed</h2>
            <p style={{ fontSize: "14px", color: "#9ca3af", marginBottom: "1.5rem" }}>
              {paymentError || "Something went wrong. Please try again."}
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={onClose}
                style={{ flex: 1, padding: "12px", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "#9ca3af", cursor: "pointer" }}
              >
                Close
              </button>
              <button
                onClick={() => { setStep("confirm"); setPaymentError(null); }}
                style={{ flex: 1, padding: "12px", background: "#7c3aed", border: "none", borderRadius: "8px", color: "#fff", cursor: "pointer", fontWeight: 600 }}
              >
                Try again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


/* ──────────────────────────────────────────────────────────────────────────────
   BACKEND: Express/Node.js endpoint for creating Razorpay order
   Create this at: server/routes/payment.js (or your backend)

   const Razorpay = require("razorpay");
   const razorpay = new Razorpay({
     key_id: process.env.RAZORPAY_KEY_ID,
     key_secret: process.env.RAZORPAY_KEY_SECRET,
   });

   app.post("/api/create-razorpay-order", async (req, res) => {
     const { amount, currency, receipt, notes } = req.body;
     try {
       const order = await razorpay.orders.create({ amount, currency, receipt, notes });
       res.json(order);
     } catch (err) {
       res.status(500).json({ error: err.message });
     }
   });
────────────────────────────────────────────────────────────────────────────── */
