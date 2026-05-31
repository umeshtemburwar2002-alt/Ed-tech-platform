const supabase = require("../config/supabase");
const { uploadImageToCloudinary } = require("../utils/imageUploader");
const { convertSecondsToDuration } = require("../utils/secToDuration");
const { sanitizeArray } = require("../utils/arrayUtils");

// Create Course
exports.createCourse = async (req, res) => {
    try {
        const {
            courseName,
            courseDescription,
            whatYouWillLearn,
            price,
            tag: _tag,
            category,
            status,
            instructions: _instructions,
        } = req.body;

        const thumbnail = req.files.thumbnailImage;
        const tag = sanitizeArray(_tag);
        const instructions = sanitizeArray(_instructions);
        const whatYouWillLearnSanitized = sanitizeArray(whatYouWillLearn);

        console.log("Course create payload sanitized:", {
            title: courseName,
            description: courseDescription,
            tags: tag,
            instructions: instructions,
            what_you_will_learn: whatYouWillLearnSanitized
        });

        if (!courseName || !courseDescription || !price || !tag.length || !thumbnail || !category || !instructions.length) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        const instructorId = req.user.id;

        // Upload to Cloudinary (Keeping Cloudinary for now, but can switch to Supabase Storage)
        const thumbnailImage = await uploadImageToCloudinary(thumbnail, process.env.FOLDER_NAME);

        // Insert course into Supabase with title/description (matches user's live database)
        const { data: newCourse, error } = await supabase
            .from('courses')
            .insert([{
                title: courseName,
                description: courseDescription,
                instructor_id: instructorId,
                what_you_will_learn: whatYouWillLearnSanitized,
                price: Number(price),
                tags: tag,
                category_id: category,
                thumbnail: thumbnailImage.secure_url,
                status: status || 'draft',
                instructions: instructions,
            }])
            .select()
            .single();

        if (error) throw error;

        return res.status(200).json({
            success: true,
            message: "Course created successfully",
            data: newCourse,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Failed to create course",
            error: error.message,
        });
    }
};

// Get all courses
exports.getAllCourses = async (req, res) => {
    try {
        const { data: allCourses, error } = await supabase
            .from('courses')
            .select('*, instructor:instructor_id(first_name, last_name, image, avatar_url)')
            .eq('status', 'published'); // lowercase to match constraint

        if (error) throw error;

        return res.status(200).json({
            success: true,
            message: "Data for all courses fetched successfully",
            data: allCourses,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Cannot fetch course data",
            error: error.message,
        });
    }
};

// Get course details
// Get course details (resolving blank course content and outcomes dynamically)
exports.getCourseDetails = async (req, res) => {
    try {
        const { courseId } = req.body;
        if (!courseId) {
            return res.status(400).json({ success: false, message: "courseId is required" });
        }

        const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(courseId);
        
        let query = supabase
            .from('courses')
            .select(`
                *,
                instructor:instructor_id(*),
                category:category_id(*)
            `);

        if (isUUID) {
            query = query.eq('id', courseId);
        } else {
            query = query.eq('slug', courseId);
        }

        const { data: course, error } = await query.single();
        if (error || !course) throw error || new Error("Course not found");

        // Fetch course sections using resolved course UUID
        const { data: sectionsData, error: sectionsError } = await supabase
            .from('course_sections')
            .select('*')
            .eq('course_id', course.id)
            .order('position', { ascending: true });

        if (sectionsError) throw sectionsError;

        // Fetch course lessons using resolved course UUID
        const { data: lessonsData, error: lessonsError } = await supabase
            .from('course_lessons')
            .select('*')
            .eq('course_id', course.id)
            .order('position', { ascending: true });

        if (lessonsError) throw lessonsError;

        // Map lessons to sections to preserve frontend accordion format
        const formattedSections = (sectionsData || []).map(section => ({
            ...section,
            section_name: section.title,
            sub_sections: (lessonsData || [])
                .filter(lesson => lesson.section_id === section.id)
                .map(lesson => ({
                    ...lesson,
                    time_duration: lesson.duration_seconds ? `${Math.round(lesson.duration_seconds / 60)} min` : "5 min"
                }))
        }));

        course.sections = formattedSections;

        // Populate outcomes/requirements fallback structures
        course.course_name = course.title;
        course.course_description = course.description;
        course.enrolled_students_count = course.enrollment_count || 0;

        // Calculate total duration
        let totalDuration = course.duration || "0m";

        return res.status(200).json({
            success: true,
            message: "Course details fetched successfully",
            data: {
                courseDetails: course,
                totalDuration,
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Get Instructor Courses
exports.getInstructorCourses = async (req, res) => {
    try {
        const instructorId = req.user.id;
        const { data: courses, error } = await supabase
            .from('courses')
            .select('*')
            .eq('instructor_id', instructorId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.status(200).json({
            success: true,
            data: courses,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to retrieve instructor courses",
            error: error.message,
        });
    }
};

// Delete Course
exports.deleteCourse = async (req, res) => {
    try {
        const { courseId } = req.body;
        const { error } = await supabase
            .from('courses')
            .delete()
            .eq('id', courseId);

        if (error) throw error;

        return res.status(200).json({
            success: true,
            message: "Course deleted successfully",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

// Edit Course (instructor only — req.user set by auth middleware)
exports.editCourse = async (req, res) => {
    try {
        const { courseId, ...updates } = req.body;
        if (!courseId) {
            return res.status(400).json({ success: false, message: "courseId is required" });
        }

        // Map camelCase fields to snake_case columns (uses title/description for user's live database)
        const patch = {};
        if (updates.courseName)        patch.title              = updates.courseName;
        if (updates.courseDescription) patch.description        = updates.courseDescription;
        if (updates.price !== undefined) patch.price            = Number(updates.price);
        if (updates.whatYouWillLearn)  patch.what_you_will_learn = sanitizeArray(updates.whatYouWillLearn);
        if (updates.tag)               patch.tags               = sanitizeArray(updates.tag);
        if (updates.category)          patch.category_id        = updates.category;
        if (updates.status)            patch.status             = updates.status; // "Draft" or "Published" (capitalized)
        if (updates.instructions)      patch.instructions       = sanitizeArray(updates.instructions);

        // Handle optional thumbnail upload
        if (req.files?.thumbnailImage) {
            const { uploadImageToCloudinary } = require("../utils/imageUploader");
            const img = await uploadImageToCloudinary(req.files.thumbnailImage, process.env.FOLDER_NAME);
            patch.thumbnail = img.secure_url;
        }

        patch.updated_at = new Date().toISOString();

        const { data: updatedCourse, error } = await supabase
            .from("courses")
            .update(patch)
            .eq("id", courseId)
            .eq("instructor_id", req.user.id) // prevent editing another instructor's course
            .select()
            .single();

        if (error) throw error;

        return res.status(200).json({
            success: true,
            message: "Course updated successfully",
            data: updatedCourse,
        });
    } catch (error) {
        console.error("editCourse error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update course",
            error: error.message,
        });
    }
};

// Get Full Course Details (authenticated — same deep query as getCourseDetails)
exports.getFullCourseDetails = async (req, res) => {
    try {
        const { courseId } = req.body;
        if (!courseId) {
            return res.status(400).json({ success: false, message: "courseId is required" });
        }

        const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(courseId);
        
        let query = supabase
            .from("courses")
            .select(`
                *,
                instructor:instructor_id(*),
                category:category_id(*)
            `);

        if (isUUID) {
            query = query.eq("id", courseId);
        } else {
            query = query.eq("slug", courseId);
        }

        const { data: course, error } = await query.single();
        if (error || !course) throw error || new Error("Course not found");

        // Fetch course sections using resolved course UUID
        const { data: sectionsData, error: sectionsError } = await supabase
            .from('course_sections')
            .select('*')
            .eq('course_id', course.id)
            .order('position', { ascending: true });

        if (sectionsError) throw sectionsError;

        // Fetch course lessons using resolved course UUID
        const { data: lessonsData, error: lessonsError } = await supabase
            .from('course_lessons')
            .select('*')
            .eq('course_id', course.id)
            .order('position', { ascending: true });

        if (lessonsError) throw lessonsError;

        // Map lessons to sections to preserve frontend accordion format
        const formattedSections = (sectionsData || []).map(section => ({
            ...section,
            section_name: section.title,
            sub_sections: (lessonsData || [])
                .filter(lesson => lesson.section_id === section.id)
                .map(lesson => ({
                    ...lesson,
                    time_duration: lesson.duration_seconds ? `${Math.round(lesson.duration_seconds / 60)} min` : "5 min"
                }))
        }));

        course.sections = formattedSections;

        // Map titles and details
        course.course_name = course.title;
        course.course_description = course.description;
        course.enrolled_students_count = course.enrollment_count || 0;

        return res.status(200).json({
            success: true,
            message: "Course details fetched successfully",
            data: { courseDetails: course },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// ============================================================================
// ENROLLMENT & ACCESS MANAGEMENT CONTROLLERS
// ============================================================================

// Enroll Student in FREE Course
exports.enrollFreeCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const studentId = req.user.id;
        console.log("[enrollFreeCourse] Received request for courseId:", courseId, "studentId:", studentId); 
        
        // Resolve courseId from slug if not UUID
        const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(courseId);
        let resolvedCourseId = courseId;
        if (!isUUID) {
            const { data: course } = await supabase
                .from('courses')
                .select('id')
                .eq('slug', courseId)
                .maybeSingle();
            if (!course) {
                return res.status(404).json({ success: false, message: "Course not found" });
            }
            resolvedCourseId = course.id;
        }

        // 1. Check if already enrolled
        const { data: existing } = await supabase
            .from('course_enrollments')
            .select('*')
            .eq('course_id', resolvedCourseId)
            .eq('student_id', studentId)
            .maybeSingle();

        if (existing) {
            return res.status(200).json({
                success: true,
                message: "You are already enrolled in this course.",
                data: existing
            });
        }

        // 2. Fetch course details (needed for NOT NULL columns)
        const { data: courseData, error: courseError } = await supabase
            .from('courses')
            .select('id, title, instructor_id')
            .eq('id', resolvedCourseId)
            .maybeSingle();

        if (courseError || !courseData) {
            return res.status(404).json({ success: false, message: "Course not found" });
        }

        // 3. Fetch student profile (needed for NOT NULL columns)
        const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email, full_name')
            .eq('id', studentId)
            .maybeSingle();

        const studentName = profile?.full_name || 
            `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 
            req.user.email || 'Student';
        const studentEmail = profile?.email || req.user.email || '';

        // 4. Insert active free enrollment with all required NOT NULL fields
        const { data: enrollment, error } = await supabase
            .from('course_enrollments')
            .insert([
                {
                    student_id: studentId,
                    course_id: resolvedCourseId,
                    payment_status: 'Free',
                    enrolled_at: new Date().toISOString(),
                    progress: 0,
                    completed: false,
                    student_name: studentName,
                    student_email: studentEmail,
                    course_name: courseData.title,
                    instructor_id: courseData.instructor_id
                }
            ])
            .select()
            .single();

        if (error) throw error;

        return res.status(201).json({
            success: true,
            message: "Enrolled in free course successfully!",
            data: enrollment
        });
    } catch (error) {
        console.error("[enrollFreeCourse] Error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to process free course enrollment",
            error: error.message
        });
    }
};


// Enroll Student in PAID Course (Simulates Checkout Flow)
exports.enrollPaidCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const studentId = req.user.id;

        // Resolve courseId from slug if not UUID
        const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(courseId);
        let resolvedCourseId = courseId;
        if (!isUUID) {
            const { data: course } = await supabase
                .from('courses')
                .select('id')
                .eq('slug', courseId)
                .maybeSingle();
            if (!course) {
                return res.status(404).json({ success: false, message: "Course not found" });
            }
            resolvedCourseId = course.id;
        }

        // 1. Check if already enrolled
        const { data: existing, error: existingError } = await supabase
            .from('course_enrollments')
            .select('*')
            .eq('course_id', resolvedCourseId)
            .eq('student_id', studentId)
            .maybeSingle();
        if (existingError) throw existingError;

        if (existing) {
            return res.status(200).json({
                success: true,
                message: "You are already enrolled in this course.",
                data: existing
            });
        }

        // 2. Fetch course details (needed for NOT NULL columns)
        const { data: courseData, error: courseError } = await supabase
            .from('courses')
            .select('id, title, instructor_id')
            .eq('id', resolvedCourseId)
            .maybeSingle();

        if (courseError || !courseData) {
            return res.status(404).json({ success: false, message: "Course not found" });
        }

        // 3. Fetch student profile (needed for NOT NULL columns)
        const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email, full_name')
            .eq('id', studentId)
            .maybeSingle();

        const studentName = profile?.full_name || 
            `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 
            req.user.email || 'Student';
        const studentEmail = profile?.email || req.user.email || '';

        // 4. Simulate payment validation and activate enrollment
        const { data: enrollment, error } = await supabase
            .from('course_enrollments')
            .insert([
                {
                    student_id: studentId,
                    course_id: resolvedCourseId,
                    payment_status: 'paid',
                    enrolled_at: new Date().toISOString(),
                    progress: 0,
                    completed: false,
                    student_name: studentName,
                    student_email: studentEmail,
                    course_name: courseData.title,
                    instructor_id: courseData.instructor_id
                }
            ]).select()
            .single();

        if (error) throw error;

        return res.status(200).json({
            success: true,
            message: "Payment authorized and enrollment successfully activated!",
            data: enrollment
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to process paid course enrollment",
            error: error.message
        });
    }
};

// Check Student Enrollment Status
exports.checkCourseEnrollment = async (req, res) => {
    try {
        const { courseId } = req.params;
        const studentId = req.user.id;

        // Resolve courseId from slug if not UUID
        const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(courseId);
        let resolvedCourseId = courseId;
        if (!isUUID) {
            const { data: course } = await supabase
                .from('courses')
                .select('id')
                .eq('slug', courseId)
                .maybeSingle();
            if (!course) {
                return res.status(404).json({ success: false, message: "Course not found" });
            }
            resolvedCourseId = course.id;
        }

        // Check enrollment status
        const { data: enrollment, error } = await supabase
            .from('course_enrollments')
            .select('*')
            .eq('course_id', resolvedCourseId)
            .eq('student_id', studentId)
            .maybeSingle();
        if (error) throw error;

        const isEnrolled = !!enrollment && (enrollment.payment_status === 'paid' || enrollment.payment_status === 'Free' || enrollment.payment_status === 'completed');

        return res.status(200).json({
            success: true,
            enrolled: isEnrolled,
            data: enrollment || null
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to check enrollment status",
            error: error.message
        });
    }
};

// Get Full Gated Syllabus for Enrolled Students (Features secure masking checks!)
exports.getCourseSyllabus = async (req, res) => {
    try {
        const { courseId } = req.params;
        const studentId = req.user.id;

        // Resolve courseId from slug if not UUID
        const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(courseId);
        let resolvedCourseId = courseId;
        if (!isUUID) {
            const { data: course } = await supabase
                .from('courses')
                .select('id')
                .eq('slug', courseId)
                .maybeSingle();
            if (!course) {
                return res.status(404).json({ success: false, message: "Course not found" });
            }
            resolvedCourseId = course.id;
        }

        // Fetch course details
        const { data: course, error: courseError } = await supabase
            .from('courses')
            .select('*, instructor:instructor_id(first_name, last_name, avatar_url, image, about)')
            .eq('id', resolvedCourseId)
            .single();

        if (courseError || !course) {
            return res.status(404).json({ success: false, message: "Course details not found" });
        }

        // Fetch curriculum sections
        const { data: sections, error: secError } = await supabase
            .from('course_sections')
            .select('*')
            .eq('course_id', resolvedCourseId)
            .order('position', { ascending: true });

        if (secError) throw secError;

        // Fetch lessons (query secure curtain view to resolve gated YouTube embeds!)
        const { data: lessons, error: lesError } = await supabase
            .from('lessons_secure_view')
            .select('*')
            .eq('course_id', resolvedCourseId)
            .order('position', { ascending: true });

        if (lesError) throw lesError;

        // Fetch student's progress checklist state
        const { data: progress } = await supabase
            .from('course_progress')
            .select('lesson_id, completed')
            .eq('course_id', resolvedCourseId)
            .eq('student_id', studentId);

        const completedIds = (progress || []).filter(p => p.completed).map(p => p.lesson_id);

        // Format curriculum array
        const formattedSections = (sections || []).map(section => ({
            ...section,
            section_name: section.title,
            sub_sections: (lessons || [])
                .filter(lesson => lesson.section_id === section.id)
                .map(lesson => ({
                    ...lesson,
                    completed: completedIds.includes(lesson.id),
                    time_duration: lesson.duration_seconds ? `${Math.round(lesson.duration_seconds / 60)} min` : "5 min"
                }))
        }));

        course.course_name = course.title;
        course.course_description = course.description;
        course.enrolled_students_count = course.enrollment_count || 0;

        return res.status(200).json({
            success: true,
            data: {
                courseDetails: course,
                sections: formattedSections,
                completedLessons: completedIds
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to compile secured course syllabus",
            error: error.message
        });
    }
};

// Update and Sync Lecture Progress Checklist Checkbox
exports.updateLectureProgress = async (req, res) => {
    try {
        const { courseId, lessonId, completed, watchedSeconds } = req.body;
        const studentId = req.user.id;

        if (!courseId || !lessonId) {
            return res.status(400).json({ success: false, message: "courseId and lessonId are required" });
        }

        const { data: progress, error } = await supabase
            .from('course_progress')
            .upsert({
                student_id: studentId,
                course_id: courseId,
                lesson_id: lessonId,
                completed: !!completed,
                watched_seconds: Number(watchedSeconds || 0),
                completion_percentage: completed ? 100 : 0,
                last_watched_at: new Date().toISOString()
            }, { onConflict: 'student_id,lesson_id' })
            .select()
            .single();

        if (error) throw error;

        return res.status(200).json({
            success: true,
            message: "Progress synchronized successfully!",
            data: progress
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to sync checklist progress",
            error: error.message
        });
    }
};

// Get Enrolled Courses Specific to Student
exports.getStudentEnrolledCourses = async (req, res) => {
    try {
        const studentId = req.user.id;

        const { data: enrollments, error } = await supabase
            .from('course_enrollments')
            .select('*, course:course_id(*)')
            .eq('student_id', studentId)
            .eq('payment_status', 'paid');
        if (error) throw error;



        // Clean null entries
        const formatted = (enrollments || [])
            .filter(e => e.course)
            .map(e => ({
                enrollmentId: e.id,
                enrolledAt: e.enrolled_at,
                ...e.course,
                course_name: e.course.title,
                course_description: e.course.description
            }));

        return res.status(200).json({
            success: true,
            data: formatted
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch enrolled courses",
            error: error.message
        });
    }
};

// Retrieve Student's Continue Learning Bookmark
exports.getStudentContinueLearning = async (req, res) => {
    try {
        const studentId = req.user.id;

        const { data: lastWatched, error } = await supabase
            .from('course_progress')
            .select(`
                *,
                course:course_id(id, title, thumbnail, final_thumbnail_url),
                lesson:lesson_id(id, title, position)
            `)
            .eq('student_id', studentId)
            .order('last_watched_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;

        return res.status(200).json({
            success: true,
            data: lastWatched || null
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch continue learning bookmarks",
            error: error.message
        });
    }
};


