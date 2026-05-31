-- ================================================================
-- CREATE `course_enrollments` TABLE
-- ================================================================
-- This table is used by ALL backend controllers (PaymentSecure.js,
-- Course.js, auth.js middleware) but was NEVER created in Supabase.
-- The original schema only has `enrollments` (different columns).
--
-- RUN THIS IN: Supabase Dashboard → SQL Editor → New Query → Run
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────────
-- TABLE: course_enrollments
-- Tracks paid and free enrollments. One row per student per course.
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id        UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id         UUID        NOT NULL REFERENCES public.courses(id)  ON DELETE CASCADE,
  payment_status    TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (payment_status IN ('pending', 'paid', 'Free', 'completed', 'failed', 'not_required')),
  enrolled_at       TIMESTAMPTZ          DEFAULT NOW(),
  progress          INT                  DEFAULT 0,
  progress_percent  INT                  DEFAULT 0,
  completed         BOOLEAN              DEFAULT false,

  -- Denormalized fields used by Course.js enrollment functions
  student_name      TEXT                 DEFAULT '',
  student_email     TEXT                 DEFAULT '',
  course_name       TEXT                 DEFAULT '',
  instructor_id     UUID                 REFERENCES public.profiles(id) ON DELETE SET NULL,

  created_at        TIMESTAMPTZ          DEFAULT NOW(),
  updated_at        TIMESTAMPTZ          DEFAULT NOW(),

  -- One enrollment per student per course
  UNIQUE (student_id, course_id)
);

-- ────────────────────────────────────────────────────────────────
-- RLS POLICIES
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

-- Students can read their own enrollments
DROP POLICY IF EXISTS "ce_student_select" ON public.course_enrollments;
CREATE POLICY "ce_student_select"
  ON public.course_enrollments FOR SELECT
  USING (auth.uid() = student_id);

-- Students can insert their own enrollments
DROP POLICY IF EXISTS "ce_student_insert" ON public.course_enrollments;
CREATE POLICY "ce_student_insert"
  ON public.course_enrollments FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Instructors can read enrollments for their courses
DROP POLICY IF EXISTS "ce_instructor_select" ON public.course_enrollments;
CREATE POLICY "ce_instructor_select"
  ON public.course_enrollments FOR SELECT
  USING (
    auth.uid() IN (
      SELECT instructor_id FROM public.courses WHERE id = course_id
    )
  );

-- Admins have full access
DROP POLICY IF EXISTS "ce_admin_all" ON public.course_enrollments;
CREATE POLICY "ce_admin_all"
  ON public.course_enrollments FOR ALL
  USING (
    (SELECT account_type FROM public.profiles WHERE id = auth.uid()) = 'Admin'
  );

-- ────────────────────────────────────────────────────────────────
-- PERFORMANCE INDEXES
-- ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ce_student    ON public.course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_ce_course     ON public.course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_ce_status     ON public.course_enrollments(payment_status);
CREATE INDEX IF NOT EXISTS idx_ce_composite  ON public.course_enrollments(student_id, course_id);

-- ================================================================
-- DONE ✅
-- The course_enrollments table is now ready for the payment flow.
-- ================================================================
