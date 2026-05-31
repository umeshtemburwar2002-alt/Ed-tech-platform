-- ================================================================
-- FIX: Courses ↔ Enrollments Relationship Issue
-- ================================================================
-- This script fixes the "Could not find a relationship" error
-- by ensuring proper foreign key constraints and schema cache refresh.
--
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- STEP 1: Verify and Fix Foreign Keys
-- ────────────────────────────────────────────────────────────────

-- Drop existing foreign key constraints if they exist (to recreate them properly)
DO $$ 
BEGIN
    -- Drop enrollments foreign keys if they exist
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'enrollments_user_id_fkey' 
        AND table_name = 'enrollments'
    ) THEN
        ALTER TABLE public.enrollments DROP CONSTRAINT enrollments_user_id_fkey;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'enrollments_course_id_fkey' 
        AND table_name = 'enrollments'
    ) THEN
        ALTER TABLE public.enrollments DROP CONSTRAINT enrollments_course_id_fkey;
    END IF;
END $$;

-- Recreate foreign keys with proper naming
ALTER TABLE public.enrollments
  ADD CONSTRAINT enrollments_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

ALTER TABLE public.enrollments
  ADD CONSTRAINT enrollments_course_id_fkey 
  FOREIGN KEY (course_id) 
  REFERENCES public.courses(id) 
  ON DELETE CASCADE;

-- ────────────────────────────────────────────────────────────────
-- STEP 2: Add Missing Indexes for Performance
-- ────────────────────────────────────────────────────────────────

-- These indexes improve query performance for relationship lookups
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id 
  ON public.enrollments(user_id);

CREATE INDEX IF NOT EXISTS idx_enrollments_course_id 
  ON public.enrollments(course_id);

CREATE INDEX IF NOT EXISTS idx_enrollments_user_course 
  ON public.enrollments(user_id, course_id);

-- ────────────────────────────────────────────────────────────────
-- STEP 3: Verify Enrollments Table Structure
-- ────────────────────────────────────────────────────────────────

-- Ensure all required columns exist
DO $$ 
BEGIN
    -- Add payment_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'enrollments' AND column_name = 'payment_id'
    ) THEN
        ALTER TABLE public.enrollments ADD COLUMN payment_id TEXT DEFAULT NULL;
    END IF;

    -- Add amount_paid if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'enrollments' AND column_name = 'amount_paid'
    ) THEN
        ALTER TABLE public.enrollments ADD COLUMN amount_paid NUMERIC(10,2) DEFAULT 0;
    END IF;

    -- Rename enrolled_at to created_at for consistency (if needed)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'enrollments' AND column_name = 'enrolled_at'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'enrollments' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.enrollments RENAME COLUMN enrolled_at TO created_at;
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- STEP 4: Verify RLS Policies
-- ────────────────────────────────────────────────────────────────

-- Ensure RLS is enabled
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "enrollments_student_own" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_insert" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_instructor_read" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_admin_all" ON public.enrollments;

-- Recreate policies
CREATE POLICY "enrollments_student_own"
  ON public.enrollments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "enrollments_insert"
  ON public.enrollments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "enrollments_instructor_read"
  ON public.enrollments FOR SELECT
  USING (
    course_id IN (
      SELECT id FROM public.courses WHERE instructor_id = auth.uid()
    )
  );

CREATE POLICY "enrollments_admin_all"
  ON public.enrollments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND account_type = 'Admin'
    )
  );

-- ────────────────────────────────────────────────────────────────
-- STEP 5: Refresh Schema Cache (CRITICAL!)
-- ────────────────────────────────────────────────────────────────

-- This forces PostgREST to reload the schema and detect relationships
NOTIFY pgrst, 'reload schema';

-- ────────────────────────────────────────────────────────────────
-- STEP 6: Validation Queries
-- ────────────────────────────────────────────────────────────────

-- Run these to verify the fix worked:

-- 1. Check foreign keys exist
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'enrollments';

-- 2. Check indexes exist
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'enrollments'
  AND schemaname = 'public';

-- 3. Test relationship query (should work now!)
-- SELECT id, course_name, enrollments(count)
-- FROM courses
-- LIMIT 1;

-- ================================================================
-- ✅ DONE! 
-- After running this script:
-- 1. Wait 5-10 seconds for schema cache to refresh
-- 2. Test your instructor dashboard
-- 3. The relationship error should be gone
-- ================================================================
