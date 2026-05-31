// ═══════════════════════════════════════════════════════════════════════════════
// SECURE ENROLLMENT VERIFICATION MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════════

const supabase = require("../config/supabase");

/**
 * CRITICAL MIDDLEWARE: Verifies student has valid enrollment before accessing course
 * 
 * Rules:
 * - FREE COURSES: Accessible to any authenticated user
 * - PAID COURSES: ONLY accessible if payment_status === "completed"
 * - INSTRUCTORS: Can access their own courses
 * - ADMINS: Can access all courses
 * 
 * Usage:
 * router.get("/learn/:courseId", auth, isStudent, verifyEnrollmentSecure, courseController.getLearningPage);
 */
exports.verifyEnrollmentSecure = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const studentId = req.user.id;
        const accountType = req.user.accountType;

        if (!courseId) {
            return res.status(400).json({
                success: false,
                message: "Course ID is required"
            });
        }

        // ─── FETCH COURSE DETAILS ─────────────────────────────────────────────
        const { data: course, error: courseError } = await supabase
            .from("courses")
            .select("id, title, is_free, instructor_id, price")
            .eq("id", courseId)
            .single();

        if (courseError || !course) {
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });
        }

        // ─── ALLOW INSTRUCTORS TO ACCESS THEIR OWN COURSES ────────────────────
        if (accountType === "Instructor" && course.instructor_id === studentId) {
            req.course = course;
            return next();
        }

        // ─── ALLOW ADMINS TO ACCESS ALL COURSES ───────────────────────────────
        if (accountType === "Admin") {
            req.course = course;
            return next();
        }

        // ─── FREE COURSES: ACCESSIBLE TO ALL AUTHENTICATED USERS ───────────────
        if (course.is_free) {
            req.course = course;
            return next();
        }

        // ─── PAID COURSES: VERIFY PAYMENT STATUS ──────────────────────────────
        const { data: enrollment, error: enrollmentError } = await supabase
            .from('course_enrollments')
            .select('id, payment_status, enrolled_at')
            .eq('student_id', studentId)
            .eq('course_id', courseId)
            .maybeSingle();

        if (enrollmentError) {
            console.error("Enrollment verification error:", enrollmentError);
            return res.status(500).json({
                success: false,
                message: "Failed to verify enrollment"
            });
        }

        // ─── CRITICAL SECURITY CHECK ──────────────────────────────────────────
        // For paid courses, MUST have completed payment
        if (!enrollment) {
            return res.status(403).json({
                success: false,
                message: "You are not enrolled in this course. Please purchase to access.",
                error: "NOT_ENROLLED"
            });
        }

        // ─── VERIFY PAYMENT STATUS FOR PAID COURSES ───────────────────────────
        if (enrollment && enrollment.payment_status !== "paid" && enrollment.payment_status !== "completed") {
            return res.status(403).json({
                success: false,
                message: "Payment not verified. Please complete payment to access this course.",
                error: "PAYMENT_NOT_VERIFIED",
                paymentStatus: enrollment.payment_status
            });
        }

        // ─── ATTACH ENROLLMENT INFO TO REQUEST ────────────────────────────────
        req.course = course;
        req.enrollment = enrollment;

        next();

    } catch (error) {
        console.error("Enrollment verification error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to verify enrollment",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};

/**
 * ALTERNATIVE: Lightweight check for API endpoints
 * Returns enrollment status without blocking access
 * Useful for fetching course data with enrollment info
 */
exports.checkEnrollmentStatus = async (req, res, next) => {
    try {
        const { courseId } = req.params || req.body;
        const studentId = req.user?.id;

        if (!courseId || !studentId) {
            return next();
        }

        const { data: course } = await supabase
            .from("courses")
            .select("id, is_free")
            .eq("id", courseId)
            .single();

        if (!course) {
            return next();
        }

        // Free courses - always accessible
        if (course.is_free) {
            req.enrollmentStatus = {
                isEnrolled: true,
                canAccess: true,
                isFree: true
            };
            return next();
        }

        // Check enrollment for paid courses
        const { data: enrollment } = await supabase
            .from('course_enrollments')
            .select('id, payment_status')
            .eq('student_id', studentId)
            .eq('course_id', courseId)
            .maybeSingle();

        req.enrollmentStatus = {
            isEnrolled: !!enrollment,
            canAccess: !!enrollment && (enrollment.payment_status === 'paid' || enrollment.payment_status === 'completed' || enrollment.payment_status === 'Free'),
            paymentStatus: enrollment?.payment_status,
            enrollmentType: enrollment?.payment_status === 'Free' ? 'free' : 'paid'
        };

        next();

    } catch (error) {
        console.error("Check enrollment status error:", error);
        next();
    }
};

/**
 * ADMIN ONLY: Verify enrollment for admin dashboard
 * Allows admins to check any student's enrollment
 */
exports.verifyEnrollmentAdmin = async (req, res, next) => {
    try {
        const { courseId, studentId } = req.body;

        if (!courseId || !studentId) {
            return res.status(400).json({
                success: false,
                message: "courseId and studentId are required"
            });
        }

        const { data: enrollment, error } = await supabase
            .from("course_enrollments")
            .select("*")
            .eq("student_id", studentId)
            .eq("course_id", courseId)
            .maybeSingle();

        if (error) throw error;

        req.enrollmentData = enrollment;
        next();

    } catch (error) {
        console.error("Admin enrollment verification error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to verify enrollment"
        });
    }
};
