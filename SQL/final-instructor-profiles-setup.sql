-- ============================================
-- Final Instructor Profiles - Complete Setup
-- ============================================

-- 1. Add new columns if they don't exist
ALTER TABLE public.instructor_profiles
ADD COLUMN IF NOT EXISTS onboarding_step INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS draft_saved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_saved_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_instructor_profiles_onboarding_step
ON public.instructor_profiles(onboarding_step);

CREATE INDEX IF NOT EXISTS idx_instructor_profiles_draft_saved
ON public.instructor_profiles(draft_saved);

CREATE INDEX IF NOT EXISTS idx_instructor_profiles_onboarding_completed
ON public.instructor_profiles(onboarding_completed);

CREATE INDEX IF NOT EXISTS idx_instructor_profiles_last_saved_at
ON public.instructor_profiles(last_saved_at);

CREATE INDEX IF NOT EXISTS idx_instructor_profiles_user_id
ON public.instructor_profiles(user_id);

-- 3. Enable RLS (if not already enabled)
ALTER TABLE public.instructor_profiles ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies (to avoid conflicts)
DROP POLICY IF EXISTS "Instructors can insert their own profiles" ON public.instructor_profiles;
DROP POLICY IF EXISTS "Instructors can view their own profiles" ON public.instructor_profiles;
DROP POLICY IF EXISTS "Instructors can update their own profiles" ON public.instructor_profiles;
DROP POLICY IF EXISTS "Instructors can delete their own profiles" ON public.instructor_profiles;

-- 5. Create INSERT policy
CREATE POLICY "Instructors can insert their own profiles"
ON public.instructor_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 6. Create SELECT policy
CREATE POLICY "Instructors can view their own profiles"
ON public.instructor_profiles
FOR SELECT
USING (auth.uid() = user_id);

-- 7. Create UPDATE policy
CREATE POLICY "Instructors can update their own profiles"
ON public.instructor_profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 8. Create DELETE policy
CREATE POLICY "Instructors can delete their own profiles"
ON public.instructor_profiles
FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- Setup Complete!
-- ============================================
