import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { 
  Star, Users, Clock, Play, Heart, Share2, CheckCircle, 
  BookOpen, Award, MessageSquare, Calendar, Download, ChevronDown, ChevronUp
} from 'lucide-react';
import Footer from '../components/common/Footer';
import { supabase } from '../config/supabaseClient';
import { toast } from 'react-hot-toast';
import { FaSpinner } from 'react-icons/fa';
import PaymentModalSecure from '../components/PaymentModalSecure';

const bgPattern = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%239C92AC\" fill-opacity=\"0.05\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
};

function CourseVideoPlayer({ courseData, isEnrolled }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const isFree = courseData.is_free || Number(courseData.price) === 0;
  const videoId = courseData.preview_video_id || courseData.youtube_video_id;
  const thumbnail = courseData.thumbnail || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=400&fit=crop';

  const canWatch = isFree || isEnrolled;

  if (!videoId) {
    return (
      <div className="relative aspect-video w-full bg-[#111625] overflow-hidden">
        <img src={thumbnail} alt={courseData.course_name} className="w-full h-full object-cover" />
      </div>
    );
  }

  if (isPlaying && canWatch) {
    return (
      <div className="relative aspect-video w-full bg-black overflow-hidden">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`}
          title="Course Preview Video"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full animate-fadeIn"
        ></iframe>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full bg-[#111625] overflow-hidden group">
      <img src={thumbnail} alt={courseData.course_name} className="w-full h-full object-cover" />
      
      {canWatch ? (
        // Playable Preview Overlay
        <button
          onClick={() => setIsPlaying(true)}
          className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 hover:bg-black/55 transition-all duration-300"
        >
          <div className="w-16 h-16 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-2xl">
            <Play className="h-6 w-6 text-white ml-1 fill-current" />
          </div>
          <span className="absolute bottom-4 left-4 text-[10px] font-black uppercase tracking-wider text-white bg-purple-600/80 border border-purple-500/30 px-3 py-1 rounded-full shadow-lg">
            Free Preview
          </span>
        </button>
      ) : (
        // Locked Preview Overlay
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-[3px] p-4 text-center">
          <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-3 shadow-lg">
            <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <span className="text-sm font-black text-white tracking-widest uppercase">Enroll to Watch</span>
          <span className="text-[10px] text-gray-400 mt-1 max-w-[200px] leading-relaxed">This video is only available for enrolled students.</span>
        </div>
      )}
    </div>
  );
}

const CourseDetail = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Redux Token & Profile Auth Selector
  const { user } = useSelector((state) => state.profile);
  const { token } = useSelector((state) => state.auth);
  
  const [courseData, setCourseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const shouldAutoEnroll = searchParams.get("enroll") === "true";

  useEffect(() => {
    const fetchCourseDetails = async () => {
      try {
        console.log('[CourseDetail] Fetching course details for id/slug:', courseId);
        setLoading(true);
        
        const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(courseId);
        
        let query = supabase
          .from("courses")
          .select(`
            *,
            instructor:instructor_id(first_name, last_name, avatar_url, image, about)
          `);
          
        if (isUUID) {
          query = query.eq("id", courseId);
        } else {
          query = query.eq("slug", courseId);
        }
        
        const { data: course, error: courseError } = await query.single();
        if (courseError || !course) throw courseError || new Error("Course not found");

        // Fetch curriculum sections from Supabase using resolved course UUID
        const { data: sectionsData, error: secError } = await supabase
          .from("course_sections")
          .select("*")
          .eq("course_id", course.id)
          .order("position", { ascending: true });

        if (secError) throw secError;

        // Fetch lessons from Supabase using resolved course UUID
        const { data: lessonsData, error: lesError } = await supabase
          .from("course_lessons")
          .select("*")
          .eq("course_id", course.id)
          .order("position", { ascending: true });

        if (lesError) throw lesError;

        // Map lessons to sections dynamically to resolve blank Course Content issue
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

        // Enrich course data with dynamic values, requirements, and outcomes
        const enrichedCourse = {
          ...course,
          course_name: course.title,
          course_description: course.description,
          enrolled_students_count: course.enrollment_count || 0,
          instructor: course.instructor || {
            first_name: "Instructor",
            last_name: "",
            avatar_url: null,
            image: null
          },
          what_you_will_learn: Array.isArray(course.what_you_will_learn)
            ? course.what_you_will_learn
            : Array.isArray(course.learning_outcomes)
            ? course.learning_outcomes
            : typeof (course.what_you_will_learn || course.learning_outcomes) === 'string'
            ? (course.what_you_will_learn || course.learning_outcomes).split(/\r?\n/).map(s => s.trim()).filter(Boolean)
            : [],
          sections: formattedSections,
          instructions: Array.isArray(course.instructions)
            ? course.instructions
            : Array.isArray(course.requirements)
            ? course.requirements
            : typeof (course.instructions || course.requirements) === 'string'
            ? (course.instructions || course.requirements).split(/\r?\n/).map(s => s.trim()).filter(Boolean)
            : []
        };

        setCourseData(enrichedCourse);

        // Check user enrollment state safely using correct database student_id column and course UUID
        let enrolled = false;
        if (user) {
          const { data: enrollData, error: enrollError } = await supabase
            .from("enrollments")
            .select("id")
            .eq("course_id", course.id)
            .eq("student_id", user.id)
            .eq("enrollment_status", "active")
            .maybeSingle();

          if (!enrollError && enrollData) {
            enrolled = true;
          }
        }
        setIsEnrolled(enrolled);
      } catch (error) {
        console.error('[CourseDetail] Error fetching course details:', error);
      } finally {
        setLoading(false);
      }
    };
    if (courseId) {
      fetchCourseDetails();
    }
  }, [courseId, user]);

  useEffect(() => {
    if (shouldAutoEnroll && token && user && courseData && !loading && !isEnrolled) {
      // Clear the query param
      navigate(location.pathname, { replace: true });
      handleEnrollment();
    }
  }, [shouldAutoEnroll, token, user, courseData, loading, isEnrolled]);

  // Handler for Checkout & Enrollments
  const handleEnrollment = async () => {
    const activeToken = token || localStorage.getItem("token");
    if (!activeToken || !user) {
      toast.error("Please login to enroll in this course");
      navigate('/login', { state: { from: `/courses/${courseId}?enroll=true` } });
      return;
    }

    try {
      const isFree = courseData.is_free || Number(courseData.price) === 0;
      const baseUrl = process.env.REACT_APP_BASE_URL || 'http://localhost:4000/api/v1';

      if (isFree) {
        // FREE COURSE - Direct enrollment
        toast.loading("Enrolling you instantly in this free course...");
        
        const response = await fetch(`${baseUrl}/course/enroll/free/${courseData.id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${activeToken}`
          }
        });
        
        const resData = await response.json();
        toast.dismiss();

        if (resData.success) {
          toast.success("Enrolled successfully! Enjoy start learning!");
          setIsEnrolled(true);
          navigate(`/learn/${courseData.id}`);
        } else {
          toast.error(resData.message || "Failed to process free enrollment");
        }
      } else {
        // PAID COURSE - Open payment modal (Razorpay will handle enrollment after payment)
        setShowPaymentModal(true);
      }
    } catch (err) {
      console.error(err);
      toast.dismiss();
      toast.error("Failed to process transaction checkout");
    }
  };

  // Handle successful payment and enrollment
  const handlePaymentSuccess = (enrollment) => {
    setIsEnrolled(true);
    setShowPaymentModal(false);
    toast.success("Payment successful! Redirecting to course...");
    setTimeout(() => {
      navigate(`/learn/${courseData.id}`);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1020] flex items-center justify-center">
        <FaSpinner className="text-purple-500 text-5xl animate-spin" />
      </div>
    );
  }

  if (!courseData) {
    return (
      <div className="min-h-screen bg-[#0B1020] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Course not found</h2>
          <button
            onClick={() => navigate('/explore-courses')}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity"
          >
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  const toggleSection = (sectionId) => {
    setActiveSection(activeSection === sectionId ? null : sectionId);
  };

  return (
    <div className="min-h-screen bg-[#0B1020]">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-900/30 via-blue-900/30 to-cyan-900/30 py-20">
        <div className="absolute inset-0 opacity-20" style={bgPattern}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="flex flex-wrap gap-2 mb-6">
                  {courseData.tags?.slice(0, 3).map((tag, i) => (
                    <span key={i} className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                      {tag}
                    </span>
                  ))}
                </div>

                <h1 className="text-5xl font-bold text-white mb-6">
                  {courseData.course_name}
                </h1>

                <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                  {courseData.course_description}
                </p>

                <div className="flex flex-wrap items-center gap-6 mb-8">
                  <div className="flex items-center gap-2">
                    <Star className="h-6 w-6 text-yellow-400" />
                    <span className="text-2xl font-bold text-white">{courseData.average_rating || 0}</span>
                    <span className="text-gray-400">({courseData.ratings_count || 0} ratings)</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <Users className="h-5 w-5" />
                    <span>{courseData.enrolled_students_count || 0} students</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <Clock className="h-5 w-5" />
                    <span>{courseData.total_duration || '10 hours'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {courseData.instructor?.image || courseData.instructor?.avatar_url ? (
                    <img
                      src={courseData.instructor?.image || courseData.instructor?.avatar_url}
                      alt={courseData.instructor?.first_name}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xl font-bold">
                        {courseData.instructor?.first_name?.charAt(0) || 'I'}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="text-white font-semibold">
                      {courseData.instructor?.first_name} {courseData.instructor?.last_name}
                    </p>
                    <p className="text-gray-400 text-sm">Course Instructor</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Sticky Enroll Card */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="sticky top-8 bg-[#1A1F36] border border-white/10 rounded-2xl overflow-hidden"
              >
                <div className="relative overflow-hidden">
                  <CourseVideoPlayer courseData={courseData} isEnrolled={isEnrolled} />
                </div>

                <div className="p-6">
                  <div className="mb-6">
                    <div className="flex items-baseline gap-3 mb-2">
                      <span className="text-4xl font-bold text-white">
                        {courseData.price > 0 ? `₹${courseData.price}` : <span className="text-emerald-400">FREE</span>}
                      </span>
                      {courseData.original_price > courseData.price && (
                        <span className="text-xl text-gray-500 line-through">
                          ₹{courseData.original_price}
                        </span>
                      )}
                    </div>
                    {courseData.discount_percentage > 0 && (
                      <p className="text-emerald-400 font-semibold">
                        {courseData.discount_percentage}% off
                      </p>
                    )}
                  </div>

                  <button 
                    onClick={isEnrolled ? () => navigate(`/learn/${courseId}`) : handleEnrollment}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-bold text-lg hover:opacity-90 transition-opacity mb-4"
                  >
                    {isEnrolled ? "Go to Classroom" : (courseData.is_free || Number(courseData.price) === 0 ? "Start Learning Free" : "Buy Now")}
                  </button>

                  <div className="flex gap-2 mb-6">
                    <button className="flex-1 py-3 border border-white/10 rounded-xl text-white hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
                      <Heart className="h-5 w-5" />
                      <span>Wishlist</span>
                    </button>
                    <button className="flex-1 py-3 border border-white/10 rounded-xl text-white hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
                      <Share2 className="h-5 w-5" />
                      <span>Share</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-gray-300">
                      <CheckCircle className="h-5 w-5 text-emerald-400" />
                      <span>Lifetime access</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-300">
                      <CheckCircle className="h-5 w-5 text-emerald-400" />
                      <span>Certificate of completion</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-300">
                      <CheckCircle className="h-5 w-5 text-emerald-400" />
                      <span>30-day money-back guarantee</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Course Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-16">
            {/* What You'll Learn */}
            <section>
              <h2 className="text-3xl font-bold text-white mb-8">What You'll Learn</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {courseData.what_you_will_learn?.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">{item}</span>
                  </div>
                )) || (
                  <>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-6 w-6 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300">Master the fundamentals</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-6 w-6 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300">Build real-world projects</span>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* Course Content */}
            <section>
              <h2 className="text-3xl font-bold text-white mb-8">Course Content</h2>
              <div className="space-y-4">
                {courseData.sections?.map((section, index) => (
                  <div key={section.id} className="bg-[#1A1F36] border border-white/10 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-purple-400 font-bold text-lg">{index + 1}</div>
                        <div>
                          <h3 className="text-white font-semibold">{section.section_name}</h3>
                          <p className="text-gray-400 text-sm">
                            {section.sub_sections?.length || 0} lessons • {section.duration || '30 min'}
                          </p>
                        </div>
                      </div>
                      {activeSection === section.id ? (
                        <ChevronUp className="h-6 w-6 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-6 w-6 text-gray-400" />
                      )}
                    </button>
                    
                    {activeSection === section.id && (
                      <div className="border-t border-white/10">
                        {section.sub_sections?.map((lesson, lessonIndex) => (
                          <div key={lesson.id} className="px-6 py-3 flex items-center gap-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                            <Play className="h-5 w-5 text-gray-400" />
                            <span className="text-gray-300 flex-1">{lesson.title}</span>
                            <span className="text-gray-500 text-sm">{lesson.time_duration || '5 min'}</span>
                          </div>
                        )) || (
                          <div className="px-6 py-4 text-gray-400">No lessons yet</div>
                        )}
                      </div>
                    )}
                  </div>
                )) || (
                  <div className="text-gray-400">No sections available</div>
                )}
              </div>
            </section>

            {/* Requirements */}
            {courseData.instructions?.length > 0 && (
              <section>
                <h2 className="text-3xl font-bold text-white mb-8">Requirements</h2>
                <ul className="space-y-3">
                  {courseData.instructions.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-gray-300">
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0"></span>
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Instructor */}
            <section>
              <h2 className="text-3xl font-bold text-white mb-8">Instructor</h2>
              <div className="bg-[#1A1F36] border border-white/10 rounded-2xl p-8">
                <div className="flex items-start gap-6">
                  {courseData.instructor?.image || courseData.instructor?.avatar_url ? (
                    <img
                      src={courseData.instructor?.image || courseData.instructor?.avatar_url}
                      alt={courseData.instructor?.first_name}
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-3xl font-bold">
                        {courseData.instructor?.first_name?.charAt(0) || 'I'}
                      </span>
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {courseData.instructor?.first_name} {courseData.instructor?.last_name}
                    </h3>
                    <p className="text-gray-400 mb-4">{courseData.instructor?.bio || 'Experienced instructor'}</p>
                    <div className="flex flex-wrap gap-6 text-sm">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">{courseData.instructor?.courses_count || 1}</div>
                        <div className="text-gray-400">Courses</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">{courseData.instructor?.students_count || 0}</div>
                        <div className="text-gray-400">Students</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">{courseData.instructor?.reviews_count || 0}</div>
                        <div className="text-gray-400">Reviews</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <Footer />

      {/* Payment Modal for Paid Courses */}
      {showPaymentModal && courseData && (
        <PaymentModalSecure
          course={courseData}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default CourseDetail;
