
import "./App.css";
import { Route, Routes } from "react-router-dom";
import React, { useEffect, Suspense, lazy } from "react";
import Navbar from "./components/common/Navbar";
import { useLocation } from "react-router-dom";

import OpenRoute from "./components/core/auth/OpenRoute";
import PrivateRoute from "./components/core/auth/PrivateRoute";

import { useDispatch, useSelector } from "react-redux";
import { ACCOUNT_TYPE } from "./utils/constants";
import RoleRoute from "./components/core/auth/RoleRoute";
import AppSkeleton from "./components/core/Loaders/AppSkeleton";
import { ThemeProvider } from "./context/ThemeContext";

import { courseRoutes } from "./routes/courseRoutes";
import AdminLayout from "./components/admin/AdminLayout";
import AdminOpenRoute from "./components/core/auth/AdminOpenRoute";
import { subscribeSupabaseAuthToStore } from "./services/syncSupabaseSession";

// Lazy loaded pages/components
const Login = React.lazy(() => import("./pages/Login"));
const Signup = React.lazy(() => import("./pages/Signup"));
const CoursePurchase = React.lazy(() => import("./pages/CoursePurchase"));
const StudentSignup = React.lazy(() => import("./components/auth/StudentSignup"));
const InstructorSignup = React.lazy(() => import("./components/auth/InstructorSignup"));
const ForgotPassword = React.lazy(() => import("./pages/ForgotPassword"));

const PhoneVerification = React.lazy(() => import("./components/auth/PhoneVerification"));
const UpdatePassword = React.lazy(() => import("./pages/UpdatePassword"));
const VerifyEmail = React.lazy(() => import("./pages/VerifyEmail"));
const About = React.lazy(() => import("./pages/About"));
const Contact = React.lazy(() => import("./pages/Contact"));
const Students = React.lazy(() => import("./pages/Students"));
const StudentSupport = React.lazy(() => import("./pages/StudentSupport"));
const MyTickets = React.lazy(() => import("./pages/MyTickets"));

const AdminLogin = React.lazy(() => import("./pages/admin/Login"));
const AdminDashboard = React.lazy(() => import("./pages/admin/Dashboard"));
const AdminUsers = React.lazy(() => import("./pages/admin/Users"));
const AdminCourses = React.lazy(() => import("./pages/admin/Courses"));
const AdminReports = React.lazy(() => import("./pages/admin/Reports"));
const InstructorEarnings     = React.lazy(() => import("./pages/dashboard/instructor/Earnings"));
const InstructorAnalytics    = React.lazy(() => import("./pages/dashboard/instructor/Analytics"));
const InstructorAssignments  = React.lazy(() => import("./pages/dashboard/instructor/Assignments"));
const InstructorNotifications= React.lazy(() => import("./pages/dashboard/instructor/Notifications"));
const InstructorReviews      = React.lazy(() => import("./pages/dashboard/instructor/Reviews"));
const InstructorResources    = React.lazy(() => import("./pages/dashboard/instructor/Resources"));
const InstructorCoupons      = React.lazy(() => import("./pages/dashboard/instructor/Coupons"));
const InstructorWebinars     = React.lazy(() => import("./pages/dashboard/instructor/Webinars"));
const InstructorAIAssistant  = React.lazy(() => import("./pages/dashboard/instructor/AIAssistant"));
const InstructorStudentProgress = React.lazy(() => import("./pages/dashboard/instructor/StudentProgress"));
const InstructorAffiliate    = React.lazy(() => import("./pages/dashboard/instructor/Affiliate"));
const InstructorVerification = React.lazy(() => import("./pages/dashboard/instructor/Verification"));
const InstructorAttendance   = React.lazy(() => import("./pages/dashboard/instructor/Attendance"));
const InstructorCertificates = React.lazy(() => import("./pages/dashboard/instructor/Certificates"));
const InstructorSupport = React.lazy(() => import("./pages/dashboard/instructor/Support"));
const InstructorInfo = React.lazy(() => import("./pages/dashboard/instructor/InstructorInfo"));
const InstructorOnboarding = React.lazy(() => import("./components/onboarding/InstructorOnboarding"));
const Careers = React.lazy(() => import("./pages/Careers"));
const Home = React.lazy(() => import("./pages/Home"));
const LandingPage = React.lazy(() => import("./pages/LandingPage"));
const Offers = React.lazy(() => import("./pages/Offers"));

// Student Dashboard New Pages
const StudentAssignments = React.lazy(() => import("./pages/student-dashboard/Assignments"));
const StudentAnalytics = React.lazy(() => import("./pages/student-dashboard/Analytics"));
const StudentAIAssistant = React.lazy(() => import("./pages/student-dashboard/AIAssistant"));
const StudentLeaderboard = React.lazy(() => import("./pages/student-dashboard/Leaderboard"));
const StudentPlanner = React.lazy(() => import("./pages/student-dashboard/Dashboard"));
const StudentBookmarks = React.lazy(() => import("./pages/student-dashboard/Dashboard"));
const StudentStudyGroups = React.lazy(() => import("./pages/student-dashboard/Dashboard"));
const StudentResources = React.lazy(() => import("./pages/student-dashboard/Dashboard"));
const StudentReferral = React.lazy(() => import("./pages/student-dashboard/Dashboard"));
const SignupOffer = React.lazy(() => import("./pages/SignupOffer"));
const AllCoursesOffer = React.lazy(() => import("./pages/AllCoursesOffer"));
const StartLearningFree = React.lazy(() => import("./pages/StartLearningFree"));
const Cart = React.lazy(() => import("./pages/Cart"));
const ExploreCourses = React.lazy(() => import("./pages/ExploreCourses"));
const CourseDetail = React.lazy(() => import("./pages/CourseDetail"));
// Resources Pages
const Articles = React.lazy(() => import("./pages/resources/Articles"));
const Blog = React.lazy(() => import("./pages/resources/Blog"));

// Support Pages
const HelpCenter = React.lazy(() => import("./pages/support/HelpCenter"));

// Subject Pages
const AI = React.lazy(() => import("./pages/subjects/AI"));

// Language Pages
const Python = React.lazy(() => import("./pages/languages/Python"));

// Legal Pages
const PrivacyPolicy = React.lazy(() => import("./pages/legal/PrivacyPolicy"));
const CookiePolicy = React.lazy(() => import("./pages/legal/CookiePolicy"));
const TermsOfService = React.lazy(() => import("./pages/legal/TermsOfService"));

// Dashboard Pages
const MyLearning = React.lazy(() => import("./pages/dashboard/MyLearning"));
const Certificates = React.lazy(() => import("./pages/dashboard/Certificates"));
const Wishlist = React.lazy(() => import("./pages/dashboard/Wishlist"));
const Theme = React.lazy(() => import("./pages/dashboard/Theme"));
const QuickStart = React.lazy(() => import("./pages/dashboard/QuickStart"));
const StudentDashboardLayout = React.lazy(() => import("./components/core/Dashboard/StudentDashboardLayout"));
const StudentDashboard = React.lazy(() => import("./pages/StudentDashboard"));
const QuizInterface = React.lazy(() => import("./components/core/Dashboard/Student/QuizInterface"));
const Settings = React.lazy(() => import("./components/core/Dashboard/Settings"));
const Notifications = React.lazy(() => import("./pages/dashboard/Notifications"));
const Progress = React.lazy(() => import("./pages/dashboard/Progress"));
const InstructorDashboardLayout = React.lazy(() => import("./components/core/Dashboard/InstructorDashboardLayout"));

const MyProfile = React.lazy(() => import("./pages/dashboard/Profile"));

// New Student Dashboard Pages
const StudentDashboardHome = React.lazy(() => import("./pages/student-dashboard/Dashboard"));
const StudentCourses = React.lazy(() => import("./pages/student-dashboard/Courses"));
const StudentLearningPath = React.lazy(() => import("./pages/student-dashboard/LearningPath"));
const StudentQuiz = React.lazy(() => import("./pages/student-dashboard/Quiz"));
const StudentMessages = React.lazy(() => import("./pages/student-dashboard/Messages"));
const StudentFeedback = React.lazy(() => import("./pages/student-dashboard/Feedback"));
const StudentNotifications = React.lazy(() => import("./pages/student-dashboard/Notifications"));
const StudentCertificates = React.lazy(() => import("./pages/student-dashboard/Certificates"));
const StudentSupportPage = React.lazy(() => import("./pages/student-dashboard/Support"));
const MyPurchases = React.lazy(() => import("./pages/student-dashboard/MyPurchases"));
const AdminEnrollmentDashboard = React.lazy(() => import("./pages/AdminEnrollmentDashboard"));

const EnrolledCourses = React.lazy(() => import("./components/core/Dashboard/EnrolledCourses"));
const DashboardCart = React.lazy(() => import("./components/core/Dashboard/Cart"));
const AddCourse = React.lazy(() => import("./components/core/Dashboard/AddCourse"));
const MyCourses = React.lazy(() => import("./components/core/Dashboard/MyCourses"));
const EditCourse = React.lazy(() => import("./components/core/Dashboard/EditCourse"));
const Catalog = React.lazy(() => import("./pages/Catalog"));
const CourseDetails = React.lazy(() => import("./pages/CourseDetails"));
const ViewCourse = React.lazy(() => import("./pages/ViewCourse"));
const VideoDetails = React.lazy(() => import("./components/core/ViewCourse/VideoDetails"));
const InstructorDashboard = React.lazy(() => import("./pages/InstructorDashboard"));
const Error = React.lazy(() => import("./pages/Error"));
const Forbidden403 = React.lazy(() => import("./pages/Forbidden403"));
const Quiz = React.lazy(() => import("./pages/dashboard/Quiz"));
const Notes = React.lazy(() => import("./pages/dashboard/Notes"));
const LiveClasses = React.lazy(() => import("./pages/dashboard/LiveClasses"));


// Helper functions for dynamic lazy loading
const lazyStudentFeature = (exportName) => {
  const Comp = React.lazy(async () => {
    const mod = await import("./components/core/Dashboard/studentFeatures");
    return { default: mod[exportName] };
  });
  return Comp;
};

const LazyInstructorFeature = (exportName) => {
  const Comp = React.lazy(async () => {
    const mod = await import("./components/core/Dashboard/instructorFeatures");
    return { default: mod[exportName] };
  });
  return Comp;
};

const Recommendations = lazyStudentFeature("Recommendations");
const Calendar = lazyStudentFeature("Calendar");
const MockInterviews = lazyStudentFeature("MockInterviews");
const Badges = lazyStudentFeature("Badges");
const SkillGapAnalysis = lazyStudentFeature("SkillGapAnalysis");
const DoubtForum = lazyStudentFeature("DoubtForum");
const Leaderboard = lazyStudentFeature("Leaderboard");
const Assignments = lazyStudentFeature("Assignments");

const Revenue = LazyInstructorFeature("Revenue");
const Marketing = LazyInstructorFeature("Marketing");
const Reports = LazyInstructorFeature("Reports");
const Feedback = LazyInstructorFeature("Feedback");
const InstructorStudents = LazyInstructorFeature("InstructorStudents");
const InstructorMessages = LazyInstructorFeature("InstructorMessages");

function App() {
  const dispatch = useDispatch();
  const location = useLocation();
  const { user } = useSelector((state) => state.profile);
  
  useEffect(() => {
    const unsubscribe = subscribeSupabaseAuthToStore(dispatch);
    return unsubscribe;
  }, [dispatch]);
  
  return (
  <ThemeProvider>
  <div className="w-screen min-h-screen bg-richblack-900 flex flex-col font-inter relative transition-colors duration-300 dark:bg-richblack-900">
    {!location.pathname.startsWith("/dashboard") && 
     !location.pathname.startsWith("/instructor") && 
     !location.pathname.startsWith("/view-course") && 
     !location.pathname.startsWith("/admin") && <Navbar />}

    <div className="content-wrapper relative z-0">
      <div className="relative z-10">
  <Suspense fallback={<AppSkeleton />}> 
  <Routes>
  {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<Home />} />
        <Route path="/offers" element={<Offers />} />
        <Route path="/all-courses-offer" element={<AllCoursesOffer />} />
        <Route path="/start-learning-free" element={<StartLearningFree />} />
        
        <Route path="catalog/:catalogName" element={<Catalog />} />
        <Route path="students" element={<Students />} />
        <Route path="explore-courses" element={<ExploreCourses />} />
        <Route path="course-catalog" element={<ExploreCourses />} />
        
        <Route path="course-purchase" element={<CoursePurchase />} />
        
        {/* Course Detail Route (Public or Private) */}
        <Route path="/courses/:courseId" element={<CourseDetail />} />
        
        <Route path="cart" element={<Cart />} />
        
        {/* Admin */}
        <Route path="/admin/login" element={<AdminOpenRoute><AdminLogin /></AdminOpenRoute>} />
        <Route path="/admin" element={<PrivateRoute><RoleRoute allow={["Admin"]}><AdminLayout /></RoleRoute></PrivateRoute>}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="courses" element={<AdminCourses />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="enrollments" element={<AdminEnrollmentDashboard userId={user?.id} userRole="admin" />} />
        </Route>
        <Route path="/403" element={<Forbidden403 />} />
        
        {/* Company Pages */}
        <Route path="/careers" element={<Careers />} />
        
        {/* Resources Pages */}
        <Route path="/resources/articles" element={<Articles />} />
        <Route path="/resources/blog" element={<Blog />} />
        
        {/* Support Pages */}
        <Route path="/support/help-center" element={<HelpCenter />} />
        
        {/* Subject Pages */}
        <Route path="/subjects/ai" element={<AI />} />
        
        {/* Language Pages */}
        <Route path="/languages/python" element={<Python />} />
        
        {/* Legal Pages */}
        <Route path="/legal/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/legal/cookie-policy" element={<CookiePolicy />} />
        <Route path="/legal/terms-of-service" element={<TermsOfService />} />
        
        {/* Student Dashboard Routes */}
        <Route element={<PrivateRoute><RoleRoute allow={["Student"]}><StudentDashboardLayout /></RoleRoute></PrivateRoute>}>
          <Route path="dashboard/my-profile" element={<StudentDashboardHome />} />
          <Route path="dashboard/enrolled-courses" element={<StudentCourses />} />
          <Route path="dashboard/learning-path" element={<StudentLearningPath />} />
          <Route path="dashboard/wishlist" element={<Wishlist />} />
          <Route path="dashboard/quizzes" element={<StudentQuiz />} />
          <Route path="dashboard/assignments" element={<StudentAssignments />} />
          <Route path="dashboard/analytics" element={<StudentAnalytics />} />
          <Route path="dashboard/ai-assistant" element={<StudentAIAssistant />} />
          <Route path="dashboard/planner" element={<StudentPlanner />} />
          <Route path="dashboard/achievements" element={<StudentDashboardHome />} />
          <Route path="dashboard/notes" element={<StudentDashboardHome />} />
          <Route path="dashboard/bookmarks" element={<StudentBookmarks />} />
          <Route path="dashboard/live-classes" element={<LiveClasses />} />
          <Route path="dashboard/forums" element={<StudentDashboardHome />} />
          <Route path="dashboard/leaderboard" element={<StudentLeaderboard />} />
          <Route path="dashboard/calendar" element={<StudentDashboardHome />} />
          <Route path="dashboard/downloads" element={<StudentDashboardHome />} />
          <Route path="dashboard/interview-prep" element={<StudentDashboardHome />} />
          <Route path="dashboard/jobs" element={<StudentDashboardHome />} />
          <Route path="dashboard/resume" element={<StudentDashboardHome />} />
          <Route path="dashboard/study-groups" element={<StudentStudyGroups />} />
          <Route path="dashboard/resources" element={<StudentResources />} />
          <Route path="dashboard/referral" element={<StudentReferral />} />
          <Route path="dashboard/messages" element={<StudentMessages />} />
          <Route path="dashboard/feedback" element={<StudentFeedback />} />
          <Route path="dashboard/notifications" element={<StudentNotifications />} />
          <Route path="dashboard/certificates" element={<StudentCertificates />} />
          <Route path="dashboard/support" element={<StudentSupportPage />} />
          <Route path="dashboard/my-tickets" element={<MyTickets />} />
          <Route path="dashboard/billing" element={<StudentDashboardHome />} />
          <Route path="dashboard/purchase-history" element={<MyPurchases />} />
          <Route path="dashboard/settings" element={<Settings />} />
          <Route path="dashboard/cart" element={<DashboardCart />} />
        </Route>

        {/* Instructor Onboarding */}
        <Route path="/instructor/setup" element={<PrivateRoute><RoleRoute allow={["Instructor"]}><InstructorOnboarding /></RoleRoute></PrivateRoute>} />
        
        {/* Instructor Dashboard Routes */}
        <Route element={<PrivateRoute><RoleRoute allow={["Instructor"]}><InstructorDashboardLayout /></RoleRoute></PrivateRoute>}>
          <Route path="dashboard/instructor" element={<InstructorDashboard />} />
          <Route path="dashboard/instructor/info" element={<InstructorInfo />} />
          <Route path="dashboard/instructor/my-courses" element={<MyCourses />} />
          <Route path="dashboard/instructor/add-course" element={<AddCourse />} />
          <Route path="dashboard/instructor/course-builder" element={<InstructorDashboard />} />
          <Route path="dashboard/instructor/quizzes" element={<Quiz />} />
          <Route path="dashboard/instructor/notes" element={<Notes />} />
          <Route path="dashboard/instructor/live-classes" element={<LiveClasses />} />
          <Route path="dashboard/instructor/profile" element={<MyProfile />} />
          <Route path="dashboard/instructor/settings" element={<Settings />} />
          <Route path="dashboard/instructor/marketing" element={<Marketing />} />
          <Route path="dashboard/instructor/students" element={<InstructorStudents />} />
          <Route path="dashboard/instructor/messages" element={<InstructorMessages />} />
          <Route path="dashboard/instructor/feedback" element={<Feedback />} />
          <Route path="dashboard/instructor/discussions" element={<InstructorDashboard />} />
          <Route path="dashboard/instructor/payouts" element={<InstructorEarnings />} />
          <Route path="dashboard/instructor/reports" element={<InstructorAnalytics />} />
          <Route path="dashboard/instructor/downloads" element={<InstructorResources />} />
          <Route path="dashboard/instructor/jobs" element={<InstructorDashboard />} />
          <Route path="dashboard/instructor/announcements" element={<InstructorNotifications />} />
          <Route path="dashboard/instructor/calendar" element={<InstructorDashboard />} />
          <Route path="dashboard/instructor/integrations" element={<InstructorDashboard />} />
          <Route path="dashboard/instructor/billing" element={<InstructorDashboard />} />
          {/* New Feature Routes */}
          <Route path="dashboard/instructor/earnings"          element={<InstructorEarnings />} />
          <Route path="dashboard/instructor/analytics"         element={<InstructorAnalytics />} />
          <Route path="dashboard/instructor/assignments"        element={<InstructorAssignments />} />
          <Route path="dashboard/instructor/notifications"      element={<InstructorNotifications />} />
          <Route path="dashboard/instructor/reviews"            element={<InstructorReviews />} />
          <Route path="dashboard/instructor/resources"          element={<InstructorResources />} />
          <Route path="dashboard/instructor/coupons"            element={<InstructorCoupons />} />
          <Route path="dashboard/instructor/webinars"           element={<InstructorWebinars />} />
          <Route path="dashboard/instructor/ai-assistant"       element={<InstructorAIAssistant />} />
          <Route path="dashboard/instructor/student-progress"   element={<InstructorStudentProgress />} />
          <Route path="dashboard/instructor/affiliate"          element={<InstructorAffiliate />} />
          <Route path="dashboard/instructor/verification"       element={<InstructorVerification />} />
          <Route path="dashboard/instructor/attendance"         element={<InstructorAttendance />} />
          <Route path="dashboard/instructor/certificates"       element={<InstructorCertificates />} />
          <Route path="dashboard/instructor/support"       element={<InstructorSupport />} />
          <Route path="dashboard/instructor/enrollments"   element={<AdminEnrollmentDashboard userId={user?.id} userRole="instructor" />} />
        </Route>
      
      {/* Auth Routes */}
      <Route path="login" element={<OpenRoute><Login /></OpenRoute>} />
      <Route path="signup" element={<OpenRoute><Signup /></OpenRoute>} />
      <Route path="register/student" element={<OpenRoute><StudentSignup /></OpenRoute>} />
      <Route path="register/instructor" element={<OpenRoute><InstructorSignup /></OpenRoute>} />
      <Route path="signup-offer" element={<OpenRoute><SignupOffer /></OpenRoute>} />
      <Route path="forgot-password" element={<OpenRoute><ForgotPassword /></OpenRoute>} />
      <Route path="phone-verification" element={<OpenRoute><PhoneVerification /></OpenRoute>} />
      <Route path="verify-email" element={<VerifyEmail />} />
      <Route path="update-password" element={<UpdatePassword />} />




      {/* Static Routes */}
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />

      <Route path="/course/:courseId" element={<CourseDetail />} />

    {/* Course Viewing Routes */}
    <Route
      path="view-course/:courseId"
      element={<PrivateRoute><ViewCourse /></PrivateRoute>}
    />
    <Route
      path="learn/:courseId"
      element={<PrivateRoute><ViewCourse /></PrivateRoute>}
    />

    {/* Course Routes - Protected by Authentication */}
    {courseRoutes.map((route, index) => (
      <Route key={index} path={route.path} element={route.element} />
    ))}

    <Route path="*" element={<Error />} />


  </Routes>
    </Suspense>
      
      </div>
    </div>
  {/* Removed black overlay above footer */}
  </div>
  </ThemeProvider>
  );
}

export default App;

