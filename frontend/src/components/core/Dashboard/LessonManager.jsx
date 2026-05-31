// ═══════════════════════════════════════════════════════════════════════════
// LESSON MANAGER — Add/Edit/Delete lessons inside Edit Course page
// Instructors can manage unlimited lessons per section
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  FaPlus, FaTrash, FaEdit, FaCheck, FaTimes, FaYoutube,
  FaChevronDown, FaChevronUp, FaGripVertical, FaSpinner,
  FaPlay, FaEye
} from "react-icons/fa";
import {
  getSectionsByCourse,
  createSection,
  updateSection,
  deleteSection,
  getLessonsBySection,
  createLesson,
  updateLesson,
  deleteLesson,
} from "../../../services/lessonService";
import { getYoutubeVideoId, getYoutubeThumbnail } from "../../../utils/youtubeUtils";

// ── Inline YouTube Preview ───────────────────────────────────────────────────
function YoutubePreview({ url }) {
  const videoId = getYoutubeVideoId(url);
  if (!videoId) return null;
  const thumb = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  return (
    <div className="mt-2 flex items-center gap-3 p-2 bg-black/30 rounded-lg border border-white/10">
      <img src={thumb} alt="Preview" className="w-16 aspect-video object-cover rounded" onError={(e) => (e.target.style.display = "none")} />
      <div>
        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">✓ Valid YouTube URL</p>
        <p className="text-[10px] text-slate-500 font-mono">{videoId}</p>
      </div>
    </div>
  );
}

// ── Lesson Form (inline) ─────────────────────────────────────────────────────
function LessonForm({ sectionId, courseId, onSave, onCancel, initialData = null }) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [youtubeUrl, setYoutubeUrl] = useState(
    initialData?.youtube_video_url || initialData?.video_url || ""
  );
  const [description, setDescription] = useState(initialData?.description || "");
  const [isFreePreview, setIsFreePreview] = useState(initialData?.is_free_preview ?? false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return toast.error("Lesson title is required");

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        youtube_video_url: youtubeUrl.trim() || null,
        video_url: youtubeUrl.trim() || null,
        description: description.trim() || null,
        is_free_preview: isFreePreview,
        is_published: true,
      };

      if (initialData?.id) {
        const { data, error } = await updateLesson(initialData.id, payload);
        if (error) throw error;
        toast.success("Lesson updated!");
        onSave(data);
      } else {
        const { data, error } = await createLesson(courseId, sectionId, payload);
        if (error) throw error;
        toast.success("Lesson added!");
        onSave(data);
      }
    } catch (err) {
      toast.error(err.message || "Failed to save lesson");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#0A0F22] border border-white/10 rounded-xl p-4 space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-1">
            Lesson Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Introduction to React Hooks"
            className="w-full px-3 py-2 text-sm rounded-lg bg-richblack-900 border border-white/10 focus:border-yellow-400 outline-none text-white placeholder-slate-600 transition-colors"
            required
          />
        </div>

        <div>
          <label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-1">
            YouTube URL
          </label>
          <div className="relative">
            <FaYoutube className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400 text-sm" />
            <input
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=... or https://youtu.be/..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-richblack-900 border border-white/10 focus:border-red-400 outline-none text-white placeholder-slate-600 transition-colors"
            />
          </div>
          <YoutubePreview url={youtubeUrl} />
        </div>
      </div>

      <div>
        <label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-1">
          Description (optional)
        </label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of this lesson..."
          className="w-full px-3 py-2 text-sm rounded-lg bg-richblack-900 border border-white/10 focus:border-yellow-400 outline-none text-white placeholder-slate-600 resize-none transition-colors"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`free_preview_${sectionId}`}
          checked={isFreePreview}
          onChange={(e) => setIsFreePreview(e.target.checked)}
          className="accent-yellow-400"
        />
        <label htmlFor={`free_preview_${sectionId}`} className="text-xs text-slate-400 cursor-pointer">
          Free preview (visible without enrollment)
        </label>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-richblack-900 text-xs font-black rounded-lg hover:bg-yellow-100 disabled:opacity-50 transition-all"
        >
          {saving ? <FaSpinner className="animate-spin" /> : <FaCheck />}
          {saving ? "Saving..." : initialData ? "Update Lesson" : "Add Lesson"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 text-slate-400 text-xs font-bold rounded-lg hover:bg-white/10 border border-white/10 transition-all"
        >
          <FaTimes /> Cancel
        </button>
      </div>
    </form>
  );
}

// ── Single Lesson Row ────────────────────────────────────────────────────────
function LessonRow({ lesson, onEdit, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const hasVideo = !!(lesson.youtube_video_id || lesson.youtube_video_url);
  const thumb = lesson.youtube_video_id
    ? `https://img.youtube.com/vi/${lesson.youtube_video_id}/mqdefault.jpg`
    : null;

  async function handleDelete() {
    if (!window.confirm(`Delete lesson "${lesson.title}"?`)) return;
    setDeleting(true);
    const { error } = await deleteLesson(lesson.id);
    if (error) {
      toast.error(error.message);
      setDeleting(false);
    } else {
      toast.success("Lesson deleted");
      onDelete(lesson.id);
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/5 rounded-xl group hover:border-white/10 transition-all"
    >
      <FaGripVertical className="text-slate-700 text-xs shrink-0 cursor-grab" />

      {/* Thumbnail or play icon */}
      <div className="w-12 aspect-video rounded-lg overflow-hidden bg-black/40 shrink-0 flex items-center justify-center">
        {thumb ? (
          <img src={thumb} alt={lesson.title} className="w-full h-full object-cover" onError={(e) => (e.target.style.display = "none")} />
        ) : (
          <FaPlay className="text-slate-700 text-xs" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white line-clamp-1">{lesson.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {hasVideo ? (
            <span className="flex items-center gap-1 text-[10px] text-red-400 font-bold">
              <FaYoutube /> YouTube
            </span>
          ) : (
            <span className="text-[10px] text-slate-600">No video attached</span>
          )}
          {lesson.is_free_preview && (
            <span className="text-[10px] text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold">
              Free Preview
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(lesson)}
          className="p-2 rounded-lg bg-white/5 text-slate-400 hover:bg-yellow-50/10 hover:text-yellow-50 border border-white/10 transition-all text-xs"
          title="Edit lesson"
        >
          <FaEdit />
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="p-2 rounded-lg bg-white/5 text-slate-400 hover:bg-red-500/20 hover:text-red-400 border border-white/10 transition-all text-xs disabled:opacity-50"
          title="Delete lesson"
        >
          {deleting ? <FaSpinner className="animate-spin" /> : <FaTrash />}
        </button>
      </div>
    </motion.div>
  );
}

// ── Section Card ─────────────────────────────────────────────────────────────
function SectionCard({ section, courseId, sectionIndex, onSectionUpdated, onSectionDeleted }) {
  const [lessons, setLessons] = useState([]);
  const [loadingLessons, setLoadingLessons] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [sectionTitle, setSectionTitle] = useState(section.section_name);
  const [savingTitle, setSavingTitle] = useState(false);
  const [deletingSection, setDeletingSection] = useState(false);

  useEffect(() => {
    fetchLessons();
  }, [section.id]);

  async function fetchLessons() {
    setLoadingLessons(true);
    const { data, error } = await getLessonsBySection(section.id);
    if (!error) setLessons(data || []);
    setLoadingLessons(false);
  }

  async function handleSaveTitle() {
    if (!sectionTitle.trim()) return;
    setSavingTitle(true);
    const { data, error } = await updateSection(section.id, { section_name: sectionTitle.trim() });
    if (error) toast.error(error.message);
    else {
      toast.success("Section renamed");
      onSectionUpdated({ ...section, section_name: sectionTitle.trim() });
    }
    setSavingTitle(false);
    setEditingTitle(false);
  }

  async function handleDeleteSection() {
    if (!window.confirm(`Delete section "${section.section_name}" and all its lessons?`)) return;
    setDeletingSection(true);
    const { error } = await deleteSection(section.id);
    if (error) { toast.error(error.message); setDeletingSection(false); }
    else { toast.success("Section deleted"); onSectionDeleted(section.id); }
  }

  function handleLessonSaved(savedLesson) {
    setLessons((prev) => {
      const exists = prev.find((l) => l.id === savedLesson.id);
      if (exists) return prev.map((l) => (l.id === savedLesson.id ? savedLesson : l));
      return [...prev, savedLesson];
    });
    setShowAddForm(false);
    setEditingLesson(null);
  }

  function handleLessonDeleted(lessonId) {
    setLessons((prev) => prev.filter((l) => l.id !== lessonId));
  }

  return (
    <div className="border border-white/10 rounded-2xl overflow-hidden bg-richblack-800">
      {/* Section Header */}
      <div className="flex items-center gap-3 p-4 bg-white/[0.04] border-b border-white/5">
        <span className="w-7 h-7 rounded-lg bg-yellow-50/10 border border-yellow-50/20 flex items-center justify-center text-xs font-black text-yellow-50 shrink-0">
          {sectionIndex + 1}
        </span>

        {editingTitle ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              value={sectionTitle}
              onChange={(e) => setSectionTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveTitle(); if (e.key === "Escape") setEditingTitle(false); }}
              className="flex-1 px-2 py-1 text-sm bg-richblack-900 border border-yellow-50/40 rounded-lg outline-none text-white"
              autoFocus
            />
            <button onClick={handleSaveTitle} disabled={savingTitle} className="text-emerald-400 hover:text-emerald-300 text-xs">
              {savingTitle ? <FaSpinner className="animate-spin" /> : <FaCheck />}
            </button>
            <button onClick={() => { setSectionTitle(section.section_name); setEditingTitle(false); }} className="text-slate-500 hover:text-slate-300 text-xs">
              <FaTimes />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingTitle(true)}
            className="flex-1 text-left font-bold text-white text-sm hover:text-yellow-50 transition-colors group"
          >
            {section.section_name}
            <FaEdit className="inline ml-2 text-slate-600 group-hover:text-slate-400 text-xs" />
          </button>
        )}

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-slate-500 font-bold px-2">{lessons.length} lesson{lessons.length !== 1 ? "s" : ""}</span>
          <button
            onClick={handleDeleteSection}
            disabled={deletingSection}
            className="p-1.5 rounded-lg bg-white/5 text-slate-600 hover:bg-red-500/20 hover:text-red-400 border border-white/10 transition-all text-xs disabled:opacity-50"
            title="Delete section"
          >
            {deletingSection ? <FaSpinner className="animate-spin" /> : <FaTrash />}
          </button>
          <button
            onClick={() => setIsExpanded((p) => !p)}
            className="p-1.5 rounded-lg bg-white/5 text-slate-500 hover:bg-white/10 border border-white/10 transition-all text-xs"
          >
            {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
          </button>
        </div>
      </div>

      {/* Section Body */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-3">
              {loadingLessons ? (
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <FaSpinner className="animate-spin" /> Loading lessons...
                </div>
              ) : (
                <AnimatePresence>
                  {lessons.length === 0 && !showAddForm && (
                    <p className="text-slate-600 text-sm text-center py-4">
                      No lessons yet. Click <strong className="text-slate-400">Add Lesson</strong> below.
                    </p>
                  )}
                  {lessons.map((lesson) =>
                    editingLesson?.id === lesson.id ? (
                      <LessonForm
                        key={lesson.id}
                        sectionId={section.id}
                        courseId={courseId}
                        initialData={lesson}
                        onSave={handleLessonSaved}
                        onCancel={() => setEditingLesson(null)}
                      />
                    ) : (
                      <LessonRow
                        key={lesson.id}
                        lesson={lesson}
                        onEdit={setEditingLesson}
                        onDelete={handleLessonDeleted}
                      />
                    )
                  )}
                </AnimatePresence>
              )}

              {/* Add Lesson Form */}
              {showAddForm && (
                <LessonForm
                  sectionId={section.id}
                  courseId={courseId}
                  onSave={handleLessonSaved}
                  onCancel={() => setShowAddForm(false)}
                />
              )}

              {!showAddForm && !editingLesson && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-yellow-50 bg-yellow-50/10 border border-yellow-50/20 rounded-xl hover:bg-yellow-50/20 transition-all"
                >
                  <FaPlus /> Add Lesson
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── MAIN LESSON MANAGER ──────────────────────────────────────────────────────
export default function LessonManager({ courseId }) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [savingSection, setSavingSection] = useState(false);

  useEffect(() => {
    if (courseId) fetchSections();
  }, [courseId]);

  async function fetchSections() {
    setLoading(true);
    const { data, error } = await getSectionsByCourse(courseId);
    if (!error) setSections(data || []);
    setLoading(false);
  }

  async function handleAddSection(e) {
    e.preventDefault();
    if (!newSectionTitle.trim()) return;
    setSavingSection(true);
    const orderIndex = sections.length;
    const { data, error } = await createSection(courseId, newSectionTitle.trim(), orderIndex);
    if (error) {
      toast.error(error.message);
    } else {
      setSections((p) => [...p, data]);
      setNewSectionTitle("");
      setAddingSection(false);
      toast.success("Section added!");
    }
    setSavingSection(false);
  }

  function handleSectionUpdated(updated) {
    setSections((p) => p.map((s) => (s.id === updated.id ? updated : s)));
  }

  function handleSectionDeleted(id) {
    setSections((p) => p.filter((s) => s.id !== id));
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 justify-center text-slate-500 text-sm">
        <FaSpinner className="animate-spin" /> Loading curriculum...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-white">Course Curriculum</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {sections.length} section{sections.length !== 1 ? "s" : ""} · Add lessons to each section below
          </p>
        </div>
        <button
          onClick={() => setAddingSection(true)}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-richblack-900 text-xs font-black rounded-xl hover:bg-yellow-100 transition-all shadow-md"
        >
          <FaPlus /> Add Section
        </button>
      </div>

      {/* Add Section Form */}
      <AnimatePresence>
        {addingSection && (
          <motion.form
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onSubmit={handleAddSection}
            className="flex items-center gap-3 p-4 bg-white/[0.04] border border-white/10 rounded-xl"
          >
            <input
              autoFocus
              type="text"
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              placeholder="Section title e.g. Introduction, HTML Basics..."
              className="flex-1 px-3 py-2 text-sm bg-richblack-900 border border-white/10 focus:border-yellow-50 rounded-lg outline-none text-white placeholder-slate-600"
              onKeyDown={(e) => e.key === "Escape" && setAddingSection(false)}
            />
            <button
              type="submit"
              disabled={savingSection}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-richblack-900 text-xs font-black rounded-lg disabled:opacity-50"
            >
              {savingSection ? <FaSpinner className="animate-spin" /> : <FaCheck />}
              {savingSection ? "Saving..." : "Save Section"}
            </button>
            <button
              type="button"
              onClick={() => setAddingSection(false)}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white text-xs"
            >
              <FaTimes />
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {sections.length === 0 && !addingSection && (
        <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
          <FaPlay className="text-slate-700 text-3xl mx-auto mb-3" />
          <p className="text-slate-500 font-bold text-sm">No sections yet</p>
          <p className="text-slate-700 text-xs mt-1">Click "Add Section" to start building your curriculum</p>
        </div>
      )}

      {/* Section Cards */}
      <AnimatePresence>
        {sections.map((section, idx) => (
          <motion.div key={section.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SectionCard
              section={section}
              courseId={courseId}
              sectionIndex={idx}
              onSectionUpdated={handleSectionUpdated}
              onSectionDeleted={handleSectionDeleted}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
