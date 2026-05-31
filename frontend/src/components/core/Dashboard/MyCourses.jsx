import React, { useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaPlus, FaEdit, FaTrash, FaEye, FaSearch,
  FaFilter, FaStar, FaUsers, FaCheckCircle
} from "react-icons/fa";
import { deleteCourse as supabaseDeleteCourse } from "../../../services/courseService";
import { useInstructorCourses } from "../../../hooks/useInstructorCourses";
import CourseViewModal from "./CourseViewModal";
import CourseEditModal from "./CourseEditModal";
import CourseRow from "./CourseRow";

// ─── Enhanced dummy data injected into mock courses ────────────────────────────
const SEED_EXTRA = [
  { level: "Beginner", language: "English", duration: "18h",  rating: 4.8, sections: [
    { sectionName: "Getting Started", subSection: [{ title: "Introduction", timeDuration: "5" }, { title: "Setup & Installation", timeDuration: "12" }] },
    { sectionName: "Core Concepts", subSection: [{ title: "Variables & Types", timeDuration: "18" }, { title: "Functions", timeDuration: "22" }] },
  ], tag: ["javascript", "es6", "web"] },
  { level: "Intermediate", language: "English", duration: "24h", rating: 4.6, sections: [
    { sectionName: "React Basics", subSection: [{ title: "JSX Deep Dive", timeDuration: "15" }, { title: "Props & State", timeDuration: "20" }] },
    { sectionName: "Hooks", subSection: [{ title: "useState", timeDuration: "12" }, { title: "useEffect", timeDuration: "16" }] },
  ], tag: ["react", "hooks", "frontend"] },
];

const enrich = (course, i) => ({
  ...course,
  ...(SEED_EXTRA[i % SEED_EXTRA.length] ?? {}),
  studentsEnrolled: Array(Math.floor(Math.random() * 200) + 20).fill(null),
  price: course.price ?? (i % 3 === 0 ? 0 : 999 + i * 200),
  status: i % 3 === 0 ? "draft" : "published",
});

// ─── Confirmation Modal ─────────────────────────────────────────────────────────
function DeleteModal({ course, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-richblack-800 border border-richblack-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl"
      >
        <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FaTrash className="text-2xl text-red-400" />
        </div>
        <h3 className="text-xl font-black text-white text-center mb-2">Delete Course?</h3>
        <p className="text-slate-400 text-sm text-center mb-1">You are about to permanently delete:</p>
        <p className="text-white font-bold text-center text-sm mb-6 px-4 py-2 bg-richblack-900 rounded-lg border border-richblack-700">
          "{course?.title}"
        </p>
        <p className="text-red-400/80 text-xs text-center mb-6">
          ⚠️ This action cannot be undone. All lectures, students data and analytics will be lost.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 bg-richblack-700 hover:bg-richblack-600 text-white rounded-xl font-bold text-sm transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FaTrash className="text-xs" />}
            {loading ? "Deleting..." : "Yes, Delete"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MyCourses() {
  const { user } = useSelector(s => s.profile);
  const navigate  = useNavigate();

  const { courses, loading, error: fetchError, setError: setFetchError, setCourses } = useInstructorCourses(user?.id);
  const [query, setQuery]               = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [viewCourse,   setViewCourse]   = useState(null);
  const [editCourse,   setEditCourse]   = useState(null);
  const [deleteCourse, setDeleteCourse] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Normalize courses for display
  const normalizedCourses = useMemo(() => {
    return courses.map(c => {
      // Resolve best thumbnail (YouTube > uploaded > none)
      const ytId = c.youtube_video_id || null;
      const resolvedThumb =
        (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null) ||
        c.youtube_thumbnail_url ||
        c.final_thumbnail_url ||
        c.custom_thumbnail_url ||
        c.thumbnail_url ||
        (c.thumbnail && !c.thumbnail.includes('unsplash') ? c.thumbnail : null) ||
        null;

      return {
        ...c,
        _id:               c.id,
        title:             c.title || c.course_name || "Untitled Course",
        thumbnail_url:     resolvedThumb || c.thumbnail_url || c.thumbnail,
        // explicit youtube fields
        youtube_video_id:        c.youtube_video_id || null,
        youtube_thumbnail_url:   resolvedThumb,
        final_thumbnail_url:     c.final_thumbnail_url || resolvedThumb,
        category:          c.category,
        studentsEnrolled:  c.enrollments ?? [],
        price:             c.price,
        status:            c.status,
        rating:            c.rating ?? null,
        level:             c.level ?? null,
        // legacy YouTube URL fields
        preview_video_url: c.preview_video_url ?? null,
        youtube_url:       c.youtube_url ?? null,
        youtubeLink:       c.youtubeLink ?? null,
      };
    });
  }, [courses]);


  const filtered = useMemo(() => {
    let list = [...normalizedCourses];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(c => (c.title ?? "").toLowerCase().includes(q));
    }
    if (statusFilter !== "all") list = list.filter(c => c.status === statusFilter);
    return list;
  }, [normalizedCourses, query, statusFilter]);

  // Navigate to full edit page instead of modal
  const handleEditCourse = (course) => {
    const courseId = course.id || course._id;
    navigate(`/dashboard/instructor/edit-course/${courseId}`);
  };

  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    const { error } = await supabaseDeleteCourse(deleteCourse._id);
    if (error) {
      toast.error(`Delete failed: ${error.message}`);
    } else {
      setCourses(prev => prev.filter(c => c.id !== (deleteCourse.id || deleteCourse._id)));
      toast.success(`"${deleteCourse.title}" deleted`);
    }
    setDeleteLoading(false);
    setDeleteCourse(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-richblack-800 p-6 rounded-2xl border border-richblack-700 shadow-xl">
        <div>
          <h1 className="text-3xl font-black text-richblack-5">My Courses</h1>
          <p className="text-sm text-richblack-300 mt-1">
            {courses.length} course{courses.length !== 1 ? "s" : ""} · {courses.filter(c => c.status === "published").length} published
          </p>
        </div>
        <button
          onClick={() => navigate("/dashboard/instructor/add-course")}
          className="flex items-center gap-2 px-6 py-3 bg-yellow-50 text-richblack-900 rounded-xl font-black hover:bg-yellow-100 transition-all shadow-lg hover:scale-105 active:scale-95 text-sm"
        >
          <FaPlus /> New Course
        </button>
      </div>

      {fetchError && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-sm">
          <span className="text-red-400 text-lg shrink-0">⚠️</span>
          <div className="min-w-0">
            <p className="font-bold text-red-400 mb-1">Database Error</p>
            <p className="text-red-300/80 text-xs break-all">{fetchError}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-red-400/60">Fix:</span>
              <code className="text-[10px] bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded text-red-300">
                Supabase Dashboard → SQL Editor → Run complete_schema.sql
              </code>
              <code className="text-[10px] bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded text-red-300">
                then run phase2_patch.sql
              </code>
            </div>
          </div>
          <button onClick={() => setFetchError(null)} className="text-red-400/50 hover:text-red-400 text-lg shrink-0 ml-auto">×</button>
        </div>
      )}

      <div className="flex flex-wrap gap-4 items-center bg-richblack-800/50 p-4 rounded-xl border border-richblack-700">
        <div className="relative flex-1 min-w-[220px]">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-richblack-400 text-xs" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search courses..."
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg bg-richblack-900 border border-richblack-700 focus:border-yellow-50 outline-none text-richblack-25 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <FaFilter className="text-richblack-400 text-xs" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 text-sm rounded-lg bg-richblack-900 border border-richblack-700 focus:border-yellow-50 outline-none text-richblack-25 cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="pending">Pending</option>
            <option value="draft">Draft</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        {(query || statusFilter !== "all") && (
          <button onClick={() => { setQuery(""); setStatusFilter("all"); }} className="text-xs text-slate-500 hover:text-slate-300 font-bold transition-colors">
            Clear ×
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-richblack-700 bg-richblack-800 overflow-hidden shadow-2xl">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-yellow-50/30 border-t-yellow-50 rounded-full animate-spin" />
            <p className="text-richblack-300 text-sm animate-pulse">Loading your courses...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-4 text-center px-6">
            <div className="w-16 h-16 bg-richblack-700 rounded-2xl flex items-center justify-center">
              <FaCheckCircle className="text-2xl text-richblack-400" />
            </div>
            <div>
              <h3 className="text-lg font-black text-richblack-5 mb-1">No Courses Found</h3>
              <p className="text-richblack-400 text-sm mb-4 max-w-xs">
                {query || statusFilter !== "all" ? "Try adjusting your search or filter." : "You haven't created any courses yet."}
              </p>
              {!(query || statusFilter !== "all") && (
                <button
                  onClick={() => navigate("/dashboard/instructor/add-course")}
                  className="px-6 py-2.5 bg-yellow-50 text-richblack-900 rounded-xl font-bold text-sm hover:bg-yellow-100 transition-all"
                >
                  Create First Course
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.12em] text-richblack-400 bg-richblack-900/60 border-b border-richblack-700">
                  {["Course Info", "Category", "Status", "Price", "Actions"].map(h => (
                    <th key={h} className={`py-4 px-6 font-black text-left ${h === "Actions" ? "text-center" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {filtered.map(course => (
                    <CourseRow
                      key={course._id}
                      course={course}
                      onView={setViewCourse}
                      onEdit={handleEditCourse}
                      onDelete={setDeleteCourse}
                    />
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {viewCourse && <CourseViewModal course={viewCourse} onClose={() => setViewCourse(null)} />}
        {/* Edit is now a full page — modal removed */}
        {deleteCourse && (
          <DeleteModal
            course={deleteCourse}
            loading={deleteLoading}
            onConfirm={handleConfirmDelete}
            onCancel={() => setDeleteCourse(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
