const express = require("express");
const router = express.Router();

// Course Controllers
const {
    createCourse,
    getAllCourses,
    getCourseDetails,
    getFullCourseDetails,
    editCourse,
    getInstructorCourses,
    deleteCourse,
    enrollFreeCourse,
    enrollPaidCourse,
    checkCourseEnrollment,
    getCourseSyllabus,
    updateLectureProgress,
    getStudentEnrolledCourses,
    getStudentContinueLearning,
} = require("../controllers/Course");

// Category Controllers
const {
    showAllCategories,
    createCategory,
    categoryPageDetails,
} = require("../controllers/Category");

// Section Controllers
const {
    createSection,
    updateSection,
    deleteSection,
} = require("../controllers/Section");

// Sub-Section Controllers
const {
    createSubSection,
    updateSubSection,
    deleteSubSection,
} = require("../controllers/SubSection");

// Rating Controllers
const {
    createRating,
    getAverageRating,
    getAllRating,
} = require("../controllers/RatingAndReview");

const {
    updateCourseProgress,
} = require("../controllers/CourseProgress");

// Middlewares
const { auth, isInstructor, isStudent, isAdmin, verifyEnrollment } = require("../middleware/auth");

// ********************************************************************************************************
//                                      Course routes
// ********************************************************************************************************

// Courses can Only be Created by Instructors
router.post("/createCourse", auth, isInstructor, createCourse);
//Add a Section to a Course
router.post("/addSection", auth, isInstructor, createSection);
// Update a Section
router.post("/updateSection", auth, isInstructor, updateSection);
// Delete a Section
router.post("/deleteSection", auth, isInstructor, deleteSection);
// Edit Sub Section
router.post("/updateSubSection", auth, isInstructor, updateSubSection);
// Delete Sub Section
router.post("/deleteSubSection", auth, isInstructor, deleteSubSection);
// Add a Sub Section to a Section
router.post("/addSubSection", auth, isInstructor, createSubSection);
// Get all Registered Courses
router.get("/getAllCourses", getAllCourses);
// Get Details for a specific course
router.post("/getCourseDetails", getCourseDetails);
// Get Details for a specific course
router.post("/getFullCourseDetails", auth, getFullCourseDetails);
// Edit Course routes
router.post("/editCourse", auth, isInstructor, editCourse);
// Get all Courses Specific to an Instructor
router.get("/getInstructorCourses", auth, isInstructor, getInstructorCourses);
// Delete a Course
router.delete("/deleteCourse", deleteCourse);

router.post("/updateCourseProgress", auth, isStudent, updateCourseProgress);

// ********************************************************************************************************
//                                      Category routes (Only by Admin)
// ********************************************************************************************************
router.post("/createCategory", auth, isAdmin, createCategory);
router.get("/showAllCategories", showAllCategories);
router.post("/getCategoryPageDetails", categoryPageDetails);

// ********************************************************************************************************
//                                      Rating and Review
// ********************************************************************************************************
router.post("/createRating", auth, isStudent, createRating);
router.get("/getAverageRating", getAverageRating);
router.get("/getReviews", getAllRating);

// ============================================================================
// STUDENT ENROLLMENT & SECURE LESSON ACCESS ROUTES
// ============================================================================

// Enroll in Free Course
router.post("/enroll/free/:courseId", auth, isStudent, enrollFreeCourse);

// Enroll in Paid Course (after payment verification)
router.post("/enroll/paid/:courseId", auth, isStudent, enrollPaidCourse);

// Check active enrollment status
router.get("/enroll/check/:courseId", auth, checkCourseEnrollment);
router.get("/enrollment-status/:courseId", auth, checkCourseEnrollment);

// Fetch syllabus & lesson metadata securely (Gated by verification middleware!)
router.get("/learn/:courseId", auth, verifyEnrollment, getCourseSyllabus);

// Update lecture completion checklists
router.post("/lecture/progress", auth, isStudent, updateLectureProgress);

// Get courses the student is currently enrolled in
router.get("/student/my-courses", auth, isStudent, getStudentEnrolledCourses);

// Retrieve student's continue learning progress bookmark
router.get("/student/continue-learning", auth, isStudent, getStudentContinueLearning);

module.exports = router;
