// useEnrollment.js
// Place this in: src/hooks/useEnrollment.js
// Requires: supabase client setup at src/config/supabaseClient.js

import { useState } from "react";
import { supabase } from "../config/supabaseClient";

export function useEnrollment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ─── FREE COURSE ENROLLMENT ───────────────────────────────────────────────
  // Called directly when student clicks "Enroll Now" on a free course
  const enrollFree = async ({ courseId, userId }) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Check if already enrolled
      const { data: existing } = await supabase
        .from("enrollments")
        .select("id")
        .eq("course_id", courseId)
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        return { success: true, alreadyEnrolled: true };
      }

      // 2. Fetch course + instructor info
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .select("id, title, instructor_id, price, is_free")
        .eq("id", courseId)
        .single();

      if (courseError) throw courseError;

      // 3. Fetch enrolling student info
      const { data: student, error: studentError } = await supabase
        .from("profiles")           // or "users" — change to match your table name
        .select("id, first_name, last_name, email")
        .eq("id", userId)
        .single();

      if (studentError) throw studentError;

      const studentName = student ? `${student.first_name || ""} ${student.last_name || ""}`.trim() : "Student";

      // 4. Insert enrollment record
      const { data: enrollment, error: enrollError } = await supabase
        .from("enrollments")
        .insert({
          course_id: courseId,
          user_id: userId,
          student_id: userId, // Safe alignment with this codebase's NOT NULL student_id constraint
          enrollment_type: "free",
          payment_status: "not_required",
          amount_paid: 0,
          enrolled_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (enrollError) throw enrollError;

      // 5. Create notification for instructor
      await supabase.from("notifications").insert({
        recipient_id: course.instructor_id,
        type: "new_enrollment",
        title: "New Student Enrolled",
        message: `${studentName} enrolled in "${course.title}"`,
        metadata: {
          enrollment_id: enrollment.id,
          course_id: courseId,
          student_id: userId,
          student_name: studentName,
          student_email: student.email,
          course_title: course.title,
          enrollment_type: "free",
        },
        is_read: false,
        created_at: new Date().toISOString(),
      });

      // 6. Create notification for admin
      // Fetch all admins from your admin/profiles table
      const { data: admins } = await supabase
        .from("profiles")           // change to match your admin table
        .select("id")
        .eq("role", "admin");

      if (admins && admins.length > 0) {
        const adminNotifications = admins.map((admin) => ({
          recipient_id: admin.id,
          type: "new_enrollment",
          title: "New Enrollment (Free Course)",
          message: `${studentName} enrolled in "${course.title}"`,
          metadata: {
            enrollment_id: enrollment.id,
            course_id: courseId,
            student_id: userId,
            student_name: studentName,
            student_email: student.email,
            course_title: course.title,
            enrollment_type: "free",
            instructor_id: course.instructor_id,
          },
          is_read: false,
          created_at: new Date().toISOString(),
        }));
        await supabase.from("notifications").insert(adminNotifications);
      }

      return { success: true, enrollment };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // ─── PAID COURSE ENROLLMENT (after payment success) ───────────────────────
  // Called from PaymentModal after Razorpay verifies payment
  const enrollPaid = async ({
    courseId,
    userId,
    razorpayPaymentId,
    razorpayOrderId,
    razorpaySignature,
    amountPaid,
  }) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch course + instructor info
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .select("id, title, instructor_id, price")
        .eq("id", courseId)
        .single();

      if (courseError) throw courseError;

      // 2. Fetch student info
      const { data: student, error: studentError } = await supabase
        .from("profiles")           // change to match your table name
        .select("id, first_name, last_name, email")
        .eq("id", userId)
        .single();

      if (studentError) throw studentError;

      const studentName = student ? `${student.first_name || ""} ${student.last_name || ""}`.trim() : "Student";

      // 3. Insert enrollment with payment details
      const { data: enrollment, error: enrollError } = await supabase
        .from("enrollments")
        .insert({
          course_id: courseId,
          user_id: userId,
          student_id: userId, // Safe alignment with this codebase's NOT NULL student_id constraint
          enrollment_type: "paid",
          payment_status: "completed",
          amount_paid: amountPaid,
          razorpay_payment_id: razorpayPaymentId,
          razorpay_order_id: razorpayOrderId,
          razorpay_signature: razorpaySignature,
          enrolled_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (enrollError) throw enrollError;

      // 4. Notify instructor
      await supabase.from("notifications").insert({
        recipient_id: course.instructor_id,
        type: "new_enrollment",
        title: "New Paid Enrollment 🎉",
        message: `${studentName} purchased "${course.title}" for ₹${amountPaid / 100}`,
        metadata: {
          enrollment_id: enrollment.id,
          course_id: courseId,
          student_id: userId,
          student_name: studentName,
          student_email: student.email,
          course_title: course.title,
          enrollment_type: "paid",
          amount_paid: amountPaid,
          razorpay_payment_id: razorpayPaymentId,
        },
        is_read: false,
        created_at: new Date().toISOString(),
      });

      // 5. Notify all admins
      const { data: admins } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin");

      if (admins && admins.length > 0) {
        const adminNotifications = admins.map((admin) => ({
          recipient_id: admin.id,
          type: "new_enrollment",
          title: "New Paid Enrollment",
          message: `${studentName} purchased "${course.title}" for ₹${amountPaid / 100}`,
          metadata: {
            enrollment_id: enrollment.id,
            course_id: courseId,
            student_id: userId,
            student_name: studentName,
            student_email: student.email,
            course_title: course.title,
            enrollment_type: "paid",
            amount_paid: amountPaid,
            instructor_id: course.instructor_id,
            razorpay_payment_id: razorpayPaymentId,
          },
          is_read: false,
          created_at: new Date().toISOString(),
        }));
        await supabase.from("notifications").insert(adminNotifications);
      }

      return { success: true, enrollment };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // ─── CHECK ENROLLMENT STATUS ──────────────────────────────────────────────
  const checkEnrollment = async ({ courseId, userId }) => {
    try {
      const { data } = await supabase
        .from("enrollments")
        .select("id, enrolled_at, payment_status")
        .eq("course_id", courseId)
        .eq("user_id", userId)
        .maybeSingle();
      return data || null;
    } catch (err) {
      console.error("Error in checkEnrollment:", err);
      return null;
    }
  };

  return { enrollFree, enrollPaid, checkEnrollment, loading, error };
}
