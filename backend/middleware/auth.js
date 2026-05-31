const supabase = require("../config/supabase");

// Authentication middleware using Supabase Auth
exports.auth = async (req, res, next) => {
    try {
        let token = req.cookies?.token || req.body?.token;

        if (!token) {
            const authHeader = req.header("Authorization");
            if (authHeader) {
                if (authHeader.toLowerCase().startsWith("bearer ")) {
                    token = authHeader.substring(7).trim();
                } else {
                    token = authHeader.trim(); // fallback if Bearer prefix is missing
                }
            }
        }

        if (!token) {
            console.warn("[auth] No token provided in request");
            return res.status(401).json({
                success: false,
                message: "Token is missing",
                error: "NO_TOKEN"
            });
        }

        console.log("[auth] Validating token...");

        // Verify token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            const errorMsg = error?.message || "";
            const isExpired = errorMsg.toLowerCase().includes("jwt expired") || errorMsg.toLowerCase().includes("expired") || error?.status === 401;
            
            console.warn("[auth] Token validation failed:", {
                error: errorMsg,
                isExpired,
                userId: user?.id
            });
            
            return res.status(401).json({
                success: false,
                message: isExpired ? "Token has expired. Please log in again." : "Token is invalid or malformed.",
                error: errorMsg,
                errorCode: isExpired ? "TOKEN_EXPIRED" : "INVALID_TOKEN"
            });
        }

        console.log("[auth] Token valid for user:", user.id);

        // Retrieve account type - prioritize database profiles table as single source of truth!
        let accountType = null;
        
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("account_type")
            .eq("id", user.id)
            .maybeSingle();
        
        if (profileError) {
            console.warn("[auth] Error fetching profile:", profileError.message);
        }
        
        if (profile && profile.account_type) {
            accountType = profile.account_type;
            console.log("[auth] Account type from database:", accountType);
        } else {
            // Fallback to user metadata if database profile is missing
            accountType = user.user_metadata?.accountType;
            console.log("[auth] Account type from metadata:", accountType);
        }

        // Normalize accountType to exact capitalization expected by role middlewares
        let normalizedAccountType = "Student";
        if (accountType) {
            const lower = accountType.toLowerCase();
            if (lower === "instructor" || lower === "teacher") {
                normalizedAccountType = "Instructor";
            } else if (lower === "admin") {
                normalizedAccountType = "Admin";
            } else {
                normalizedAccountType = "Student";
            }
        }

        console.log("[auth] Normalized account type:", normalizedAccountType);

        // Add user info to request
        req.user = {
            id: user.id,
            email: user.email,
            accountType: normalizedAccountType
        };
        
        console.log("[auth] ✅ Authentication successful for:", user.email);
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Something went wrong while validating the token",
        });
    }
};

// isStudent middleware
exports.isStudent = async (req, res, next) => {
    try {
        const role = String(req.user?.accountType || "").toLowerCase();
        console.log("[isStudent] Checking role:", role, "Expected: student");
        
        if (role !== "student") {
            console.warn("[isStudent] Access denied - not a student");
            return res.status(403).json({
                success: false,
                message: "This is a protected route for Students only",
                error: "INSUFFICIENT_ROLE"
            });
        }
        console.log("[isStudent] ✅ Student role verified");
        next();
    } catch (error) {
        console.error("[isStudent] Error:", error);
        return res.status(500).json({
            success: false,
            message: "User role cannot be verified",
            error: error.message
        });
    }
};

// isInstructor middleware
exports.isInstructor = async (req, res, next) => {
    try {
        const role = String(req.user?.accountType || "").toLowerCase();
        if (role !== "instructor" && role !== "teacher") {
            return res.status(401).json({
                success: false,
                message: "This is a protected route for Instructors only",
            });
        }
        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "User role cannot be verified",
        });
    }
};

// isAdmin middleware
exports.isAdmin = async (req, res, next) => {
    try {
        const role = String(req.user?.accountType || "").toLowerCase();
        if (role !== "admin") {
            return res.status(401).json({
                success: false,
                message: "This is a protected route for Admins only",
            });
        }
        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "User role cannot be verified",
        });
    }
};

// verifyEnrollment middleware (Checks if user has active enrollment or course is free)
exports.verifyEnrollment = async (req, res, next) => {
    try {
        const courseId = req.params.courseId || req.body.courseId || req.query.courseId;
        const userId = req.user.id;

        console.log("[verifyEnrollment] Checking access for:", {
            courseId,
            userId,
            userRole: req.user?.accountType
        });

        if (!courseId) {
            console.warn("[verifyEnrollment] No course ID provided");
            return res.status(400).json({
                success: false,
                message: "Course ID is required"
            });
        }

        // Fetch course pricing details & instructor dynamically checking if UUID or slug
        const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(courseId);
        
        let query = supabase
            .from("courses")
            .select("id, is_free, price, instructor_id");
            
        if (isUUID) {
            query = query.eq("id", courseId);
        } else {
            query = query.eq("slug", courseId);
        }

        const { data: course, error: courseError } = await query.maybeSingle();

        if (courseError || !course) {
            console.warn("[verifyEnrollment] Course not found:", courseId);
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });
        }

        console.log("[verifyEnrollment] Course found:", {
            courseId: course.id,
            isFree: course.is_free,
            price: course.price,
            instructorId: course.instructor_id
        });

        // 1. Instructors and Admins bypass enrollment check for their courses
        const role = String(req.user?.accountType || "").toLowerCase();
        if (course.instructor_id === userId || role === "admin" || role === "instructor") {
            console.log("[verifyEnrollment] ✅ Access granted - user is instructor/admin");
            return next();
        }

        // 2. Free courses are accessible to any authenticated user
        const isFree = course.is_free || Number(course.price) === 0;
        if (isFree) {
            console.log("[verifyEnrollment] ✅ Access granted - course is free");
            return next();
        }

        // 3. Paid courses require an active enrollment row in database with completed payment status
        console.log("[verifyEnrollment] Checking enrollment for paid course...");
        
        const { data: enrollment, error: enrollError } = await supabase
            .from("course_enrollments")
            .select("*")
            .eq("course_id", course.id)
            .eq("student_id", userId)
            .maybeSingle();

        if (enrollError) {
            console.error("[verifyEnrollment] Error fetching enrollment:", enrollError);
        }

        if (!enrollment) {
            console.warn("[verifyEnrollment] ❌ No active enrollment found for paid course");
            return res.status(403).json({
                success: false,
                message: "Access Denied. You are not actively enrolled in this paid course."
            });
        }

        console.log("[verifyEnrollment] Enrollment found:", {
            enrollmentId: enrollment.id,
            enrollmentType: enrollment.enrollment_type,
            paymentStatus: enrollment.payment_status,
            active: enrollment.active
        });

        // Secure Rule: payment_status must be completed (or paid) to prevent bypasses
        const paymentOk = enrollment.enrollment_type === 'free' || 
                          enrollment.payment_status === 'completed' || 
                          enrollment.payment_status === 'paid';
                          
        if (!paymentOk) {
            console.warn("[verifyEnrollment] ❌ Payment not completed:", enrollment.payment_status);
            return res.status(403).json({
                success: false,
                message: "Access Denied. Your payment status for this course is incomplete."
            });
        }

        // Enrollment is verified
        console.log("[verifyEnrollment] ✅ Access granted - enrollment verified");
        req.enrollment = enrollment;
        next();
    } catch (error) {
        console.error("[verifyEnrollment] ❌ Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to verify enrollment status",
            error: error.message
        });
    }
};

