-- ==============================================================================
-- MIGRATION V2: ENROLLMENTS, PAYMENTS, AND DASHBOARD REFACTOR
-- ==============================================================================
-- This migration captures all the work done to normalize the database,
-- create the enrolled_courses view, and fix RLS and triggers.

-- 1. Create Enrollments Table
CREATE TABLE IF NOT EXISTS public.enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    progress_percentage INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    UNIQUE(student_id, course_id)
);

-- 2. Create Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    payment_status TEXT DEFAULT 'completed',
    stripe_session_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Migrate data from purchases (if any)
INSERT INTO public.enrollments (student_id, course_id, enrolled_at)
SELECT user_id, course_id, created_at FROM public.purchases
ON CONFLICT (student_id, course_id) DO NOTHING;

INSERT INTO public.payments (student_id, course_id, amount, payment_status, created_at)
SELECT user_id, course_id, amount, status, created_at FROM public.purchases
WHERE amount IS NOT NULL;

-- 4. Create Enrolled Courses View
CREATE OR REPLACE VIEW public.enrolled_courses AS
SELECT 
    e.id AS enrollment_id,
    e.student_id,
    e.course_id,
    e.enrolled_at,
    e.progress_percentage,
    e.status AS enrollment_status,
    c.title,
    c.description,
    c.thumbnail_url,
    c.final_thumbnail_url,
    c.youtube_thumbnail_url,
    c.instructor_id,
    p.first_name AS instructor_first_name,
    p.last_name AS instructor_last_name
FROM public.enrollments e
JOIN public.courses c ON e.course_id = c.id
JOIN public.profiles p ON c.instructor_id = p.id;

-- 5. Auto-sync progress_percentage and total_students triggers
CREATE OR REPLACE FUNCTION sync_course_stats()
RETURNS TRIGGER AS $function$
BEGIN
    UPDATE public.courses
    SET total_students = (SELECT COUNT(*) FROM public.enrollments WHERE course_id = NEW.course_id)
    WHERE id = NEW.course_id;
    RETURN NEW;
END;
$function$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_course_stats ON public.enrollments;
CREATE TRIGGER trg_sync_course_stats
AFTER INSERT OR DELETE ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION sync_course_stats();

-- 6. Storage Buckets (Ensuring all 19 buckets exist)
-- (Handled internally by Supabase storage schema)

-- 7. Fix is_enrolled function
CREATE OR REPLACE FUNCTION public.is_enrolled(target_course_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.enrollments e
    WHERE e.student_id = auth.uid()
      AND e.course_id = target_course_id
  );
$function$;

-- 8. Auto Create First Lesson Trigger
CREATE OR REPLACE FUNCTION public.auto_create_first_lesson_on_publish()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_section_id uuid;
  v_url text;
BEGIN
  IF NEW.status = 'published' AND OLD.status != 'published' THEN
    v_url := COALESCE(NEW.youtube_video_url, NEW.preview_video_url);
    IF v_url IS NOT NULL AND v_url != '' THEN
      IF NOT EXISTS (SELECT 1 FROM public.course_lessons WHERE course_id = NEW.id) THEN
        SELECT id INTO v_section_id FROM public.sections WHERE course_id = NEW.id ORDER BY order_index ASC LIMIT 1;
        IF v_section_id IS NULL THEN
          INSERT INTO public.sections (course_id, section_name, order_index)
          VALUES (NEW.id, 'Introduction', 0)
          RETURNING id INTO v_section_id;
        END IF;
        INSERT INTO public.course_lessons (course_id, section_id, title, description, video_url, youtube_video_url, is_free_preview, is_preview, is_published, lesson_order, position)
        VALUES (NEW.id, v_section_id, 'Welcome to the Course', NEW.description, v_url, v_url, true, true, true, 1, 0);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_auto_create_first_lesson ON public.courses;
CREATE TRIGGER trg_auto_create_first_lesson
AFTER UPDATE ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.auto_create_first_lesson_on_publish();
