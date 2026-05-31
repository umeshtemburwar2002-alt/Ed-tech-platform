import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { getCategories, createCourse, addSection, addLesson, publishCourse } from "../../../services/courseService";
import { uploadThumbnail } from "../../../services/uploadService";
import { useCourseDraftAutosave } from "../../../hooks/useCourseDraftAutosave";
import { markDraftPublished } from "../../../services/courseDraftService";
import { FaCloudUploadAlt, FaYoutube, FaVideo } from "react-icons/fa";
import VideoPreview from "../../common/VideoPreview";

// Simple tag input component
function TagInput({ value, onChange }) {
  const [draft, setDraft] = useState("");
  function addTag(e) {
    e.preventDefault();
    const t = draft.trim();
    if (!t || value.includes(t)) return;
    onChange([...value, t]);
    setDraft("");
  }
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map(tag => (
          <span key={tag} className="px-2 py-1 rounded bg-richblack-700 text-[11px] text-richblack-25 flex items-center gap-1 border border-richblack-600">
            {tag}
            <button type="button" onClick={() => onChange(value.filter(t => t !== tag))} className="text-richblack-400 hover:text-yellow-50">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(e); } }}
          placeholder="Add tag"
          className="flex-1 px-3 py-2 text-sm rounded-md bg-richblack-900 border border-richblack-700 focus:border-yellow-50 outline-none text-richblack-25 transition-all duration-200"
        />
        <button type="button" onClick={addTag} className="px-4 py-2 text-xs font-semibold rounded-md bg-yellow-50 text-richblack-900 hover:bg-yellow-100 transition-all duration-200">Add</button>
      </div>
    </div>
  );
}

const STEPS = ["Details", "Curriculum", "Pricing", "Publish"];

export default function AddCourse({ setActiveSection, initialStep = 0 }) {
  const navigate = useNavigate();
  const { user }  = useSelector((state) => state.profile);
  const [step, setStep] = useState(initialStep);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [courseCategories, setCourseCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [isCustomThumbnail, setIsCustomThumbnail] = useState(false);

  // Generate slug from title
  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      + '-' + Date.now().toString(36);
  };

  const [data, setData] = useState({
    title: "",
    subtitle: "",
    category: "",
    level: "Beginner",
    language: "English",
    tags: [],
    prerequisites: "",
    description: "",
    coverImage: null,
    videoType: "youtube", // 'youtube' or 'upload'
    videoUrl: "",
    videoFile: null,
    sections: [
      { id: Date.now(), title: "Introduction", lectures: [{ id: Date.now() + 1, title: "Welcome", duration: 0 }] }
    ],
    price: "",
    isFree: false,
    visibility: "private",
    duration: "",
    outcomes: [],
    requirements: [],
    // Preview video fields
    preview_video_url: "",
    preview_video_id: null,
    preview_thumbnail: null,
    video_provider: "youtube",
    video_duration: null,
  });

  const {
    isHydrating,
    saveState,
    saveError,
    lastSavedAt,
    draftMeta,
    forceSave,
  } = useCourseDraftAutosave({
    instructorId: user?.id,
    data,
    step,
    setData,
    setStep,
  });

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setCategoriesLoading(true);

      // Fetch categories
      const categoriesData = await getCategories();

      if (isMounted) {
        if (!categoriesData.error) setCourseCategories(categoriesData.data);
        setCategoriesLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  function update(field, value) {
    setData(d => ({ ...d, [field]: value }));
    if (field === 'coverImage' && value) {
      setIsCustomThumbnail(true);
      const reader = new FileReader();
      reader.onloadend = () => setThumbnailPreview(reader.result);
      reader.readAsDataURL(value);
    }
    if (field === 'videoFile' && value) {
      const reader = new FileReader();
      reader.onloadend = () => setVideoPreview(reader.result);
      reader.readAsDataURL(value);
    }
  }

  function updateSection(idx, patch) {
    setData(d => ({
      ...d,
      sections: d.sections.map((s, i) => i === idx ? { ...s, ...patch } : s)
    }));
  }

  /** UI only — must not shadow `addSection` from courseService (used in handlePublish). */
  function appendBlankSection() {
    setData(d => ({ ...d, sections: [...d.sections, { id: Date.now(), title: "New Section", lectures: [] }] }));
  }

  function addLecture(sectionIdx) {
    setData(d => ({
      ...d,
      sections: d.sections.map((s, i) => i === sectionIdx ? { ...s, lectures: [...s.lectures, { id: Date.now(), title: "New Lecture", duration: 0 }] } : s)
    }));
  }

  // Helper functions for outcomes and requirements
  function addOutcome() {
    setData(d => ({ ...d, outcomes: [...d.outcomes, ""] }));
  }

  function updateOutcome(idx, text) {
    setData(d => ({
      ...d,
      outcomes: d.outcomes.map((o, i) => i === idx ? text : o)
    }));
  }

  function removeOutcome(idx) {
    setData(d => ({
      ...d,
      outcomes: d.outcomes.filter((_, i) => i !== idx)
    }));
  }

  function addRequirement() {
    setData(d => ({ ...d, requirements: [...d.requirements, ""] }));
  }

  function updateRequirement(idx, text) {
    setData(d => ({
      ...d,
      requirements: d.requirements.map((r, i) => i === idx ? text : r)
    }));
  }

  function removeRequirement(idx) {
    setData(d => ({
      ...d,
      requirements: d.requirements.filter((_, i) => i !== idx)
    }));
  }

  const handleVideoDataChange = useCallback(({ videoId, thumbnail, isValid }) => {
    setData(d => ({
      ...d,
      preview_video_id: videoId,
      preview_thumbnail: thumbnail,
      video_provider: isValid ? "youtube" : null,
    }));
    // Auto-update thumbnail preview if not custom overridden
    if (!isCustomThumbnail) {
      setThumbnailPreview(thumbnail || null);
    }
  }, [isCustomThumbnail]);

  function validateCurrentStep() {
    if (step === 0) {
      if (!data.title.trim()) return "Title is required";
      if (!data.category) return "Category is required";
      if (!data.description.trim()) return "Description is required";
      if (data.videoType === 'upload' && !data.coverImage && !thumbnailPreview) return "Thumbnail is required";
      if (data.videoType === 'youtube' && !data.preview_video_url.trim()) return "YouTube URL is required";
      if (data.videoType === 'upload' && !data.videoFile) return "Video file is required";
    } else if (step === 1) {
      if (!data.sections.length) return "At least one section required";
    } else if (step === 2) {
      if (!data.isFree && !data.price) return "Price is required for paid courses";
    }
    return null;
  }

  async function handleNext() {
    const v = validateCurrentStep();
    if (v) { setError(v); toast.error(v); return; }
    setError(null);
    if (step < STEPS.length - 1) setStep(step + 1);
  }

  function handlePrev() { if (step > 0) setStep(step - 1); }

  function getYouTubeEmbedUrl(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
  }

  async function handlePublish() {
    const v = validateCurrentStep();
    if (v) { setError(v); toast.error(v); return; }
    setError(null);
    setSaving(true);
    const toastId = toast.loading("Saving your course...");
    try {
      const instructorId = user?.id;
      if (!instructorId) throw new Error("Not authenticated");
      await forceSave();

      // 1. Create course as draft first (content added next; then we publish).
      const { data: course, error: courseErr } = await createCourse(instructorId, {
        title:               data.title,
        slug:                generateSlug(data.title),
        course_description:  data.description,
        price:               data.isFree ? 0 : Number(data.price),
        category_id:         data.category || null,
        tags:                Array.isArray(data.tags) ? data.tags : [],
        learning_outcomes:   Array.isArray(data.outcomes) ? data.outcomes : [],
        requirements:        Array.isArray(data.requirements) ? data.requirements : [],
        is_free:             data.isFree,
        // Preview video fields
        preview_video_url:   data.preview_video_url,
        preview_video_id:    data.preview_video_id,
        preview_thumbnail:   data.preview_thumbnail,
        video_provider:      data.video_provider,
        video_duration:      data.video_duration,
      }, "draft");

      if (courseErr) {
        console.error("Course creation failed:", courseErr);
        throw new Error(courseErr.message || "Failed to create course");
      }

      if (!course) {
        throw new Error("No course returned from createCourse");
      }

      // 2. Upload thumbnail if file provided, otherwise if auto-fetched YouTube URL is used, save it!
      if (data.coverImage) {
        toast.loading("Uploading thumbnail...", { id: toastId });
        const { url, error: upErr } = await uploadThumbnail(instructorId, course.id, data.coverImage);
        if (upErr) {
          toast.error(`Thumbnail upload failed: ${upErr}`, { id: toastId });
        } else if (url) {
          const { updateCourse } = await import("../../../services/courseService");
          await updateCourse(course.id, { thumbnail: url });
        }
      } else if (!isCustomThumbnail && thumbnailPreview) {
        const { updateCourse } = await import("../../../services/courseService");
        await updateCourse(course.id, { thumbnail: thumbnailPreview });
      }

      // 3. Save sections + lessons
      toast.loading("Building curriculum...", { id: toastId });
      for (let si = 0; si < data.sections.length; si++) {
        const sec = data.sections[si];
        const { data: sectionRow, error: secErr } = await addSection(course.id, sec.title, si);
        if (secErr || !sectionRow) continue;
        for (let li = 0; li < sec.lectures.length; li++) {
          const lec = sec.lectures[li];
          await addLesson(sectionRow.id, {
            title:         lec.title,
            video_url:     data.videoType === "youtube" ? data.preview_video_url : "",
            time_duration: String(lec.duration ?? 0),
            order_index:   li,
          });
        }
      }

      // 4. Publish — "Publish Course" must set status in DB (was always left as draft before).
      toast.loading("Publishing your course...", { id: toastId });
      const { error: publishErr } = await publishCourse(course.id);
      if (publishErr) {
        throw new Error(
          publishErr.message ||
            "Course was saved but publishing failed. Open My Courses and try publishing again."
        );
      }

      if (draftMeta?.id) {
        await markDraftPublished(draftMeta.id, course.id);
      }

      toast.success("Course published successfully!", { id: toastId, duration: 5000 });
      navigate("/dashboard/instructor/my-courses");
    } catch (e) {
      console.error("handlePublish error:", e);
      setError(e.message || "Failed to save course. Please try again.");
      toast.error(e.message || "Failed to save course.", { id: toastId });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-richblack-800 p-6 rounded-xl border border-richblack-700 shadow-lg">
        <div>
          <h1 className="text-3xl font-bold text-richblack-5">Add New Course</h1>
          <p className="text-sm text-richblack-300 mt-1">Fill in the details to create your course.</p>
          <p className="text-xs mt-2 text-richblack-400">
            {isHydrating && "Loading draft..."}
            {!isHydrating && saveState === "saving" && "Saving draft..."}
            {!isHydrating && saveState === "saved" && `Saved${lastSavedAt ? ` · ${new Date(lastSavedAt).toLocaleString()}` : ""}`}
            {!isHydrating && saveState === "error" && (saveError || "Failed to save draft. Please try again.")}
          </p>
        </div>
        <div className="flex gap-3">
          {step > 0 && <button onClick={handlePrev} className="px-5 py-2.5 text-sm rounded-lg bg-richblack-700 hover:bg-richblack-600 text-richblack-25 transition-all duration-200">Back</button>}
          {step < STEPS.length - 1 && <button onClick={handleNext} className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-yellow-50 text-richblack-900 hover:bg-yellow-100 transition-all duration-200 shadow-md">Next</button>}
          {step === STEPS.length - 1 && <button disabled={saving} onClick={handlePublish} className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-gradient-to-r from-yellow-50 to-yellow-200 text-richblack-900 disabled:opacity-50 hover:scale-105 transition-all duration-200 shadow-lg">{saving ? "Publishing..." : "Publish Course"}</button>}
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex justify-between items-center px-4 max-w-2xl mx-auto">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div className="flex flex-col items-center gap-2 relative">
              <div className={`w-10 h-10 flex items-center justify-center rounded-full border-2 transition-all duration-300 ${i <= step ? "bg-yellow-50 text-richblack-900 border-yellow-50" : "bg-richblack-800 text-richblack-400 border-richblack-700"}`}>
                {i < step ? "✓" : i + 1}
              </div>
              <span className={`text-xs font-medium ${i <= step ? "text-richblack-5" : "text-richblack-500"}`}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-4 -mt-6 transition-all duration-300 ${i < step ? "bg-yellow-50" : "bg-richblack-700"}`} />}
          </React.Fragment>
        ))}
      </div>

      {error && <div className="mx-auto max-w-3xl px-4 py-3 rounded-lg bg-rose-600/10 border border-rose-500/50 text-rose-500 text-sm font-medium animate-shake">{error}</div>}

      {/* Step Content */}
      <div className="bg-richblack-800 p-8 rounded-2xl border border-richblack-700 shadow-xl">
        {step === 0 && (
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-richblack-5">Course Title <span className="text-pink-200">*</span></label>
                <input value={data.title || ""} onChange={e => update('title', e.target.value)} placeholder="e.g. Full Stack MERN Development" className="w-full px-4 py-3 text-sm rounded-lg bg-richblack-900 border border-richblack-700 focus:border-yellow-50 focus:ring-1 focus:ring-yellow-50 outline-none text-richblack-25 transition-all duration-200" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-richblack-5">Description <span className="text-pink-200">*</span></label>
                <textarea rows={6} value={data.description || ""} onChange={e => update('description', e.target.value)} placeholder="Provide a detailed description of the course content..." className="w-full resize-none px-4 py-3 text-sm rounded-lg bg-richblack-900 border border-richblack-700 focus:border-yellow-50 focus:ring-1 focus:ring-yellow-50 outline-none text-richblack-25 transition-all duration-200" />
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-richblack-5">Category <span className="text-pink-200">*</span></label>
                  <select
                    value={data.category || ""}
                    onChange={e => update('category', e.target.value)}
                    className="w-full px-4 py-3 text-sm rounded-lg bg-richblack-900 border border-richblack-700 focus:border-yellow-50 outline-none text-richblack-25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={categoriesLoading}
                  >
                    <option value="">
                      {categoriesLoading
                        ? "Loading categories..."
                        : courseCategories.length === 0
                          ? "No categories found"
                          : "Select Category"}
                    </option>
                    {courseCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-richblack-5">Level <span className="text-pink-200">*</span></label>
                  <select value={data.level} onChange={e => update('level', e.target.value)} className="w-full px-4 py-3 text-sm rounded-lg bg-richblack-900 border border-richblack-700 focus:border-yellow-50 outline-none text-richblack-25 cursor-pointer">
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="block text-sm font-semibold text-richblack-5">Duration</label>
                  <input value={data.duration || ""} onChange={e => update('duration', e.target.value)} placeholder="e.g. 3 Months" className="w-full px-4 py-3 text-sm rounded-lg bg-richblack-900 border border-richblack-700 focus:border-yellow-50 outline-none text-richblack-25" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="block text-sm font-semibold text-richblack-5">Tags</label>
                  <TagInput value={data.tags} onChange={v => update('tags', v)} />
                </div>
              </div>

              {/* Outcomes & Requirements */}
              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-semibold text-richblack-5">What You'll Learn</label>
                    <button type="button" onClick={addOutcome} className="text-[11px] font-bold text-yellow-50 hover:text-yellow-100 transition-all flex items-center gap-1">
                      <span className="text-lg">+</span> Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {data.outcomes.map((outcome, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input value={outcome || ""} onChange={e => updateOutcome(idx, e.target.value)} placeholder="e.g. Build a full-stack application" className="flex-1 px-3 py-2 text-sm rounded-lg bg-richblack-900 border border-richblack-700 focus:border-yellow-50 outline-none text-richblack-25" />
                        <button type="button" onClick={() => removeOutcome(idx)} className="px-2 py-2 text-sm rounded-lg bg-rose-600/20 text-rose-500 hover:bg-rose-600/30 transition-all">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-semibold text-richblack-5">Requirements</label>
                    <button type="button" onClick={addRequirement} className="text-[11px] font-bold text-yellow-50 hover:text-yellow-100 transition-all flex items-center gap-1">
                      <span className="text-lg">+</span> Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {data.requirements.map((req, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input value={req || ""} onChange={e => updateRequirement(idx, e.target.value)} placeholder="e.g. Basic knowledge of HTML/CSS" className="flex-1 px-3 py-2 text-sm rounded-lg bg-richblack-900 border border-richblack-700 focus:border-yellow-50 outline-none text-richblack-25" />
                        <button type="button" onClick={() => removeRequirement(idx)} className="px-2 py-2 text-sm rounded-lg bg-rose-600/20 text-rose-500 hover:bg-rose-600/30 transition-all">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-richblack-5">Video Source <span className="text-pink-200">*</span></label>
                  <div className="flex bg-richblack-900 p-1 rounded-lg border border-richblack-700">
                    <button onClick={() => update('videoType', 'youtube')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${data.videoType === 'youtube' ? 'bg-yellow-50 text-richblack-900 shadow-sm' : 'text-richblack-400 hover:text-richblack-25'}`}>YOUTUBE</button>
                    <button onClick={() => update('videoType', 'upload')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${data.videoType === 'upload' ? 'bg-yellow-50 text-richblack-900 shadow-sm' : 'text-richblack-400 hover:text-richblack-25'}`}>UPLOAD</button>
                  </div>
                </div>

                {data.videoType === 'youtube' ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 bg-richblack-900 border border-richblack-700 rounded-lg px-3 py-2.5">
                      <FaYoutube className="text-rose-600 text-xl" />
                      <input 
                        value={data.preview_video_url || ""} 
                        onChange={e => update('preview_video_url', e.target.value)} 
                        placeholder="Paste YouTube preview link here" 
                        className="bg-transparent outline-none text-sm text-richblack-25 w-full" 
                      />
                    </div>
                    <VideoPreview 
                      url={data.preview_video_url}
                      onVideoChange={handleVideoDataChange}
                    />
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <label className="block text-sm font-semibold text-richblack-5">Course Thumbnail <span className="text-pink-200">*</span></label>
                      <div className="relative group">
                        <div className={`aspect-video rounded-xl border-2 border-dashed border-richblack-600 bg-richblack-900 flex flex-col items-center justify-center overflow-hidden transition-all duration-300 ${!thumbnailPreview ? "hover:border-yellow-50" : ""}`}>
                          {thumbnailPreview ? (
                            <img src={thumbnailPreview} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-richblack-400">
                              <FaCloudUploadAlt className="text-4xl" />
                              <p className="text-xs">Click to upload image</p>
                            </div>
                          )}
                          <input type="file" accept="image/*" onChange={e => update('coverImage', e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                        {thumbnailPreview && (
                          <button
                            onClick={() => {
                              setThumbnailPreview(null);
                              update('coverImage', null);
                            }}
                            className="absolute top-2 right-2 bg-pink-200 text-richblack-900 p-1.5 rounded-full text-xs font-bold hover:scale-110 transition-all"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="relative group">
                      <div className={`aspect-video rounded-xl border-2 border-dashed border-richblack-600 bg-richblack-900 flex flex-col items-center justify-center overflow-hidden transition-all duration-300 ${!videoPreview ? "hover:border-yellow-50" : ""}`}>
                        {videoPreview ? (
                          <div className="flex flex-col items-center gap-2 p-4 text-center">
                            <FaVideo className="text-3xl text-yellow-50" />
                            <p className="text-xs text-richblack-25 font-medium truncate max-w-[200px]">{data.videoFile?.name}</p>
                            <p className="text-[10px] text-richblack-400">File size: {(data.videoFile?.size / (1024 * 1024)).toFixed(2)} MB</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-richblack-400">
                            <FaCloudUploadAlt className="text-4xl" />
                            <p className="text-xs">Click to upload MP4 video</p>
                          </div>
                        )}
                        <input type="file" accept="video/mp4" onChange={e => update('videoFile', e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                      </div>
                      {videoPreview && (
                        <button onClick={() => { setVideoPreview(null); update('videoFile', null) }} className="absolute top-2 right-2 bg-pink-200 text-richblack-900 p-1.5 rounded-full text-xs font-bold hover:scale-110 transition-all">✕</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-8">
            <div className="flex items-center justify-between bg-richblack-900/50 p-4 rounded-xl border border-richblack-700">
              <div>
                <h2 className="text-xl font-bold text-richblack-5">Curriculum Builder</h2>
                <p className="text-xs text-richblack-400 mt-0.5">Structure your course into sections and lectures.</p>
              </div>
              <button onClick={appendBlankSection} className="px-4 py-2 text-xs rounded-lg bg-yellow-50 text-richblack-900 font-bold hover:scale-105 transition-all shadow-md">+ Add Section</button>
            </div>
            <div className="space-y-6">
              {data.sections.map((s, idx) => (
                <div key={s.id} className="rounded-xl border border-richblack-700 bg-richblack-900/30 p-6 space-y-4 hover:border-richblack-600 transition-all">
                  <div className="flex gap-4">
                    <div className="bg-richblack-700 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-richblack-5 shrink-0">{idx + 1}</div>
                    <input value={s.title || ""} onChange={e => updateSection(idx, { title: e.target.value })} className="w-full bg-transparent border-b border-richblack-700 focus:border-yellow-50 outline-none text-richblack-5 font-semibold py-1 transition-all" placeholder="Section Title" />
                  </div>
                  <div className="pl-12 space-y-3">
                    {s.lectures.map((l, lIdx) => (
                      <div key={l.id} className="flex items-center gap-3 rounded-lg bg-richblack-900 border border-richblack-700 px-4 py-3 group hover:border-richblack-500 transition-all">
                        <div className="text-richblack-500 text-[10px] font-bold">{lIdx + 1}</div>
                        <input value={l.title || ""} onChange={e => {
                          setData(d => ({ ...d, sections: d.sections.map((sec, i) => i === idx ? { ...sec, lectures: sec.lectures.map(ll => ll.id === l.id ? { ...ll, title: e.target.value } : ll) } : sec) }));
                        }} className="flex-1 bg-transparent outline-none text-sm text-richblack-25" placeholder="Lecture Title" />
                        <div className="flex items-center gap-2">
                          <input type="number" value={String(l.duration ?? "")} onChange={e => {
                            const val = e.target.value === "" ? "" : Number(e.target.value);
                            setData(d => ({ ...d, sections: d.sections.map((sec, i) => i === idx ? { ...sec, lectures: sec.lectures.map(ll => ll.id === l.id ? { ...ll, duration: val } : ll) } : sec) }));
                          }} className="w-12 bg-richblack-800 rounded px-1 py-0.5 text-center text-[10px] text-richblack-25 outline-none" placeholder="Min" />
                          <span className="text-[10px] text-richblack-500 font-bold uppercase">MIN</span>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => addLecture(idx)} className="text-[11px] font-bold text-yellow-50 hover:text-yellow-100 transition-all flex items-center gap-1 mt-2">
                      <span className="text-lg">+</span> Add Lecture
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-3xl mx-auto py-4">
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-8">
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-richblack-5">Course Pricing</label>
                  <div className="flex items-center gap-6 p-4 rounded-xl bg-richblack-900 border border-richblack-700">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input type="radio" checked={data.isFree} onChange={() => update('isFree', true)} className="w-4 h-4 accent-yellow-50 cursor-pointer" />
                      <span className={`text-sm font-medium transition-all ${data.isFree ? 'text-yellow-50' : 'text-richblack-400 group-hover:text-richblack-200'}`}>Free Course</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input type="radio" checked={!data.isFree} onChange={() => update('isFree', false)} className="w-4 h-4 accent-yellow-50 cursor-pointer" />
                      <span className={`text-sm font-medium transition-all ${!data.isFree ? 'text-yellow-50' : 'text-richblack-400 group-hover:text-richblack-200'}`}>Paid Course</span>
                    </label>
                  </div>
                </div>

                {!data.isFree && (
                  <div className="space-y-3 animate-fadeIn">
                    <label className="block text-sm font-semibold text-richblack-5">Price (₹) <span className="text-pink-200">*</span></label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-richblack-400 font-bold">₹</span>
                      <input type="number" value={data.price ?? ""} onChange={e => update('price', e.target.value)} placeholder="e.g. 1999" className="w-full pl-10 pr-4 py-3 text-sm rounded-lg bg-richblack-900 border border-richblack-700 focus:border-yellow-50 outline-none text-richblack-25 font-bold" />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-richblack-5">Visibility</label>
                  <select value={data.visibility} onChange={e => update('visibility', e.target.value)} className="w-full px-4 py-3 text-sm rounded-lg bg-richblack-900 border border-richblack-700 focus:border-yellow-50 outline-none text-richblack-25 cursor-pointer">
                    <option value="private">Private (Draft)</option>
                    <option value="public">Public (Visible to All)</option>
                  </select>
                </div>
                <div className="p-4 rounded-xl bg-yellow-50/5 border border-yellow-50/20 text-xs text-yellow-50/70 leading-relaxed">
                  <p className="font-bold mb-2 flex items-center gap-2 text-yellow-50">ℹ️ PRICING TIP</p>
                  <p>Keep your price competitive based on content depth and category. Free courses often get 5x more enrollments!</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 max-w-3xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-8 bg-yellow-50 rounded-full" />
              <h2 className="text-2xl font-bold text-richblack-5">Review Details</h2>
            </div>

            <div className="grid gap-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="aspect-video rounded-xl overflow-hidden border border-richblack-700 shadow-2xl">
                  <img src={thumbnailPreview} alt="Course Thumbnail" className="w-full h-full object-cover" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-richblack-5 line-clamp-2">{data.title}</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-0.5 rounded bg-yellow-50/10 text-yellow-50 text-[10px] font-bold border border-yellow-50/20 uppercase">{data.level}</span>
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-200 text-[10px] font-bold border border-blue-500/20 uppercase">{courseCategories.find(c => c.id === data.category)?.name || 'Category'}</span>
                  </div>
                  <p className="text-2xl font-black text-richblack-5">{data.isFree ? "FREE" : `₹${data.price}`}</p>
                  <p className="text-xs text-richblack-400 font-medium">Visibility: <span className={data.visibility === 'public' ? 'text-emerald-400' : 'text-yellow-400'}>{data.visibility.toUpperCase()}</span></p>
                </div>
              </div>

              <div className="p-6 rounded-xl bg-richblack-900/50 border border-richblack-700 space-y-4">
                <h4 className="text-sm font-bold text-richblack-5 uppercase tracking-wider">Course Summary</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center p-3 rounded-lg bg-richblack-800">
                    <p className="text-xs text-richblack-500 font-bold uppercase mb-1">Sections</p>
                    <p className="text-lg font-black text-richblack-5">{data.sections.length}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-richblack-800">
                    <p className="text-xs text-richblack-500 font-bold uppercase mb-1">Lectures</p>
                    <p className="text-lg font-black text-richblack-5">{data.sections.reduce((a, s) => a + s.lectures.length, 0)}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-richblack-800">
                    <p className="text-xs text-richblack-500 font-bold uppercase mb-1">Duration</p>
                    <p className="text-lg font-black text-richblack-5 truncate px-1">{data.duration || '—'}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-richblack-800">
                    <p className="text-xs text-richblack-500 font-bold uppercase mb-1">Video</p>
                    <p className="text-lg font-black text-richblack-5 uppercase">{data.videoType}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-yellow-50/30 bg-yellow-50/5 text-center">
                <p className="text-sm text-richblack-200">Ready to share your knowledge with the world? Click publish to launch your course!</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
