-- ================================================================
-- Fix courses table to support both column names (title/description AND course_name/course_description)
-- Run this in Supabase SQL Editor!
-- ================================================================

-- First, check if title/description already exist; if not, add them
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'courses' AND column_name = 'title') THEN
        ALTER TABLE public.courses ADD COLUMN title TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'courses' AND column_name = 'description') THEN
        ALTER TABLE public.courses ADD COLUMN description TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'courses' AND column_name = 'enrolled_students_count') THEN
        ALTER TABLE public.courses ADD COLUMN enrolled_students_count INT DEFAULT 0;
    END IF;
END $$;

-- If course_name exists, set title to course_name for existing rows
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'courses' AND column_name = 'course_name') THEN
        UPDATE public.courses SET title = course_name WHERE title IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'courses' AND column_name = 'course_description') THEN
        UPDATE public.courses SET description = course_description WHERE description IS NULL;
    END IF;
END $$;

-- Add a trigger to update enrolled_students_count when a new enrollment is added
CREATE OR REPLACE FUNCTION public.update_course_enrollment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update count when inserting an enrollment
  IF TG_OP = 'INSERT' THEN
    UPDATE public.courses
    SET enrolled_students_count = enrolled_students_count + 1
    WHERE id = NEW.course_id;
  -- Update count when deleting an enrollment
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.courses
    SET enrolled_students_count = enrolled_students_count - 1
    WHERE id = OLD.course_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_enrollment_change ON public.enrollments;

-- Create the trigger
CREATE TRIGGER on_enrollment_change
AFTER INSERT OR DELETE ON public.enrollments
FOR EACH ROW
EXECUTE FUNCTION public.update_course_enrollment_count();

-- ================================================================
-- DONE!
-- ================================================================
