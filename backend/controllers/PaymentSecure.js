// ═══════════════════════════════════════════════════════════════════════════════
// SECURE PAYMENT CONTROLLER - SCHEMA-VERIFIED & PRODUCTION READY
// ═══════════════════════════════════════════════════════════════════════════════
//
// payments table columns:
//   id, student_id, course_id, razorpay_order_id (NOT NULL), razorpay_payment_id,
//   razorpay_signature, amount (NOT NULL), currency (NOT NULL), payment_status (NOT NULL),
//   created_at, notes (jsonb), verified_at
//
// enrollments table columns:
//   id, student_id (NOT NULL), course_id, enrolled_at, progress, status,
//   user_id, payment_id, enrollment_status, payment_status, access_expires_at,
//   created_at, progress_percent, completed, active, enrollment_type,
//   last_watched_lecture, transaction_id, razorpay_order_id, razorpay_payment_id,
//   razorpay_signature, amount_paid, updated_at
//
// course_progress table: lesson_id is NOT NULL — do NOT insert on enrollment
// ═══════════════════════════════════════════════════════════════════════════════

const supabase = require("../config/supabase");
const razorpayInstance = require("../config/razorpay");
const crypto = require("crypto");
const mailSender = require("../utils/mailSender");

// ─────────────────────────────────────────────────────────────────────────────
// 1. CREATE RAZORPAY ORDER
// ─────────────────────────────────────────────────────────────────────────────
exports.createOrder = async (req, res) => {
    console.log("\n[createOrder] ══════════════════════════════════");
    console.log("[createOrder] Body:", JSON.stringify(req.body));
    console.log("[createOrder] User:", req.user?.id, "|", req.user?.email);

    try {
        // ─── Accept courseId directly or as first item of courses[] array ─────
        let courseId = req.body.courseId;
        if (!courseId && Array.isArray(req.body.courses) && req.body.courses.length > 0) {
            courseId = req.body.courses[0];
        }
        const amount    = Number(req.body.amount);
        const studentId = req.user.id;

        console.log("[createOrder] courseId:", courseId, "| amount:", amount);

        // ─── VALIDATION ───────────────────────────────────────────────────────
        if (!courseId) {
            return res.status(400).json({ success: false, message: "courseId is required" });
        }
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: "A valid amount > 0 is required" });
        }

        // ─── LOG ENV KEYS ─────────────────────────────────────────────────────
        const key_id     = process.env.RAZORPAY_KEY_ID     || process.env.RAZORPAY_KEY;
        const key_secret = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET;
        console.log("[createOrder] RAZORPAY_KEY_ID  :", key_id     ? key_id.substring(0, 14) + "..." : "❌ MISSING");
        console.log("[createOrder] RAZORPAY_SECRET  :", key_secret ? "✅ loaded"                     : "❌ MISSING");

        if (!key_id || !key_secret) {
            return res.status(500).json({
                success: false,
                message: "Payment gateway credentials are not configured. Contact support."
            });
        }

        // ─── FETCH COURSE ─────────────────────────────────────────────────────
        const { data: course, error: courseError } = await supabase
            .from("courses")
            .select("id, title, price, is_free, instructor_id")
            .eq("id", courseId)
            .single();

        if (courseError || !course) {
            console.error("[createOrder] Course fetch error:", courseError?.message);
            return res.status(404).json({ success: false, message: "Course not found" });
        }
        console.log("[createOrder] Course:", course.title, "| price:", course.price, "| is_free:", course.is_free);

        // ─── GUARD: Free course ───────────────────────────────────────────────
        if (course.is_free || Number(course.price) === 0) {
            return res.status(400).json({
                success: false,
                message: "This is a free course — use free enrollment instead."
            });
        }

        // ─── GUARD: Amount matches course price ───────────────────────────────
        if (Math.abs(Number(course.price) - amount) > 0.01) {
            console.warn("[createOrder] Price mismatch — course:", course.price, "received:", amount);
            return res.status(400).json({
                success: false,
                message: `Amount mismatch. Course price is ₹${course.price}. Please refresh and try again.`
            });
        }

        // ─── GUARD: Already enrolled ──────────────────────────────────────────
        const { data: existing } = await supabase
            .from("course_enrollments")
            .select("id, payment_status")
            .eq("student_id", studentId)
            .eq("course_id", courseId)
            .eq("payment_status", "paid")
            .maybeSingle();

        if (existing?.payment_status === "paid" || existing?.payment_status === "completed") {
            return res.status(400).json({ success: false, message: "You are already enrolled in this course." });
        }

        // ─── BUILD RAZORPAY ORDER ─────────────────────────────────────────────
        const amountInPaise = Math.round(amount * 100);
        if (amountInPaise < 100) {
            return res.status(400).json({ success: false, message: "Amount must be at least ₹1." });
        }

        // receipt ≤ 40 chars (Razorpay hard limit)
        const shortId = courseId.replace(/-/g, "").substring(0, 8);
        const receipt = `r_${shortId}_${Date.now() % 1000000000}`; // max ~20 chars

        const options = {
            amount:   amountInPaise,
            currency: "INR",
            receipt:  receipt,
            notes: {
                studentId,
                courseId,
                courseTitle: course.title.substring(0, 50)
            }
        };

        console.log("[createOrder] Razorpay options:", JSON.stringify(options));

        // ─── CALL RAZORPAY API ────────────────────────────────────────────────
        let order;
        try {
            order = await razorpayInstance.orders.create(options);
            console.log("[createOrder] ✅ Razorpay order created:", order.id, "| status:", order.status);
        } catch (rzpErr) {
            // Log the full Razorpay error so it appears in the backend terminal
            console.error("[createOrder] ❌ Razorpay API error:");
            console.error("   statusCode:", rzpErr.statusCode);
            console.error("   error     :", JSON.stringify(rzpErr.error || rzpErr.message || rzpErr, null, 2));
            return res.status(500).json({
                success: false,
                message: "Failed to initiate Razorpay order",
                error:   rzpErr.error?.description || rzpErr.message || "Razorpay API error"
            });
        }

        // ─── STORE PENDING PAYMENT (only columns that exist in the table) ─────
        const { error: paymentError } = await supabase
            .from("payments")
            .insert([{
                student_id:        studentId,
                course_id:         courseId,
                razorpay_order_id: order.id,   // NOT NULL — must be set
                amount:            amount,      // NOT NULL — must be set
                currency:          "INR",       // NOT NULL — defaults to 'INR'
                payment_status:    "pending"    // NOT NULL — defaults to 'pending'
                // notes & verified_at are nullable — omit here, set on verify
            }]);

        if (paymentError) {
            // Non-fatal — Razorpay order was created, just log and continue
            // NOTE: This may fail due to duplicate order IDs or other DB issues.
            // verifyPayment uses UPSERT so it will still record the payment correctly.
            console.warn("[createOrder] ⚠️  Could not store pending payment row:");
            console.warn("[createOrder]    code:", paymentError.code, "| message:", paymentError.message);
            console.warn("[createOrder]    details:", paymentError.details, "| hint:", paymentError.hint);
            console.warn("[createOrder] ⚠️  Non-fatal — continuing with order response");
        } else {
            console.log("[createOrder] ✅ Pending payment row stored");
        }

        // ─── RETURN ORDER DETAILS ─────────────────────────────────────────────
        return res.status(200).json({
            success:     true,
            orderId:     order.id,
            amount:      order.amount,      // In paise
            currency:    order.currency,
            totalAmount: amount,            // In INR
            message:     "Order created successfully. Complete payment to enroll."
        });

    } catch (error) {
        console.error("[createOrder] ❌ Unexpected error:", error.message);
        console.error(error.stack);
        return res.status(500).json({
            success: false,
            message: "Failed to create payment order",
            error:   process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. VERIFY PAYMENT & CREATE ENROLLMENT
// ─────────────────────────────────────────────────────────────────────────────
exports.verifyPayment = async (req, res) => {
    console.log("\n[verifyPayment] ══════════════════════════════════");
    console.log("[verifyPayment] Initializing Payment Verification Flow");

    try {
        // 1. INPUT VALIDATION
        const razorpayOrderId   = req.body.razorpayOrderId   || req.body.razorpay_order_id;
        const razorpayPaymentId = req.body.razorpayPaymentId || req.body.razorpay_payment_id;
        const razorpaySignature = req.body.razorpaySignature || req.body.razorpay_signature;
        let   courseId          = req.body.courseId;
        if (!courseId && Array.isArray(req.body.courses)) courseId = req.body.courses[0];

        const studentId = req.user.id;

        console.log("[verifyPayment] Received Data -> OrderId:", razorpayOrderId, "| PaymentId:", razorpayPaymentId, "| CourseId:", courseId, "| StudentId:", studentId);

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !courseId) {
            console.error("[verifyPayment] ❌ Validation Error: Missing required fields");
            return res.status(400).json({ success: false, message: "Missing required fields for payment verification.", error: "MISSING_FIELDS" });
        }

        // 2. SIGNATURE VERIFICATION
        const keySecret = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET;
        if (!keySecret) {
            console.error("[verifyPayment] ❌ Configuration Error: RAZORPAY_SECRET is missing");
            return res.status(500).json({ success: false, message: "Server configuration error regarding payment gateway.", error: "MISSING_SECRET" });
        }

        const expectedSig = crypto
            .createHmac("sha256", keySecret)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest("hex");

        if (expectedSig !== razorpaySignature) {
            console.error("[verifyPayment] ❌ Security Error: Signature mismatch");
            // Mark payment as failed if it exists
            await supabase.from("payments").update({ payment_status: "failed" }).eq("razorpay_order_id", razorpayOrderId);
            return res.status(400).json({ success: false, message: "Invalid payment signature. Payment verification failed.", error: "INVALID_SIGNATURE" });
        }
        console.log("[verifyPayment] ✅ Razorpay Signature Verified Successfully");

        // 3. FETCH EXISTING PAYMENT AND PREVENT DUPLICATE PROCESSING
        console.log("[verifyPayment] Fetching payment record for order:", razorpayOrderId);
        const { data: paymentRecord, error: paymentFetchError } = await supabase
            .from("payments")
            .select("*")
            .eq("razorpay_order_id", razorpayOrderId)
            .maybeSingle();

        if (paymentFetchError) {
            console.error("[verifyPayment] ❌ Database Error: Failed to fetch payment record", paymentFetchError);
            return res.status(500).json({ success: false, message: "Could not fetch payment record from database.", error: paymentFetchError.message });
        }

        if (paymentRecord?.payment_status === "completed") {
            console.log("[verifyPayment] ⚠️ Payment already marked as completed. Checking for existing enrollment...");
            const { data: existingEnrollment } = await supabase
                .from("course_enrollments").select("*").eq("student_id", studentId).eq("course_id", courseId).maybeSingle();
            
            if (existingEnrollment) {
                console.log("[verifyPayment] ✅ Existing enrollment found. Returning success early.");
                return res.status(200).json({ success: true, message: "Payment already processed and you are enrolled.", enrollment: existingEnrollment, alreadyProcessed: true });
            }
            console.log("[verifyPayment] ⚠️ Payment completed but enrollment missing. Will proceed to create enrollment.");
        }

        // 4. FETCH COURSE AND STUDENT DETAILS FOR NOTIFICATIONS/ENROLLMENT
        const { data: course, error: courseError } = await supabase.from("courses").select("id, title, instructor_id, price").eq("id", courseId).single();
        if (courseError || !course) {
            console.error("[verifyPayment] ❌ Database Error: Course not found", courseError);
            return res.status(404).json({ success: false, message: "Course not found in database.", error: courseError?.message || "COURSE_NOT_FOUND" });
        }

        const { data: student } = await supabase.from("profiles").select("id, first_name, last_name, email").eq("id", studentId).maybeSingle();

        // 5. UPSERT PAYMENT HISTORY *BEFORE* ENROLLMENT CREATION
        // Using UPSERT (not UPDATE) so even if createOrder's INSERT failed silently,
        // we always have a payment record. onConflict targets the UNIQUE razorpay_order_id.
        console.log("[verifyPayment] Upserting payment record to 'completed'...");
        const { error: paymentUpdateError } = await supabase
            .from("payments")
            .upsert(
                [{
                    student_id:          studentId,
                    course_id:           courseId,
                    razorpay_order_id:   razorpayOrderId,
                    razorpay_payment_id: razorpayPaymentId,
                    razorpay_signature:  razorpaySignature,
                    amount:              course.price || 0,
                    currency:            "INR",
                    payment_status:      "completed",
                    verified_at:         new Date().toISOString()
                }],
                { onConflict: "razorpay_order_id" }
            );

        if (paymentUpdateError) {
            console.error("[verifyPayment] ❌ Failed to upsert payment record:");
            console.error("[verifyPayment]    code:", paymentUpdateError.code);
            console.error("[verifyPayment]    message:", paymentUpdateError.message);
            console.error("[verifyPayment]    details:", paymentUpdateError.details);
            console.error("[verifyPayment]    hint:", paymentUpdateError.hint);
            // NON-FATAL: payment was verified by Razorpay signature — proceed with enrollment
            // The payment was genuinely successful even if DB logging failed
            console.warn("[verifyPayment] ⚠️  Continuing with enrollment despite payment record error");
        } else {
            console.log("[verifyPayment] ✅ Payment record upserted to 'completed'");
        }

        // 6. CREATE COURSE ENROLLMENT
        console.log("[verifyPayment] Creating course enrollment...");
        const { data: enrollment, error: enrollmentError } = await supabase
            .from("course_enrollments")
            .insert([{
                student_id:          studentId,
                course_id:           courseId,
                payment_status:      "paid",
                enrolled_at:         new Date().toISOString(),
                progress:            0,
                progress_percent:    0,
                completed:           false
            }])
            .select()
            .single();

        if (enrollmentError) {
            console.error("[verifyPayment] ❌ Database Error: Enrollment creation failed:", enrollmentError);
            
            // Handle unique constraint violation gracefully
            if (enrollmentError.code === "23505") {
                console.log("[verifyPayment] ⚠️ Duplicate enrollment detected. Fetching existing enrollment...");
                const { data: existing } = await supabase.from("course_enrollments").select("*").eq("student_id", studentId).eq("course_id", courseId).single();
                return res.status(200).json({ success: true, message: "Payment successful. You were already enrolled.", enrollment: existing, alreadyProcessed: true });
            }
            
            return res.status(500).json({ success: false, message: "Payment successful, but failed to create course enrollment. Please contact support.", error: enrollmentError.message });
        }
        console.log("[verifyPayment] ✅ Enrollment successfully created. ID:", enrollment.id);

        // 7. POST-ENROLLMENT ACTIONS (Emails & Notifications)
        // Wrapped in non-fatal try-catch blocks
        try {
            if (student?.email) {
                const name = `${student.first_name || ""} ${student.last_name || ""}`.trim() || "Student";
                await mailSender(
                    student.email,
                    `✅ You're enrolled in ${course.title}!`,
                    `<h2>Payment Successful!</h2><p>Hi ${name},</p><p>You are now enrolled in <strong>${course.title}</strong>.</p><p><a href="${process.env.FRONTEND_URL}/learn/${courseId}">Start Learning →</a></p>`
                );
                console.log("[verifyPayment] ✅ Success email sent to student");
            }
        } catch (emailErr) {
            console.warn("[verifyPayment] ⚠️  Non-fatal Error: Success email failed to send", emailErr.message);
        }

        try {
            if (course.instructor_id) {
                await supabase.from("notifications").insert({
                    recipient_id: course.instructor_id,
                    type:         "new_enrollment",
                    title:        "New Paid Enrollment",
                    message:      `${student?.first_name || "A student"} enrolled in "${course.title}" (₹${paymentRecord?.amount || course.price})`,
                    metadata:     { enrollment_id: enrollment.id, course_id: courseId, student_id: studentId, payment_id: razorpayPaymentId }
                });
                console.log("[verifyPayment] ✅ Notification sent to instructor");
            }
        } catch (notifErr) {
            console.warn("[verifyPayment] ⚠️  Non-fatal Error: Instructor notification failed", notifErr.message);
        }

        console.log("[verifyPayment] 🎉 Payment Verification Flow Completed Successfully\n");
        return res.status(200).json({
            success:    true,
            message:    "Payment verified and enrollment created successfully.",
            enrollment: enrollment
        });

    } catch (error) {
        console.error("[verifyPayment] ❌ CRITICAL UNEXPECTED ERROR:", error);
        return res.status(500).json({ 
            success: false, 
            message: "A critical server error occurred during payment verification.", 
            error: error.message,
            stack: process.env.NODE_ENV === "development" ? error.stack : undefined
        });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. GET PAYMENT HISTORY
// ─────────────────────────────────────────────────────────────────────────────
exports.getPaymentHistory = async (req, res) => {
    try {
        const { data: payments, error } = await supabase
            .from("payments")
            .select("*, course:course_id(id, title, price)")
            .eq("student_id", req.user.id)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return res.status(200).json({ success: true, payments: payments || [] });
    } catch (error) {
        console.error("[getPaymentHistory] Error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to fetch payment history" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. WEBHOOK HANDLER
// ─────────────────────────────────────────────────────────────────────────────
exports.handleWebhook = async (req, res) => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (webhookSecret) {
            const signature = req.headers["x-razorpay-signature"];
            const expected  = crypto.createHmac("sha256", webhookSecret).update(JSON.stringify(req.body)).digest("hex");
            if (signature !== expected) return res.status(400).json({ error: "Invalid webhook signature" });
        }

        const { event, payload } = req.body;
        console.log("[webhook] Event:", event);

        if (event === "payment.authorized" || event === "payment.captured") {
            const { order_id, id: payment_id } = payload.payment.entity;
            await supabase.from("payments").update({ payment_status: "completed", razorpay_payment_id: payment_id, verified_at: new Date().toISOString() }).eq("razorpay_order_id", order_id);
        }
        if (event === "payment.failed") {
            const { order_id } = payload.payment.entity;
            await supabase.from("payments").update({ payment_status: "failed" }).eq("razorpay_order_id", order_id);
        }
        return res.status(200).json({ received: true });
    } catch (error) {
        console.error("[webhook] Error:", error.message);
        return res.status(200).json({ received: true }); // Always 200 to Razorpay
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. FREE COURSE ENROLLMENT
// ─────────────────────────────────────────────────────────────────────────────
exports.enrollFree = async (req, res) => {
    console.log("\n[enrollFree] courseId:", req.body.courseId, "| student:", req.user?.id);

    try {
        const { courseId } = req.body;
        const studentId    = req.user.id;

        if (!courseId) return res.status(400).json({ success: false, message: "courseId is required" });

        const { data: course } = await supabase.from("courses").select("id, title, is_free, price").eq("id", courseId).single();
        if (!course) return res.status(404).json({ success: false, message: "Course not found" });

        if (!course.is_free && Number(course.price) > 0) {
            return res.status(400).json({ success: false, message: "This is a paid course. Use the payment flow." });
        }

        const { data: enrollment, error: enrollErr } = await supabase
            .from("course_enrollments")
            .insert([{
                student_id:          studentId,
                course_id:           courseId,
                payment_status:      "Free",
                enrolled_at:         new Date().toISOString(),
                progress:            0,
                progress_percent:    0,
                completed:           false
            }])
            .select()
            .single();

        if (enrollErr) {
            if (enrollErr.code === "23505") return res.status(200).json({ success: true, message: "Already enrolled.", alreadyEnrolled: true });
            throw enrollErr;
        }

        console.log("[enrollFree] ✅ Enrolled:", studentId, "in:", courseId);
        return res.status(200).json({ success: true, message: "Successfully enrolled in free course.", enrollment });

    } catch (error) {
        console.error("[enrollFree] ❌ Error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to enroll in course", error: process.env.NODE_ENV === "development" ? error.message : undefined });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. CHECK COURSE ENROLLMENT STATUS
// ─────────────────────────────────────────────────────────────────────────────
exports.checkEnrollment = async (req, res) => {
    console.log("[checkEnrollment] courseId:", req.params.courseId, "| student:", req.user?.id);
    try {
        const { courseId } = req.params;
        const studentId = req.user?.id;

        if (!courseId) {
            return res.status(400).json({ success: false, message: "courseId parameter is required" });
        }

        const { data: enrollment, error } = await supabase
            .from("course_enrollments")
            .select("id, payment_status, enrolled_at")
            .eq("student_id", studentId)
            .eq("course_id", courseId)
            .maybeSingle();

        if (error) {
            console.error("[checkEnrollment] Error:", error.message);
            return res.status(500).json({ success: false, message: "Failed to check enrollment" });
        }

        const isEnrolled = !!enrollment && (enrollment.payment_status === "paid" || enrollment.payment_status === "Free" || enrollment.payment_status === "completed");

        return res.status(200).json({
            success: true,
            isEnrolled,
            enrolled: isEnrolled,
            data: enrollment || null
        });
    } catch (error) {
        console.error("[checkEnrollment] ❌ Unexpected error:", error.message);
        return res.status(500).json({ success: false, message: "Unexpected error checking enrollment" });
    }
};

