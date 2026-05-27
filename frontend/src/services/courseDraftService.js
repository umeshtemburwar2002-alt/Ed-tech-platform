import { supabase } from "../config/supabaseClient";

function toIsoOrNull(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function buildDraftPayload(formData, step) {
  return {
    title: formData.title ?? "",
    subtitle: formData.subtitle ?? "",
    description: formData.description ?? "",
    category_id: formData.category || null,
    level: formData.level || "Beginner",
    language: formData.language || "English",
    tags: Array.isArray(formData.tags) ? formData.tags : [],
    prerequisites: formData.prerequisites || "",
    outcomes: Array.isArray(formData.outcomes) ? formData.outcomes : [],
    requirements: Array.isArray(formData.requirements) ? formData.requirements : [],
    cover_image_url: typeof formData.coverImage === "string" ? formData.coverImage : null,
    video_type: formData.videoType || "youtube",
    video_url: formData.videoUrl || "",
    price: formData.isFree ? 0 : Number(formData.price || 0),
    is_free: !!formData.isFree,
    visibility: formData.visibility || "private",
    duration: formData.duration || "",
    department_id: formData.departmentId || null,
    semester: formData.semester ? Number(formData.semester) : null,
    subject_code: formData.subjectCode || "",
    current_step: Number(step ?? 0),
    sections: Array.isArray(formData.sections) ? formData.sections : [],
  };
}

function mapDraftToFormData(draft) {
  const draftData = draft?.draft_data ?? {};
  const sections = (draftData.sections ?? []).map((section, sIdx) => ({
    id: section.id || Date.now() + sIdx,
    title: section.title || "New Section",
    lectures: (section.lectures ?? []).map((lesson, lIdx) => ({
      id: lesson.id || Date.now() + sIdx + lIdx + 1,
      title: lesson.title || "New Lecture",
      duration: Number(lesson.duration ?? 0),
    })),
  }));

  return {
    title: draftData.title ?? "",
    subtitle: draftData.subtitle ?? "",
    category: draftData.category_id ?? "",
    level: draftData.level ?? "Beginner",
    language: draftData.language ?? "English",
    tags: draftData.tags ?? [],
    prerequisites: draftData.prerequisites ?? "",
    description: draftData.description ?? "",
    coverImage: draftData.cover_image_url ?? null,
    videoType: draftData.video_type ?? "youtube",
    videoUrl: draftData.video_url ?? "",
    videoFile: null,
    sections:
      sections.length > 0
        ? sections
        : [{ id: Date.now(), title: "Introduction", lectures: [{ id: Date.now() + 1, title: "Welcome", duration: 0 }] }],
    price: draftData.price ?? "",
    isFree: !!draftData.is_free,
    visibility: draftData.visibility ?? "private",
    duration: draftData.duration ?? "",
    departmentId: draftData.department_id ?? "",
    semester: draftData.semester ? String(draftData.semester) : "",
    subjectCode: draftData.subject_code ?? "",
    outcomes: draftData.outcomes ?? [],
    requirements: draftData.requirements ?? [],
  };
}

export async function getInstructorActiveDraft(instructorId) {
  const { data, error } = await supabase
    .from("course_drafts")
    .select("*")
    .eq("instructor_id", instructorId)
    .in("draft_status", ["active", "in_progress"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { data, error };
}

function computeCompletionFromPayload(payload) {
  const titleScore = String(payload?.title ?? "").trim() ? 20 : 0;
  const descriptionScore = String(payload?.description ?? "").trim() ? 20 : 0;
  const categoryScore = payload?.category_id ? 15 : 0;
  const sectionsScore = Array.isArray(payload?.sections) && payload.sections.length > 0 ? 20 : 0;
  const pricingScore = payload?.is_free || Number(payload?.price ?? 0) > 0 ? 15 : 0;
  const publishScore = Number(payload?.current_step ?? 0) >= 3 ? 10 : 0;
  return Math.min(100, titleScore + descriptionScore + categoryScore + sectionsScore + pricingScore + publishScore);
}

async function saveDraftRowWithoutRpc(instructorId, payload) {
  const nowIso = new Date().toISOString();
  const step = Number(payload?.current_step ?? 0);
  const completion = computeCompletionFromPayload(payload);
  const draftStatus = step >= 4 ? "published" : "in_progress";

  const { data: existing, error: existingError } = await getInstructorActiveDraft(instructorId);
  if (existingError) {
    return { data: null, error: existingError };
  }

  if (existing?.id) {
    const { data, error } = await supabase
      .from("course_drafts")
      .update({
        draft_data: payload,
        current_step: step,
        completion_percentage: completion,
        draft_status: draftStatus,
        last_saved_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    return { data, error };
  }

  const { data, error } = await supabase
    .from("course_drafts")
    .insert({
      instructor_id: instructorId,
      draft_data: payload,
      current_step: step,
      completion_percentage: completion,
      draft_status: draftStatus,
      last_saved_at: nowIso,
    })
    .select("*")
    .single();

  return { data, error };
}

export async function saveInstructorDraft(instructorId, payload) {
  const rpcResult = await supabase.rpc("upsert_instructor_course_draft", {
    p_instructor_id: instructorId,
    p_payload: payload,
  });

  const row = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
  if (!rpcResult.error && row) {
    return { data: row, error: null };
  }

  // Fallback for broken/mismatched RPCs (e.g. malformed array literal from old SQL function).
  const fallback = await saveDraftRowWithoutRpc(instructorId, payload);
  if (!fallback.error && fallback.data) {
    return { data: fallback.data, error: null };
  }

  return { data: null, error: fallback.error || rpcResult.error };
}

export async function loadDraftForInstructor(instructorId) {
  const { data, error } = await getInstructorActiveDraft(instructorId);
  if (error || !data) return { data: null, error };

  return {
    data: {
      draftId: data.id,
      formData: mapDraftToFormData(data),
      currentStep: Number(data.current_step ?? 0),
      lastSavedAt: toIsoOrNull(data.last_saved_at ?? data.updated_at),
      completionPercentage: Number(data.completion_percentage ?? 0),
      draftStatus: data.draft_status ?? "active",
    },
    error: null,
  };
}

export async function markDraftPublished(draftId, courseId) {
  const { data, error } = await supabase
    .from("course_drafts")
    .update({
      draft_status: "published",
      published_course_id: courseId,
      updated_at: new Date().toISOString(),
      last_saved_at: new Date().toISOString(),
      current_step: 4,
      completion_percentage: 100,
    })
    .eq("id", draftId)
    .select("id")
    .single();

  return { data, error };
}
