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
            return res.status(401).json({
                success: false,
                message: "Token is missing",
            });
        }

        // Verify token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            const errorMsg = error?.message || "";
            const isExpired = errorMsg.toLowerCase().includes("jwt expired") || errorMsg.toLowerCase().includes("expired") || error?.status === 401;
            
            return res.status(401).json({
                success: false,
                message: isExpired ? "Token has expired. Please log in again." : "Token is invalid or malformed.",
                error: errorMsg
            });
        }

        // Retrieve account type - prioritize database profiles table as single source of truth!
        let accountType = null;
        
        const { data: profile } = await supabase
            .from("profiles")
            .select("account_type")
            .eq("id", user.id)
            .maybeSingle();
        
        if (profile && profile.account_type) {
            accountType = profile.account_type;
        } else {
            // Fallback to user metadata if database profile is missing
            accountType = user.user_metadata?.accountType;
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

        // Add user info to request
        req.user = {
            id: user.id,
            email: user.email,
            accountType: normalizedAccountType
        };
        
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
        if (role !== "student") {
            return res.status(401).json({
                success: false,
                message: "This is a protected route for Students only",
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

        if (!courseId) {
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
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });
        }

        // 1. Instructors and Admins bypass enrollment check for their courses
        const role = String(req.user?.accountType || "").toLowerCase();
        if (course.instructor_id === userId || role === "admin" || role === "instructor") {
            return next();
        }

        // 2. Free courses are accessible to any authenticated user
        const isFree = course.is_free || Number(course.price) === 0;
        if (isFree) {
            return next();
        }

        // 3. Paid courses require an active enrollment row in database with completed payment status
        const { data: enrollment, error: enrollError } = await supabase
            .from("enrollments")
            .select("*")
            .eq("course_id", course.id)
            .eq("student_id", userId)
            .eq("enrollment_status", "active")
            .maybeSingle();

        if (enrollError || !enrollment) {
            return res.status(403).json({
                success: false,
                message: "Access Denied. You are not actively enrolled in this paid course."
            });
        }

        // Secure Rule: payment_status must be completed (or paid) to prevent bypasses
        const paymentOk = enrollment.enrollment_type === 'free' || 
                          enrollment.payment_status === 'completed' || 
                          enrollment.payment_status === 'paid';
                          
        if (!paymentOk) {
            return res.status(403).json({
                success: false,
                message: "Access Denied. Your payment status for this course is incomplete."
            });
        }

        // Enrollment is verified
        req.enrollment = enrollment;
        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to verify enrollment status",
            error: error.message
        });
    }
};

