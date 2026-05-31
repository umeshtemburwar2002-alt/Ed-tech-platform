-- ================================================================
-- EdTech Platform — Complete Supabase Schema
-- Run this ENTIRE script in: Supabase Dashboard → SQL Editor → Run
--
-- Tables created (in dependency order):
--   1.  profiles          (extends auth.users)
--   2.  categories
--   3.  courses
--   4.  sections
--   5.  sub_sections
--   6.  enrollments
--   7.  course_progress
--   8.  ratings_reviews
--   9.  quizzes
--   10. questions
--   11. quiz_attempts
--   12. live_classes
--   13. support_tickets
--
-- Storage buckets:
--   - support-attachments
--   - course-thumbnails
--
-- Triggers:
--   - on_auth_user_created  → auto-creates profile row
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- EXTENSIONS
-- ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- TABLE 1: profiles
-- Extends auth.users. One row per registered user.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id               UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email            TEXT        NOT NULL DEFAULT '',
  first_name       TEXT        NOT NULL DEFAULT '',
  last_name        TEXT        NOT NULL DEFAULT '',
  full_name        TEXT                 DEFAULT '',
  image            TEXT                 DEFAULT '',
  avatar_url       TEXT                 DEFAULT '',
  account_type     TEXT        NOT NULL DEFAULT 'Student'
                               CHECK (account_type IN ('Student', 'Instructor', 'Admin')),
  contact_number   TEXT                 DEFAULT '',
  about            TEXT                 DEFAULT '',
  gender           TEXT                 DEFAULT '',
  date_of_birth    TEXT                 DEFAULT '',
  provider         TEXT                 DEFAULT 'email',
  token            TEXT                 DEFAULT NULL,
  created_at       TIMESTAMPTZ          DEFAULT NOW(),
  updated_at       TIMESTAMPTZ          DEFAULT NOW()
);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all"   ON public.profiles;

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can read all profiles (used by Support admin view)
CREATE POLICY "profiles_admin_all"
  ON public.profiles FOR SELECT
  USING (
    (SELECT account_type FROM public.profiles WHERE id = auth.uid()) = 'Admin'
  );

-- ================================================================
-- TABLE 2: categories
-- Course categories managed by Admin.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT        NOT NULL UNIQUE,
  description TEXT                 DEFAULT '',
  created_at  TIMESTAMPTZ          DEFAULT NOW()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_public_read"  ON public.categories;
DROP POLICY IF EXISTS "categories_admin_write"  ON public.categories;

-- Anyone (including anonymous) can read categories
CREATE POLICY "categories_public_read"
  ON public.categories FOR SELECT
  USING (true);

-- Only admins can create/update/delete categories
CREATE POLICY "categories_admin_write"
  ON public.categories FOR ALL
  USING (
    (SELECT account_type FROM public.profiles WHERE id = auth.uid()) = 'Admin'
  );

-- Seed some default categories
INSERT INTO public.categories (name, description) VALUES
  ('Web Development',     'Frontend, backend, and full-stack web technologies'),
  ('Data Science',        'Machine learning, data analysis, and AI'),
  ('Mobile Development',  'iOS, Android, and cross-platform apps'),
  ('DevOps',              'Cloud, CI/CD, and infrastructure'),
  ('Design',              'UI/UX, graphic design, and product design'),
  ('Business',            'Marketing, management, and entrepreneurship'),
  ('Cybersecurity',       'Ethical hacking, network security, and privacy')
ON CONFLICT (name) DO NOTHING;

-- ================================================================
-- TABLE 3: courses
-- Main course entity. Belongs to an instructor.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.courses (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_name         TEXT        NOT NULL,
  course_description  TEXT                 DEFAULT '',
  instructor_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  what_you_will_learn TEXT                 DEFAULT '',
  price               NUMERIC(10,2)        DEFAULT 0,
  thumbnail           TEXT                 DEFAULT '',
  tags                TEXT[]               DEFAULT '{}',
  category_id         UUID                 REFERENCES public.categories(id) ON DELETE SET NULL,
  instructions        TEXT[]               DEFAULT '{}',
  status              TEXT        NOT NULL DEFAULT 'Draft'
                                  CHECK (status IN ('Draft', 'Published')),
  sold_count          INT                  DEFAULT 0,
  created_at          TIMESTAMPTZ          DEFAULT NOW(),
  updated_at          TIMESTAMPTZ          DEFAULT NOW()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "courses_public_read_published"  ON public.courses;
DROP POLICY IF EXISTS "courses_instructor_own"         ON public.courses;
DROP POLICY IF EXISTS "courses_admin_all"              ON public.courses;

-- Anyone can read published courses
CREATE POLICY "courses_public_read_published"
  ON public.courses FOR SELECT
  USING (status = 'Published' OR auth.uid() = instructor_id);

-- Instructors can INSERT/UPDATE/DELETE their own courses
CREATE POLICY "courses_instructor_own"
  ON public.courses FOR ALL
  USING (auth.uid() = instructor_id);

-- Admins can do everything
CREATE POLICY "courses_admin_all"
  ON public.courses FOR ALL
  USING (
    (SELECT account_type FROM public.profiles WHERE id = auth.uid()) = 'Admin'
  );

-- ================================================================
-- TABLE 4: sections
-- Course sections (chapters). Belong to a course.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.sections (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id   UUID        NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  section_name TEXT       NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ          DEFAULT NOW()
);

ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sections_read_enrolled_or_instructor" ON public.sections;
DROP POLICY IF EXISTS "sections_instructor_write"            ON public.sections;

CREATE POLICY "sections_read_enrolled_or_instructor"
  ON public.sections FOR SELECT
  USING (
    -- Instructor of the course OR enrolled student OR admin
    auth.uid() IN (
      SELECT instructor_id FROM public.courses WHERE id = course_id
    )
    OR auth.uid() IN (
      SELECT user_id FROM public.enrollments WHERE course_id = sections.course_id
    )
    OR (SELECT account_type FROM public.profiles WHERE id = auth.uid()) = 'Admin'
  );

CREATE POLICY "sections_instructor_write"
  ON public.sections FOR ALL
  USING (
    auth.uid() IN (SELECT instructor_id FROM public.courses WHERE id = course_id)
  );

-- ================================================================
-- TABLE 5: sub_sections
-- Lectures/videos inside a section.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.sub_sections (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id    UUID        NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  title         TEXT        NOT NULL DEFAULT '',
  time_duration TEXT                 DEFAULT '0',
  description   TEXT                 DEFAULT '',
  video_url     TEXT                 DEFAULT '',
  created_at    TIMESTAMPTZ          DEFAULT NOW()
);

ALTER TABLE public.sub_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sub_sections_read"  ON public.sub_sections;
DROP POLICY IF EXISTS "sub_sections_write" ON public.sub_sections;

-- Same access pattern as sections
CREATE POLICY "sub_sections_read"
  ON public.sub_sections FOR SELECT
  USING (
    auth.uid() IN (
      SELECT c.instructor_id
      FROM public.courses c
      JOIN public.sections s ON s.course_id = c.id
      WHERE s.id = sub_sections.section_id
    )
    OR auth.uid() IN (
      SELECT e.user_id
      FROM public.enrollments e
      JOIN public.sections s ON s.course_id = e.course_id
      WHERE s.id = sub_sections.section_id
    )
    OR (SELECT account_type FROM public.profiles WHERE id = auth.uid()) = 'Admin'
  );

CREATE POLICY "sub_sections_write"
  ON public.sub_sections FOR ALL
  USING (
    auth.uid() IN (
      SELECT c.instructor_id
      FROM public.courses c
      JOIN public.sections s ON s.course_id = c.id
      WHERE s.id = sub_sections.section_id
    )
  );

-- ================================================================
-- TABLE 6: enrollments
-- Student ↔ Course relationship.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.enrollments (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id     UUID        NOT NULL REFERENCES public.courses(id)  ON DELETE CASCADE,
  payment_id    TEXT                 DEFAULT NULL,      -- Razorpay payment ID
  amount_paid   NUMERIC(10,2)        DEFAULT 0,
  enrolled_at   TIMESTAMPTZ          DEFAULT NOW(),
  UNIQUE (user_id, course_id)
);

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "enrollments_student_own"       ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_instructor_read"   ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_admin_all"         ON public.enrollments;

-- Students can read their own enrollments
CREATE POLICY "enrollments_student_own"
  ON public.enrollments FOR SELECT
  USING (auth.uid() = user_id);

-- Students can insert (purchase/enroll)
CREATE POLICY "enrollments_insert"
  ON public.enrollments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Instructors can see who enrolled in their courses
CREATE POLICY "enrollments_instructor_read"
  ON public.enrollments FOR SELECT
  USING (
    auth.uid() IN (
      SELECT instructor_id FROM public.courses WHERE id = course_id
    )
  );

-- Admins have full access
CREATE POLICY "enrollments_admin_all"
  ON public.enrollments FOR ALL
  USING (
    (SELECT account_type FROM public.profiles WHERE id = auth.uid()) = 'Admin'
  );

-- ================================================================
-- TABLE 7: course_progress
-- Tracks which sub_sections a student has completed.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.course_progress (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id         UUID        NOT NULL REFERENCES public.courses(id)  ON DELETE CASCADE,
  completed_videos  UUID[]               DEFAULT '{}',   -- array of sub_section IDs
  created_at        TIMESTAMPTZ          DEFAULT NOW(),
  updated_at        TIMESTAMPTZ          DEFAULT NOW(),
  UNIQUE (user_id, course_id)
);

ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "course_progress_student_own"  ON public.course_progress;

CREATE POLICY "course_progress_student_own"
  ON public.course_progress FOR ALL
  USING (auth.uid() = user_id);

-- ================================================================
-- TABLE 8: ratings_reviews
-- Student reviews for courses.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.ratings_reviews (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  course_id   UUID        NOT NULL REFERENCES public.courses(id)   ON DELETE CASCADE,
  rating      INT         NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review      TEXT                 DEFAULT '',
  created_at  TIMESTAMPTZ          DEFAULT NOW(),
  UNIQUE (user_id, course_id)     -- one review per student per course
);

ALTER TABLE public.ratings_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ratings_public_read"    ON public.ratings_reviews;
DROP POLICY IF EXISTS "ratings_student_write"  ON public.ratings_reviews;
DROP POLICY IF EXISTS "ratings_admin_all"      ON public.ratings_reviews;

CREATE POLICY "ratings_public_read"
  ON public.ratings_reviews FOR SELECT
  USING (true);

CREATE POLICY "ratings_student_write"
  ON public.ratings_reviews FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    -- Must be enrolled
    EXISTS (
      SELECT 1 FROM public.enrollments
      WHERE user_id = auth.uid() AND course_id = ratings_reviews.course_id
    )
  );

CREATE POLICY "ratings_admin_all"
  ON public.ratings_reviews FOR ALL
  USING (
    (SELECT account_type FROM public.profiles WHERE id = auth.uid()) = 'Admin'
  );

-- ================================================================
-- TABLE 9: quizzes
-- Quizzes linked to courses.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.quizzes (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id   UUID        NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL DEFAULT '',
  description TEXT                 DEFAULT '',
  time_limit  INT                  DEFAULT 900,    -- seconds (default 15 min)
  created_by  UUID                 REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ          DEFAULT NOW()
);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quizzes_enrolled_read"    ON public.quizzes;
DROP POLICY IF EXISTS "quizzes_instructor_write" ON public.quizzes;

CREATE POLICY "quizzes_enrolled_read"
  ON public.quizzes FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.enrollments WHERE course_id = quizzes.course_id
    )
    OR auth.uid() IN (
      SELECT instructor_id FROM public.courses WHERE id = quizzes.course_id
    )
    OR (SELECT account_type FROM public.profiles WHERE id = auth.uid()) = 'Admin'
  );

CREATE POLICY "quizzes_instructor_write"
  ON public.quizzes FOR ALL
  USING (
    auth.uid() IN (
      SELECT instructor_id FROM public.courses WHERE id = course_id
    )
  );

-- ================================================================
-- TABLE 10: questions
-- Multiple-choice questions belonging to a quiz.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.questions (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id         UUID        NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text   TEXT        NOT NULL DEFAULT '',
  option1         TEXT        NOT NULL DEFAULT '',
  option2         TEXT        NOT NULL DEFAULT '',
  option3         TEXT        NOT NULL DEFAULT '',
  option4         TEXT        NOT NULL DEFAULT '',
  correct_answer  TEXT        NOT NULL DEFAULT '',  -- must match one of option1-4
  created_at      TIMESTAMPTZ          DEFAULT NOW()
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "questions_quiz_access"     ON public.questions;
DROP POLICY IF EXISTS "questions_instructor_write" ON public.questions;

-- Same access as quizzes (enrolled students + instructor + admin)
CREATE POLICY "questions_quiz_access"
  ON public.questions FOR SELECT
  USING (
    auth.uid() IN (
      SELECT e.user_id
      FROM public.enrollments e
      JOIN public.quizzes q ON q.course_id = e.course_id
      WHERE q.id = questions.quiz_id
    )
    OR auth.uid() IN (
      SELECT c.instructor_id
      FROM public.courses c
      JOIN public.quizzes q ON q.course_id = c.id
      WHERE q.id = questions.quiz_id
    )
    OR (SELECT account_type FROM public.profiles WHERE id = auth.uid()) = 'Admin'
  );

CREATE POLICY "questions_instructor_write"
  ON public.questions FOR ALL
  USING (
    auth.uid() IN (
      SELECT c.instructor_id
      FROM public.courses c
      JOIN public.quizzes q ON q.course_id = c.id
      WHERE q.id = questions.quiz_id
    )
  );

-- ================================================================
-- TABLE 11: quiz_attempts
-- Student attempts for quizzes.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quiz_id      UUID        NOT NULL REFERENCES public.quizzes(id)  ON DELETE CASCADE,
  score        INT         NOT NULL DEFAULT 0,
  attempted_at TIMESTAMPTZ          DEFAULT NOW()
);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quiz_attempts_student_own"  ON public.quiz_attempts;

CREATE POLICY "quiz_attempts_student_own"
  ON public.quiz_attempts FOR ALL
  USING (auth.uid() = user_id);

-- ================================================================
-- TABLE 12: live_classes
-- Scheduled live sessions for a course.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.live_classes (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id     UUID        NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title         TEXT        NOT NULL DEFAULT '',
  meeting_link  TEXT        NOT NULL DEFAULT '',
  scheduled_at  TIMESTAMPTZ NOT NULL,
  created_by    UUID                 REFERENCES public.profiles(id),
  created_at    TIMESTAMPTZ          DEFAULT NOW()
);

ALTER TABLE public.live_classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "live_classes_enrolled_read"    ON public.live_classes;
DROP POLICY IF EXISTS "live_classes_instructor_write" ON public.live_classes;

CREATE POLICY "live_classes_enrolled_read"
  ON public.live_classes FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.enrollments WHERE course_id = live_classes.course_id
    )
    OR auth.uid() IN (
      SELECT instructor_id FROM public.courses WHERE id = live_classes.course_id
    )
    OR (SELECT account_type FROM public.profiles WHERE id = auth.uid()) = 'Admin'
  );

CREATE POLICY "live_classes_instructor_write"
  ON public.live_classes FOR ALL
  USING (
    auth.uid() IN (
      SELECT instructor_id FROM public.courses WHERE id = course_id
    )
  );

-- ================================================================
-- TABLE 13: support_tickets
-- Support tickets from students, instructors, and guests.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID                 REFERENCES public.profiles(id) ON DELETE SET NULL,
  role           TEXT                 DEFAULT 'guest',          -- 'student' | 'instructor' | 'guest'
  subject        TEXT        NOT NULL DEFAULT '',
  category       TEXT        NOT NULL DEFAULT '',
  message        TEXT        NOT NULL DEFAULT '',
  status         TEXT        NOT NULL DEFAULT 'open'
                             CHECK (status IN ('open', 'pending', 'in_progress', 'resolved', 'closed')),
  priority       TEXT        NOT NULL DEFAULT 'medium'
                             CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  attachment_url TEXT                 DEFAULT NULL,
  admin_note     TEXT                 DEFAULT NULL,
  created_at     TIMESTAMPTZ          DEFAULT NOW(),
  updated_at     TIMESTAMPTZ          DEFAULT NOW()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tickets_user_own"        ON public.support_tickets;
DROP POLICY IF EXISTS "tickets_guest_insert"    ON public.support_tickets;
DROP POLICY IF EXISTS "tickets_admin_all"       ON public.support_tickets;

-- Authenticated users can read & create their own tickets
CREATE POLICY "tickets_user_own"
  ON public.support_tickets FOR ALL
  USING (auth.uid() = user_id);

-- Guests (anonymous) can INSERT (contact form) — user_id will be null
CREATE POLICY "tickets_guest_insert"
  ON public.support_tickets FOR INSERT
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- Admins can see and manage all tickets
CREATE POLICY "tickets_admin_all"
  ON public.support_tickets FOR ALL
  USING (
    (SELECT account_type FROM public.profiles WHERE id = auth.uid()) = 'Admin'
  );

-- ================================================================
-- AUTO-CREATE PROFILE TRIGGER
-- Fires when a new user signs up (email/password OR OAuth).
-- Creates a profiles row automatically.
-- account_type defaults to 'Student'; upsertOAuthProfile() will
-- update it to 'Instructor' if the user selected that role.
-- ================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _full_name  TEXT;
  _first_name TEXT;
  _last_name  TEXT;
  _avatar_url TEXT;
  _provider   TEXT;
BEGIN
  -- Extract name (works for Google "full_name", GitHub "name"/"login", email signups)
  _full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'login',
    split_part(NEW.email, '@', 1)
  );

  _first_name := COALESCE(
    NEW.raw_user_meta_data->>'firstName',
    split_part(_full_name, ' ', 1)
  );

  _last_name := COALESCE(
    NEW.raw_user_meta_data->>'lastName',
    CASE
      WHEN position(' ' IN _full_name) > 0
      THEN TRIM(SUBSTR(_full_name, position(' ' IN _full_name)))
      ELSE ''
    END
  );

  _avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',   -- GitHub
    NEW.raw_user_meta_data->>'picture',      -- Google
    ''
  );

  _provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');

  INSERT INTO public.profiles (
    id, email, first_name, last_name, full_name,
    avatar_url, image, account_type, provider,
    created_at, updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    _first_name,
    _last_name,
    _full_name,
    _avatar_url,
    _avatar_url,
    -- Default to 'Student'; the OAuthCallback will UPDATE this to
    -- the role the user selected (stored in sessionStorage)
    COALESCE(NEW.raw_user_meta_data->>'accountType', 'Student'),
    _provider,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;   -- never clobber existing profiles

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ================================================================
-- STORAGE BUCKETS
-- Run these AFTER the tables above.
-- ================================================================

-- Support ticket attachments (private — users access via signed URLs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-attachments', 'support-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Course thumbnail images (public — anyone can view thumbnails)
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-thumbnails', 'course-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: support-attachments
-- Authenticated users can upload to their own folder
DROP POLICY IF EXISTS "support_attach_insert" ON storage.objects;
DROP POLICY IF EXISTS "support_attach_select" ON storage.objects;

CREATE POLICY "support_attach_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'support-attachments' AND
    auth.uid()::text = (storage.foldername(name))[2]
  );

CREATE POLICY "support_attach_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'support-attachments' AND (
      auth.uid()::text = (storage.foldername(name))[2] OR
      (SELECT account_type FROM public.profiles WHERE id = auth.uid()) = 'Admin'
    )
  );

-- Storage RLS: course-thumbnails (public bucket — anyone can read)
DROP POLICY IF EXISTS "course_thumb_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "course_thumb_instructor_upload" ON storage.objects;

CREATE POLICY "course_thumb_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'course-thumbnails');

CREATE POLICY "course_thumb_instructor_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'course-thumbnails' AND
    (SELECT account_type FROM public.profiles WHERE id = auth.uid()) IN ('Instructor', 'Admin')
  );

-- ================================================================
-- HELPER INDEXES (performance)
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_courses_instructor    ON public.courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_category      ON public.courses(category_id);
CREATE INDEX IF NOT EXISTS idx_courses_status        ON public.courses(status);
CREATE INDEX IF NOT EXISTS idx_sections_course       ON public.sections(course_id);
CREATE INDEX IF NOT EXISTS idx_subsections_section   ON public.sub_sections(section_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user      ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course    ON public.enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_course  ON public.course_progress(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_ratings_course        ON public.ratings_reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_course        ON public.quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_questions_quiz        ON public.questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user         ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_live_classes_course   ON public.live_classes(course_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user          ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status        ON public.support_tickets(status);

-- ================================================================
-- DONE ✅
-- Your EdTech platform database is fully set up.
-- ================================================================
