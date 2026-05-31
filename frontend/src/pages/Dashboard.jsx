import { useSelector } from "react-redux"
import { Outlet, useNavigate } from "react-router-dom"
import { useEffect } from "react"

import Sidebar from "../components/core/Dashboard/Sidebar"
import DashboardSidebar from "../components/core/Dashboard/DashboardSidebar"

function Dashboard() {
  const { loading: profileLoading, user } = useSelector((state) => state.profile)
  const { loading: authLoading, token } = useSelector((state) => state.auth)
  const navigate = useNavigate()

  useEffect(() => {
    
    console.log("Dashboard - Auth State:", { 
      profileLoading, 
      authLoading, 
      hasUser: !!user, 
      hasToken: !!token 
    })
    
    
    if (!profileLoading && !authLoading && (!user || !token)) {
      console.warn("Dashboard detected missing auth data, redirecting to login")
      navigate("/login")
    }
  }, [profileLoading, authLoading, user, token, navigate])

  if (profileLoading || authLoading) {
    return (
      <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center">
        <div className="spinner"></div>
      </div>
    )
  }

  
  if (!user) {
    console.error("Dashboard rendered without user data")
    return (
      <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center">
        <div className="text-richblack-5">
          <p>Authentication error. Please try logging in again.</p>
          <button 
            onClick={() => navigate("/login")}
            className="mt-4 rounded-[8px] bg-yellow-50 py-[8px] px-[12px] font-medium text-richblack-900"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-[calc(100vh-3.5rem)]">
      <Sidebar />
      <div className="h-[calc(100vh-3.5rem)] flex-1 overflow-auto pr-80">
        <div className="mx-auto w-11/12 max-w-[1000px] py-10">
          <Outlet />
          {user?.accountType === "Instructor" && (
            <div className="mt-8 p-6 bg-richblack-800 rounded-lg">
              <h2 className="text-xl font-bold mb-4 text-yellow-50">Instructor Dashboard Features</h2>
              <ul className="list-disc pl-6 space-y-2 text-richblack-100">
                <li>My Courses – Manage, organize, and monitor created courses with quick edit and duplication features.</li>
                <li>Add / Edit Courses – Upload video, documents, quizzes, and interactive assignments with built-in plagiarism checks.</li>
                <li>View Student Progress – Access individual and batch performance summaries with filtering options.</li>
                <li>Analytics – Track course completions, enrollments, ratings, watch time, and student engagement heatmaps.</li>
                <li>Manage Tests & Assignments – Create, schedule, auto-grade quizzes, and provide manual grading with feedback.</li>
                <li>Company Project Integration – Assign, track, and evaluate live industry projects with submission status.</li>
                <li>Mock Interview Conduction – Schedule, host, and assess mock interviews with recorded session playback.</li>
                <li>Progress Report Generation – Automated, customizable reports for individual students or groups.</li>
                <li>Live Class Scheduling – Host interactive sessions with polls, whiteboards, breakout rooms, and auto-recording.</li>
                <li>Student Feedback & Ratings – View feedback analytics, sentiment breakdown, and improvement suggestions.</li>
                <li>Revenue & Earnings Tracking – Monitor income, payout schedules, conversion rates, and sales funnels.</li>
                <li>Collaboration Tools – Co-create courses with other instructors, share teaching resources, and split revenues.</li>
                <li>Assignment & Test Analytics – See difficulty ratings, average scores, and question-level performance.</li>
                <li>Marketing Tools – Email campaigns, coupon creation, and social media sharing for course promotion.</li>
                <li>AI Content Suggestions – Get automated recommendations for new topics or course improvements.</li>
                <li>Community Engagement – Host instructor blogs, AMA (Ask Me Anything) sessions, and discussion groups.</li>
              </ul>
            </div>
          )}
        </div>
      </div>
      <DashboardSidebar />
    </div>
  )
}

export default Dashboard