const supabase = require("../config/supabase");
const mailSender = require("../utils/mailSender");
const { courseEnrollmentEmail } = require("../utils/courseEnrollmentEmail");
const razorpayInstance = require("../config/razorpay");
const crypto = require("crypto");

// 1. Create Order API
exports.capturePayment = async (req, res) => {
    try {
        const { courses } = req.body;
        const userId = req.user.id;

        if (!courses || courses.length === 0) {
            return res.status(400).json({ success: false, message: "Please provide at least one course ID" });
        }

        let totalAmount = 0;
        const courseDetailsList = [];

        // Validate all courses exist and calculate amount
        for (const course_id of courses) {
            const { data: course, error } = await supabase
                .from("courses")
                .select("*")
                .eq("id", course_id)
                .maybeSingle();

            if (error || !course) {
                return res.status(404).json({ success: false, message: `Could not find course: ${course_id}` });
            }

            // Check if student is already actively enrolled
            const { data: existingEnrollment } = await supabase
                .from("enrollments")
                .select("*")
                .eq("student_id", userId)
                .eq("course_id", course_id)
                .eq("enrollment_status", "active")
                .maybeSingle();

            if (existingEnrollment) {
                return res.status(400).json({ success: false, message: `You are already enrolled in: ${course.title}` });
            }

            totalAmount += Number(course.price);
            courseDetailsList.push(course);
        }

        // Convert totalAmount to Paise (Cents equivalent) for Razorpay
        const amountInPaise = Math.round(totalAmount * 100);

        if (amountInPaise < 100) {
            return res.status(400).json({ success: false, message: "Amount must be at least 100 paise (1 INR)" });
        }

        // Create Razorpay Order
        const options = {
            amount: amountInPaise,
            currency: "INR",
            receipt: "rec_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
            notes: {
                studentId: userId,
                courses: courses.join(",")
            }
        };

        const order = await razorpayInstance.orders.create(options);

        // Store pending payment in our payments table
        for (const course of courseDetailsList) {
            const { error: paymentError } = await supabase
                .from("payments")
                .insert([{
                    student_id: userId,
                    course_id: course.id,
                    razorpay_order_id: order.id,
                    amount: Number(course.price),
                    currency: "INR",
                    payment_status: "pending"
                }]);

            if (paymentError) {
                console.error("Failed to insert pending payment log:", paymentError);
            }
        }

        return res.status(200).json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            totalAmount: totalAmount // Return standard INR format as well
        });

    } catch (error) {
        console.error("Razorpay Order Creation Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to initiate Razorpay order",
            error: error.message
        });
    }
};

// 2. Verify Payment API
exports.verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            courses
        } = req.body;

        const userId = req.user.id;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !courses) {
            return res.status(400).json({ success: false, message: "Missing required payment fields for verification" });
        }

        // HMAC verification
        const text = razorpay_order_id + "|" + razorpay_payment_id;
        const secret = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET;
        const generated_signature = crypto
            .createHmac("sha256", secret)
            .update(text.toString())
            .digest("hex");

        if (generated_signature !== razorpay_signature) {
            // Update transaction logs to failed
            await supabase
                .from("payments")
                .update({ payment_status: "failed", razorpay_payment_id, razorpay_signature })
                .eq("razorpay_order_id", razorpay_order_id);

            return res.status(400).json({ success: false, message: "Payment verification failed. Signature mismatch." });
        }

        // Update payment transaction logs to success
        await supabase
            .from("payments")
            .update({ payment_status: "success", razorpay_payment_id, razorpay_signature })
            .eq("razorpay_order_id", razorpay_order_id);

        // Enroll Student & Sync Continue Learning
        await enrollStudents(courses, userId, razorpay_payment_id);

        return res.status(200).json({
            success: true,
            message: "Payment authorized and enrollment successfully activated!"
        });

    } catch (error) {
        console.error("Payment Verification Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to verify transaction signature",
            error: error.message
        });
    }
};

// 3. Send Payment Success Email API
exports.sendPaymentSuccessEmail = async (req, res) => {
    try {
        const { orderId, paymentId, amount } = req.body;
        const userId = req.user.id;

        if (!orderId || !paymentId || !amount) {
            return res.status(400).json({ success: false, message: "Please provide orderId, paymentId and amount details" });
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("email, first_name")
            .eq("id", userId)
            .single();

        if (profile) {
            await mailSender(
                profile.email,
                "Payment Success Confirmation - EdTech Platform",
                `Dear ${profile.first_name || "Student"},\n\nWe have successfully received your payment of INR ${amount / 100} for Order ID: ${orderId}.\nYour Transaction ID is ${paymentId}.\n\nEnjoy learning!\nBest regards,\nEdTech Platform Team`
            );
        }

        return res.status(200).json({ success: true, message: "Receipt confirmation email sent successfully" });

    } catch (error) {
        console.error("Receipt Mail Sender Error:", error);
        return res.status(500).json({ success: false, message: "Could not dispatch success receipt email" });
    }
};

// 4. Get Payment History API
exports.getPaymentHistory = async (req, res) => {
    try {
        const studentId = req.user.id;

        // Fetch success payments and left-join course titles and pricing
        const { data: payments, error } = await supabase
            .from("payments")
            .select(`
                *,
                course:course_id(id, title, thumbnail, price)
            `)
            .eq("student_id", studentId)
            .eq("payment_status", "success")
            .order("created_at", { ascending: false });

        if (error) throw error;

        return res.status(200).json({
            success: true,
            data: payments || []
        });

    } catch (error) {
        console.error("Get Payment History Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve transaction history log",
            error: error.message
        });
    }
};

// Private Helper to Enroll Students
const enrollStudents = async (courses, userId, paymentId) => {
    for (const courseId of courses) {
        // Create active paid enrollment in legacy enrollments table
        const { error: enrollError } = await supabase
            .from("enrollments")
            .insert([{
                student_id: userId,
                user_id: userId, // Keep user_id populated as well for safety
                course_id: courseId,
                enrollment_status: "active",
                payment_status: "paid",
                payment_id: paymentId,
                transaction_id: paymentId,
                enrollment_type: "paid",
                active: true,
                enrolled_at: new Date().toISOString()
            }]);

        if (enrollError) throw enrollError;

        // Create active paid enrollment in new course_enrollments table
        const { error: courseEnrollmentError } = await supabase
            .from("course_enrollments")
            .insert([{
                student_id: userId,
                course_id: courseId,
                payment_status: "paid",
                enrolled_at: new Date().toISOString(),
                progress: 0,
                progress_percent: 0,
                completed: false
            }]);

        if (courseEnrollmentError) {
            console.error("course_enrollments table insert skipped/failed:", courseEnrollmentError.message);
        }

        // Create or reset course player progress
        const { error: progressError } = await supabase
            .from("course_progress")
            .insert([{
                student_id: userId,
                course_id: courseId,
                completed: false,
                created_at: new Date().toISOString()
            }]);

        if (progressError) {
            console.error("Progress table mapping skipped/failed:", progressError.message);
        }

        // Send confirmation email
        const { data: course } = await supabase.from("courses").select("title").eq("id", courseId).single();
        const { data: profile } = await supabase.from("profiles").select("first_name, email").eq("id", userId).single();

        if (course && profile) {
            await mailSender(
                profile.email,
                `Welcome Aboard! Successfully Enrolled in ${course.title}`,
                courseEnrollmentEmail(course.title, `${profile.first_name || "Student"}`)
            );
        }
    }
};
