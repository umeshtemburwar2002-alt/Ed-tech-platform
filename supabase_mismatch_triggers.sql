-- ============================================================================
-- SQL Script: Real-Time downstream sync triggers for LMS Schema Alignment
-- Target: Supabase PostgreSQL Database
-- Resolves: Syncs Sections and Lessons created by instructors directly to Student views
-- ============================================================================

-- 1. Safely add is_preview column if not exists (Already executed but added for reproducibility)
ALTER TABLE public.sub_sections ADD COLUMN IF NOT EXISTS is_preview BOOLEAN DEFAULT FALSE;

-- 2. CREATE OR UPDATE SYNC TRIGGER FUNCTION FOR SECTIONS -> COURSE_SECTIONS
CREATE OR REPLACE FUNCTION public.sync_sections_to_course_sections_func()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.course_sections (id, course_id, title, position, created_at)
        VALUES (NEW.id, NEW.course_id, NEW.section_name, NEW.order_index, COALESCE(NEW.created_at, NOW()))
        ON CONFLICT (id) DO UPDATE
        SET 
            course_id = EXCLUDED.course_id,
            title = EXCLUDED.title,
            position = EXCLUDED.position;
            
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE public.course_sections
        SET 
            course_id = NEW.course_id,
            title = NEW.section_name,
            position = NEW.order_index
        WHERE id = NEW.id;
        
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM public.course_sections WHERE id = OLD.id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create sync trigger for public.sections
DROP TRIGGER IF EXISTS sections_downstream_sync_trigger ON public.sections;
CREATE TRIGGER sections_downstream_sync_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.sections
FOR EACH ROW EXECUTE FUNCTION public.sync_sections_to_course_sections_func();


-- 3. CREATE OR UPDATE SYNC TRIGGER FUNCTION FOR SUB_SECTIONS -> COURSE_LESSONS
CREATE OR REPLACE FUNCTION public.sync_sub_sections_to_course_lessons_func()
RETURNS TRIGGER AS $$
DECLARE
    resolved_course_id UUID;
    duration_secs INTEGER;
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Resolve course_id from parent section
        SELECT course_id INTO resolved_course_id
        FROM public.sections
        WHERE id = NEW.section_id;
        
        -- Safely convert string duration to integer seconds
        duration_secs := COALESCE(NULLIF(regexp_replace(NEW.time_duration, '[^0-9]', '', 'g'), ''), '0')::integer;
    END IF;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.course_lessons (
            id, 
            section_id, 
            course_id, 
            title, 
            description, 
            youtube_video_url, 
            duration_seconds, 
            is_free_preview, 
            is_published, 
            position, 
            created_at,
            updated_at
        )
        VALUES (
            NEW.id,
            NEW.section_id,
            resolved_course_id,
            NEW.title,
            NEW.description,
            NEW.video_url,
            duration_secs,
            NEW.is_preview,
            TRUE, -- default publish lessons in student view
            NEW.order_index,
            COALESCE(NEW.created_at, NOW()),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE
        SET 
            section_id = EXCLUDED.section_id,
            course_id = EXCLUDED.course_id,
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            youtube_video_url = EXCLUDED.youtube_video_url,
            duration_seconds = EXCLUDED.duration_seconds,
            is_free_preview = EXCLUDED.is_free_preview,
            position = EXCLUDED.position,
            updated_at = NOW();
            
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE public.course_lessons
        SET 
            section_id = NEW.section_id,
            course_id = resolved_course_id,
            title = NEW.title,
            description = NEW.description,
            youtube_video_url = NEW.video_url,
            duration_seconds = duration_secs,
            is_free_preview = NEW.is_preview,
            position = NEW.order_index,
            updated_at = NOW()
        WHERE id = NEW.id;
        
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM public.course_lessons WHERE id = OLD.id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create sync trigger for public.sub_sections
DROP TRIGGER IF EXISTS subsections_downstream_sync_trigger ON public.sub_sections;
CREATE TRIGGER subsections_downstream_sync_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.sub_sections
FOR EACH ROW EXECUTE FUNCTION public.sync_sub_sections_to_course_lessons_func();


-- 4. RUN COMPREHENSIVE ONE-TIME SYNC FOR ANY UNBALANCED HISTORICAL ROWS
-- Sync sections
INSERT INTO public.course_sections (id, course_id, title, position)
SELECT id, course_id, section_name, order_index
FROM public.sections
ON CONFLICT (id) DO UPDATE 
SET title = EXCLUDED.title, position = EXCLUDED.position;

-- Sync sub_sections
INSERT INTO public.course_lessons (id, section_id, course_id, title, description, youtube_video_url, duration_seconds, is_free_preview, is_published, position)
SELECT 
    s.id, 
    s.section_id, 
    sec.course_id, 
    s.title, 
    s.description, 
    s.video_url, 
    COALESCE(NULLIF(regexp_replace(s.time_duration, '[^0-9]', '', 'g'), ''), '0')::integer, 
    s.is_preview, 
    TRUE, 
    s.order_index
FROM public.sub_sections s
JOIN public.sections sec ON s.section_id = sec.id
ON CONFLICT (id) DO UPDATE 
SET 
    title = EXCLUDED.title, 
    description = EXCLUDED.description, 
    youtube_video_url = EXCLUDED.youtube_video_url, 
    duration_seconds = EXCLUDED.duration_seconds, 
    is_free_preview = EXCLUDED.is_free_preview, 
    position = EXCLUDED.position;


-- 5. NOTIFY SUPABASE OF SCHEMA CHANGES (Refresh Cache)
NOTIFY pgrst, 'reload schema';
