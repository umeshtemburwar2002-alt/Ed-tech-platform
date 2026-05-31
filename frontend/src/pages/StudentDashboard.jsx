import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  FaBook, FaTrophy, FaClock, FaFire, FaChartLine,
  FaPlayCircle, FaCheckCircle, FaArrowRight, FaGraduationCap,
  FaMedal, FaAward, FaBullseye, FaBell, FaStar,
  FaChevronRight, FaPlusCircle, FaSpinner, FaYoutube
} from "react-icons/fa";
import { supabase } from "../config/supabaseClient";


// ─── Thumbnail helper ────────────────────────────────────────────────────────
function getCourseThumbnail(course) {
  if (!course) return null;
  const ytId = course.youtube_video_id;
  return (
    (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null) ||
    course.youtube_thumbnail_url ||
    course.final_thumbnail_url ||
    course.thumbnail_url ||
    (course.thumbnail && !course.thumbnail.includes("unsplash") ? course.thumbnail : null) ||
    null
  );
}

// ─── Fetch enrolled courses from enrolled_courses VIEW (one query) ───────────
async function fetchEnrolledCourses(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("enrolled_courses")
    .select("*")
    .eq("student_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[fetchEnrolledCourses]", error.message);
    return [];
  }
  return (data || []).map(row => ({
    ...row,
    id: row.course_id,
    instructor: {
      first_name: row.instructor_first_name,
      last_name:  row.instructor_last_name,
      avatar_url: row.instructor_avatar,
    },
  }));
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function StudentDashboard() {
  const { user } = useSelector((state) => state.profile);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [featuredCourses, setFeaturedCourses] = useState([]);

  const firstName =
    user?.full_name?.trim().split(" ")[0] ||
    user?.firstName?.trim() ||
    user?.first_name?.trim() ||
    "Student";

  // ─── Fetch real data ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }

    const load = async () => {
      try {
        const [enrolled, featured] = await Promise.all([
          fetchEnrolledCourses(user.id),
          supabase
            .from("courses")
            .select(`id, title, rating, total_students, is_featured, status,
                     final_thumbnail_url, youtube_thumbnail_url, youtube_video_id, thumbnail`)
            .eq("status", "published")
            .eq("is_featured", true)
            .order("rating", { ascending: false })
            .limit(4)
            .then(r => r.data || []),
        ]);
        setEnrolledCourses(enrolled);
        setFeaturedCourses(featured);
      } catch (e) {
        console.error("[StudentDashboard] fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  const stats = {
    enrolledCourses: enrolledCourses.length,
    completedCourses: enrolledCourses.filter(c => c.completed).length,
    activeStreak: 7,
    studyHours: 0
  };

  const lastActivity = enrolledCourses.find(c => !c.completed) || enrolledCourses[0];
  const overallProgress = enrolledCourses.length
    ? Math.round(enrolledCourses.reduce((s, c) => s + (c.progress || 0), 0) / enrolledCourses.length)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <FaSpinner className="w-10 h-10 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden" animate="visible" variants={containerVariants}
      className="space-y-8 pb-10"
    >
      {/* ── WELCOME + STATS ──────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              Welcome back, <span className="text-cyan-400 capitalize">{firstName}!</span>
            </h1>
            <p className="mt-2 text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">
              Ready to continue your learning journey today?
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Enrolled Courses", value: stats.enrolledCourses, icon: FaGraduationCap, color: "text-cyan-400", bg: "bg-cyan-500/10" },
            { label: "Completed", value: stats.completedCourses, icon: FaCheckCircle, color: "text-green-400", bg: "bg-green-500/10" },
            { label: "Learning Streak", value: `${stats.activeStreak} Days`, icon: FaFire, color: "text-orange-400", bg: "bg-orange-500/10" },
            { label: "Overall Progress", value: `${overallProgress}%`, icon: FaChartLine, color: "text-purple-400", bg: "bg-purple-500/10" },
          ].map((stat, i) => (
            <div key={i} className="bg-richblack-800 rounded-3xl p-6 border border-richblack-700 flex items-center gap-4 group hover:border-white/20 transition-all shadow-xl">
              <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center text-xl shadow-lg border border-white/5 group-hover:scale-110 transition-transform`}>
                <stat.icon />
              </div>
              <div>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
                <h3 className="text-xl font-black mt-1 text-white">{stat.value}</h3>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── MAIN GRID ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* LEFT COLUMN */}
        <div className="lg:col-span-8 space-y-10">

          {/* CONTINUE LEARNING (top enrolled course) */}
          <section className="space-y-6">
            <h2 className="text-xl font-black text-white flex items-center gap-3">
              <span className="w-1.5 h-6 bg-cyan-500 rounded-full" />
              Continue Learning
            </h2>

            {lastActivity ? (
              <div
                className="bg-richblack-800 rounded-3xl p-6 md:p-8 border border-richblack-700 shadow-2xl relative overflow-hidden group cursor-pointer hover:border-cyan-500/30 transition-all"
                onClick={() => navigate(`/learn/${lastActivity.id}`)}
              >
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                  <FaPlayCircle className="text-9xl rotate-12" />
                </div>
                <div className="flex flex-col md:flex-row gap-8 relative z-10">
                  <div className="w-full md:w-64 h-40 rounded-2xl overflow-hidden shadow-2xl shrink-0 border border-white/10 bg-slate-950">
                    {lastActivity.thumbnail ? (
                      <img
                        src={lastActivity.thumbnail}
                        alt={lastActivity.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        onError={e => { e.target.style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FaYoutube className="text-slate-700 text-5xl" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <span className="bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-cyan-500/30">
                        {lastActivity.completed ? "Completed" : "In Progress"}
                      </span>
                      <h3 className="text-2xl font-black text-white tracking-tight line-clamp-2">{lastActivity.title}</h3>
                      <p className="text-slate-400 text-sm font-bold">
                        {lastActivity.instructor?.first_name} {lastActivity.instructor?.last_name}
                      </p>
                    </div>
                    <div className="mt-6 space-y-4">
                      <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                        <span>Progress</span>
                        <span className="text-cyan-400">{lastActivity.progress}%</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${lastActivity.progress}%` }}
                          className="h-full bg-cyan-500 shadow-[0_0_15px_rgba(0,180,216,0.5)]"
                        />
                      </div>
                      <button
                        className="btn-primary w-full py-4 flex items-center justify-center gap-3 shadow-lg shadow-cyan-500/20 text-xs font-black uppercase tracking-widest"
                        onClick={(e) => { e.stopPropagation(); navigate(`/learn/${lastActivity.id}`); }}
                      >
                        Continue <FaArrowRight className="text-[10px]" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
                <div className="bg-[#1A1F36] rounded-3xl p-12 text-center border border-white/5 shadow-2xl">
                  <div className="w-24 h-24 rounded-full bg-cyan-500/10 flex items-center justify-center mx-auto mb-6">
                    <FaGraduationCap className="text-4xl text-cyan-400" />
                  </div>
                  <h3 className="text-2xl font-black text-white mb-2">No Courses Yet</h3>
                  <p className="text-slate-400 font-bold">You haven't enrolled in any courses yet.</p>
                </div>
            )}
          </section>

          {/* MY ENROLLED COURSES GRID */}
          {enrolledCourses.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-white flex items-center gap-3">
                  <span className="w-1.5 h-6 bg-purple-500 rounded-full" />
                  My Courses
                </h2>
                <Link
                  to="/dashboard/enrolled-courses"
                  className="text-[10px] font-black text-cyan-500 hover:text-cyan-400 tracking-widest uppercase"
                >
                  View All
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {enrolledCourses.slice(0, 3).map((course) => (
                  <div
                    key={course.id}
                    onClick={() => navigate(`/learn/${course.id}`)}
                    className="bg-richblack-800 rounded-3xl p-5 border border-richblack-700 shadow-xl group hover:border-white/10 transition-all cursor-pointer"
                  >
                    <div className="h-32 rounded-2xl overflow-hidden mb-4 border border-white/5 bg-slate-950">
                      {course.thumbnail ? (
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          onError={e => { e.target.style.display = "none"; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FaYoutube className="text-slate-700 text-3xl" />
                        </div>
                      )}
                    </div>
                    <h4 className="font-bold text-white text-sm mb-4 leading-tight h-10 line-clamp-2">{course.title}</h4>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-[8px] font-black text-slate-500 uppercase tracking-widest">
                        <span>Progress</span>
                        <span className="text-cyan-400">{course.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500" style={{ width: `${course.progress}%` }} />
                      </div>
                    </div>
                    <button className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-center text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all text-slate-300">
                      {course.completed ? "Review ✓" : "Continue →"}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* FEATURED / RECOMMENDED COURSES */}
          {featuredCourses.length > 0 && (
            <section className="space-y-6">
              <h2 className="text-xl font-black text-white flex items-center gap-3">
                <span className="w-1.5 h-6 bg-orange-500 rounded-full" />
                Recommended for You 🔥
              </h2>
              <div className="flex gap-6 overflow-x-auto pb-6">
                {featuredCourses.map((course) => {
                  const thumb = getCourseThumbnail(course);
                  return (
                    <Link
                      key={course.id}
                      to={`/courses/${course.id}`}
                      className="min-w-[280px] bg-richblack-800 rounded-3xl p-5 border border-richblack-700 shadow-xl group hover:border-orange-500/30 transition-all flex-shrink-0"
                    >
                      <div className="h-36 rounded-2xl overflow-hidden mb-4 relative bg-slate-950">
                        {thumb ? (
                          <img src={thumb} alt={course.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" onError={e => { e.target.style.display="none"; }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><FaYoutube className="text-slate-700 text-4xl" /></div>
                        )}
                        {course.rating > 0 && (
                          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-yellow-400 text-[10px] font-black flex items-center gap-1">
                            <FaStar /> {(course.rating || 0).toFixed(1)}
                          </div>
                        )}
                      </div>
                      <h4 className="font-bold text-white text-sm mb-2 line-clamp-2">{course.title}</h4>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                          {course.total_students || 0} students
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-cyan-500 text-white flex items-center justify-center shadow-lg shadow-cyan-500/20 hover:scale-110 transition-transform">
                          <FaPlusCircle className="text-xs" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="lg:col-span-4 space-y-8">

          {/* PROGRESS TRACKER */}
          <div className="bg-richblack-800 rounded-3xl p-8 border border-richblack-700 shadow-xl">
            <h3 className="text-lg font-black text-white mb-8 flex items-center gap-3">
              <FaChartLine className="text-cyan-400" /> Progress Tracker
            </h3>
            <div className="relative w-40 h-40 mx-auto mb-8">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-white/5" />
                <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="10" fill="transparent"
                  strokeDasharray={440}
                  strokeDashoffset={440 - (440 * overallProgress) / 100}
                  strokeLinecap="round"
                  className="text-cyan-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-white">{overallProgress}%</span>
                <span className="text-[8px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Overall</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Enrolled</p>
                <p className="text-xl font-black text-cyan-400">{enrolledCourses.length}</p>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Finished</p>
                <p className="text-xl font-black text-green-400">{stats.completedCourses}</p>
              </div>
            </div>
          </div>

          {/* DAILY GOAL */}
          <div className="bg-gradient-to-br from-indigo-600/10 to-purple-600/10 rounded-3xl p-8 border border-indigo-500/20 shadow-xl">
            <h3 className="text-lg font-black text-white mb-6 flex items-center gap-3">
              <FaBullseye className="text-indigo-400" /> Daily Goal
            </h3>
            <p className="text-sm font-bold text-slate-300 mb-4">Complete 2 lessons today</p>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden mb-3">
              <div className="h-full w-1/2 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
            </div>
            <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <span>Progress</span>
              <span>1 / 2 Lessons</span>
            </div>
          </div>

          {/* ACHIEVEMENTS */}
          <div className="bg-richblack-800 rounded-3xl p-8 border border-richblack-700 shadow-xl">
            <h3 className="text-lg font-black text-white mb-8 flex items-center gap-3">
              <FaMedal className="text-yellow-400" /> Achievements
            </h3>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { icon: FaFire, color: "text-orange-400", bg: "bg-orange-500/10" },
                { icon: FaAward, color: "text-purple-400", bg: "bg-purple-500/10" },
                { icon: FaMedal, color: "text-yellow-400", bg: "bg-yellow-500/10" }
              ].map((badge, i) => (
                <div key={i} className={`w-full aspect-square ${badge.bg} ${badge.color} rounded-2xl flex items-center justify-center text-2xl border border-white/5 shadow-lg`}>
                  <badge.icon />
                </div>
              ))}
            </div>
            <div className="p-5 bg-white/5 rounded-2xl border border-white/5 text-center group cursor-pointer hover:bg-white/10 transition-all">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Next Badge</p>
              <h4 className="text-sm font-bold text-white mb-2">Centurion</h4>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full w-[80%] bg-cyan-500" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
