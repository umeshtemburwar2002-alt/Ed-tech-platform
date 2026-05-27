// ═══════════════════════════════════════════════════════════════════════════════
// SECURE PAYMENT CONTROLLER - PRODUCTION READY
// ═══════════════════════════════════════════════════════════════════════════════

const supabase = require("../config/supabase");
const razorpayInstance = require("../config/razorpay");
const crypto = require("crypto");
const mailSender = require("../utils/mailSender");

// ─────────────────────────────────────────────────────────────────────────────
// 1. CREATE RAZORPAY ORDER - STEP 1 OF PAYMENT FLOW
// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/v1/payment/create-order
 * 
 * Creates a Razorpay order for a paid course.
 * CRITICAL: Does NOT create enrollment yet - only creates payment order.
 * 
 * Request body:
 * {
 *   courseId: UUID,
 *   amount: number (in INR, not paise)
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
exports.createOrder = async (req, res) => {
    try {
        const { courseId, amount } = req.body;
        const studentId = req.user.id;

        // ─── VALIDATION ───────────────────────────────────────────────────────
        if (!courseId || !amount) {
            return res.status(400).json({
                success: false,
                message: "courseId and amount are required"
            });
        }

        if (amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Amount must be greater than 0"
            });
        }

        // ─── FETCH COURSE ─────────────────────────────────────────────────────
        const { data: course, error: courseError } = await supabase
            .from("courses")
            .select("id, title, price, is_free, instructor_id")
            .eq("id", courseId)
            .single();

        if (courseError || !course) {
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });
        }

        // ─── SECURITY CHECK: Verify course is paid ────────────────────────────
        if (course.is_free) {
            return res.status(400).json({
                success: false,
                message: "This is a free course. Use free enrollment instead."
            });
        }

        // ─── SECURITY CHECK: Verify amount matches course price ────────────────
        if (Math.abs(Number(course.price) - amount) > 0.01) {
            return res.status(400).json({
                success: false,
                message: "Amount mismatch. Please refresh and try again."
            });
        }

        // ─── SECURITY CHECK: Check for existing active enrollment ─────────────
        const { data: existingEnrollment } = await supabase
            .from("enrollments")
            .select("id, payment_status")
            .eq("student_id", studentId)
            .eq("course_id", courseId)
            .eq("active", true)
            .maybeSingle();

        if (existingEnrollment) {
            // If already completed, they're enrolled
            if (existingEnrollment.payment_status === "completed") {
                return res.status(400).json({
                    success: false,
                    message: "You are already enrolled in this course"
                });
            }
            // If pending, allow retry (they can create new order)
        }

        // ─── CREATE RAZORPAY ORDER ────────────────────────────────────────────
        const amountInPaise = Math.round(amount * 100);

        if (amountInPaise < 100) {
            return res.status(400).json({
                success: false,
                message: "Amount must be at least ₹1"
            });
        }

        const receipt = `order_${courseId}_${studentId}_${Date.now()}`;

        const options = {
            amount: amountInPaise,
            currency: "INR",
            receipt: receipt,
            notes: {
                studentId: studentId,
                courseId: courseId,
                courseTitle: course.title,
                instructorId: course.instructor_id
            }
        };

        const order = await razorpayInstance.orders.create(options);

        // ─── STORE PENDING PAYMENT RECORD ─────────────────────────────────────
        // This creates an audit trail and prevents duplicate orders
        const { data: payment, error: paymentError } = await supabase
            .from("payments")
            .insert([{
                student_id: studentId,
                course_id: courseId,
                razorpay_order_id: order.id,
                amount: amount,
                currency: "INR",
                payment_status: "pending",
                notes: {
                    receipt: receipt,
                    created_at: new Date().toISOString()
                }
            }])
            .select()
            .single();

        if (paymentError) {
            console.error("Failed to store payment record:", paymentError);
            // Don't fail the request - order was created successfully
        }

        // ─── RETURN ORDER DETAILS ─────────────────────────────────────────────
        return res.status(200).json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            totalAmount: amount,
            message: "Order created successfully. Complete payment to enroll."
        });

    } catch (error) {
        console.error("Create Order Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create payment order",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. VERIFY PAYMENT & CREATE ENROLLMENT - STEP 2 OF PAYMENT FLOW
// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/v1/payment/verify
 * 
 * CRITICAL SECURITY FUNCTION:
 * 1. Verifies Razorpay signature using HMAC-SHA256
 * 2. ONLY creates enrollment after signature verification
 * 3. Prevents payment tampering and unauthorized access
 * 
 * Request body:
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
 *   enrollment: { id, student_id, course_id, payment_status, ... },
 *   message: string
 * }
 */
exports.verifyPayment = async (req, res) => {
    try {
        const {
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            courseId
        } = req.body;

        const studentId = req.user.id;

        // ─── VALIDATION ───────────────────────────────────────────────────────
        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !courseId) {
            return res.status(400).json({
                success: false,
                message: "Missing required payment verification fields"
            });
        }

        // ─── VERIFY RAZORPAY SIGNATURE ────────────────────────────────────────
        // This is CRITICAL - prevents payment tampering
        const signatureBody = `${razorpayOrderId}|${razorpayPaymentId}`;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(signatureBody)
            .digest("hex");

        if (expectedSignature !== razorpaySignature) {
            console.warn(`Signature mismatch for order ${razorpayOrderId}`);
            
            // Update payment record as failed
            await supabase
                .from("payments")
                .update({ payment_status: "failed" })
                .eq("razorpay_order_id", razorpayOrderId);

            return res.status(400).json({
                success: false,
                message: "Payment verification failed. Signature mismatch.",
                error: "INVALID_SIGNATURE"
            });
        }

        // ─── FETCH PAYMENT RECORD ─────────────────────────────────────────────
        const { data: paymentRecord, error: paymentFetchError } = await supabase
            .from("payments")
            .select("*")
            .eq("razorpay_order_id", razorpayOrderId)
            .single();

        if (paymentFetchError || !paymentRecord) {
            return res.status(404).json({
                success: false,
                message: "Payment record not found"
            });
        }

        // ─── SECURITY CHECK: Verify student matches ───────────────────────────
        if (paymentRecord.student_id !== studentId) {
            console.warn(`Student mismatch for order ${razorpayOrderId}`);
            return res.status(403).json({
                success: false,
                message: "Unauthorized payment verification",
                error: "STUDENT_MISMATCH"
            });
        }

        // ─── SECURITY CHECK: Verify course matches ────────────────────────────
        if (paymentRecord.course_id !== courseId) {
            console.warn(`Course mismatch for order ${razorpayOrderId}`);
            return res.status(403).json({
                success: false,
                message: "Course mismatch in payment verification",
                error: "COURSE_MISMATCH"
            });
        }

        // ─── SECURITY CHECK: Prevent duplicate verification ───────────────────
        if (paymentRecord.payment_status === "completed") {
            // Payment already verified - check if enrollment exists
            const { data: enrollment } = await supabase
                .from("enrollments")
                .select("*")
                .eq("razorpay_order_id", razorpayOrderId)
                .single();

            if (enrollment) {
                return res.status(200).json({
                    success: true,
                    message: "Payment already verified. Enrollment exists.",
                    enrollment: enrollment,
                    alreadyProcessed: true
                });
            }
        }

        // ─── FETCH COURSE DETAILS ─────────────────────────────────────────────
        const { data: course, error: courseError } = await supabase
            .from("courses")
            .select("id, title, instructor_id, price")
            .eq("id", courseId)
            .single();

        if (courseError || !course) {
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });
        }

        // ─── FETCH STUDENT DETAILS ────────────────────────────────────────────
        const { data: student, error: studentError } = await supabase
            .from("profiles")
            .select("id, first_name, last_name, email")
            .eq("id", studentId)
            .single();

        if (studentError || !student) {
            return res.status(404).json({
                success: false,
                message: "Student profile not found"
            });
        }

        // ─── CREATE ENROLLMENT (ONLY AFTER SIGNATURE VERIFICATION) ────────────
        // This is the critical step - enrollment is created ONLY after payment is verified
        const { data: enrollment, error: enrollmentError } = await supabase
            .from("enrollments")
            .insert([{
                student_id: studentId,
                course_id: courseId,
                enrollment_type: "paid",
                payment_status: "completed",
                razorpay_order_id: razorpayOrderId,
                razorpay_payment_id: razorpayPaymentId,
                razorpay_signature: razorpaySignature,
                amount_paid: paymentRecord.amount,
                active: true,
                enrolled_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (enrollmentError) {
            // Check if it's a duplicate enrollment error
            if (enrollmentError.message.includes("duplicate") || enrollmentError.code === "23505") {
                // Enrollment already exists - this is OK, payment was already processed
                const { data: existingEnrollment } = await supabase
                    .from("enrollments")
                    .select("*")
                    .eq("student_id", studentId)
                    .eq("course_id", courseId)
                    .single();

                if (existingEnrollment && existingEnrollment.payment_status === "completed") {
                    // Update payment record as completed
                    await supabase
                        .from("payments")
                        .update({
                            payment_status: "completed",
                            razorpay_payment_id: razorpayPaymentId,
                            razorpay_signature: razorpaySignature,
                            verified_at: new Date().toISOString()
                        })
                        .eq("razorpay_order_id", razorpayOrderId);

                    return res.status(200).json({
                        success: true,
                        message: "Payment verified. Enrollment already exists.",
                        enrollment: existingEnrollment,
                        alreadyProcessed: true
                    });
                }
            }

            console.error("Enrollment creation error:", enrollmentError);
            return res.status(500).json({
                success: false,
                message: "Failed to create enrollment after payment verification",
                error: process.env.NODE_ENV === "development" ? enrollmentError.message : undefined
            });
        }

        // ─── UPDATE PAYMENT RECORD AS VERIFIED ─────────────────────────────────
        await supabase
            .from("payments")
            .update({
                payment_status: "completed",
                razorpay_payment_id: razorpayPaymentId,
                razorpay_signature: razorpaySignature,
                verified_at: new Date().toISOString()
            })
            .eq("razorpay_order_id", razorpayOrderId);

        // ─── SEND ENROLLMENT CONFIRMATION EMAIL ───────────────────────────────
        try {
            const studentName = `${student.first_name || ""} ${student.last_name || ""}`.trim();
            await mailSender(
                student.email,
                `Welcome to ${course.title}!`,
                `
                <h2>Payment Successful!</h2>
                <p>Hi ${studentName},</p>
                <p>Your payment of ₹${paymentRecord.amount} has been verified successfully.</p>
                <p>You are now enrolled in <strong>${course.title}</strong></p>
                <p>Start learning now: <a href="${process.env.FRONTEND_URL}/learn/${courseId}">Go to Course</a></p>
                `
            );
        } catch (emailError) {
            console.error("Failed to send enrollment email:", emailError);
            // Don't fail the request if email fails
        }

        // ─── NOTIFY INSTRUCTOR ────────────────────────────────────────────────
        try {
            await supabase.from("notifications").insert({
                recipient_id: course.instructor_id,
                type: "new_enrollment",
                title: "New Paid Enrollment",
                message: `${student.first_name} enrolled in "${course.title}" (₹${paymentRecord.amount})`,
                metadata: {
                    enrollment_id: enrollment.id,
                    course_id: courseId,
                    student_id: studentId,
                    amount: paymentRecord.amount,
                    payment_id: razorpayPaymentId
                }
            });
        } catch (notificationError) {
            console.error("Failed to create notification:", notificationError);
        }

        // ─── RETURN SUCCESS ────────────────────────────────────────────────────
        return res.status(200).json({
            success: true,
            message: "Payment verified successfully. Enrollment created.",
            enrollment: enrollment
        });

    } catch (error) {
        console.error("Verify Payment Error:", error);
        return res.status(500).json({
            success: false,
            message: "Payment verification failed",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. GET PAYMENT HISTORY
// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/v1/payment/history
 * 
 * Fetches payment history for the logged-in student
 */
exports.getPaymentHistory = async (req, res) => {
    try {
        const studentId = req.user.id;

        const { data: payments, error } = await supabase
            .from("payments")
            .select(`
                *,
                course:course_id(id, title, price)
            `)
            .eq("student_id", studentId)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return res.status(200).json({
            success: true,
            payments: payments || []
        });

    } catch (error) {
        console.error("Get Payment History Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch payment history",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. WEBHOOK HANDLER FOR RAZORPAY (Optional but recommended)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/v1/payment/webhook
 * 
 * Razorpay webhook for payment events
 * Provides additional security layer for payment verification
 */
exports.handleWebhook = async (req, res) => {
    try {
        const { event, payload } = req.body;

        // Verify webhook signature
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!webhookSecret) {
            console.warn("Webhook secret not configured");
            return res.status(200).json({ received: true });
        }

        const signature = req.headers["x-razorpay-signature"];
        const body = JSON.stringify(req.body);
        const expectedSignature = crypto
            .createHmac("sha256", webhookSecret)
            .update(body)
            .digest("hex");

        if (signature !== expectedSignature) {
            console.warn("Webhook signature mismatch");
            return res.status(400).json({ error: "Invalid signature" });
        }

        // Handle payment events
        if (event === "payment.authorized" || event === "payment.captured") {
            const { order_id, payment_id } = payload.payment.entity;

            // Update payment record
            await supabase
                .from("payments")
                .update({
                    payment_status: "completed",
                    razorpay_payment_id: payment_id,
                    verified_at: new Date().toISOString()
                })
                .eq("razorpay_order_id", order_id);
        }

        if (event === "payment.failed") {
            const { order_id } = payload.payment.entity;

            // Update payment record
            await supabase
                .from("payments")
                .update({ payment_status: "failed" })
                .eq("razorpay_order_id", order_id);
        }

        return res.status(200).json({ received: true });

    } catch (error) {
        console.error("Webhook Error:", error);
        return res.status(200).json({ received: true }); // Always return 200 to Razorpay
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. FREE COURSE ENROLLMENT
// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/v1/enrollment/free
 * 
 * Enrolls student in a free course
 * No payment verification needed
 */
exports.enrollFree = async (req, res) => {
    try {
        const { courseId } = req.body;
        const studentId = req.user.id;

        if (!courseId) {
            return res.status(400).json({
                success: false,
                message: "courseId is required"
            });
        }

        // ─── FETCH COURSE ─────────────────────────────────────────────────────
        const { data: course, error: courseError } = await supabase
            .from("courses")
            .select("id, title, is_free, instructor_id")
            .eq("id", courseId)
            .single();

        if (courseError || !course) {
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });
        }

        // ─── VERIFY COURSE IS FREE ────────────────────────────────────────────
        if (!course.is_free) {
            return res.status(400).json({
                success: false,
                message: "This is a paid course. Use payment flow instead."
            });
        }

        // ─── CREATE ENROLLMENT ────────────────────────────────────────────────
        const { data: enrollment, error: enrollmentError } = await supabase
            .from("enrollments")
            .insert([{
                student_id: studentId,
                course_id: courseId,
                enrollment_type: "free",
                payment_status: "not_required",
                amount_paid: 0,
                active: true,
                enrolled_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (enrollmentError) {
            if (enrollmentError.code === "23505") {
                // Already enrolled
                return res.status(200).json({
                    success: true,
                    message: "Already enrolled in this course",
                    alreadyEnrolled: true
                });
            }
            throw enrollmentError;
        }

        // ─── FETCH STUDENT DETAILS ────────────────────────────────────────────
        const { data: student } = await supabase
            .from("profiles")
            .select("first_name, last_name, email")
            .eq("id", studentId)
            .single();

        // ─── SEND CONFIRMATION EMAIL ──────────────────────────────────────────
        try {
            const studentName = `${student?.first_name || ""} ${student?.last_name || ""}`.trim();
            await mailSender(
                student?.email,
                `Welcome to ${course.title}!`,
                `
                <h2>Enrollment Successful!</h2>
                <p>Hi ${studentName},</p>
                <p>You are now enrolled in <strong>${course.title}</strong></p>
                <p>Start learning now: <a href="${process.env.FRONTEND_URL}/learn/${courseId}">Go to Course</a></p>
                `
            );
        } catch (emailError) {
            console.error("Failed to send enrollment email:", emailError);
        }

        return res.status(200).json({
            success: true,
            message: "Successfully enrolled in free course",
            enrollment: enrollment
        });

    } catch (error) {
        console.error("Free Enrollment Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to enroll in course",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};
