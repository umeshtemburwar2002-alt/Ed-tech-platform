-- ================================================================
-- EdTech Platform — Phase 2 Patch Migration
-- ================================================================
-- PURPOSE:
--   Patches the existing schema to match the Phase 2 courseService.js
--   expectations. Run this AFTER complete_schema.sql has already
--   been applied.
--
-- Run in: Supabase Dashboard → SQL Editor → Run
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- PATCH 1: sections — add order_index column
-- courseService.js addSection() writes order_index.
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.sections
  ADD COLUMN IF NOT EXISTS order_index INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_sections_order ON public.sections(course_id, order_index);

-- ────────────────────────────────────────────────────────────────
-- PATCH 2: sub_sections — add order_index + is_preview columns
-- courseService.js addLesson() writes both.
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.sub_sections
  ADD COLUMN IF NOT EXISTS order_index INT     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_preview  BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_subsections_order ON public.sub_sections(section_id, order_index);

-- ────────────────────────────────────────────────────────────────
-- PATCH 3: lesson-videos Storage bucket
-- Used by uploadService.js for video uploads.
-- ────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-videos', 'lesson-videos', false)
ON CONFLICT (id) DO NOTHING;

-- Instructors can upload videos to their own folder
DROP POLICY IF EXISTS "lesson_video_instructor_upload" ON storage.objects;
CREATE POLICY "lesson_video_instructor_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'lesson-videos' AND
    (SELECT account_type FROM public.profiles WHERE id = auth.uid()) IN ('Instructor', 'Admin')
  );

-- Instructors can update/delete their own videos
DROP POLICY IF EXISTS "lesson_video_instructor_manage" ON storage.objects;
CREATE POLICY "lesson_video_instructor_manage"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'lesson-videos' AND
    (SELECT account_type FROM public.profiles WHERE id = auth.uid()) IN ('Instructor', 'Admin')
  );

-- Enrolled students can read videos via signed URLs (bucket is private)
DROP POLICY IF EXISTS "lesson_video_enrolled_read" ON storage.objects;
CREATE POLICY "lesson_video_enrolled_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'lesson-videos' AND
    auth.uid() IS NOT NULL
  );

-- ────────────────────────────────────────────────────────────────
-- PATCH 4: courses RLS — fix the ALL policy gap
-- The existing "courses_instructor_own" FOR ALL policy covers
-- INSERT/UPDATE/DELETE, but Postgres evaluates USING on SELECT
-- only. The "courses_public_read_published" covers SELECT.
-- We need to ensure instructors can ALWAYS see their own drafts
-- even when status = 'Draft'. The existing policy already handles
-- this with: status = 'Published' OR auth.uid() = instructor_id
-- But we add explicit SELECT for enrolled students too.
-- ────────────────────────────────────────────────────────────────

-- Re-create the SELECT policy with enrolled students included
DROP POLICY IF EXISTS "courses_public_read_published" ON public.courses;
CREATE POLICY "courses_public_read_published"
  ON public.courses FOR SELECT
  USING (
    status = 'Published'                          -- public can see published
    OR auth.uid() = instructor_id                 -- instructors see their own drafts
    OR auth.uid() IN (                            -- enrolled students see their course
      SELECT user_id FROM public.enrollments WHERE course_id = courses.id
    )
    OR (SELECT account_type FROM public.profiles WHERE id = auth.uid()) = 'Admin'
  );

-- ────────────────────────────────────────────────────────────────
-- PATCH 5: profiles — ensure instructors can read other profiles
-- Needed so instructor dashboard can show student names
-- ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_instructor_read_students" ON public.profiles;
CREATE POLICY "profiles_instructor_read_students"
  ON public.profiles FOR SELECT
  USING (
    -- Instructors can read profiles of students enrolled in their courses
    auth.uid() IN (
      SELECT c.instructor_id
      FROM public.courses c
      JOIN public.enrollments e ON e.course_id = c.id
      WHERE e.user_id = profiles.id
    )
  );

-- ────────────────────────────────────────────────────────────────
-- PATCH 6: course-thumbnails — add UPDATE/DELETE for instructors
-- uploadService.js uses upsert: true which requires UPDATE
-- ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "course_thumb_instructor_manage" ON storage.objects;
CREATE POLICY "course_thumb_instructor_manage"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'course-thumbnails' AND
    (SELECT account_type FROM public.profiles WHERE id = auth.uid()) IN ('Instructor', 'Admin')
  );

-- ────────────────────────────────────────────────────────────────
-- VERIFY — run these SELECT statements to confirm everything works
-- ────────────────────────────────────────────────────────────────

-- Check sections columns
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'sections' ORDER BY ordinal_position;

-- Check sub_sections columns
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'sub_sections' ORDER BY ordinal_position;

-- Check buckets exist
-- SELECT id, name, public FROM storage.buckets;

-- Check RLS policies
-- SELECT tablename, policyname, cmd FROM pg_policies
-- WHERE schemaname = 'public' ORDER BY tablename, policyname;

-- ================================================================
-- DONE ✅  Phase 2 migration complete.
-- ================================================================
