-- ================================================================
-- College LMS — Complete Supabase Schema
-- Stack: React(Vite) + Tailwind + FramerMotion + Zustand + ReactHookForm
--        + Node.js + Express + Supabase(PostgreSQL+Auth+Storage+Realtime)
--
-- COLLEGE CONTEXT: Departments, Semesters, Subject Codes, Attendance, Certificates
--
-- TABLES (in dependency order):
--   1. profiles
--   2. departments
--   3. categories
--   4. courses
--   5. course_sections
--   6. course_lessons
--   7. lesson_resources
--   8. quizzes
--   9. quiz_questions
--   10. quiz_attempts
--   11. assignments
--   12. assignment_submissions
--   13. enrollments
--   14. lesson_progress
--   15. attendance
--   16. reviews
--   17. wishlists
--   18. certificates
--   19. announcements
--
-- STORAGE BUCKETS:
--   - course-thumbnails (public, 5MB max)
--   - lesson-videos (enrolled-only, 2GB max)
--   - lesson-pdfs (enrolled-only, 50MB max)
--   - lesson-resources (enrolled-only, 100MB max)
--   - assignment-files (instructor-only, 50MB max)
--   - user-avatars (public, 2MB max)
--   - certificates (public-uuid)
--
-- TRIGGERS:
--   - on_auth_user_created → auto-creates profile row
--   - updated_at → auto-updates timestamps
--
-- REALTIME:
--   - courses
--   - enrollments
--   - lesson_progress
--   - announcements
-- ================================================================

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- TABLE 1: profiles
-- Extends auth.users. College-specific: roll_number, department_id, semester
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
                               CHECK (account_type IN ('Student', 'Instructor', 'HOD', 'Admin')),
  contact_number   TEXT                 DEFAULT '',
  about            TEXT                 DEFAULT '',
  gender           TEXT                 DEFAULT '',
  date_of_birth    TEXT                 DEFAULT '',
  provider         TEXT                 DEFAULT 'email',
  token            TEXT                 DEFAULT NULL,

  -- College-specific fields
  roll_number      TEXT                 DEFAULT '',
  department_id    UUID                 REFERENCES public.departments(id) ON DELETE SET NULL,
  semester         INT                  CHECK (semester BETWEEN 1 AND 8),

  created_at       TIMESTAMPTZ          DEFAULT NOW(),
  updated_at       TIMESTAMPTZ          DEFAULT NOW()
);

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

-- Admins/HODs can read all profiles
CREATE POLICY "profiles_admin_all"
  ON public.profiles FOR SELECT
  USING (
    (SELECT account_type FROM public.profiles WHERE id = auth.uid()) IN ('Admin', 'HOD')
  );

-- ================================================================
-- TABLE 2: departments
-- College departments (CS, ECE, MBA, etc.)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.departments (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT        NOT NULL UNIQUE,
  code        TEXT        NOT NULL UNIQUE,
  description TEXT                 DEFAULT '',
  created_at  TIMESTAMPTZ          DEFAULT NOW(),
  updated_at  TIMESTAMPTZ          DEFAULT NOW()
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Anyone can read departments
CREATE POLICY "departments_public_read"
  ON public.departments FOR SELECT
  USING (true);

-- Only admins/HODs can create/update/delete departments
CREATE POLICY "departments_admin_write"
  ON public.departments FOR ALL
  USING (
    (SELECT account_type FROM public.profiles WHERE id = auth.uid()) IN ('Admin', 'HOD')
  );

-- Seed some default departments
INSERT INTO public.departments (name, code, description) VALUES
  ('Computer Science', 'CS', 'Computer Science and Engineering'),
  ('Electronics and Communication', 'ECE', 'Electronics and Communication Engineering'),
  ('Mechanical Engineering', 'ME', 'Mechanical Engineering'),
  ('Civil Engineering', 'CE', 'Civil Engineering'),
  ('Electrical Engineering', 'EE', 'Electrical Engineering'),
  ('Master of Business Administration', 'MBA', 'Master of Business Administration')
ON CONFLICT (name) DO NOTHING;

-- ================================================================
-- TABLE 3: categories
-- Course categories managed by Admin/HOD
-- ================================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT        NOT NULL UNIQUE,
  description TEXT                 DEFAULT '',
  created_at  TIMESTAMPTZ          DEFAULT NOW(),
  updated_at  TIMESTAMPTZ          DEFAULT NOW()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Anyone can read categories
CREATE POLICY "categories_public_read"
  ON public.categories FOR SELECT
  USING (true);

-- Only admins/HODs can create/update/delete categories
CREATE POLICY "categories_admin_write"
  ON public.categories FOR ALL
  USING (
    (SELECT account_type FROM public.profiles WHERE id = auth.uid()) IN ('Admin', 'HOD')
  );

-- Seed some default categories
INSERT INTO public.categories (name, description) VALUES
  ('Web Development', 'Frontend, backend, and full-stack web technologies'),
  ('Data Science', 'Machine learning, data analysis, and AI'),
  ('Mobile Development', 'iOS, Android, and cross-platform apps'),
  ('DevOps', 'Cloud, CI/CD, and infrastructure'),
  ('Design', 'UI/UX, graphic design, and product design'),
  ('Business', 'Marketing, management, and entrepreneurship'),
  ('Cybersecurity', 'Ethical hacking, network security, and privacy')
ON CONFLICT (name) DO NOTHING;

-- ================================================================
-- TABLE 4: courses
-- Main course entity. College-specific: department_id, semester, subject_code, slug
-- ================================================================
CREATE TABLE IF NOT EXISTS public.courses (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug                TEXT        UNIQUE,
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
                                  CHECK (status IN ('Draft', 'Pending', 'Published', 'Rejected', 'Archived')),
  sold_count          INT                  DEFAULT 0,

  -- College-specific fields
  department_id       UUID                 REFERENCES public.departments(id) ON DELETE SET NULL,
  semester            INT                  CHECK (semester BETWEEN 1 AND 8),
  subject_code        TEXT,
  is_free             BOOLEAN              DEFAULT false,

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

-- Admins/HODs can do everything
CREATE POLICY "courses_admin_all"
  ON public.courses FOR ALL
  USING (
    (SELECT account_type FROM public.profiles WHERE id = auth.uid()) IN ('Admin', 'HOD')
  );

-- ================================================================
-- TABLE 5: course_sections
-- Course sections (chapters)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.course_sections (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id   UUID        NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  section_name TEXT       NOT NULL DEFAULT '',
  order_index INT                  DEFAULT 0,
  created_at  TIMESTAMPTZ          DEFAULT NOW(),
  updated_at  TIMESTAMPTZ          DEFAULT NOW()
);

ALTER TABLE public.course_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sections_read_enrolled_or_instructor" ON public.course_sections;
DROP POLICY IF EXISTS "sections_instructor_write"            ON public.course_sections;

CREATE POLICY "sections_read_enrolled_or_instructor"
  ON public.course_sections FOR SELECT
  USING (
    -- Instructor of the course OR enrolled student OR admin/HOD
    auth.uid() IN (
      SELECT instructor_id FROM public.courses WHERE id = course_id
    )
    OR auth.uid() IN (
      SELECT user_id FROM public.enrollments WHERE course_id = course_sections.course_id
    )
    OR (SELECT account_type FROM public.profiles WHERE id = auth.uid()) IN ('Admin', 'HOD')
  );

CREATE POLICY "sections_instructor_write"
  ON public.course_sections FOR ALL
  USING (
    auth.uid() IN (SELECT instructor_id FROM public.courses WHERE id = course_id)
  );

-- ================================================================
-- TABLE 6: course_lessons
-- Lessons inside sections with types: video, pdf, article, quiz, assignment, live
-- ================================================================
CREATE TABLE IF NOT EXISTS public.course_lessons (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id    UUID        NOT NULL REFERENCES public.course_sections(id) ON DELETE CASCADE,
  title         TEXT        NOT NULL DEFAULT '',
  description   TEXT                 DEFAULT '',
  lesson_type   TEXT        NOT NULL DEFAULT 'video'
                              CHECK (lesson_type IN ('video', 'pdf', 'article', 'quiz', 'assignment', 'live')),
  video_url     TEXT                 DEFAULT '',
  time_duration TEXT                 DEFAULT '0',
  is_preview    BOOLEAN              DEFAULT false,
  order_index   INT                  DEFAULT 0,
  created_at    TIMESTAMPTZ          DEFAULT NOW(),
  updated_at    TIMESTAMPTZ          DEFAULT NOW()
);

ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lessons_read"  ON public.course_lessons;
DROP POLICY IF EXISTS "lessons_write" ON public.course_lessons;

-- Same access pattern as sections
CREATE POLICY "lessons_read"
  ON public.course_lessons FOR SELECT
  USING (
    auth.uid() IN (
      SELECT c.instructor_id
      FROM public.courses c
      JOIN public.course_sections s ON s.course_id = c.id
      WHERE s.id = course_lessons.section_id
    )
    OR auth.uid() IN (
      SELECT e.user_id
      FROM public.enrollments e
      JOIN public.course_sections s ON s.course_id = e.course_id
      WHERE s.id = course_lessons.section_id
    )
    OR (SELECT account_type FROM public.profiles WHERE id = auth.uid()) IN ('Admin', 'HOD')
  );

CREATE POLICY "lessons_write"
  ON public.course_lessons FOR ALL
  USING (
    auth.uid() IN (
      SELECT c.instructor_id
      FROM public.courses c
      JOIN public.course_sections s ON s.course_id = c.id
      WHERE s.id = course_lessons.section_id
    )
  );

-- ================================================================
-- TABLE 7: lesson_resources
-- Additional resources for lessons
-- ================================================================
CREATE TABLE IF NOT EXISTS public.lesson_resources (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id  UUID        NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL DEFAULT '',
  url        TEXT        NOT NULL DEFAULT '',
  file_type  TEXT                 DEFAULT '',
  order_index INT                 DEFAULT 0,
  created_at TIMESTAMPTZ          DEFAULT NOW(),
  updated_at TIMESTAMPTZ          DEFAULT NOW()
);

ALTER TABLE public.lesson_resources ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- TABLE 8: quizzes
-- Quizzes linked to courses/lessons
-- ================================================================
CREATE TABLE IF NOT EXISTS public.quizzes (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id   UUID        NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id   UUID                 REFERENCES public.course_lessons(id) ON DELETE SET NULL,
  title       TEXT        NOT NULL DEFAULT '',
  description TEXT                 DEFAULT '',
  time_limit  INT                  DEFAULT 900,    -- seconds (default 15 min)
  passing_score INT                DEFAULT 60,     -- percentage
  created_by  UUID                 REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ          DEFAULT NOW(),
  updated_at  TIMESTAMPTZ          DEFAULT NOW()
);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- TABLE 9: quiz_questions
-- Multiple-choice/TF/short-answer questions
-- ================================================================
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id         UUID        NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text   TEXT        NOT NULL DEFAULT '',
  question_type   TEXT        NOT NULL DEFAULT 'mcq'
                              CHECK (question_type IN ('mcq', 'tf', 'short')),
  options         JSONB                DEFAULT '[]',
  correct_answer  TEXT        NOT NULL DEFAULT '',
  explanation     TEXT                 DEFAULT '',
  order_index     INT                  DEFAULT 0,
  created_at      TIMESTAMPTZ          DEFAULT NOW(),
  updated_at      TIMESTAMPTZ          DEFAULT NOW()
);

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- TABLE 10: quiz_attempts
-- Student attempts for quizzes
-- ================================================================
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quiz_id      UUID        NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  score        INT         NOT NULL DEFAULT 0,
  max_score    INT         NOT NULL DEFAULT 0,
  answers      JSONB                DEFAULT '{}',
  started_at   TIMESTAMPTZ          DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ          DEFAULT NOW()
);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Students can read their own quiz attempts
CREATE POLICY "quiz_attempts_student_own"
  ON public.quiz_attempts FOR ALL
  USING (auth.uid() = user_id);

-- ================================================================
-- TABLE 11: assignments
-- Course assignments
-- ================================================================
CREATE TABLE IF NOT EXISTS public.assignments (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id    UUID        NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id    UUID                 REFERENCES public.course_lessons(id) ON DELETE SET NULL,
  title        TEXT        NOT NULL DEFAULT '',
  description  TEXT                 DEFAULT '',
  due_date     TIMESTAMPTZ,
  max_score    INT                  DEFAULT 100,
  file_url     TEXT                 DEFAULT '',
  created_at   TIMESTAMPTZ          DEFAULT NOW(),
  updated_at   TIMESTAMPTZ          DEFAULT NOW()
);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- TABLE 12: assignment_submissions
-- Student submissions for assignments
-- ================================================================
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assignment_id UUID       NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  file_url     TEXT                 DEFAULT '',
  comments     TEXT                 DEFAULT '',
  score        INT,
  graded_at    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ          DEFAULT NOW(),
  updated_at   TIMESTAMPTZ          DEFAULT NOW()
);

ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- TABLE 13: enrollments
-- Student ↔ Course relationship
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

-- Admins/HODs have full access
CREATE POLICY "enrollments_admin_all"
  ON public.enrollments FOR ALL
  USING (
    (SELECT account_type FROM public.profiles WHERE id = auth.uid()) IN ('Admin', 'HOD')
  );

-- ================================================================
-- TABLE 14: lesson_progress
-- Tracks which lessons a student has completed
-- ================================================================
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id         UUID        NOT NULL REFERENCES public.courses(id)  ON DELETE CASCADE,
  lesson_id         UUID        NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  completed         BOOLEAN              DEFAULT false,
  watched_seconds   INT                  DEFAULT 0,
  created_at        TIMESTAMPTZ          DEFAULT NOW(),
  updated_at        TIMESTAMPTZ          DEFAULT NOW(),
  UNIQUE (user_id, lesson_id)
);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lesson_progress_student_own"
  ON public.lesson_progress FOR ALL
  USING (auth.uid() = user_id);

-- ================================================================
-- TABLE 15: attendance
-- College attendance tracking
-- ================================================================
CREATE TABLE IF NOT EXISTS public.attendance (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id        UUID        NOT NULL REFERENCES public.courses(id)  ON DELETE CASCADE,
  date             DATE        NOT NULL DEFAULT CURRENT_DATE,
  status           TEXT        NOT NULL DEFAULT 'present'
                               CHECK (status IN ('present', 'absent', 'late')),
  created_at       TIMESTAMPTZ          DEFAULT NOW(),
  updated_at       TIMESTAMPTZ          DEFAULT NOW(),
  UNIQUE (user_id, course_id, date)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- TABLE 16: reviews
-- Student reviews for courses
-- ================================================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  course_id   UUID        NOT NULL REFERENCES public.courses(id)   ON DELETE CASCADE,
  rating      INT         NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review      TEXT                 DEFAULT '',
  created_at  TIMESTAMPTZ          DEFAULT NOW(),
  UNIQUE (user_id, course_id)     -- one review per student per course
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- TABLE 17: wishlists
-- Courses saved for later
-- ================================================================
CREATE TABLE IF NOT EXISTS public.wishlists (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id  UUID        NOT NULL REFERENCES public.courses(id)  ON DELETE CASCADE,
  created_at TIMESTAMPTZ          DEFAULT NOW(),
  UNIQUE (user_id, course_id)
);

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- TABLE 18: certificates
-- Course completion certificates
-- ================================================================
CREATE TABLE IF NOT EXISTS public.certificates (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id        UUID        NOT NULL REFERENCES public.courses(id)  ON DELETE CASCADE,
  certificate_url  TEXT                 DEFAULT '',
  issued_at        TIMESTAMPTZ          DEFAULT NOW(),
  created_at       TIMESTAMPTZ          DEFAULT NOW()
);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- TABLE 19: announcements
-- Platform and course announcements
-- ================================================================
CREATE TABLE IF NOT EXISTS public.announcements (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT        NOT NULL DEFAULT '',
  content     TEXT                 DEFAULT '',
  course_id   UUID                 REFERENCES public.courses(id) ON DELETE SET NULL,
  author_id   UUID                 REFERENCES public.profiles(id) ON DELETE SET NULL,
  priority    TEXT                 DEFAULT 'normal'
                               CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at  TIMESTAMPTZ          DEFAULT NOW(),
  updated_at  TIMESTAMPTZ          DEFAULT NOW()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- AUTO-CREATE PROFILE TRIGGER
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
    COALESCE(NEW.raw_user_meta_data->>'accountType', 'Student'),
    _provider,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ================================================================
-- UPDATED_AT TRIGGER
-- Auto-updates updated_at timestamp when a row is modified
-- ================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply updated_at trigger to all tables that have updated_at column
CREATE OR REPLACE FUNCTION public.apply_updated_at_triggers()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  tbl record;
BEGIN
  FOR tbl IN SELECT table_name FROM information_schema.columns
    WHERE table_schema = 'public'
    AND column_name = 'updated_at'
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_updated_at ON %I;
      CREATE TRIGGER update_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
    ', tbl.table_name, tbl.table_name);
  END LOOP;
END;
$$;

SELECT apply_updated_at_triggers();

-- ================================================================
-- STORAGE BUCKETS
-- ================================================================

-- 1. course-thumbnails (public read, instructor upload)
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-thumbnails', 'course-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- 2. lesson-videos (private, enrolled-only access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-videos', 'lesson-videos', false)
ON CONFLICT (id) DO NOTHING;

-- 3. lesson-pdfs (private, enrolled-only access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-pdfs', 'lesson-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- 4. lesson-resources (private, enrolled-only access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-resources', 'lesson-resources', false)
ON CONFLICT (id) DO NOTHING;

-- 5. assignment-files (private, instructor upload only)
INSERT INTO storage.buckets (id, name, public)
VALUES ('assignment-files', 'assignment-files', false)
ON CONFLICT (id) DO NOTHING;

-- 6. user-avatars (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-avatars', 'user-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 7. certificates (public, UUID-based access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', true)
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- HELPER INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_courses_instructor    ON public.courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_category      ON public.courses(category_id);
CREATE INDEX IF NOT EXISTS idx_courses_department    ON public.courses(department_id);
CREATE INDEX IF NOT EXISTS idx_courses_semester      ON public.courses(semester);
CREATE INDEX IF NOT EXISTS idx_courses_status        ON public.courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_slug          ON public.courses(slug);
CREATE INDEX IF NOT EXISTS idx_sections_course       ON public.course_sections(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_section       ON public.course_lessons(section_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user      ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course    ON public.enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_lesson  ON public.lesson_progress(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_ratings_course        ON public.reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_course        ON public.quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz   ON public.quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user         ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_course ON public.attendance(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_certificates_user      ON public.certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_announcements_course   ON public.announcements(course_id);

-- ================================================================
-- DONE ✅
-- Your College LMS database is fully set up!
-- ================================================================
