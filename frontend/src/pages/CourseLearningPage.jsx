// ═══════════════════════════════════════════════════════════════════════════
// COURSE LEARNING PAGE — Full Supabase-native player with curriculum sidebar
// Fixes: auto-load first lesson, thumbnail cards, multi-lesson playback,
//        video_url fallback, dynamic embed URL, debug console logs
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  FaPlay, FaCheckCircle, FaArrowLeft, FaChevronDown, FaChevronUp,
  FaLock, FaShareAlt, FaBookOpen, FaRegStickyNote, FaFolderOpen,
  FaCommentDots, FaSpinner, FaYoutube, FaList, FaClock
} from "react-icons/fa";
import { supabase } from "../config/supabaseClient";
import { extractYouTubeVideoId, getYoutubeThumbnail } from "../utils/youtubeUtils";
import Navbar from "../components/common/Navbar";
import Footer from "../components/common/Footer";

// ─── Utility: resolve the best embed URL from a lesson ─────────────────────
function getLessonEmbedUrl(lesson) {
  if (!lesson) return null;

  // Already computed embed URL from DB trigger
  if (lesson.youtube_embed_url) {
    return lesson.youtube_embed_url + "?autoplay=1&rel=0&modestbranding=1";
  }

  // Has explicit video_id
  if (lesson.youtube_video_id) {
    return `https://www.youtube.com/embed/${lesson.youtube_video_id}?autoplay=1&rel=0&modestbranding=1`;
  }

  // Derive from any available URL field
  const rawUrl =
    lesson.youtube_video_url ||
    lesson.video_url ||
    lesson.preview_video_url ||
    null;

  if (rawUrl) {
    const vid = extractYouTubeVideoId(rawUrl);
    if (vid) {
      return `https://www.youtube.com/embed/${vid}?autoplay=1&rel=0&modestbranding=1`;
    }
  }

  return null;
}

// ─── Utility: get lesson thumbnail ──────────────────────────────────────────
function getLessonThumbnail(lesson) {
  if (!lesson) return null;

  if (lesson.youtube_thumbnail_url) return lesson.youtube_thumbnail_url;

  const id =
    lesson.youtube_video_id ||
    extractYouTubeVideoId(lesson.youtube_video_url || lesson.video_url || "");

  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

// ─── Utility: format duration ────────────────────────────────────────────────
function formatDuration(lesson) {
  if (lesson.duration_seconds && lesson.duration_seconds > 0) {
    const m = Math.floor(lesson.duration_seconds / 60);
    const s = lesson.duration_seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  if (lesson.duration) return String(lesson.duration);
  return null;
}

// ─── Lesson Thumbnail Card ───────────────────────────────────────────────────
function LessonCard({ lesson, index, isActive, isDone, onSelect, onToggleDone }) {
  const thumb = getLessonThumbnail(lesson);
  const embedUrl = getLessonEmbedUrl(lesson);
  const hasVideo = !!embedUrl;
  const dur = formatDuration(lesson);

  return (
    <div
      onClick={() => onSelect(lesson)}
      className={`group cursor-pointer transition-all border-l-2 ${
        isActive
          ? "bg-purple-600/10 border-purple-500"
          : "border-transparent hover:bg-white/[0.03] hover:border-white/10"
      }`}
    >
      {/* Thumbnail row */}
      <div className="flex gap-3 px-4 pt-3 pb-1">
        {/* Checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleDone(lesson.id); }}
          className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-1 transition-all ${
            isDone ? "bg-emerald-500 border-emerald-500" : "border-slate-700 hover:border-slate-500"
          }`}
        >
          {isDone && <FaCheckCircle className="text-white text-[8px]" />}
        </button>

        {/* Thumbnail */}
        <div className="relative w-24 h-14 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-white/5">
          {thumb ? (
            <img
              src={thumb}
              alt={lesson.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                if (e.target.src.includes("maxresdefault")) {
                  e.target.src = thumb.replace("maxresdefault", "hqdefault");
                } else {
                  e.target.style.display = "none";
                }
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <FaYoutube className="text-slate-600 text-xl" />
            </div>
          )}
          {/* Play overlay */}
          <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${
            isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}>
            <div className="w-7 h-7 bg-black/60 rounded-full flex items-center justify-center">
              <FaPlay className={`text-[9px] ml-0.5 ${isActive ? "text-purple-400" : "text-white"}`} />
            </div>
          </div>
          {/* Duration badge */}
          {dur && (
            <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] px-1 rounded font-mono">
              {dur}
            </span>
          )}
          {/* Lock */}
          {!hasVideo && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <FaLock className="text-slate-500 text-xs" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold line-clamp-2 leading-snug ${
            isActive ? "text-white" : "text-slate-400 group-hover:text-slate-300"
          }`}>
            {index + 1}. {lesson.title}
          </p>
          {dur && (
            <span className="flex items-center gap-1 mt-1 text-[10px] text-slate-600">
              <FaClock className="text-[8px]" /> {dur}
            </span>
          )}
          {hasVideo && (
            <span className="inline-flex items-center gap-0.5 mt-1 text-[9px] text-red-400/70 font-bold">
              <FaYoutube className="text-[10px]" /> YouTube
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function CourseLearningPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useSelector((s) => s.auth);
  const { user: profileUser } = useSelector((s) => s.profile);
  const currentUser = user || profileUser;

  // ─── Data State ───────────────────────────────────────────────────────────
  const [courseData, setCourseData] = useState(null);
  const [curriculum, setCurriculum] = useState([]);   // [{...section, lessons:[]}]
  const [flatLessons, setFlatLessons] = useState([]);
  const [activeLesson, setActiveLesson] = useState(null);
  const [completedIds, setCompletedIds] = useState(new Set());
  const [expandedSections, setExpandedSections] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ─── UI State ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("overview");
  const [notes, setNotes] = useState("");
  const [savedNotes, setSavedNotes] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const playerRef = useRef(null);

  // ─── Fetch Data ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!courseId) return;
    if (!currentUser) {
      toast.error("Please login to access this course");
      navigate("/login");
      return;
    }
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, currentUser?.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // ── 1. Fetch course ────────────────────────────────────────────────────
      const { data: course, error: courseErr } = await supabase
        .from("courses")
        .select(`
          id, title, description, status, is_free, price,
          final_thumbnail_url, youtube_thumbnail_url, thumbnail_url, thumbnail,
          youtube_video_id, youtube_embed_url, preview_video_url,
          learning_outcomes, requirements,
          instructor:instructor_id(first_name, last_name, avatar_url, image, about)
        `)
        .eq("id", courseId)
        .single();

      if (courseErr) throw new Error("Course not found: " + courseErr.message);

      console.log("[Learning] Course:", course);
      setCourseData(course);

      // ── 2. Fetch sections ──────────────────────────────────────────────────
      const { data: sections, error: secErr } = await supabase
        .from("sections")
        .select("id, section_name, order_index")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });

      if (secErr) throw new Error("Failed to load sections: " + secErr.message);

      // ── 3. Fetch lessons ───────────────────────────────────────────────────
      const { data: lessons, error: lesErr } = await supabase
        .from("course_lessons")
        .select(`
          id, title, description,
          video_url, youtube_video_url, youtube_video_id,
          youtube_embed_url, youtube_thumbnail_url,
          duration, duration_seconds, lesson_order,
          position, is_preview, is_free_preview, is_locked, is_published,
          section_id, course_id
        `)
        .eq("course_id", courseId)
        .order("position", { ascending: true });

      if (lesErr) throw new Error("Failed to load lessons: " + lesErr.message);

      console.log("[Learning] Raw lessons:", lessons);

      // ── 4. Enrich lessons with derived YouTube fields ──────────────────────
      const enriched = (lessons || []).map((l) => {
        const rawUrl = l.youtube_video_url || l.video_url || "";
        const vid = l.youtube_video_id || extractYouTubeVideoId(rawUrl);
        return {
          ...l,
          youtube_video_id: vid || null,
          youtube_embed_url:
            l.youtube_embed_url ||
            (vid ? `https://www.youtube.com/embed/${vid}` : null),
          youtube_thumbnail_url:
            l.youtube_thumbnail_url ||
            (vid ? `https://img.youtube.com/vi/${vid}/hqdefault.jpg` : null),
          youtube_video_url: l.youtube_video_url || rawUrl || null,
        };
      });

      // ── 5. Build curriculum tree ───────────────────────────────────────────
      const curriculumTree = (sections || []).map((sec) => ({
        ...sec,
        lessons: enriched
          .filter((l) => l.section_id === sec.id)
          .sort(
            (a, b) =>
              (a.position ?? a.lesson_order ?? 0) -
              (b.position ?? b.lesson_order ?? 0)
          ),
      }));

      // ── 6. Flat list + lessons without a section ───────────────────────────
      const sectionIds = new Set((sections || []).map((s) => s.id));
      const orphans = enriched.filter(
        (l) => !l.section_id || !sectionIds.has(l.section_id)
      );

      if (orphans.length > 0) {
        curriculumTree.push({
          id: "__orphans__",
          section_name: "Lessons",
          order_index: 9999,
          lessons: orphans,
        });
      }

      const flat = curriculumTree.flatMap((s) => s.lessons);

      console.log("[Learning] Curriculum:", curriculumTree);
      console.log("[Learning] Flat lessons:", flat);

      setCurriculum(curriculumTree);
      setFlatLessons(flat);

      // ── 7. Auto-expand first section ──────────────────────────────────────
      if (curriculumTree.length > 0) {
        setExpandedSections({ [curriculumTree[0].id]: true });
      }

      // ── 8. Auto-select FIRST lesson ───────────────────────────────────────
      const firstWithVideo = flat.find((l) => getLessonEmbedUrl(l));
      const firstLesson = firstWithVideo || flat[0] || null;
      if (firstLesson) {
        setActiveLesson(firstLesson);
        console.log("[Learning] Auto-selected lesson:", firstLesson);
        console.log("[Learning] Embed URL:", getLessonEmbedUrl(firstLesson));
      }

      // ── 9. Load progress ──────────────────────────────────────────────────
      const saved = localStorage.getItem(`progress_${courseId}`);
      if (saved) {
        try { setCompletedIds(new Set(JSON.parse(saved))); } catch {}
      }

    } catch (err) {
      console.error("[Learning] Error:", err);
      setError(err.message || "Failed to load course");
    } finally {
      setLoading(false);
    }
  };

  // ─── Lesson selection ──────────────────────────────────────────────────────
  const selectLesson = useCallback((lesson) => {
    setActiveLesson(lesson);
    setNotes((prev) => savedNotes[lesson.id] || "");
    console.log("[Learning] Selected lesson:", lesson);
    console.log("[Learning] Embed URL:", getLessonEmbedUrl(lesson));
    playerRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [savedNotes]);

  const toggleSection = (id) =>
    setExpandedSections((p) => ({ ...p, [id]: !p[id] }));

  const toggleComplete = (lessonId) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      next.has(lessonId) ? next.delete(lessonId) : next.add(lessonId);
      localStorage.setItem(`progress_${courseId}`, JSON.stringify([...next]));
      return next;
    });
  };

  // ─── Computed values ──────────────────────────────────────────────────────
  const totalCount = flatLessons.length;
  const completedCount = completedIds.size;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const courseEmbedUrl = courseData?.youtube_embed_url || 
    (courseData?.youtube_video_id ? `https://www.youtube.com/embed/${courseData.youtube_video_id}?autoplay=1&rel=0&modestbranding=1` : null);
  const embedUrl = getLessonEmbedUrl(activeLesson) || (totalCount === 0 ? courseEmbedUrl : null);
  const coursePoster =
    courseData?.final_thumbnail_url ||
    courseData?.youtube_thumbnail_url ||
    courseData?.thumbnail_url ||
    courseData?.thumbnail ||
    null;

  // ─── Debug log ──────────────────────────────────────────────────────────
  console.log("[Learning] Active lesson:", activeLesson?.title, "| embed:", embedUrl);

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#070B19] flex flex-col items-center justify-center gap-4">
        <FaSpinner className="text-purple-500 text-5xl animate-spin" />
        <p className="text-slate-400 font-bold tracking-wider animate-pulse">
          Loading Course...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#070B19] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-rose-400 text-lg font-bold">{error}</p>
          <button
            onClick={() => navigate("/explore-courses")}
            className="px-6 py-2 bg-purple-600 text-white rounded-xl font-semibold"
          >
            Browse Courses
          </button>
        </div>
      </div>
    );
  }


  if (!courseData) return null;

  return (
    <div>
      <Navbar />
      <div className="min-h-screen bg-[#070B19] text-white flex flex-col pt-20 md:pt-24">
        {/* ── TOP HEADER ──────────────────────────────────────────────────── */}
        <header className="bg-[#0B1228] border-b border-white/5 py-3 px-4 md:px-8 flex items-center justify-between gap-4 sticky top-0 z-40 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/dashboard/enrolled-courses"
              className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0"
            >
              <FaArrowLeft className="text-slate-300 text-sm" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-sm md:text-base font-black text-white line-clamp-1">{courseData.title}</h1>
              <p className="text-slate-500 text-[10px] font-semibold">
              {courseData.instructor?.first_name} {courseData.instructor?.last_name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Progress */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-xs text-purple-400 font-bold whitespace-nowrap">
              {completedCount}/{totalCount}
            </span>
          </div>

          <button
            onClick={() => setSidebarOpen((p) => !p)}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
            title="Toggle curriculum"
          >
            <FaList className="text-slate-300 text-sm" />
          </button>

          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success("Link copied!");
            }}
            className="hidden md:flex items-center gap-2 px-3 py-2 border border-white/5 bg-white/5 hover:bg-white/10 text-xs font-bold rounded-lg tracking-wider transition-colors"
          >
            <FaShareAlt /> Share
          </button>
        </div>
      </header>

      {/* ── MAIN LAYOUT ─────────────────────────────────────────────────── */}
      <main className="flex-1 flex overflow-hidden">

        {/* LEFT: Player + Tabs */}
        <section className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

            {/* ── VIDEO PLAYER ─────────────────────────────────────────── */}
            <div
              ref={playerRef}
              className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl shadow-purple-500/10 border border-white/10 relative"
            >
              {embedUrl ? (
                <iframe
                  key={activeLesson?.id || "idle"}
                  src={embedUrl}
                  title={activeLesson?.title || "Lesson"}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full"
                />
              ) : (

                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 gap-4">
                  {coursePoster && (
                    <img
                      src={coursePoster}
                      alt="Course"
                      className="absolute inset-0 w-full h-full object-cover opacity-10"
                    />
                  )}
                  <FaYoutube className="text-slate-700 text-6xl relative z-10" />
<div className="text-center px-6 relative z-10">
  {activeLesson ? (
    <>
      <p className="text-slate-400 font-bold text-sm">{activeLesson.title}</p>
      <p className="text-slate-600 text-xs mt-1">
        No video URL attached. Instructor can add one in Edit Course - Lessons.
      </p>
    </>
  ) : totalCount === 0 ? (
    <>
      <p className="text-slate-400 font-bold text-sm">No lessons yet</p>
      <p className="text-slate-600 text-xs mt-1">
        Instructor hasn't added lessons to this course yet.
      </p>
    </>
  ) : (
    <p className="text-slate-400 text-sm">Select a lesson from the curriculum -</p>
  )}
</div>
                </div>
              )}
            </div>


            {/* ── ACTIVE LESSON INFO ───────────────────────────────────── */}
            {activeLesson && (
              <div className="p-5 bg-[#0B1228] border border-white/5 rounded-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-lg md:text-xl font-black text-white line-clamp-2">
                      {activeLesson.title}
                    </h2>
                    {activeLesson.description && (
                      <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                        {activeLesson.description}
                      </p>
                    )}
                    {(activeLesson.youtube_video_url || activeLesson.video_url) && (
                      <a
                        href={activeLesson.youtube_video_url || activeLesson.video_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 mt-2 text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        <FaYoutube /> Watch on YouTube
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() => toggleComplete(activeLesson.id)}
                    className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${
                      completedIds.has(activeLesson.id)
                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                        : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20"
                    }`}
                  >
                    <FaCheckCircle />
                    {completedIds.has(activeLesson.id) ? "Done ✓" : "Mark Done"}
                  </button>
                </div>
              </div>
            )}

            {/* ── TAB BAR ─────────────────────────────────────────────── */}
            <div className="flex bg-[#0B1228] p-1 rounded-2xl border border-white/5 overflow-x-auto scrollbar-none">
              {[
                { id: "overview",    label: "Overview",    icon: FaBookOpen },
                { id: "notes",       label: "Notes",       icon: FaRegStickyNote },
                { id: "resources",   label: "Resources",   icon: FaFolderOpen },
                { id: "discussion",  label: "Discussion",  icon: FaCommentDots },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-purple-600 text-white shadow-lg"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <tab.icon className="text-sm" /> {tab.label}
                </button>
              ))}
            </div>

            {/* ── TAB CONTENT ─────────────────────────────────────────── */}
            <div className="bg-[#0B1228] p-6 rounded-2xl border border-white/5 min-h-[280px]">
              {activeTab === "overview" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-3">About This Course</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      {courseData.description || "No description available."}
                    </p>
                  </div>
                  {courseData.learning_outcomes?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-3">What You'll Learn</h3>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {courseData.learning_outcomes.map((o, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                            <FaCheckCircle className="text-emerald-400 shrink-0 mt-0.5 text-xs" />
                            {o}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-4 p-4 bg-white/5 border border-white/5 rounded-xl">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-2xl font-bold shrink-0">
                      {courseData.instructor?.first_name?.[0] || "I"}
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">
                        {courseData.instructor?.first_name} {courseData.instructor?.last_name}
                      </p>
                      <p className="text-slate-400 text-xs mt-1">
                        {courseData.instructor?.about || "Expert instructor"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "notes" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-white">Lecture Notes</h3>
                  <textarea
                    rows={6}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Capture key concepts, code snippets..."
                    className="w-full px-4 py-3 bg-[#070B19] border border-white/5 focus:border-purple-500 rounded-xl outline-none text-sm text-white placeholder-slate-600 resize-none transition-colors"
                  />
                  <button
                    onClick={() => {
                      if (!activeLesson) return;
                      setSavedNotes((p) => ({ ...p, [activeLesson.id]: notes }));
                      toast.success("Note saved locally!");
                    }}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-xs font-black uppercase rounded-xl transition-all"
                  >
                    Save Note
                  </button>
                </div>
              )}

              {activeTab === "resources" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-white">Lesson Resources</h3>
                  <p className="text-slate-500 text-xs">No resources attached to this lesson yet.</p>
                </div>
              )}

              {activeTab === "discussion" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-white">Discussion</h3>
                  <p className="text-slate-500 text-xs">Discussion board coming soon.</p>
                </div>
              )}
            </div>

          </div>
        </section>

        {/* ── RIGHT: CURRICULUM SIDEBAR ──────────────────────────────────── */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 360, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="hidden lg:flex flex-col border-l border-white/5 bg-[#0B1228] overflow-hidden shrink-0"
            >
              <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                  <span className="w-1 h-4 bg-purple-500 rounded-full" />
                  Course Curriculum
                </h3>
                <p className="text-[10px] text-slate-500 mt-1">
                  {totalCount} lesson{totalCount !== 1 ? "s" : ""} · {progressPct}% complete
                </p>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                {curriculum.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-slate-500 text-sm">No curriculum uploaded yet.</p>
                    <p className="text-slate-700 text-xs mt-1">Instructor can add lessons in Edit Course.</p>
                  </div>
                ) : (
                  curriculum.map((section, sIdx) => {
                    const isExpanded = !!expandedSections[section.id];
                    return (
                      <div key={section.id} className="border-b border-white/5 last:border-0">
                        {/* Section Header */}
                        <button
                          onClick={() => toggleSection(section.id)}
                          className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.03] transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0 text-left">
                            <span className="w-6 h-6 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-[10px] font-black text-purple-400 shrink-0">
                              {sIdx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="font-bold text-white text-sm line-clamp-1">{section.section_name}</p>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                {section.lessons?.length || 0} lesson{section.lessons?.length !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>
                          {isExpanded ? (
                            <FaChevronUp className="text-slate-500 text-xs shrink-0" />
                          ) : (
                            <FaChevronDown className="text-slate-500 text-xs shrink-0" />
                          )}
                        </button>

                        {/* Lesson Cards */}
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: "auto" }}
                              exit={{ height: 0 }}
                              className="overflow-hidden"
                            >
                              {section.lessons?.length === 0 ? (
                                <p className="px-10 py-3 text-slate-600 text-xs">No lessons in this section.</p>
                              ) : (
                                <div className="py-1 space-y-1">
                                  {section.lessons.map((lesson, lIdx) => (
                                    <LessonCard
                                      key={lesson.id}
                                      lesson={lesson}
                                      index={lIdx}
                                      isActive={activeLesson?.id === lesson.id}
                                      isDone={completedIds.has(lesson.id)}
                                      onSelect={selectLesson}
                                      onToggleDone={toggleComplete}
                                    />
                                  ))}
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </main>

      {/* ── MOBILE CURRICULUM (bottom sheet) ──────────────────────────────── */}
      <div className="lg:hidden border-t border-white/5 bg-[#0B1228]">
        <div className="p-4 border-b border-white/5">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Curriculum · {totalCount} lesson{totalCount !== 1 ? "s" : ""}
          </h3>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {curriculum.map((section, sIdx) => (
            <div key={section.id}>
              <p className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 bg-white/[0.02]">
                {sIdx + 1}. {section.section_name}
              </p>
              <div className="space-y-1 py-1">
                {section.lessons?.map((lesson, lIdx) => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    index={lIdx}
                    isActive={activeLesson?.id === lesson.id}
                    isDone={completedIds.has(lesson.id)}
                    onSelect={selectLesson}
                    onToggleDone={toggleComplete}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
</div>
      <Footer />
    </div>
  );
}
