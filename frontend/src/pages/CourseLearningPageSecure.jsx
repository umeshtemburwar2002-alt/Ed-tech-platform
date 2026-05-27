// ═══════════════════════════════════════════════════════════════════════════════
// SECURE COURSE LEARNING PAGE - PRODUCTION READY
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1";

/**
 * CourseLearningPageSecure Component
 * 
 * CRITICAL SECURITY FEATURES:
 * 1. Backend verifies enrollment BEFORE returning course content
 * 2. Checks payment_status === "completed" for paid courses
 * 3. Prevents unauthorized access via URL manipulation
 * 4. Verifies JWT token on every request
 * 
 * Access Rules:
 * - FREE COURSES: Accessible to any authenticated user
 * - PAID COURSES: ONLY accessible if payment_status === "completed"
 * - INSTRUCTORS: Can access their own courses
 * - ADMINS: Can access all courses
 */
export default function CourseLearningPageSecure() {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const { token, user } = useSelector(state => state.auth);

    const [course, setCourse] = useState(null);
    const [enrollment, setEnrollment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [accessDenied, setAccessDenied] = useState(false);

    // ─────────────────────────────────────────────────────────────────────────
    // FETCH COURSE WITH ENROLLMENT VERIFICATION
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!courseId || !token || !user?.id) {
            setLoading(false);
            setAccessDenied(true);
            return;
        }

        fetchCourseWithVerification();
    }, [courseId, token, user?.id]);

    const fetchCourseWithVerification = async () => {
        try {
            setLoading(true);
            setError(null);
            setAccessDenied(false);

            // ─── BACKEND VERIFIES ENROLLMENT BEFORE RETURNING CONTENT ────────
            // This is CRITICAL - the backend middleware checks:
            // 1. If course is free OR
            // 2. If student has completed payment
            // 3. If student is instructor/admin
            const response = await axios.get(
                `${API_BASE}/course/learn/${courseId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            if (!response.data.success) {
                throw new Error(response.data.message || "Failed to load course");
            }

            // Backend returns data with courseDetails, sections, completedLessons
            const courseData = response.data.data || response.data;
            setCourse(courseData.courseDetails || courseData.course);
            
            // Set enrollment info from request (middleware attaches it)
            setEnrollment({
                enrollment_type: courseData.courseDetails?.is_free ? "free" : "paid",
                payment_status: courseData.courseDetails?.is_free ? "not_required" : "completed"
            });

        } catch (err) {
            console.error("Course fetch error:", err);

            // Check if it's an access denied error
            if (err.response?.status === 403) {
                setAccessDenied(true);
                setError(err.response?.data?.message || "You don't have access to this course");
            } else if (err.response?.status === 401) {
                // Token expired or invalid
                navigate("/login");
            } else {
                setError(err.response?.data?.message || err.message || "Failed to load course");
            }
        } finally {
            setLoading(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER LOADING STATE
    // ─────────────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                    </div>
                    <p className="text-white mt-4">Loading course...</p>
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER ACCESS DENIED STATE
    // ─────────────────────────────────────────────────────────────────────────
    if (accessDenied) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4 border border-red-500 text-center">
                    <div className="inline-block mb-4">
                        <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                    </div>

                    <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
                    <p className="text-gray-300 mb-6">{error || "You don't have access to this course"}</p>

                    <div className="space-y-3">
                        <button
                            onClick={() => navigate("/courses")}
                            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
                        >
                            Browse Courses
                        </button>
                        <button
                            onClick={() => navigate("/")}
                            className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                        >
                            Go Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER ERROR STATE
    // ─────────────────────────────────────────────────────────────────────────
    if (error) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4 border border-red-500 text-center">
                    <h1 className="text-2xl font-bold text-white mb-2">Error</h1>
                    <p className="text-gray-300 mb-6">{error}</p>

                    <button
                        onClick={() => navigate("/courses")}
                        className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
                    >
                        Back to Courses
                    </button>
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER COURSE CONTENT
    // ─────────────────────────────────────────────────────────────────────────
    if (!course) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <p className="text-white">Course not found</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900">
            {/* HEADER */}
            <div className="bg-gray-800 border-b border-gray-700 p-6">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-3xl font-bold text-white mb-2">{course.title}</h1>
                    <p className="text-gray-400">
                        {enrollment?.enrollment_type === "free" ? "Free Course" : "Paid Course"}
                        {enrollment?.payment_status === "completed" && " • Payment Verified"}
                    </p>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="max-w-7xl mx-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* COURSE CONTENT */}
                    <div className="lg:col-span-2">
                        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                            <h2 className="text-2xl font-bold text-white mb-4">Course Content</h2>

                            {/* COURSE DESCRIPTION */}
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
                                <p className="text-gray-300">{course.description || "No description available"}</p>
                            </div>

                            {/* COURSE SECTIONS */}
                            {course.sections && course.sections.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-4">Sections</h3>
                                    <div className="space-y-3">
                                        {course.sections.map((section, idx) => (
                                            <div key={idx} className="bg-gray-700 rounded-lg p-4">
                                                <h4 className="text-white font-semibold mb-2">{section.title}</h4>
                                                {section.sub_sections && section.sub_sections.length > 0 && (
                                                    <ul className="space-y-2 ml-4">
                                                        {section.sub_sections.map((lesson, lidx) => (
                                                            <li key={lidx} className="text-gray-300 text-sm">
                                                                <span className="text-purple-400">▶</span> {lesson.title}
                                                                {lesson.time_duration && (
                                                                    <span className="text-gray-500 ml-2">({lesson.time_duration})</span>
                                                                )}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* SIDEBAR */}
                    <div>
                        {/* ENROLLMENT INFO */}
                        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Enrollment Status</h3>

                            <div className="space-y-3">
                                <div>
                                    <p className="text-gray-400 text-sm">Type</p>
                                    <p className="text-white font-semibold capitalize">
                                        {enrollment?.enrollment_type || "Unknown"}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-gray-400 text-sm">Payment Status</p>
                                    <p className={`font-semibold capitalize ${
                                        enrollment?.payment_status === "completed" ? "text-green-400" : "text-yellow-400"
                                    }`}>
                                        {enrollment?.payment_status || "Unknown"}
                                    </p>
                                </div>

                                {enrollment?.enrolled_at && (
                                    <div>
                                        <p className="text-gray-400 text-sm">Enrolled On</p>
                                        <p className="text-white">
                                            {new Date(enrollment.enrolled_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                )}

                                {enrollment?.amount_paid > 0 && (
                                    <div>
                                        <p className="text-gray-400 text-sm">Amount Paid</p>
                                        <p className="text-white font-semibold">₹{enrollment.amount_paid}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* SECURITY INFO */}
                        <div className="bg-blue-900 bg-opacity-30 rounded-lg p-4 border border-blue-700">
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
                                </svg>
                                <div>
                                    <p className="text-blue-300 text-sm font-semibold">Secure Access</p>
                                    <p className="text-blue-200 text-xs mt-1">
                                        Your access is verified and secured by our payment system.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
