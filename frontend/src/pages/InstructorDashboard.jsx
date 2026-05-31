import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaBook, FaUsers, FaDollarSign, FaRocket,
  FaCheckCircle, FaFileAlt, FaPlus, FaEdit,
  FaChartLine, FaStar, FaClock, FaArrowRight,
  FaClipboardList, FaPlay
} from "react-icons/fa";
import { getInstructorStats, getInstructorCourses } from "../services/courseService";
import { supabase } from "../config/supabaseClient";
import { getYoutubeThumbnail } from "../utils/youtubeUtils";

// ── Stat Card ──────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, title, value, sub, iconBg, iconColor, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay }}
    className="relative overflow-hidden bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 hover:border-white/20 hover:bg-white/[0.05] transition-all group cursor-default"
  >
    <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 ${iconBg}`} />
    <div className="relative flex items-start justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">{title}</p>
        <p className="text-3xl font-black text-white mb-1">{value}</p>
        <p className="text-xs text-slate-500">{sub}</p>
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg} bg-opacity-20 group-hover:scale-110 transition-transform`}>
        <Icon className={`text-xl ${iconColor}`} />
      </div>
    </div>
  </motion.div>
);

// ── Status pill ────────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  Published: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  published: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Draft:     "bg-slate-500/10  text-slate-400  border-slate-500/20",
  draft:     "bg-slate-500/10  text-slate-400  border-slate-500/20",
};

// ── Onboarding Progress Card ─────────────────────────────────────────────────
const OnboardingCard = ({ profile, navigate }) => {
  const currentStep = profile?.onboarding_step || 1;
  const isCompleted = profile?.onboarding_completed || false;
  const isDraftSaved = profile?.draft_saved || false;

  if (isCompleted) return null;
  if (!isDraftSaved) return null;

  const progress = Math.round(((currentStep - 1) / 5) * 100);
  const lastSaved = profile?.last_saved_at 
    ? new Date(profile.last_saved_at).toLocaleString() 
    : "Recently";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-white/10"
    >
      <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/10 blur-[100px] -ml-20 -mt-20 pointer-events-none" />
      
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Complete Your Instructor Setup
            </h2>
            <p className="text-slate-400 mt-2">
              Your onboarding draft is saved. Continue from where you left off.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Last saved: {lastSaved}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-black text-blue-400 uppercase tracking-widest">Step {currentStep} of 5</p>
            <p className="text-3xl font-black text-white">{progress}%</p>
          </div>
        </div>

        <div className="w-full h-3 bg-slate-800 rounded-full mt-4 overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(profile.onboarding_step / 5) * 100}%` }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
          <p className="text-sm text-slate-500">
            Almost there! Finish your setup to start teaching.
          </p>
          <button 
            onClick={() => navigate("/instructor/setup")}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-sm hover:from-blue-500 hover:to-cyan-500 transition-all shadow-lg shadow-blue-500/25 hover:scale-105 active:scale-95"
          >
            <FaPlay className="text-xs" />
            Continue Setup
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ── Course Row (recent list) ──────────────────────────────────────────────────
const CourseRow = ({ course, navigate }) => {
  const enrollments = course.enrollments?.length ?? 0;
  const status      = course.status ?? "Draft";
  const courseTitle = course.title || course.course_name || "Untitled Course";

  // Resolve thumbnail: DB pre-computed > YouTube generated > uploaded > null
  const dbThumbnail = course.final_thumbnail_url || course.youtube_thumbnail_url || null;
  const youtubeUrl =
    course.preview_video_url ||
    course.youtube_video_url ||
    null;
  const youtubeThumbnail = dbThumbnail || getYoutubeThumbnail(youtubeUrl);
  const resolvedThumbnail = youtubeThumbnail || course.custom_thumbnail_url || course.thumbnail_url || (course.thumbnail && course.thumbnail !== '' ? course.thumbnail : null) || null;

  function handleImgError(e) {
    const src = e.target.src;
    if (youtubeUrl && src.includes("maxresdefault")) {
      const hq = getYoutubeThumbnail(youtubeUrl, "hq");
      if (hq && hq !== src) { e.target.src = hq; return; }
    }
    const fallback = course.thumbnail_url || course.thumbnail;
    if (fallback && src !== fallback) { e.target.src = fallback; return; }
    e.target.style.display = "none";
  }
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/[0.04] transition-all group cursor-pointer"
      onClick={() => navigate(`/dashboard/instructor/my-courses`)}
    >
      {/* Thumbnail */}
      <div className="w-14 aspect-video rounded-lg overflow-hidden bg-white/5 border border-white/10 shrink-0 flex items-center justify-center">
        {resolvedThumbnail
          ? <img
              src={resolvedThumbnail}
              alt={courseTitle}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={handleImgError}
              loading="lazy"
            />
          : <div className="w-full h-full flex items-center justify-center text-slate-600"><FaBook /></div>
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-white line-clamp-1 group-hover:text-[#00B4D8] transition-colors">{courseTitle}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">{course.categories?.name ?? "Uncategorized"}</p>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <FaUsers className="text-blue-400 text-[10px]" />
          <span>{enrollments}</span>
        </div>
        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${STATUS_STYLE[status] ?? STATUS_STYLE.Draft}`}>
          {status}
        </span>
        <FaArrowRight className="text-slate-600 text-[10px] group-hover:text-slate-400 group-hover:translate-x-1 transition-all" />
      </div>
    </motion.div>
  );
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function InstructorDashboard() {
  const { user }  = useSelector((s) => s.profile);
  const navigate  = useNavigate();

  const [stats,   setStats]   = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [instructorProfile, setInstructorProfile] = useState(null);

  const instructorId = user?.id;

  // ── Name resolution (matches Dashboard.jsx pattern) ─────────────────────────
  const firstName =
    user?.full_name?.trim().split(" ")[0] ||
    user?.firstName?.trim() ||
    user?.first_name?.trim() ||
    "Instructor";

  const h = new Date().getHours();
  const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    if (!instructorId) return;
    
    let isMounted = true; // Prevent state updates after unmount
    
    (async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [statsRes, coursesRes, profileRes] = await Promise.all([
          getInstructorStats(instructorId),
          getInstructorCourses(instructorId),
          supabase.from("instructor_profiles").select("*").eq("user_id", instructorId).maybeSingle(),
        ]);
        
        if (!isMounted) return; // Component unmounted, don't update state
        
        // Validate statsRes and coursesRes
        const safeStatsRes = statsRes || { data: null, error: null };
        const safeCoursesRes = coursesRes || { data: [], error: null };
        
        // Set stats even if there's an error (use default values)
        setStats(safeStatsRes.data || {
          totalCourses: 0,
          publishedCourses: 0,
          draftCourses: 0,
          totalEnrollments: 0,
          totalRevenue: 0,
        });
        
        // Set courses even if there's an error (use empty array)
        setCourses(safeCoursesRes.data || []);
        
        // Set instructor profile
        setInstructorProfile(profileRes.data);
        
        // Only set error if both requests failed
        if (statsRes.error && coursesRes.error) {
          setError("Unable to load dashboard data. Please refresh the page.");
          console.error("Dashboard errors:", { statsRes, coursesRes, profileRes });
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Unexpected dashboard error:", err);
        setError("An unexpected error occurred. Please try again.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();
    
    return () => {
      isMounted = false; // Cleanup: prevent state updates after unmount
    };
  }, [instructorId]);

  const statCards = [
    {
      icon: FaBook,       title: "Total Courses",    delay: 0,
      value: loading ? "—" : (stats?.totalCourses    ?? 0),
      sub:   `${stats?.publishedCourses ?? 0} published · ${stats?.draftCourses ?? 0} draft`,
      iconBg: "bg-violet-500", iconColor: "text-violet-400",
    },
    {
      icon: FaUsers,      title: "Total Students",   delay: 0.08,
      value: loading ? "—" : (stats?.totalEnrollments ?? 0).toLocaleString(),
      sub:   "All-time enrollments",
      iconBg: "bg-blue-500", iconColor: "text-blue-400",
    },
    {
      icon: FaDollarSign, title: "Total Revenue",    delay: 0.16,
      value: loading ? "—" : `₹${(stats?.totalRevenue ?? 0).toLocaleString()}`,
      sub:   "Estimated earnings",
      iconBg: "bg-emerald-500", iconColor: "text-emerald-400",
    },
    {
      icon: FaStar,       title: "Avg Rating",       delay: 0.24,
      value: "4.8",
      sub:   "From student reviews",
      iconBg: "bg-amber-500", iconColor: "text-amber-400",
    },
  ];

  const quickActions = [
    { label: "Create Course",   icon: FaPlus,      path: "/dashboard/instructor/add-course",   color: "bg-[#00B4D8]/10 border-[#00B4D8]/20 text-[#00B4D8]" },
    { label: "My Courses",      icon: FaBook,      path: "/dashboard/instructor/my-courses",   color: "bg-violet-500/10 border-violet-500/20 text-violet-400" },
    // { label: "Students",        icon: FaUsers,     path: "/dashboard/instructor/students",     color: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
    { label: "Analytics",       icon: FaChartLine, path: "/dashboard/instructor/analytics",   color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" },
  ];

  return (
    <div className="space-y-8">

      {/* ── Onboarding Card (if not completed) ────────────────────────────── */}
      {instructorProfile && (
        <OnboardingCard profile={instructorProfile} navigate={navigate} />
      )}

      {/* ── Error Banner (if any) ───────────────────────────────────────────── */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
        >
          <p className="font-bold mb-1">⚠️ Error Loading Dashboard</p>
          <p className="text-xs">{error}</p>
        </motion.div>
      )}

      {/* ── Welcome Banner ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden p-8 rounded-3xl bg-gradient-to-br from-violet-600/20 via-[#00B4D8]/10 to-transparent border border-white/[0.08]"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-500/10 blur-[120px] -mr-32 -mt-32 pointer-events-none" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-[#00B4D8] font-bold text-sm mb-1">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h1 className="text-3xl font-black text-white mb-2">
              {greeting}, <span className="capitalize">{firstName}</span>! 👨‍🏫
            </h1>
            <p className="text-slate-400 text-sm max-w-md">
              {loading
                ? "Loading your dashboard..."
                : courses.length === 0
                  ? "Welcome! Create your first course to get started."
                  : `You have ${stats?.publishedCourses ?? 0} live course${(stats?.publishedCourses ?? 0) !== 1 ? "s" : ""} reaching ${(stats?.totalEnrollments ?? 0).toLocaleString()} students.`
              }
            </p>
          </div>
          <Link
            to="/dashboard/instructor/add-course"
            className="flex items-center gap-2 px-6 py-3 bg-[#00B4D8] text-white rounded-xl font-bold text-sm hover:bg-[#0096b5] transition-all shadow-lg shadow-[#00B4D8]/20 hover:scale-105 active:scale-95"
          >
            <FaPlus />
            Create New Course
          </Link>
        </div>
      </motion.div>

      {/* ── Stats Grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {statCards.map((s) => <StatCard key={s.title} {...s} />)}
      </div>

      {/* ── Quick Actions + Recent Courses ──────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Quick Actions */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-5">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((a) => (
              <Link
                key={a.label}
                to={a.path}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${a.color} hover:scale-105 active:scale-95 transition-all text-center`}
              >
                <a.icon className="text-xl" />
                <span className="text-xs font-bold">{a.label}</span>
              </Link>
            ))}
          </div>

          {/* Info cards */}
          <div className="mt-5 space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <FaCheckCircle className="text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">{stats?.publishedCourses ?? 0} Live</p>
                <p className="text-[10px] text-slate-500">Published courses</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <FaFileAlt className="text-slate-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">{stats?.draftCourses ?? 0} Draft</p>
                <p className="text-[10px] text-slate-500">Unpublished courses</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <FaClock className="text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">Last updated</p>
                <p className="text-[10px] text-slate-500">
                  {courses[0]?.updated_at
                    ? new Date(courses[0].updated_at).toLocaleDateString()
                    : "No courses yet"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Courses */}
        <div className="xl:col-span-2 bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Your Courses</h2>
            <Link
              to="/dashboard/instructor/my-courses"
              className="text-xs font-bold text-[#00B4D8] hover:underline flex items-center gap-1"
            >
              View All <FaArrowRight className="text-[10px]" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-white/[0.03] animate-pulse" />
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                <FaRocket className="text-2xl text-slate-500" />
              </div>
              <div>
                <h3 className="font-bold text-white mb-1">No courses yet</h3>
                <p className="text-sm text-slate-500 mb-4">Create your first course and start teaching</p>
                <Link
                  to="/dashboard/instructor/add-course"
                  className="px-5 py-2.5 bg-[#00B4D8]/10 border border-[#00B4D8]/30 text-[#00B4D8] rounded-xl text-sm font-bold hover:bg-[#00B4D8]/20 transition-all"
                >
                  + Create First Course
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {courses.slice(0, 5).map((course) => (
                <CourseRow key={course.id} course={course} navigate={navigate} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Revenue summary bar ─────────────────────────────────────────────── */}
      {!loading && stats && stats.totalRevenue > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20"
        >
          <div>
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">Revenue Snapshot</p>
            <p className="text-2xl font-black text-white">₹{stats.totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-0.5">Estimated from {stats.totalEnrollments} enrollments</p>
          </div>
          <Link
            to="/dashboard/instructor/analytics"
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm font-bold hover:bg-emerald-500/20 transition-all"
          >
            <FaChartLine />
            View Analytics
          </Link>
        </motion.div>
      )}
    </div>
  );
}
