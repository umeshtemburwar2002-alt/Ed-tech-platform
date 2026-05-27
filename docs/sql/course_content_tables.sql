-- ================================================================
-- ADDITIONAL TABLES FOR WHAT YOU'LL LEARN & COURSE CONTENT
-- ================================================================
-- This migration adds enhanced tables for learning outcomes and course content management

-- ================================================================
-- 1. ENHANCED COURSE LEARNING POINTS TABLE (What You'll Learn)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.course_learning_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_course_learning_points_course ON public.course_learning_points(course_id);
CREATE INDEX IF NOT EXISTS idx_course_learning_points_order ON public.course_learning_points(course_id, order_index);

-- Add updated_at trigger
CREATE TRIGGER course_learning_points_updated_at
    BEFORE UPDATE ON public.course_learning_points
    FOR EACH ROW EXECUTE FUNCTION public.updated_at_trigger();

-- Enable RLS
ALTER TABLE public.course_learning_points ENABLE ROW LEVEL SECURITY;

-- RLS Policies for course_learning_points
CREATE POLICY "Instructors can manage their course learning points"
    ON public.course_learning_points
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.courses
            WHERE courses.id = public.course_learning_points.course_id
            AND courses.instructor_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can view learning points for published courses"
    ON public.course_learning_points
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.courses
            WHERE courses.id = public.course_learning_points.course_id
            AND courses.status = 'published'
        )
    );

-- ================================================================
-- 2. ENHANCED COURSE SECTIONS TABLE
-- ================================================================
-- Check if table exists, if not create it with enhanced structure
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'course_sections') THEN
        CREATE TABLE public.course_sections (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            description TEXT,
            order_index INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX idx_course_sections_course ON public.course_sections(course_id);
        CREATE INDEX idx_course_sections_order ON public.course_sections(course_id, order_index);
        
        CREATE TRIGGER course_sections_updated_at
            BEFORE UPDATE ON public.course_sections
            FOR EACH ROW EXECUTE FUNCTION public.updated_at_trigger();
            
        ALTER TABLE public.course_sections ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Instructors can manage their course sections"
            ON public.course_sections
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM public.courses
                    WHERE courses.id = public.course_sections.course_id
                    AND courses.instructor_id = auth.uid()
                )
            );
            
        CREATE POLICY "Anyone can view sections for published courses"
            ON public.course_sections
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM public.courses
                    WHERE courses.id = public.course_sections.course_id
                    AND courses.status = 'published'
                )
            );
    END IF;
END $$;

-- ================================================================
-- 3. ENHANCED COURSE LESSONS TABLE  
-- ================================================================
-- Check if table exists, if not create it with enhanced structure
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'course_lessons') THEN
        CREATE TABLE public.course_lessons (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            section_id UUID NOT NULL REFERENCES public.course_sections(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            description TEXT,
            content_type TEXT NOT NULL CHECK (content_type IN ('video', 'text', 'quiz', 'assignment', 'live', 'other')),
            video_url TEXT,
            text_content TEXT,
            duration INTEGER DEFAULT 0, -- in minutes
            is_preview BOOLEAN DEFAULT FALSE,
            access_level TEXT DEFAULT 'free' CHECK (access_level IN ('free', 'premium', 'paid')),
            is_published BOOLEAN DEFAULT FALSE,
            published_at TIMESTAMP WITH TIME ZONE,
            order_index INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX idx_course_lessons_section ON public.course_lessons(section_id);
        CREATE INDEX idx_course_lessons_type ON public.course_lessons(content_type);
        CREATE INDEX idx_course_lessons_published ON public.course_lessons(is_published);
        
        CREATE TRIGGER course_lessons_updated_at
            BEFORE UPDATE ON public.course_lessons
            FOR EACH ROW EXECUTE FUNCTION public.updated_at_trigger();
            
        ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Instructors can manage their course lessons"
            ON public.course_lessons
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM public.course_sections
                    JOIN public.courses ON courses.id = public.course_sections.course_id
                    WHERE public.course_sections.id = public.course_lessons.section_id
                    AND courses.instructor_id = auth.uid()
                )
            );
            
        CREATE POLICY "Anyone can view published lessons"
            ON public.course_lessons
            FOR SELECT
            USING (
                is_published = true AND
                EXISTS (
                    SELECT 1 FROM public.course_sections
                    JOIN public.courses ON courses.id = public.course_sections.course_id
                    WHERE public.course_sections.id = public.course_lessons.section_id
                    AND courses.status = 'published'
                )
            );
    END IF;
END $$;

-- ================================================================
-- 4. COURSE METRICS COLUMNS (Add to existing courses table)
-- ================================================================
DO $$
BEGIN
    -- Add columns if they don't exist
    ALTER TABLE public.courses
        ADD COLUMN IF NOT EXISTS total_lessons INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_sections INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_duration INTEGER DEFAULT 0;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- ================================================================
-- 5. AUTOMATIC METRICS UPDATE FUNCTION
-- ================================================================
CREATE OR REPLACE FUNCTION public.update_course_metrics()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF TG_TABLE_NAME = 'course_sections' THEN
            UPDATE public.courses SET
                total_sections = total_sections + 1,
                updated_at = NOW()
            WHERE id = NEW.course_id;
        ELSIF TG_TABLE_NAME = 'course_lessons' THEN
            UPDATE public.courses SET
                total_lessons = total_lessons + 1,
                total_duration = total_duration + COALESCE(NEW.duration, 0),
                updated_at = NOW()
            WHERE id = (SELECT course_id FROM public.course_sections WHERE id = NEW.section_id);
        ELSIF TG_TABLE_NAME = 'course_learning_points' THEN
            -- Update courses table if needed for learning points count
            NULL;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF TG_TABLE_NAME = 'course_sections' THEN
            UPDATE public.courses SET
                total_sections = GREATEST(total_sections - 1, 0),
                updated_at = NOW()
            WHERE id = OLD.course_id;
        ELSIF TG_TABLE_NAME = 'course_lessons' THEN
            UPDATE public.courses SET
                total_lessons = GREATEST(total_lessons - 1, 0),
                total_duration = GREATEST(total_duration - COALESCE(OLD.duration, 0), 0),
                updated_at = NOW()
            WHERE id = (SELECT course_id FROM public.course_sections WHERE id = OLD.section_id);
        ELSIF TG_TABLE_NAME = 'course_learning_points' THEN
            NULL;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF TG_TABLE_NAME = 'course_lessons' AND NEW.duration <> OLD.duration THEN
            UPDATE public.courses SET
                total_duration = total_duration + COALESCE(NEW.duration, 0) - COALESCE(OLD.duration, 0),
                updated_at = NOW()
            WHERE id = (SELECT course_id FROM public.course_sections WHERE id = NEW.section_id);
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 6. CREATE TRIGGERS FOR AUTOMATIC METRICS UPDATE
-- ================================================================
DROP TRIGGER IF EXISTS trigger_update_course_metrics_sections ON public.course_sections;
CREATE TRIGGER trigger_update_course_metrics_sections
    AFTER INSERT OR DELETE OR UPDATE ON public.course_sections
    FOR EACH ROW EXECUTE FUNCTION public.update_course_metrics();

DROP TRIGGER IF EXISTS trigger_update_course_metrics_lessons ON public.course_lessons;
CREATE TRIGGER trigger_update_course_metrics_lessons
    AFTER INSERT OR DELETE OR UPDATE ON public.course_lessons
    FOR EACH ROW EXECUTE FUNCTION public.update_course_metrics();

-- ================================================================
-- 7. HELPER FUNCTION TO GET COURSE CONTENT WITH LEARNING POINTS
-- ================================================================
CREATE OR REPLACE FUNCTION public.get_course_content_with_learning_points(p_course_id UUID)
RETURNS JSON AS $$
DECLARE
    course_data JSON;
    learning_points JSON;
    sections JSON;
BEGIN
    -- Get basic course info
    SELECT json_build_object(
        'id', id,
        'title', title,
        'description', description,
        'total_lessons', total_lessons,
        'total_sections', total_sections,
        'total_duration', total_duration
    ) INTO course_data
    FROM public.courses
    WHERE id = p_course_id;
    
    -- Get learning points
    SELECT COALESCE(json_agg(json_build_object(
        'id', id,
        'title', title,
        'description', description,
        'order_index', order_index
    )), '[]'::json) INTO learning_points
    FROM public.course_learning_points
    WHERE course_id = p_course_id
    ORDER BY order_index;
    
    -- Get sections with lessons
    SELECT COALESCE(json_agg(
        json_build_object(
            'id', s.id,
            'title', s.title,
            'description', s.description,
            'order_index', s.order_index,
            'lessons', (
                SELECT COALESCE(json_agg(json_build_object(
                    'id', l.id,
                    'title', l.title,
                    'description', l.description,
                    'content_type', l.content_type,
                    'duration', l.duration,
                    'is_preview', l.is_preview,
                    'access_level', l.access_level,
                    'is_published', l.is_published,
                    'order_index', l.order_index
                )), '[]'::json)
                FROM public.course_lessons l
                WHERE l.section_id = s.id
                ORDER BY l.order_index
            )
        )
    ), '[]'::json) INTO sections
    FROM public.course_sections s
    WHERE s.course_id = p_course_id
    ORDER BY s.order_index;
    
    -- Combine all data
    RETURN json_build_object(
        'course', course_data,
        'learning_points', learning_points,
        'sections', sections
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 8. CREATE VIEW FOR EASY COURSE CONTENT ACCESS
-- ================================================================
CREATE OR REPLACE VIEW public.course_content_view AS
SELECT 
    c.id as course_id,
    c.title as course_title,
    c.description as course_description,
    c.total_lessons,
    c.total_sections,
    c.total_duration,
    (
        SELECT json_agg(json_build_object(
            'id', lp.id,
            'title', lp.title,
            'description', lp.description,
            'order_index', lp.order_index
        ) ORDER BY lp.order_index)
        FROM public.course_learning_points lp
        WHERE lp.course_id = c.id
    ) as learning_points,
    (
        SELECT json_agg(json_build_object(
            'id', s.id,
            'title', s.title,
            'order_index', s.order_index,
            'lessons_count', (SELECT COUNT(*) FROM public.course_lessons l WHERE l.section_id = s.id)
        ) ORDER BY s.order_index)
        FROM public.course_sections s
        WHERE s.course_id = c.id
    ) as sections
FROM public.courses c;

-- ================================================================
-- SUCCESS MESSAGE
-- ================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Successfully created/updated tables for What You''ll Learn and Course Content!';
    RAISE NOTICE '📋 Tables: course_learning_points, course_sections, course_lessons';
    RAISE NOTICE '🔒 RLS Policies applied for security';
    RAISE NOTICE '📊 Automatic metrics calculation enabled';
    RAISE NOTICE '🔍 Helper functions and views created';
END $$;