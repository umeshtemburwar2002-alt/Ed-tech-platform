// ═══════════════════════════════════════════════════════════════════════════
// LESSON SERVICE — Supabase CRUD for sections, lessons, and curriculum
// ═══════════════════════════════════════════════════════════════════════════

import { supabase } from "../config/supabaseClient";
import { getYoutubeThumbnail, getYoutubeVideoId } from "../utils/youtubeUtils";

// ── SECTIONS ────────────────────────────────────────────────────────────────

export async function getSectionsByCourse(courseId) {
  const { data, error } = await supabase
    .from("sections")
    .select("*")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });
  return { data, error };
}

export async function createSection(courseId, sectionName, orderIndex = 0) {
  const { data, error } = await supabase
    .from("sections")
    .insert({
      course_id: courseId,
      section_name: sectionName,
      order_index: orderIndex,
    })
    .select()
    .single();
  return { data, error };
}

export async function updateSection(sectionId, patch) {
  const { data, error } = await supabase
    .from("sections")
    .update(patch)
    .eq("id", sectionId)
    .select()
    .single();
  return { data, error };
}

export async function deleteSection(sectionId) {
  // Delete lessons first, then section
  await supabase.from("course_lessons").delete().eq("section_id", sectionId);
  const { error } = await supabase.from("sections").delete().eq("id", sectionId);
  return { error };
}

// ── LESSONS ─────────────────────────────────────────────────────────────────

export async function getLessonsBySection(sectionId) {
  const { data, error } = await supabase
    .from("course_lessons")
    .select("*")
    .eq("section_id", sectionId)
    .order("position", { ascending: true });
  return { data, error };
}

export async function getLessonsByCourse(courseId) {
  const { data, error } = await supabase
    .from("course_lessons")
    .select("*")
    .eq("course_id", courseId)
    .order("position", { ascending: true });
  return { data, error };
}

export async function createLesson(courseId, sectionId, lessonData) {
  const youtubeUrl = lessonData.youtube_video_url || lessonData.video_url || "";
  const videoId = getYoutubeVideoId(youtubeUrl);
  const thumbnail = videoId ? getYoutubeThumbnail(youtubeUrl) : null;

  const payload = {
    course_id: courseId,
    section_id: sectionId,
    title: lessonData.title,
    description: lessonData.description || null,
    youtube_video_url: youtubeUrl || null,
    youtube_video_id: videoId || null,
    youtube_embed_url: videoId
      ? `https://www.youtube.com/embed/${videoId}`
      : null,
    youtube_thumbnail_url: thumbnail || null,
    video_url: youtubeUrl || null,
    position: lessonData.position ?? 0,
    lesson_order: lessonData.lesson_order ?? 1,
    is_preview: lessonData.is_preview ?? false,
    is_free_preview: lessonData.is_free_preview ?? false,
    is_locked: lessonData.is_locked ?? false,
    is_published: lessonData.is_published ?? true,
    duration: lessonData.duration || null,
    duration_seconds: lessonData.duration_seconds || null,
  };

  const { data, error } = await supabase
    .from("course_lessons")
    .insert(payload)
    .select()
    .single();

  return { data, error };
}

export async function updateLesson(lessonId, lessonData) {
  const youtubeUrl = lessonData.youtube_video_url || lessonData.video_url || null;
  let patch = { ...lessonData };

  if (youtubeUrl) {
    const videoId = getYoutubeVideoId(youtubeUrl);
    if (videoId) {
      patch.youtube_video_id = videoId;
      patch.youtube_embed_url = `https://www.youtube.com/embed/${videoId}`;
      patch.youtube_thumbnail_url = getYoutubeThumbnail(youtubeUrl);
      patch.video_url = youtubeUrl;
    }
  }

  const { data, error } = await supabase
    .from("course_lessons")
    .update(patch)
    .eq("id", lessonId)
    .select()
    .single();

  return { data, error };
}

export async function deleteLesson(lessonId) {
  const { error } = await supabase
    .from("course_lessons")
    .delete()
    .eq("id", lessonId);
  return { error };
}

// ── CURRICULUM (Learning Page) ───────────────────────────────────────────────

/**
 * Fetch full curriculum for a course: sections + their lessons.
 * Used by the learning page sidebar and video player.
 */
export async function getCourseCurriculum(courseId) {
  // Fetch sections
  const { data: sections, error: sectionsError } = await supabase
    .from("sections")
    .select("id, section_name, order_index")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });

  if (sectionsError) return { data: null, error: sectionsError };

  // Fetch all lessons for course (include all video URL columns)
  const { data: lessons, error: lessonsError } = await supabase
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

  if (lessonsError) return { data: null, error: lessonsError };

  // Enrich each lesson: derive YouTube fields from any available URL
  const enrichedLessons = (lessons || []).map((l) => {
    const rawUrl = l.youtube_video_url || l.video_url || "";
    const vid = l.youtube_video_id || getYoutubeVideoId(rawUrl) || null;
    return {
      ...l,
      youtube_video_id: vid,
      youtube_embed_url:
        l.youtube_embed_url ||
        (vid ? `https://www.youtube.com/embed/${vid}` : null),
      youtube_thumbnail_url:
        l.youtube_thumbnail_url ||
        (vid ? `https://img.youtube.com/vi/${vid}/hqdefault.jpg` : null),
      youtube_video_url: l.youtube_video_url || (rawUrl || null),
    };
  });

  // Build grouped structure: sections with their lessons
  const curriculum = (sections || []).map((section) => ({
    ...section,
    lessons: enrichedLessons
      .filter((l) => l.section_id === section.id)
      .sort(
        (a, b) =>
          (a.position ?? a.lesson_order ?? 0) -
          (b.position ?? b.lesson_order ?? 0)
      ),
  }));

  // Also add orphan lessons (no section or unknown section)
  const sectionIds = new Set((sections || []).map((s) => s.id));
  const orphans = enrichedLessons.filter(
    (l) => !l.section_id || !sectionIds.has(l.section_id)
  );
  if (orphans.length > 0) {
    curriculum.push({
      id: "__orphans__",
      section_name: "Lessons",
      order_index: 9999,
      lessons: orphans,
    });
  }

  // Flat lessons list (for progress tracking)
  const flatLessons = curriculum.flatMap((s) => s.lessons);

  return { data: { curriculum, flatLessons }, error: null };
}


// ── REORDER ──────────────────────────────────────────────────────────────────

export async function reorderLessons(updates) {
  // updates: [{ id, position }, ...]
  const promises = updates.map(({ id, position }) =>
    supabase
      .from("course_lessons")
      .update({ position })
      .eq("id", id)
  );
  await Promise.all(promises);
}
