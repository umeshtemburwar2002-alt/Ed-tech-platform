import React, { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate, useParams, useLocation } from "react-router-dom"
import { fetchCourseDetails } from "../services/operations/courseDetailsAPI"
import { BuyCourse } from "../services/operations/studentFeaturesAPI"
import { ACCOUNT_TYPE } from "../utils/constants"
import { addToCart } from "../slices/cartSlice"
import { toast } from "react-hot-toast"
import { FaShareSquare, FaPlay } from "react-icons/fa"
import { BiInfoCircle } from "react-icons/bi"
import { HiOutlineGlobeAlt } from "react-icons/hi"
import { ReactMarkdown } from "react-markdown/lib/react-markdown"
import { supabase } from "../config/supabaseClient"

function CourseVideoPlayer({ courseData, isEnrolled }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const isFree = courseData.is_free || Number(courseData.price) === 0;
  const videoId = courseData.preview_video_id;
  const thumbnail = courseData.thumbnail || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=400&fit=crop';

  const canWatch = isFree || isEnrolled;

  if (!videoId) {
    return (
      <div className="relative aspect-video w-full bg-[#111625] overflow-hidden rounded-2xl">
        <img src={thumbnail} alt={courseData.title || courseData.course_name} className="w-full h-full object-cover" />
      </div>
    );
  }

  if (isPlaying && canWatch) {
    return (
      <div className="relative aspect-video w-full bg-black overflow-hidden rounded-2xl">
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
    <div className="relative aspect-video w-full bg-[#111625] overflow-hidden rounded-2xl group">
      <img src={thumbnail} alt={courseData.title || courseData.course_name} className="w-full h-full object-cover" />
      
      {canWatch ? (
        // Playable Preview Overlay
        <button
          onClick={() => setIsPlaying(true)}
          className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 hover:bg-black/55 transition-all duration-300"
        >
          <div className="w-16 h-16 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-2xl">
            <FaPlay className="h-5 w-5 text-white ml-1 fill-current animate-pulse" />
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

function CourseDetails() {
  const { user } = useSelector((state) => state.profile)
  const { token } = useSelector((state) => state.auth)
  const { loading } = useSelector((state) => state.profile)
  const { paymentLoading } = useSelector((state) => state.course)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const [isEnrolled, setIsEnrolled] = useState(false)

  // Getting courseId from url parameter
  const { courseId } = useParams()

  // Declear a state to save the course details
  const [response, setResponse] = useState(null)
  const [confirmationModal, setConfirmationModal] = useState(null)

  const searchParams = new URLSearchParams(location.search);
  const shouldAutoEnroll = searchParams.get("enroll") === "true";
  
  useEffect(() => {
    // Calling fetchCourseDetails function to fetch the details
    ;(async () => {
      try {
        const res = await fetchCourseDetails(courseId)
        console.log("course details res: ", res)
        setResponse(res)

        // Check user enrollment state safely using Supabase query
        let enrolled = false;
        if (user) {
          const { data: enrollData, error: enrollError } = await supabase
            .from("enrollments")
            .select("id")
            .eq("course_id", courseId)
            .eq("student_id", user.id || user._id)
            .eq("enrollment_status", "active")
            .maybeSingle();

          if (!enrollError && enrollData) {
            enrolled = true;
          }
        }
        setIsEnrolled(enrolled);
      } catch (error) {
        console.log("Could not fetch Course Details")
      }
    })()
  }, [courseId, user])

  useEffect(() => {
    if (shouldAutoEnroll && token && user && response?.success && !isEnrolled) {
      // Clear the query param
      navigate(location.pathname, { replace: true });
      handleEnrollment();
    }
  }, [shouldAutoEnroll, token, user, response, isEnrolled]);

  const handleEnrollment = async () => {
    const activeToken = token || localStorage.getItem("token");
    if (!activeToken || !user) {
      toast.error("Please login to enroll in this course");
      navigate('/login', { state: { from: `/courses/${courseId}?enroll=true` } });
      return;
    }

    try {
      const details = response?.data?.courseDetails;
      const isFree = details?.is_free || Number(details?.price) === 0;
      const baseUrl = process.env.REACT_APP_BASE_URL || 'http://localhost:4000/api/v1';

      if (isFree) {
        toast.loading("Enrolling you instantly in this free course...");
        
        const enrollRes = await fetch(`${baseUrl}/course/enroll/free/${details.id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${activeToken}`
          }
        });
        
        const resData = await enrollRes.json();
        toast.dismiss();

        if (resData.success) {
          toast.success("Enrolled successfully! Enjoy start learning!");
          setIsEnrolled(true);
          navigate(`/learn/${details.id}`);
        } else {
          toast.error(resData.message || "Failed to process free enrollment");
        }
      } else {
        // Paid course simulated checkout flow
        toast.loading("Opening secure checkout simulation gateway...");
        
        setTimeout(async () => {
          toast.dismiss();
          toast.loading("Authorizing purchase and issuing certificate eligibility...");
          
          const enrollRes = await fetch(`${baseUrl}/course/enroll/paid/${details.id}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${activeToken}`
            }
          });
          
          const resData = await enrollRes.json();
          toast.dismiss();

          if (resData.success) {
            toast.success("Transaction process complete! Added to classrooms.");
            setIsEnrolled(true);
            navigate(`/learn/${details.id}`);
          } else {
            toast.error(resData.message || "Failed to authorize payment");
          }
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      toast.dismiss();
      toast.error("Failed to process transaction checkout");
    }
  };

  const handleAddToCart = () => {
    if (user && user?.accountType === ACCOUNT_TYPE.INSTRUCTOR) {
      toast.error("You are an Instructor. You can't buy a course.")
      return
    }
    if (token) {
      dispatch(addToCart(response.data.courseDetails))
      return
    }
    setConfirmationModal({
      text1: "You are not logged in!",
      text2: "Please login to add to cart",
      btn1Text: "Login",
      btn2Text: "Cancel",
      btn1Handler: () => navigate("/login"),
      btn2Handler: () => setConfirmationModal(null),
    })
  }

  if (loading || !response) {
    return (
      <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center">
        <div className="spinner"></div>
      </div>
    )
  }
  if (!response.success) {
    return <div className="text-white">Error loading course details.</div>
  }

  // Map database fields to frontend format
  const courseDetails = response.data.courseDetails;
  const {
    course_name,
    course_description,
    thumbnail,
    price,
    what_you_will_learn,
    sections,
    instructor,
    created_at,
  } = courseDetails;
  
  // Use title if available, fallback to course_name
  const courseTitle = courseDetails.title || course_name || "Untitled Course";
  const courseDescription = courseDetails.description || course_description || "";
  const isFree = courseDetails.is_free || Number(price) === 0;

  // Format array to bullet points for markdown rendering
  const formattedWhatYouWillLearn = Array.isArray(what_you_will_learn)
    ? what_you_will_learn.map((item) => `- ${item}`).join("\n")
    : typeof what_you_will_learn === "string"
    ? what_you_will_learn
    : "";

  return (
    <>
      <div className={`relative w-full bg-richblack-800`}>
        {/* Hero Section */}
        <div className="mx-auto box-content px-4 lg:w-[1260px] 2xl:relative ">
          <div className="mx-auto grid min-h-[450px] max-w-maxContentTab justify-items-center py-8 lg:mx-0 lg:justify-items-start lg:py-0">
            <div className="relative block max-h-[30rem] lg:hidden w-full overflow-hidden rounded-xl border border-white/10 mb-6">
              <CourseVideoPlayer courseData={courseDetails} isEnrolled={isEnrolled} />
            </div>
            <div
              className={`z-30 my-5 flex flex-col justify-center gap-4 py-5 text-lg text-richblack-5`}
            >
              <div>
                <p className="text-4xl font-bold text-richblack-5 sm:text-[42px]">
                  {courseTitle}
                </p>
              </div>
              <p className={`text-richblack-200`}>{courseDescription}</p>
              <div className="text-md flex flex-wrap items-center gap-2">
                <span className="text-yellow-25">4.5</span>
                <span className="text-richblack-400">
                  (245 reviews)
                </span>
                <span className="text-richblack-600">
                  {courseDetails.enrollment_count || 12} students enrolled
                </span>
              </div>
              <div>
                <p className="">
                  Created By {instructor ? `${instructor.first_name || ""} ${instructor.last_name || ""}`.trim() || "Instructor" : "Instructor"}
                </p>
              </div>
              <div className="flex flex-wrap gap-5 text-lg">
                <p className="flex items-center gap-2">
                  {" "}
                  <BiInfoCircle /> Created at {new Date(created_at).toLocaleDateString()}
                </p>
                <p className="flex items-center gap-2">
                  {" "}
                  <HiOutlineGlobeAlt /> English
                </p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-4 border-y border-y-richblack-500 py-4 lg:hidden">
              <p className="space-x-3 pb-4 text-3xl font-semibold text-richblack-5">
                {isFree ? <span className="text-emerald-400">FREE</span> : `Rs. ${price}`}
              </p>
              <button 
                className="yellowButton" 
                onClick={isEnrolled ? () => navigate(`/learn/${courseId}`) : handleEnrollment}
              >
                {isEnrolled ? "Go to Classroom" : (isFree ? "Start Learning Free" : "Buy Now")}
              </button>
              {!isEnrolled && (
                <button className="blackButton" onClick={handleAddToCart}>Add to Cart</button>
              )}
            </div>
          </div>
          {/* Courses Card */}
          <div className="right-[1rem] top-[60px] mx-auto hidden min-h-[600px] w-full max-w-[410px] translate-y-24 md:translate-y-0 lg:absolute  lg:block">
             <div className={`flex flex-col gap-4 rounded-md bg-richblack-700 p-4 text-richblack-5`}>
                <div className="relative overflow-hidden">
                  <CourseVideoPlayer courseData={courseDetails} isEnrolled={isEnrolled} />
                </div>
                <div className="px-4">
                    <div className="space-x-3 pb-4 text-3xl font-semibold">
                        {isFree ? <span className="text-emerald-400">FREE</span> : `Rs. ${price}`}
                    </div>
                    <div className="flex flex-col gap-4">
                        <button
                            className="yellowButton"
                            onClick={isEnrolled ? () => navigate(`/learn/${courseId}`) : handleEnrollment}
                        >
                            {isEnrolled ? "Go to Classroom" : (isFree ? "Start Learning Free" : "Buy Now")}
                        </button>
                        {!isEnrolled && (
                            <button onClick={handleAddToCart} className="blackButton">
                                Add to Cart
                            </button>
                        )}
                    </div>
                    <div>
                        <p className="pb-3 pt-6 text-center text-sm text-richblack-25">
                            30-Day Money-Back Guarantee
                        </p>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto box-content px-4 text-start text-richblack-5 lg:w-[1260px]">
        <div className="mx-auto max-w-maxContentTab lg:mx-0 xl:max-w-[810px]">
          {/* What will you learn section */}
          <div className="my-8 border border-richblack-600 p-8">
            <p className="text-3xl font-semibold">What you'll learn</p>
            <div className="mt-5">
              <ReactMarkdown>{formattedWhatYouWillLearn}</ReactMarkdown>
            </div>
          </div>

          {/* Course Content Section */}
          <div className="max-w-[830px] ">
            <div className="flex flex-col gap-3">
              <p className="text-[28px] font-semibold">Course Content</p>
              <div className="flex flex-wrap justify-between gap-2">
                <div className="flex gap-2">
                  <span>
                    {sections?.length || 0} {`section(s)`}
                  </span>
                  <span>
                    {response.data?.totalDuration || "10m"} total length
                  </span>
                </div>
              </div>
            </div>

            {/* Course Details Accordion */}
            <div className="py-4">
                {sections?.map((section) => (
                    <div key={section.id} className="border border-richblack-600 bg-richblack-700 p-4 mb-2 rounded-lg">
                        <p className="font-bold text-lg text-richblack-5">{section.section_name}</p>
                        <div className="ml-4 mt-2">
                            {section.sub_sections?.map((sub) => (
                                <div key={sub.id} className="flex items-center gap-2 py-2 border-b border-richblack-600/50 last:border-0">
                                    <FaPlay className="text-yellow-50 text-xs flex-shrink-0" />
                                    <span className="text-richblack-100 flex-grow">{sub.title}</span>
                                    <span className="text-richblack-400 text-sm">{sub.time_duration || "5 min"}</span>
                                </div>
                            ))}
                            {(!section.sub_sections || section.sub_sections.length === 0) && (
                                <p className="text-sm text-richblack-400 italic">No lectures in this section yet</p>
                            )}
                        </div>
                    </div>
                ))}
                {(!sections || sections.length === 0) && (
                    <p className="text-richblack-400 italic">Curriculum content not loaded</p>
                )}
            </div>

            {/* Requirements */}
            {courseDetails.instructions?.length > 0 && (
              <div className="mb-12 py-4">
                <p className="text-[28px] font-semibold mb-4">Requirements</p>
                <ul className="list-disc pl-5 space-y-2">
                  {courseDetails.instructions.map((item, i) => (
                    <li key={i} className="text-richblack-100">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Author Details */}
            <div className="mb-12 py-4">
              <p className="text-[28px] font-semibold">Author</p>
              <div className="flex items-center gap-4 py-4">
                {instructor?.image || instructor?.avatar_url ? (
                  <img
                    src={instructor.image || instructor.avatar_url}
                    alt="Author"
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center font-bold text-white">
                    {instructor?.first_name?.charAt(0) || "I"}
                  </div>
                )}
                <p className="text-lg">{instructor ? `${instructor.first_name || ""} ${instructor.last_name || ""}`.trim() : "Instructor"}</p>
              </div>
              <p className="text-richblack-50">
                {instructor?.about || instructor?.bio || "Experienced LMS platform instructor."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default CourseDetails
