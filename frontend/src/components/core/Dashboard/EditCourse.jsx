// ═══════════════════════════════════════════════════════════════════════════
// EDIT COURSE — Full course editing + lesson management
// ═══════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  FaSave, FaTrash, FaArrowLeft, FaYoutube, FaBook,
  FaChartBar, FaSpinner, FaGlobe, FaLock, FaList
} from "react-icons/fa";
import { supabase } from "../../../config/supabaseClient";
import { getYoutubeVideoId, getYoutubeThumbnail } from "../../../utils/youtubeUtils";
import LessonManager from "./LessonManager";

// ── YouTube URL preview helper ───────────────────────────────────────────────
function YoutubeUrlPreview({ url }) {
  const id = getYoutubeVideoId(url);
  if (!id) return null;
  return (
    <div className="mt-2 flex items-center gap-2 p-2 bg-black/30 rounded-lg border border-red-500/20">
      <img
        src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`}
        alt="Preview"
        className="w-16 aspect-video object-cover rounded"
        onError={(e) => (e.target.style.display = "none")}
      />
      <div>
        <p className="text-[10px] text-emerald-400 font-bold">✓ Valid YouTube URL</p>
        <p className="text-[10px] text-slate-500 font-mono">ID: {id}</p>
      </div>
    </div>
  );
}

// ── Tab system ───────────────────────────────────────────────────────────────
const TABS = [
  { id: "details", label: "Course Details", icon: FaBook },
  { id: "curriculum", label: "Curriculum & Lessons", icon: FaList },
  { id: "stats", label: "Stats", icon: FaChartBar },
];

export default function EditCourse() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("details");

  // ─── Fetch State ─────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [course, setCourse] = useState(null);

  // ─── Editable Fields ────────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [status, setStatus] = useState("draft");
  const [previewVideoUrl, setPreviewVideoUrl] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [videoSource, setVideoSource] = useState("youtube");

  // ─── Fetch Course ────────────────────────────────────────────────────────
  const fetchCourse = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from("courses")
        .select(`
          id, title, description, course_description, price, is_free, status,
          preview_video_url, youtube_video_url, youtube_video_id,
          final_thumbnail_url, youtube_thumbnail_url, thumbnail_url, thumbnail,
          created_at, updated_at,
          instructor_id, level, language, tags, category_id
        `)
        .eq("id", courseId)
        .single();

      if (err) throw err;
      setCourse(data);
      setTitle(data.title || "");
      setDescription(data.description || data.course_description || "");
      setPrice(data.price?.toString() || "");
      setIsFree(data.is_free || false);
      setStatus(data.status || "draft");
      const initialUrl = data.preview_video_url || data.youtube_video_url || "";
      setPreviewVideoUrl(initialUrl);
      setVideoSource(initialUrl ? "youtube" : "upload");
      // Set thumbnail preview from DB
      const thumb =
        data.final_thumbnail_url ||
        data.youtube_thumbnail_url ||
        data.thumbnail_url ||
        data.thumbnail;
      setThumbnailPreview(thumb || null);
    } catch (e) {
      setError(e.message || "Failed to load course");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (courseId) fetchCourse();
  }, [courseId, fetchCourse]);

  // ─── Handle thumbnail file ────────────────────────────────────────────────
  function handleThumbnailChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnailFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setThumbnailPreview(reader.result);
    reader.readAsDataURL(file);
  }

  // ─── Save Course ──────────────────────────────────────────────────────────
  async function handleSave() {
    if (!title.trim()) return toast.error("Course title is required");
    setSaving(true);
    setError(null);
    try {
      const videoId = getYoutubeVideoId(previewVideoUrl);
      const youtubeThumbnail = videoId ? getYoutubeThumbnail(previewVideoUrl) : null;

      // If custom thumbnail file, upload to Supabase Storage
      let customThumbnailUrl = null;
      if (thumbnailFile) {
        const fileName = `${courseId}/${Date.now()}_${thumbnailFile.name}`;
        const { error: uploadErr } = await supabase.storage
          .from("course-thumbnails")
          .upload(fileName, thumbnailFile, { upsert: true });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage
            .from("course-thumbnails")
            .getPublicUrl(fileName);
          customThumbnailUrl = urlData?.publicUrl;
        }
      }

      const patch = {
        title: title.trim(),
        description: description.trim(),
        course_description: description.trim(),
        price: isFree ? 0 : Number(price) || 0,
        is_free: isFree,
        status: status.toLowerCase(),
        preview_video_url: previewVideoUrl || null,
        youtube_video_url: previewVideoUrl || null,
        youtube_video_id: videoId || null,
        youtube_embed_url: videoId
          ? `https://www.youtube.com/embed/${videoId}`
          : null,
        youtube_thumbnail_url: youtubeThumbnail || null,
        updated_at: new Date().toISOString(),
      };

      if (videoSource === "upload" && customThumbnailUrl) {
        patch.custom_thumbnail_url = customThumbnailUrl;
        patch.thumbnail_url = customThumbnailUrl;
        patch.thumbnail_source = "custom";
        patch.final_thumbnail_url = customThumbnailUrl;
      } else if (videoSource === "youtube" && youtubeThumbnail) {
        patch.final_thumbnail_url = youtubeThumbnail;
        patch.thumbnail_source = "youtube";
        patch.thumbnail_url = youtubeThumbnail; // Explicitly set it here as well
      }

      const { error: saveErr } = await supabase
        .from("courses")
        .update(patch)
        .eq("id", courseId);

      if (saveErr) throw saveErr;

      toast.success("Course saved!");
      await fetchCourse();
      setThumbnailFile(null);
    } catch (e) {
      setError(e.message || "Failed to save course");
      toast.error(e.message || "Failed to save course");
    } finally {
      setSaving(false);
    }
  }

  // ─── Delete Course ────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!window.confirm("Permanently delete this course and all its content?")) return;
    setDeleting(true);
    try {
      // Delete sections & lessons cascade
      const { data: sections } = await supabase
        .from("sections")
        .select("id")
        .eq("course_id", courseId);

      for (const s of sections || []) {
        await supabase.from("course_lessons").delete().eq("section_id", s.id);
      }
      await supabase.from("sections").delete().eq("course_id", courseId);
      await supabase.from("courses").delete().eq("id", courseId);

      toast.success("Course deleted");
      navigate("/dashboard/instructor/my-courses");
    } catch (e) {
      toast.error(e.message || "Delete failed");
      setDeleting(false);
    }
  }

  // ─── Preview URL change: also update thumbnail ────────────────────────────
  function handlePreviewUrlChange(url) {
    setPreviewVideoUrl(url);
    const videoId = getYoutubeVideoId(url);
    if (videoId && !thumbnailFile) {
      setThumbnailPreview(getYoutubeThumbnail(url));
    }
  }

  // ─── Stats ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center gap-2 justify-center py-16 text-slate-400 text-sm">
        <FaSpinner className="animate-spin text-purple-500" /> Loading course...
      </div>
    );
  }

  if (error && !course) {
    return <div className="p-6 text-rose-400 text-sm">{error}</div>;
  }

  if (!course) return null;

  return (
    <div className="space-y-6 pb-12">

      {/* ── PAGE HEADER ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard/instructor/my-courses")}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <FaArrowLeft className="text-sm" />
          </button>
          <div>
            <h1 className="text-xl font-black text-richblack-5">{course.title}</h1>
            <p className="text-[10px] text-richblack-400 font-mono mt-0.5">ID: {courseId}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-black rounded-xl bg-yellow-50 text-richblack-900 hover:bg-yellow-100 disabled:opacity-50 transition-all shadow-md"
          >
            {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 disabled:opacity-50 transition-all"
          >
            {deleting ? <FaSpinner className="animate-spin" /> : <FaTrash />}
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      {/* ── ERROR BANNER ────────────────────────────────────────────────── */}
      {error && (
        <div className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* ── TAB NAV ─────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-richblack-800 p-1 rounded-xl border border-richblack-700 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === tab.id
                ? "bg-yellow-50 text-richblack-900 shadow-md"
                : "text-richblack-400 hover:text-richblack-50"
            }`}
          >
            <tab.icon className="text-sm" /> {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: DETAILS ────────────────────────────────────────────────── */}
      {activeTab === "details" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-6 lg:grid-cols-3"
        >
          {/* Left: Edit Form */}
          <div className="lg:col-span-2 space-y-5">
            {/* Title */}
            <div>
              <label className="text-[11px] uppercase tracking-wide text-richblack-400 font-bold block mb-1.5">
                Course Title *
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl bg-richblack-900 border border-richblack-700 focus:border-yellow-50 outline-none text-richblack-5 transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-[11px] uppercase tracking-wide text-richblack-400 font-bold block mb-1.5">
                Description *
              </label>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full resize-none px-3 py-2.5 text-sm rounded-xl bg-richblack-900 border border-richblack-700 focus:border-yellow-50 outline-none text-richblack-5 transition-colors"
              />
            </div>

            {/* Price + Free toggle */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-[11px] uppercase tracking-wide text-richblack-400 font-bold block mb-1.5">
                  Price (₹)
                </label>
                <input
                  type="number"
                  value={isFree ? "0" : price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={isFree}
                  min="0"
                  className="w-full px-3 py-2.5 text-sm rounded-xl bg-richblack-900 border border-richblack-700 focus:border-yellow-50 outline-none text-richblack-5 disabled:opacity-50 transition-colors"
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wide text-richblack-400 font-bold block mb-1.5">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl bg-richblack-900 border border-richblack-700 focus:border-yellow-50 outline-none text-richblack-5 transition-colors"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>

            {/* Free course toggle */}
            <label className="flex items-center gap-3 cursor-pointer select-none group">
              <div
                onClick={() => setIsFree((p) => !p)}
                className={`w-10 h-5 rounded-full transition-all ${isFree ? "bg-yellow-400" : "bg-richblack-700"} relative`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isFree ? "translate-x-5" : ""}`} />
              </div>
              <span className="text-sm font-bold text-richblack-300 group-hover:text-richblack-50 transition-colors">
                Free Course (no payment required)
              </span>
            </label>

            {/* Video Source & URL */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[11px] uppercase tracking-wide text-richblack-400 font-bold block">
                  Video Source *
                </label>
                <div className="flex bg-richblack-900 p-1 rounded-lg border border-richblack-700">
                  <button onClick={() => setVideoSource('youtube')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${videoSource === 'youtube' ? 'bg-yellow-50 text-richblack-900 shadow-sm' : 'text-richblack-400 hover:text-richblack-25'}`}>YOUTUBE</button>
                  <button onClick={() => setVideoSource('upload')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${videoSource === 'upload' ? 'bg-yellow-50 text-richblack-900 shadow-sm' : 'text-richblack-400 hover:text-richblack-25'}`}>UPLOAD</button>
                </div>
              </div>

              {videoSource === "youtube" ? (
                <div>
                  <div className="relative">
                    <FaYoutube className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400 text-lg" />
                    <input
                      type="url"
                      value={previewVideoUrl}
                      onChange={(e) => handlePreviewUrlChange(e.target.value)}
                      placeholder="https://youtube.com/watch?v=VIDEO_ID"
                      className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl bg-richblack-900 border border-richblack-700 focus:border-red-400 outline-none text-richblack-5 transition-colors"
                    />
                  </div>
                  <YoutubeUrlPreview url={previewVideoUrl} />
                  <p className="text-[10px] text-richblack-500 mt-1">
                    This URL is used as the course trailer and to generate the course thumbnail automatically.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-richblack-900 border border-richblack-700 rounded-xl text-center">
                  <p className="text-xs text-richblack-400">Direct video upload is currently supported via Curriculum manager.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Thumbnail + Status */}
          <div className="space-y-5">
            {/* Thumbnail Preview */}
            {videoSource === "upload" && (
              <div>
                <label className="text-[11px] uppercase tracking-wide text-richblack-400 font-bold block mb-2">
                  Course Thumbnail
                </label>
                <div className="aspect-video rounded-xl overflow-hidden bg-richblack-900 border border-richblack-700 relative">
                  {thumbnailPreview ? (
                    <img
                      src={thumbnailPreview}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                      onError={(e) => (e.target.style.display = "none")}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-richblack-500">
                      <FaYoutube className="text-4xl" />
                      <p className="text-xs">No thumbnail yet</p>
                    </div>
                  )}
                </div>
                <div className="mt-2">
                  <label className="text-[10px] text-richblack-400 block mb-1">Upload Custom Thumbnail (optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailChange}
                    className="text-xs text-richblack-400 file:mr-3 file:px-3 file:py-1 file:rounded-lg file:bg-richblack-700 file:border-0 file:text-richblack-25 file:text-xs file:cursor-pointer"
                  />
                  {thumbnailFile && (
                    <p className="text-[10px] text-emerald-400 mt-1">✓ {thumbnailFile.name}</p>
                  )}
                </div>
              </div>
            )}

            {/* Status card */}
            <div className="p-4 rounded-xl bg-richblack-800 border border-richblack-700 space-y-3">
              <p className="text-xs font-black uppercase tracking-wider text-richblack-400">Quick Status</p>
              <div className="flex items-center gap-2">
                {status === "published" ? (
                  <>
                    <FaGlobe className="text-emerald-400 text-sm" />
                    <span className="text-sm font-bold text-emerald-400">Published</span>
                  </>
                ) : (
                  <>
                    <FaLock className="text-yellow-400 text-sm" />
                    <span className="text-sm font-bold text-yellow-400">Draft</span>
                  </>
                )}
              </div>
              <p className="text-[10px] text-richblack-500">
                Last updated: {course.updated_at ? new Date(course.updated_at).toLocaleString() : "—"}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── TAB: CURRICULUM ─────────────────────────────────────────────── */}
      {activeTab === "curriculum" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <LessonManager courseId={courseId} />
        </motion.div>
      )}

      {/* ── TAB: STATS ──────────────────────────────────────────────────── */}
      {activeTab === "stats" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Status", value: status.toUpperCase(), color: status === "published" ? "text-emerald-400" : "text-yellow-400" },
            { label: "Price", value: isFree ? "FREE" : `₹${price || 0}`, color: "text-white" },
            { label: "Level", value: course.level || "—", color: "text-white" },
          ].map((s) => (
            <div key={s.label} className="p-5 rounded-xl bg-richblack-800 border border-richblack-700 text-center">
              <p className="text-[10px] text-richblack-400 uppercase tracking-wider mb-2">{s.label}</p>
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            </div>
          ))}
          <div className="sm:col-span-3 p-4 rounded-xl bg-richblack-800 border border-richblack-700">
            <p className="text-[10px] text-richblack-500 font-mono">Course ID: {courseId}</p>
            <p className="text-[10px] text-richblack-500 font-mono mt-1">
              Created: {course.created_at ? new Date(course.created_at).toLocaleString() : "—"}
            </p>
          </div>
        </motion.div>
      )}

    </div>
  );
}
