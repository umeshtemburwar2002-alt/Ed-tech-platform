/**
 * uploadService.js
 * ─────────────────────────────────────────────────────────────────
 * Handles file uploads to Supabase Storage.
 * Buckets used:
 *   - course-thumbnails  (public read, instructor upload)
 *   - lesson-videos      (private, instructor upload)
 * ─────────────────────────────────────────────────────────────────
 */
import { supabase } from "../config/supabaseClient";

// ── Constants ─────────────────────────────────────────────────────────────────
const THUMBNAIL_BUCKET = "course-thumbnails";
const VIDEO_BUCKET     = "lesson-videos";

const MAX_THUMBNAIL_MB = 5;
const MAX_VIDEO_MB     = 500;
const ALLOWED_IMAGES   = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEOS   = ["video/mp4", "video/webm", "video/ogg", "video/mov", "video/quicktime"];

// ── Validation ────────────────────────────────────────────────────────────────

function validateFile(file, allowedTypes, maxMB) {
  if (!file) return "No file selected.";
  if (!allowedTypes.includes(file.type))
    return `Invalid file type. Allowed: ${allowedTypes.map((t) => t.split("/")[1]).join(", ")}`;
  if (file.size > maxMB * 1024 * 1024)
    return `File too large. Maximum size is ${maxMB}MB.`;
  return null;
}

// ── Upload with progress ──────────────────────────────────────────────────────

/**
 * Generic uploader with optional progress callback.
 * @param {string} bucket
 * @param {string} path  - storage path, e.g. "instructor-id/course-id/thumb.jpg"
 * @param {File}   file
 * @param {Function} [onProgress] - called with 0-100 numbers
 * @returns {{ url: string|null, error: string|null }}
 */
async function uploadFile(bucket, path, file, onProgress) {
  try {
    // Simulate initial progress (Supabase JS v2 doesn't expose upload progress natively)
    onProgress?.(10);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true, cacheControl: "3600" });

    if (error) {
      onProgress?.(0);
      return { url: null, error: error.message };
    }

    onProgress?.(90);

    // Get public URL (for thumbnails) or signed URL (for videos)
    let url;
    if (bucket === THUMBNAIL_BUCKET) {
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(data.path);
      url = pub.publicUrl;
    } else {
      const { data: signed, error: signErr } = await supabase.storage
        .from(bucket)
        .createSignedUrl(data.path, 60 * 60 * 24 * 7); // 7-day signed URL
      if (signErr) return { url: null, error: signErr.message };
      url = signed.signedUrl;
    }

    onProgress?.(100);
    return { url, error: null };
  } catch (err) {
    onProgress?.(0);
    return { url: null, error: err.message };
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Upload a course thumbnail image.
 * @param {string} instructorId
 * @param {string} courseId
 * @param {File}   file
 * @param {Function} [onProgress]
 */
export async function uploadThumbnail(instructorId, courseId, file, onProgress) {
  const validationError = validateFile(file, ALLOWED_IMAGES, MAX_THUMBNAIL_MB);
  if (validationError) return { url: null, error: validationError };

  const ext  = file.name.split(".").pop();
  // Conforms perfectly to the 3-level folder ownership check: auth.uid()/course/courseId/thumbnail_timestamp.ext
  const path = `${instructorId}/course/${courseId}/thumbnail_${Date.now()}.${ext}`;
  return uploadFile(THUMBNAIL_BUCKET, path, file, onProgress);
}

/**
 * Upload a lesson video.
 * @param {string} instructorId
 * @param {string} courseId
 * @param {string} sectionId
 * @param {string} lessonId
 * @param {File}   file
 * @param {Function} [onProgress]
 */
export async function uploadLessonVideo(instructorId, courseId, sectionId, lessonId, file, onProgress) {
  const validationError = validateFile(file, ALLOWED_VIDEOS, MAX_VIDEO_MB);
  if (validationError) return { url: null, error: validationError };

  const ext  = file.name.split(".").pop();
  const path = `${instructorId}/${courseId}/${sectionId}/${lessonId}.${ext}`;
  return uploadFile(VIDEO_BUCKET, path, file, onProgress);
}

/**
 * Delete a file from a bucket.
 * @param {string} bucket
 * @param {string} path
 */
export async function deleteStorageFile(bucket, path) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  return { error };
}

/** Parse a Supabase storage URL back to bucket path for deletion. */
export function extractStoragePath(url) {
  try {
    const u = new URL(url);
    // URL format: .../storage/v1/object/public/bucket-name/path
    const parts = u.pathname.split("/");
    const bucketIdx = parts.findIndex((p) => p === "public" || p === "sign") + 1;
    return parts.slice(bucketIdx + 1).join("/");
  } catch {
    return null;
  }
}
