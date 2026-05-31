-- ═══════════════════════════════════════════════════════════════════════════════
-- EDTECH PLATFORM — MASTER SUPABASE SETUP SQL
-- Version: 2.0  |  Safe to re-run (fully idempotent)
-- Covers: Classroom player fix, multi-lesson support, dynamic thumbnails,
--         video_url fallback, all 19 storage buckets, full RLS on all tables
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 1: Add required columns to courses
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS youtube_video_url       TEXT,
  ADD COLUMN IF NOT EXISTS youtube_video_id        TEXT,
  ADD COLUMN IF NOT EXISTS youtube_embed_url       TEXT,
  ADD COLUMN IF NOT EXISTS youtube_thumbnail_url   TEXT,
  ADD COLUMN IF NOT EXISTS custom_thumbnail_url    TEXT,
  ADD COLUMN IF NOT EXISTS final_thumbnail_url     TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_source        TEXT DEFAULT 'youtube',
  ADD COLUMN IF NOT EXISTS is_featured             BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS total_students          INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating                  NUMERIC(3,2) DEFAULT 0.0;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 2: Add required columns to course_lessons + sections
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.course_lessons
  ADD COLUMN IF NOT EXISTS youtube_video_url     TEXT,
  ADD COLUMN IF NOT EXISTS youtube_video_id      TEXT,
  ADD COLUMN IF NOT EXISTS youtube_embed_url     TEXT,
  ADD COLUMN IF NOT EXISTS youtube_thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS duration_seconds      INTEGER,
  ADD COLUMN IF NOT EXISTS is_free_preview       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_published          BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS position              INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS description           TEXT,
  ADD COLUMN IF NOT EXISTS updated_at            TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.sections
  ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 3: YouTube Video ID extractor
--   Supports: watch?v=, youtu.be/, /embed/, /shorts/, /live/
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.extract_youtube_video_id(url TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  vid_id TEXT;
BEGIN
  IF url IS NULL OR url = '' THEN RETURN NULL; END IF;

  vid_id := substring(url FROM 'youtu\.be/([a-zA-Z0-9_-]{11})');
  IF vid_id IS NOT NULL THEN RETURN vid_id; END IF;

  vid_id := substring(url FROM '[?&]v=([a-zA-Z0-9_-]{11})');
  IF vid_id IS NOT NULL THEN RETURN vid_id; END IF;

  vid_id := substring(url FROM '/embed/([a-zA-Z0-9_-]{11})');
  IF vid_id IS NOT NULL THEN RETURN vid_id; END IF;

  vid_id := substring(url FROM '/shorts/([a-zA-Z0-9_-]{11})');
  IF vid_id IS NOT NULL THEN RETURN vid_id; END IF;

  vid_id := substring(url FROM '/live/([a-zA-Z0-9_-]{11})');
  IF vid_id IS NOT NULL THEN RETURN vid_id; END IF;

  RETURN NULL;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 4: Course YouTube auto-fill trigger
--   Fires on: INSERT/UPDATE of preview_video_url OR youtube_video_url
--   Skips Unsplash placeholders when choosing final_thumbnail_url
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.auto_populate_youtube_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  vid_id TEXT;
  src_url TEXT;
BEGIN
  src_url := COALESCE(
    NULLIF(NEW.preview_video_url, ''),
    NULLIF(NEW.youtube_video_url, ''),
    NULLIF(NEW.youtube_embed_url, '')
  );

  vid_id := public.extract_youtube_video_id(src_url);

  IF vid_id IS NOT NULL THEN
    NEW.youtube_video_id      := vid_id;
    NEW.youtube_embed_url     := 'https://www.youtube.com/embed/' || vid_id;
    NEW.youtube_thumbnail_url := 'https://img.youtube.com/vi/' || vid_id || '/maxresdefault.jpg';
    NEW.final_thumbnail_url   := CASE
      WHEN NEW.custom_thumbnail_url IS NOT NULL AND NEW.custom_thumbnail_url != '' THEN NEW.custom_thumbnail_url
      WHEN NEW.thumbnail_url IS NOT NULL AND NEW.thumbnail_url != '' AND NEW.thumbnail_url NOT LIKE '%unsplash%' THEN NEW.thumbnail_url
      WHEN NEW.thumbnail    IS NOT NULL AND NEW.thumbnail    != '' AND NEW.thumbnail    NOT LIKE '%unsplash%' THEN NEW.thumbnail
      ELSE 'https://img.youtube.com/vi/' || vid_id || '/maxresdefault.jpg'
    END;
    NEW.thumbnail_source := CASE
      WHEN NEW.custom_thumbnail_url IS NOT NULL AND NEW.custom_thumbnail_url != '' THEN 'custom'
      WHEN (NEW.thumbnail_url IS NOT NULL AND NEW.thumbnail_url != '' AND NEW.thumbnail_url NOT LIKE '%unsplash%')
        OR (NEW.thumbnail    IS NOT NULL AND NEW.thumbnail    != '' AND NEW.thumbnail    NOT LIKE '%unsplash%') THEN 'uploaded'
      ELSE 'youtube'
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_youtube_fields ON public.courses;
CREATE TRIGGER trg_auto_youtube_fields
  BEFORE INSERT OR UPDATE OF preview_video_url, youtube_video_url
  ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_youtube_fields();

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 5: Lesson YouTube auto-fill trigger
--   CRITICAL: fires on BOTH youtube_video_url AND legacy video_url
--   This ensures old lessons created with video_url also get thumbnails
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.auto_populate_lesson_youtube_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  vid_id  TEXT;
  raw_url TEXT;
BEGIN
  raw_url := COALESCE(
    NULLIF(NEW.youtube_video_url, ''),
    NULLIF(NEW.video_url, '')
  );

  vid_id := public.extract_youtube_video_id(raw_url);

  IF vid_id IS NOT NULL THEN
    NEW.youtube_video_id      := vid_id;
    NEW.youtube_embed_url     := 'https://www.youtube.com/embed/' || vid_id;
    NEW.youtube_thumbnail_url := 'https://img.youtube.com/vi/' || vid_id || '/hqdefault.jpg';
    IF NEW.youtube_video_url IS NULL OR NEW.youtube_video_url = '' THEN
      NEW.youtube_video_url := 'https://www.youtube.com/watch?v=' || vid_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lesson_youtube_fields ON public.course_lessons;
CREATE TRIGGER trg_lesson_youtube_fields
  BEFORE INSERT OR UPDATE OF youtube_video_url, video_url
  ON public.course_lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_lesson_youtube_fields();

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 6: Sync course thumbnail from first lesson with a YouTube video
--   When instructor adds first lesson with YouTube URL → course card auto-updates
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.sync_course_thumbnail_from_first_lesson()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  first_yt_id TEXT;
  first_thumb TEXT;
  target_cid  UUID;
BEGIN
  target_cid := COALESCE(NEW.course_id, OLD.course_id);

  SELECT youtube_video_id INTO first_yt_id
  FROM public.course_lessons
  WHERE course_id = target_cid
    AND youtube_video_id IS NOT NULL
  ORDER BY COALESCE(position, lesson_order, 999), created_at
  LIMIT 1;

  IF first_yt_id IS NOT NULL THEN
    first_thumb := 'https://img.youtube.com/vi/' || first_yt_id || '/hqdefault.jpg';
    UPDATE public.courses SET
      youtube_video_id      = first_yt_id,
      youtube_embed_url     = 'https://www.youtube.com/embed/' || first_yt_id,
      youtube_thumbnail_url = first_thumb,
      final_thumbnail_url   = CASE
        WHEN custom_thumbnail_url IS NOT NULL AND custom_thumbnail_url != '' THEN custom_thumbnail_url
        WHEN thumbnail_url IS NOT NULL AND thumbnail_url != '' AND thumbnail_url NOT LIKE '%unsplash%' THEN thumbnail_url
        WHEN thumbnail    IS NOT NULL AND thumbnail    != '' AND thumbnail    NOT LIKE '%unsplash%' THEN thumbnail
        ELSE first_thumb
      END,
      thumbnail_source = CASE
        WHEN custom_thumbnail_url IS NOT NULL AND custom_thumbnail_url != '' THEN 'custom'
        WHEN (thumbnail_url IS NOT NULL AND thumbnail_url != '' AND thumbnail_url NOT LIKE '%unsplash%')
          OR (thumbnail    IS NOT NULL AND thumbnail    != '' AND thumbnail    NOT LIKE '%unsplash%') THEN 'uploaded'
        ELSE 'youtube'
      END
    WHERE id = target_cid;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_course_thumb_from_lesson ON public.course_lessons;
CREATE TRIGGER trg_sync_course_thumb_from_lesson
  AFTER INSERT OR UPDATE OF youtube_video_id
  ON public.course_lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_course_thumbnail_from_first_lesson();

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 7: course_catalog VIEW
--   Used by: ExploreCourses, CourseCard, StudentDashboard, LandingPage
--   Thumbnail priority: custom > uploaded > youtube (skips Unsplash)
-- ═══════════════════════════════════════════════════════════════════════════════
DROP VIEW IF EXISTS public.course_catalog CASCADE;
CREATE OR REPLACE VIEW public.course_catalog
WITH (security_invoker = true)
AS
SELECT
  c.id, c.title, c.description, c.short_description,
  c.price, c.is_free, c.status, c.level, c.language,
  c.tags, c.category_id, c.instructor_id, c.created_at, c.updated_at,
  c.sold_count, c.rating, c.total_students, c.is_featured,
  COALESCE(
    NULLIF(c.custom_thumbnail_url, ''),
    NULLIF(c.thumbnail_url, ''),
    CASE WHEN c.thumbnail NOT LIKE '%unsplash%' AND c.thumbnail IS NOT NULL AND c.thumbnail != '' THEN c.thumbnail ELSE NULL END,
    NULLIF(c.final_thumbnail_url, ''),
    NULLIF(c.youtube_thumbnail_url,'')
  ) AS resolved_thumbnail,
  c.final_thumbnail_url, c.youtube_thumbnail_url,
  c.youtube_video_url, c.youtube_video_id,
  c.preview_video_url, c.thumbnail, c.thumbnail_url,
  c.custom_thumbnail_url, c.thumbnail_source,
  p.first_name AS instructor_first_name,
  p.last_name  AS instructor_last_name,
  p.avatar_url AS instructor_avatar
FROM public.courses c
LEFT JOIN public.profiles p ON p.id = c.instructor_id;

GRANT SELECT ON public.course_catalog TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 8: course_curriculum VIEW
--   Used by: CourseLearningPage sidebar + player
--   Derives embed URL + thumbnail from BOTH youtube_video_url AND video_url
-- ═══════════════════════════════════════════════════════════════════════════════
DROP VIEW IF EXISTS public.course_curriculum CASCADE;
CREATE OR REPLACE VIEW public.course_curriculum
WITH (security_invoker = true)
AS
SELECT
  s.id           AS section_id,
  s.course_id,
  s.section_name AS section_title,
  s.order_index  AS section_order,
  l.id           AS lesson_id,
  l.title        AS lesson_title,
  l.description  AS lesson_description,
  l.youtube_video_id,
  COALESCE(
    l.youtube_embed_url,
    CASE
      WHEN public.extract_youtube_video_id(COALESCE(NULLIF(l.youtube_video_url,''), NULLIF(l.video_url,''))) IS NOT NULL
      THEN 'https://www.youtube.com/embed/' || public.extract_youtube_video_id(COALESCE(NULLIF(l.youtube_video_url,''), NULLIF(l.video_url,'')))
      ELSE NULL
    END
  ) AS youtube_embed_url,
  COALESCE(
    l.youtube_thumbnail_url,
    CASE
      WHEN public.extract_youtube_video_id(COALESCE(NULLIF(l.youtube_video_url,''), NULLIF(l.video_url,''))) IS NOT NULL
      THEN 'https://img.youtube.com/vi/' || public.extract_youtube_video_id(COALESCE(NULLIF(l.youtube_video_url,''), NULLIF(l.video_url,''))) || '/hqdefault.jpg'
      ELSE NULL
    END
  ) AS youtube_thumbnail_url,
  l.youtube_video_url,
  l.video_url,
  l.duration,
  l.duration_seconds,
  l.is_preview,
  l.is_free_preview,
  l.is_locked,
  l.is_published,
  COALESCE(l.position, l.lesson_order, 0) AS lesson_position
FROM public.sections s
LEFT JOIN public.course_lessons l ON l.section_id = s.id
ORDER BY s.order_index, COALESCE(l.position, l.lesson_order, 0);

GRANT SELECT ON public.course_curriculum TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 9: RLS — courses
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "courses_public_read"       ON public.courses;
DROP POLICY IF EXISTS "courses_instructor_insert" ON public.courses;
DROP POLICY IF EXISTS "courses_instructor_update" ON public.courses;
DROP POLICY IF EXISTS "courses_instructor_delete" ON public.courses;

CREATE POLICY "courses_public_read"
  ON public.courses FOR SELECT
  USING (status = 'published' OR instructor_id = auth.uid());

CREATE POLICY "courses_instructor_insert"
  ON public.courses FOR INSERT TO authenticated
  WITH CHECK (instructor_id = auth.uid());

CREATE POLICY "courses_instructor_update"
  ON public.courses FOR UPDATE TO authenticated
  USING (instructor_id = auth.uid());

CREATE POLICY "courses_instructor_delete"
  ON public.courses FOR DELETE TO authenticated
  USING (instructor_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 10: RLS — sections
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sections_public_read"       ON public.sections;
DROP POLICY IF EXISTS "sections_instructor_manage" ON public.sections;

CREATE POLICY "sections_public_read"
  ON public.sections FOR SELECT USING (true);

CREATE POLICY "sections_instructor_manage"
  ON public.sections FOR ALL TO authenticated
  USING   (course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid()))
  WITH CHECK (course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 11: RLS — course_lessons
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lessons_public_read"       ON public.course_lessons;
DROP POLICY IF EXISTS "lessons_instructor_insert" ON public.course_lessons;
DROP POLICY IF EXISTS "lessons_instructor_update" ON public.course_lessons;
DROP POLICY IF EXISTS "lessons_instructor_delete" ON public.course_lessons;

CREATE POLICY "lessons_public_read"
  ON public.course_lessons FOR SELECT USING (true);

CREATE POLICY "lessons_instructor_insert"
  ON public.course_lessons FOR INSERT TO authenticated
  WITH CHECK (course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid()));

CREATE POLICY "lessons_instructor_update"
  ON public.course_lessons FOR UPDATE TO authenticated
  USING (course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid()));

CREATE POLICY "lessons_instructor_delete"
  ON public.course_lessons FOR DELETE TO authenticated
  USING (course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 12: RLS — profiles
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_public_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_insert"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_update"   ON public.profiles;

CREATE POLICY "profiles_public_select"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "profiles_self_insert"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_self_update"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 13: RLS — enrollments (handles both student_id and user_id schemas)
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "enrollments_own_read"        ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_instructor_read" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_student_insert"  ON public.enrollments;

DO $$
DECLARE
  has_student_id BOOLEAN;
  has_user_id    BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='enrollments' AND column_name='student_id'
  ) INTO has_student_id;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='enrollments' AND column_name='user_id'
  ) INTO has_user_id;

  IF has_student_id THEN
    EXECUTE '
      CREATE POLICY "enrollments_own_read"
        ON public.enrollments FOR SELECT TO authenticated
        USING (student_id = auth.uid());
      CREATE POLICY "enrollments_instructor_read"
        ON public.enrollments FOR SELECT TO authenticated
        USING (course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid()));
      CREATE POLICY "enrollments_student_insert"
        ON public.enrollments FOR INSERT TO authenticated
        WITH CHECK (student_id = auth.uid());
    ';
  ELSIF has_user_id THEN
    EXECUTE '
      CREATE POLICY "enrollments_own_read"
        ON public.enrollments FOR SELECT TO authenticated
        USING (user_id = auth.uid());
      CREATE POLICY "enrollments_instructor_read"
        ON public.enrollments FOR SELECT TO authenticated
        USING (course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid()));
      CREATE POLICY "enrollments_student_insert"
        ON public.enrollments FOR INSERT TO authenticated
        WITH CHECK (user_id = auth.uid());
    ';
  END IF;
END
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 14: RLS — reviews + payments
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.reviews  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_public_read"    ON public.reviews;
DROP POLICY IF EXISTS "reviews_student_write"  ON public.reviews;
DROP POLICY IF EXISTS "reviews_student_update" ON public.reviews;
DROP POLICY IF EXISTS "reviews_student_delete" ON public.reviews;

CREATE POLICY "reviews_public_read"    ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_student_write"  ON public.reviews FOR INSERT TO authenticated WITH CHECK  (student_id = auth.uid());
CREATE POLICY "reviews_student_update" ON public.reviews FOR UPDATE TO authenticated USING       (student_id = auth.uid());
CREATE POLICY "reviews_student_delete" ON public.reviews FOR DELETE TO authenticated USING       (student_id = auth.uid());

DROP POLICY IF EXISTS "payments_own_read"        ON public.payments;
DROP POLICY IF EXISTS "payments_instructor_read" ON public.payments;
DROP POLICY IF EXISTS "payments_student_insert"  ON public.payments;

CREATE POLICY "payments_own_read"
  ON public.payments FOR SELECT TO authenticated
  USING (student_id = auth.uid());
CREATE POLICY "payments_instructor_read"
  ON public.payments FOR SELECT TO authenticated
  USING (course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid()));
CREATE POLICY "payments_student_insert"
  ON public.payments FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 15: Storage Bucket RLS Policies
-- All 19 buckets found in this project:
--   PUBLIC:  course-thumbnails, profile-images, user-avatars, course-attachments,
--            live-class-banners, support-attachments, support-attachments-only-student,
--            thumbnails, videos
--   PRIVATE: lesson-videos, course-videos, lesson-pdfs, course-documents,
--            course-resources, lesson-resources, instructor-documents,
--            instructor-assets, certificates, assignment-files
-- ═══════════════════════════════════════════════════════════════════════════════

-- course-thumbnails (public)
DROP POLICY IF EXISTS "thumbnails_public_read"       ON storage.objects;
DROP POLICY IF EXISTS "thumbnails_instructor_upload" ON storage.objects;
DROP POLICY IF EXISTS "thumbnails_instructor_update" ON storage.objects;
DROP POLICY IF EXISTS "thumbnails_instructor_delete" ON storage.objects;
CREATE POLICY "thumbnails_public_read"       ON storage.objects FOR SELECT USING (bucket_id = 'course-thumbnails');
CREATE POLICY "thumbnails_instructor_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'course-thumbnails');
CREATE POLICY "thumbnails_instructor_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'course-thumbnails' AND owner = auth.uid());
CREATE POLICY "thumbnails_instructor_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'course-thumbnails' AND owner = auth.uid());

-- profile-images (public)
DROP POLICY IF EXISTS "profile_images_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "profile_images_owner_upload" ON storage.objects;
DROP POLICY IF EXISTS "profile_images_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "profile_images_owner_delete" ON storage.objects;
CREATE POLICY "profile_images_public_read"  ON storage.objects FOR SELECT USING (bucket_id = 'profile-images');
CREATE POLICY "profile_images_owner_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'profile-images');
CREATE POLICY "profile_images_owner_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'profile-images' AND owner = auth.uid());
CREATE POLICY "profile_images_owner_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'profile-images' AND owner = auth.uid());

-- user-avatars (public)
DROP POLICY IF EXISTS "avatars_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_upload" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;
CREATE POLICY "avatars_public_read"  ON storage.objects FOR SELECT USING (bucket_id = 'user-avatars');
CREATE POLICY "avatars_owner_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'user-avatars');
CREATE POLICY "avatars_owner_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'user-avatars' AND owner = auth.uid());
CREATE POLICY "avatars_owner_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'user-avatars' AND owner = auth.uid());

-- course-attachments (public)
DROP POLICY IF EXISTS "course_attachments_public_read"       ON storage.objects;
DROP POLICY IF EXISTS "course_attachments_instructor_upload" ON storage.objects;
CREATE POLICY "course_attachments_public_read"       ON storage.objects FOR SELECT USING (bucket_id = 'course-attachments');
CREATE POLICY "course_attachments_instructor_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'course-attachments');

-- live-class-banners (public)
DROP POLICY IF EXISTS "live_class_banners_public_read" ON storage.objects;
DROP POLICY IF EXISTS "live_class_banners_auth_upload" ON storage.objects;
CREATE POLICY "live_class_banners_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'live-class-banners');
CREATE POLICY "live_class_banners_auth_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'live-class-banners');

-- support-attachments (public)
DROP POLICY IF EXISTS "support_attachments_public_read" ON storage.objects;
DROP POLICY IF EXISTS "support_attachments_auth_upload" ON storage.objects;
CREATE POLICY "support_attachments_public_read" ON storage.objects FOR SELECT USING (bucket_id IN ('support-attachments','support-attachments-only-student'));
CREATE POLICY "support_attachments_auth_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('support-attachments','support-attachments-only-student'));

-- thumbnails (public alias)
DROP POLICY IF EXISTS "thumbnails_alias_public_read" ON storage.objects;
DROP POLICY IF EXISTS "thumbnails_alias_auth_upload" ON storage.objects;
CREATE POLICY "thumbnails_alias_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'thumbnails');
CREATE POLICY "thumbnails_alias_auth_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'thumbnails');

-- videos (public alias)
DROP POLICY IF EXISTS "videos_alias_auth_read"   ON storage.objects;
DROP POLICY IF EXISTS "videos_alias_auth_upload" ON storage.objects;
CREATE POLICY "videos_alias_auth_read"   ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'videos');
CREATE POLICY "videos_alias_auth_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'videos');

-- lesson-videos (private)
DROP POLICY IF EXISTS "lesson_videos_enrolled_read"    ON storage.objects;
DROP POLICY IF EXISTS "lesson_videos_instructor_upload" ON storage.objects;
DROP POLICY IF EXISTS "lesson_videos_instructor_delete" ON storage.objects;
CREATE POLICY "lesson_videos_enrolled_read"    ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'lesson-videos');
CREATE POLICY "lesson_videos_instructor_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'lesson-videos');
CREATE POLICY "lesson_videos_instructor_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'lesson-videos' AND owner = auth.uid());

-- course-videos (private)
DROP POLICY IF EXISTS "course_videos_auth_read"   ON storage.objects;
DROP POLICY IF EXISTS "course_videos_auth_upload" ON storage.objects;
CREATE POLICY "course_videos_auth_read"   ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'course-videos');
CREATE POLICY "course_videos_auth_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'course-videos');

-- lesson-pdfs (private)
DROP POLICY IF EXISTS "lesson_pdfs_authenticated_read" ON storage.objects;
DROP POLICY IF EXISTS "lesson_pdfs_instructor_upload"  ON storage.objects;
CREATE POLICY "lesson_pdfs_authenticated_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'lesson-pdfs');
CREATE POLICY "lesson_pdfs_instructor_upload"  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'lesson-pdfs');

-- course-documents (private)
DROP POLICY IF EXISTS "course_docs_auth_read"   ON storage.objects;
DROP POLICY IF EXISTS "course_docs_auth_upload" ON storage.objects;
CREATE POLICY "course_docs_auth_read"   ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'course-documents');
CREATE POLICY "course_docs_auth_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'course-documents');

-- course-resources (private)
DROP POLICY IF EXISTS "course_resources_auth_read"   ON storage.objects;
DROP POLICY IF EXISTS "course_resources_auth_upload" ON storage.objects;
CREATE POLICY "course_resources_auth_read"   ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'course-resources');
CREATE POLICY "course_resources_auth_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'course-resources');

-- lesson-resources (private)
DROP POLICY IF EXISTS "lesson_resources_auth_read"   ON storage.objects;
DROP POLICY IF EXISTS "lesson_resources_auth_upload" ON storage.objects;
CREATE POLICY "lesson_resources_auth_read"   ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'lesson-resources');
CREATE POLICY "lesson_resources_auth_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'lesson-resources');

-- instructor-documents + instructor-assets (owner only)
DROP POLICY IF EXISTS "instructor_docs_owner_select" ON storage.objects;
DROP POLICY IF EXISTS "instructor_docs_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "instructor_docs_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "instructor_docs_owner_delete" ON storage.objects;
CREATE POLICY "instructor_docs_owner_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id IN ('instructor-documents','instructor-assets') AND owner = auth.uid());
CREATE POLICY "instructor_docs_owner_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('instructor-documents','instructor-assets'));
CREATE POLICY "instructor_docs_owner_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id IN ('instructor-documents','instructor-assets') AND owner = auth.uid());
CREATE POLICY "instructor_docs_owner_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id IN ('instructor-documents','instructor-assets') AND owner = auth.uid());

-- certificates (private, owner-read)
DROP POLICY IF EXISTS "certificates_owner_read"  ON storage.objects;
DROP POLICY IF EXISTS "certificates_auth_upload" ON storage.objects;
CREATE POLICY "certificates_owner_read"  ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'certificates' AND owner = auth.uid());
CREATE POLICY "certificates_auth_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'certificates');

-- assignment-files (private)
DROP POLICY IF EXISTS "assignment_files_auth_read"   ON storage.objects;
DROP POLICY IF EXISTS "assignment_files_auth_upload" ON storage.objects;
CREATE POLICY "assignment_files_auth_read"   ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'assignment-files');
CREATE POLICY "assignment_files_auth_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'assignment-files');

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 16: Backfill existing data
-- ═══════════════════════════════════════════════════════════════════════════════

-- Lessons with only video_url → fire trigger to populate youtube fields
UPDATE public.course_lessons
SET video_url = video_url
WHERE (youtube_video_id IS NULL OR youtube_video_id = '')
  AND (video_url IS NOT NULL AND video_url != '')
  AND (video_url LIKE '%youtube%' OR video_url LIKE '%youtu.be%');

-- Lessons with youtube_video_url but no youtube_video_id → fire trigger
UPDATE public.course_lessons
SET youtube_video_url = youtube_video_url
WHERE (youtube_video_id IS NULL OR youtube_video_id = '')
  AND (youtube_video_url IS NOT NULL AND youtube_video_url != '')
  AND (youtube_video_url LIKE '%youtube%' OR youtube_video_url LIKE '%youtu.be%');

-- Courses with preview_video_url but no youtube_video_id → fire trigger
UPDATE public.courses
SET preview_video_url = preview_video_url
WHERE (youtube_video_id IS NULL OR youtube_video_id = '')
  AND (preview_video_url IS NOT NULL AND preview_video_url != '')
  AND (preview_video_url LIKE '%youtube%' OR preview_video_url LIKE '%youtu.be%');

-- Clear Unsplash placeholders
UPDATE public.courses
SET
  final_thumbnail_url = CASE
    WHEN youtube_video_id IS NOT NULL
    THEN 'https://img.youtube.com/vi/' || youtube_video_id || '/maxresdefault.jpg'
    ELSE NULL
  END,
  youtube_thumbnail_url = CASE
    WHEN youtube_video_id IS NOT NULL
    THEN 'https://img.youtube.com/vi/' || youtube_video_id || '/maxresdefault.jpg'
    ELSE NULL
  END,
  thumbnail     = CASE WHEN thumbnail     LIKE '%unsplash%' THEN '' ELSE thumbnail     END,
  thumbnail_url = CASE WHEN thumbnail_url LIKE '%unsplash%' THEN '' ELSE thumbnail_url END
WHERE final_thumbnail_url LIKE '%unsplash%'
   OR thumbnail            LIKE '%unsplash%'
   OR thumbnail_url        LIKE '%unsplash%';

-- Courses with youtube_video_id but missing thumbnail → set it
UPDATE public.courses
SET
  youtube_thumbnail_url = 'https://img.youtube.com/vi/' || youtube_video_id || '/maxresdefault.jpg',
  final_thumbnail_url   = 'https://img.youtube.com/vi/' || youtube_video_id || '/maxresdefault.jpg'
WHERE youtube_video_id IS NOT NULL
  AND (youtube_thumbnail_url IS NULL OR youtube_thumbnail_url = '')
  AND (final_thumbnail_url   IS NULL OR final_thumbnail_url   = '' OR final_thumbnail_url LIKE '%unsplash%');

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 17: FINAL VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════════
SELECT 'FUNCTION' AS type, routine_name AS name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'extract_youtube_video_id',
    'auto_populate_youtube_fields',
    'auto_populate_lesson_youtube_fields',
    'sync_course_thumbnail_from_first_lesson'
  )
UNION ALL
SELECT 'TRIGGER', trigger_name
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'trg_auto_youtube_fields',
    'trg_lesson_youtube_fields',
    'trg_sync_course_thumb_from_lesson'
  )
UNION ALL
SELECT 'VIEW', table_name
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN ('course_catalog','course_curriculum')
UNION ALL
SELECT 'RLS_ON', relname
FROM pg_class
WHERE relnamespace = (SELECT oid FROM pg_namespace WHERE nspname='public')
  AND relkind = 'r'
  AND relrowsecurity = true
  AND relname IN ('courses','sections','course_lessons','enrollments','profiles','payments','reviews')
UNION ALL
SELECT 'BUCKET', name
FROM storage.buckets
ORDER BY type, name;

-- -------------------------------------------------------------------------------
-- STEP 18: FIX ENROLLMENT ACCESS LOGIC
-- -------------------------------------------------------------------------------
-- The is_enrolled function was previously checking the 'purchases' table 
-- instead of the 'enrollments' table, causing students to see 'No lessons yet'.
CREATE OR REPLACE FUNCTION public.is_enrolled(target_course_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS 
  SELECT EXISTS (
    SELECT 1
    FROM public.enrollments e
    WHERE e.student_id = auth.uid()
      AND e.course_id = target_course_id
  );
;

-- -------------------------------------------------------------------------------
-- STEP 19: AUTO-CREATE FIRST LESSON ON PUBLISH
-- -------------------------------------------------------------------------------
-- If an instructor adds a video to the course details but forgets to add lessons,
-- this trigger will automatically create an 'Introduction' lesson when published.

CREATE OR REPLACE FUNCTION public.auto_create_first_lesson_on_publish()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_section_id uuid;
  v_url text;
BEGIN
  -- Fire only when a course transitions to 'published'
  IF NEW.status = 'published' AND OLD.status != 'published' THEN
    
    -- Pick the best URL available
    v_url := COALESCE(NEW.youtube_video_url, NEW.preview_video_url);

    -- Proceed only if a URL is attached
    IF v_url IS NOT NULL AND v_url != '' THEN
      
      -- Check if there are no existing lessons for this course
      IF NOT EXISTS (SELECT 1 FROM public.course_lessons WHERE course_id = NEW.id) THEN
        
        -- Get or create an 'Introduction' section
        SELECT id INTO v_section_id FROM public.sections WHERE course_id = NEW.id ORDER BY order_index ASC LIMIT 1;
        
        IF v_section_id IS NULL THEN
          INSERT INTO public.sections (course_id, section_name, order_index)
          VALUES (NEW.id, 'Introduction', 0)
          RETURNING id INTO v_section_id;
        END IF;

        -- Create the first lesson
        INSERT INTO public.course_lessons (
          course_id, 
          section_id, 
          title, 
          description, 
          video_url, 
          youtube_video_url, 
          is_free_preview, 
          is_preview,
          is_published,
          lesson_order,
          position
        )
        VALUES (
          NEW.id, 
          v_section_id, 
          'Welcome to the Course', 
          NEW.description,
          v_url, 
          v_url, 
          true, 
          true,
          true,
          1,
          0
        );
        
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_auto_create_first_lesson ON public.courses;
CREATE TRIGGER trg_auto_create_first_lesson
AFTER UPDATE ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_first_lesson_on_publish();

-- -------------------------------------------------------------------------------
-- STEP 20: HEAL BROKEN COURSE LESSONS (FRONTEND BUG FIX)
-- -------------------------------------------------------------------------------
-- The frontend previously had a bug where the first lesson was saved with an empty video_url.
-- This query retroactively heals all lessons that were affected by copying the URL from the course.

UPDATE public.course_lessons cl
SET 
  video_url = COALESCE(c.youtube_video_url, c.preview_video_url),
  youtube_video_url = COALESCE(c.youtube_video_url, c.preview_video_url)
FROM public.courses c
WHERE cl.course_id = c.id
  AND (cl.video_url IS NULL OR cl.video_url = '')
  AND (cl.youtube_video_url IS NULL OR cl.youtube_video_url = '')
  AND (c.preview_video_url IS NOT NULL OR c.youtube_video_url IS NOT NULL);
