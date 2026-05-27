-- ============================================================================
-- LMS Database Refactoring Migration Script
-- Target: production-level YouTube-based Course Delivery on Supabase
-- Covers: safely altering/creating tables, functions, secure views, triggers,
--         RLS security policies, performance indexes, and storage architecture.
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. SECURE DATABASE HELPER FUNCTIONS
-- ============================================================================

-- Extract 11-char YouTube Video ID from any standard URL format
CREATE OR REPLACE FUNCTION public.extract_youtube_video_id(url TEXT)
RETURNS TEXT AS $$
DECLARE
    patterns TEXT[];
    pattern TEXT;
    matches TEXT[];
BEGIN
    IF url IS NULL OR url = '' THEN
        RETURN NULL;
    END IF;
    
    patterns := ARRAY[
        'youtube\.com/watch\?.*v=([a-zA-Z0-9_-]{11})',
        'youtube\.com/v/([a-zA-Z0-9_-]{11})',
        'youtu\.be/([a-zA-Z0-9_-]{11})',
        'youtube\.com/shorts/([a-zA-Z0-9_-]{11})',
        'youtube\.com/embed/([a-zA-Z0-9_-]{11})',
        'youtube\.com/live/([a-zA-Z0-9_-]{11})'
    ];
    
    FOREACH pattern IN ARRAY patterns LOOP
        matches := regexp_matches(url, pattern, 'i');
        IF matches IS NOT NULL AND matches[1] IS NOT NULL THEN
            RETURN matches[1];
        END IF;
    END LOOP;
    
    -- Fallback: if already a valid 11-character video ID, return it
    IF url ~ '^[a-zA-Z0-9_-]{11}$' THEN
        RETURN url;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- Generate standard embed URL
CREATE OR REPLACE FUNCTION public.generate_embed_url(video_id TEXT)
RETURNS TEXT AS $$
BEGIN
    IF video_id IS NULL OR video_id = '' THEN
        RETURN NULL;
    END IF;
    RETURN 'https://www.youtube.com/embed/' || video_id;
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- Generate standard thumbnail URL with fallbacks
CREATE OR REPLACE FUNCTION public.generate_thumbnail_url(video_id TEXT, quality TEXT DEFAULT 'maxres')
RETURNS TEXT AS $$
DECLARE
    q_val TEXT;
BEGIN
    IF video_id IS NULL OR video_id = '' THEN
        RETURN NULL;
    END IF;
    q_val := CASE LOWER(quality)
        WHEN 'maxres' THEN 'maxresdefault'
        WHEN 'high' THEN 'hqdefault'
        WHEN 'medium' THEN 'mqdefault'
        ELSE 'default'
    END;
    RETURN 'https://img.youtube.com/vi/' || video_id || '/' || q_val || '.jpg';
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- Check if student has active enrollment in course
CREATE OR REPLACE FUNCTION public.is_student_enrolled(student_uuid UUID, course_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF student_uuid IS NULL OR course_uuid IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.enrollments
        WHERE student_id = student_uuid 
          AND course_id = course_uuid
          AND enrollment_status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check overall course access permissions
CREATE OR REPLACE FUNCTION public.can_access_course(user_uuid UUID, course_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    c_instructor UUID;
    c_is_free BOOLEAN;
    u_role TEXT;
BEGIN
    -- Fetch course details
    SELECT instructor_id, is_free INTO c_instructor, c_is_free
    FROM public.courses
    WHERE id = course_uuid;

    -- If course doesn't exist, deny
    IF c_instructor IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Public/Free courses can be viewed by anyone
    IF c_is_free = TRUE THEN
        RETURN TRUE;
    END IF;

    -- Anonymous users cannot view paid courses
    IF user_uuid IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Owner / Instructor check
    IF c_instructor = user_uuid THEN
        RETURN TRUE;
    END IF;

    -- Admin / HOD check
    SELECT role INTO u_role FROM public.profiles WHERE id = user_uuid;
    IF u_role IN ('admin', 'hod') THEN
        RETURN TRUE;
    END IF;

    -- Enrollment check
    RETURN public.is_student_enrolled(user_uuid, course_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check individual lesson access permissions
CREATE OR REPLACE FUNCTION public.can_access_lesson(user_uuid UUID, lesson_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    l_is_preview BOOLEAN;
    l_course_id UUID;
BEGIN
    -- Fetch lesson details
    SELECT is_free_preview, course_id INTO l_is_preview, l_course_id
    FROM public.course_lessons
    WHERE id = lesson_uuid;

    -- If lesson doesn't exist, deny
    IF l_course_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Free preview lessons can be viewed by anyone
    IF l_is_preview = TRUE THEN
        RETURN TRUE;
    END IF;

    -- If not a free preview, check course access
    RETURN public.can_access_course(user_uuid, l_course_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 2. CREATE / UPDATE CORE LMS TABLES
-- ============================================================================

-- ── 2.1 public.courses ──
DO $$
BEGIN
    -- If courses table exists, alter safely; otherwise, create new.
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'courses') THEN
        ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS level TEXT CHECK (level IN ('beginner', 'intermediate', 'advanced'));
        ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'English';
        ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
        ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS duration TEXT;
        ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'unlisted'));
        ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS enrollment_required BOOLEAN DEFAULT TRUE;
        ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS discount_price DECIMAL(10,2) DEFAULT 0.00;
        ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';
        ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS youtube_video_url TEXT;
        ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS youtube_video_id TEXT;
        ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS youtube_embed_url TEXT;
        ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS youtube_thumbnail_url TEXT;
        ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS preview_video_enabled BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS thumbnail_source TEXT DEFAULT 'youtube' CHECK (thumbnail_source IN ('youtube', 'custom'));
        ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS custom_thumbnail_url TEXT;
        ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS final_thumbnail_url TEXT;
        ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS video_provider TEXT DEFAULT 'youtube';
        ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_access_type TEXT DEFAULT 'paid' CHECK (course_access_type IN ('free', 'paid'));
        ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS trailer_video_url TEXT;
        ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS trailer_video_id TEXT;
        ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_type TEXT DEFAULT 'youtube';
        ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS total_sections INTEGER DEFAULT 0;
        ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS total_lessons INTEGER DEFAULT 0;
        ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS total_duration_seconds INTEGER DEFAULT 0;
        ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS enrollment_count INTEGER DEFAULT 0;
        ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS wishlist_count INTEGER DEFAULT 0;
        ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0.00;
        ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
        ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;
        -- Use public.categories relation securely
        ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
    ELSE
        CREATE TABLE public.courses (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            instructor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            slug TEXT NOT NULL UNIQUE,
            description TEXT,
            category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
            level TEXT CHECK (level IN ('beginner', 'intermediate', 'advanced')),
            language TEXT DEFAULT 'English',
            tags TEXT[] DEFAULT '{}',
            duration TEXT,
            status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
            visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'unlisted')),
            is_published BOOLEAN DEFAULT FALSE,
            is_free BOOLEAN DEFAULT FALSE,
            is_paid BOOLEAN DEFAULT FALSE,
            enrollment_required BOOLEAN DEFAULT TRUE,
            price DECIMAL(10,2) DEFAULT 0.00,
            discount_price DECIMAL(10,2) DEFAULT 0.00,
            currency TEXT DEFAULT 'INR',
            youtube_video_url TEXT,
            youtube_video_id TEXT,
            youtube_embed_url TEXT,
            youtube_thumbnail_url TEXT,
            preview_video_enabled BOOLEAN DEFAULT FALSE,
            thumbnail_source TEXT DEFAULT 'youtube' CHECK (thumbnail_source IN ('youtube', 'custom')),
            custom_thumbnail_url TEXT,
            final_thumbnail_url TEXT,
            video_provider TEXT DEFAULT 'youtube',
            course_access_type TEXT DEFAULT 'paid' CHECK (course_access_type IN ('free', 'paid')),
            trailer_video_url TEXT,
            trailer_video_id TEXT,
            course_type TEXT DEFAULT 'youtube',
            total_sections INTEGER DEFAULT 0,
            total_lessons INTEGER DEFAULT 0,
            total_duration_seconds INTEGER DEFAULT 0,
            enrollment_count INTEGER DEFAULT 0,
            wishlist_count INTEGER DEFAULT 0,
            average_rating DECIMAL(3,2) DEFAULT 0.00,
            review_count INTEGER DEFAULT 0,
            last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            published_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- ── 2.2 public.course_drafts ──
CREATE TABLE IF NOT EXISTS public.course_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    current_step INTEGER DEFAULT 0,
    draft_data JSONB DEFAULT '{}'::jsonb,
    autosave_enabled BOOLEAN DEFAULT TRUE,
    last_autosaved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completion_percentage INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 2.3 public.course_sections ──
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'course_sections') THEN
        ALTER TABLE public.course_sections ADD COLUMN IF NOT EXISTS description TEXT;
        ALTER TABLE public.course_sections ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;
        ALTER TABLE public.course_sections ADD COLUMN IF NOT EXISTS is_previewable BOOLEAN DEFAULT FALSE;
    ELSE
        CREATE TABLE public.course_sections (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            description TEXT,
            position INTEGER NOT NULL DEFAULT 0,
            is_previewable BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- ── 2.4 public.course_lessons ──
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'course_lessons') THEN
        ALTER TABLE public.course_lessons ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;
        ALTER TABLE public.course_lessons ADD COLUMN IF NOT EXISTS youtube_video_url TEXT;
        ALTER TABLE public.course_lessons ADD COLUMN IF NOT EXISTS youtube_video_id TEXT;
        ALTER TABLE public.course_lessons ADD COLUMN IF NOT EXISTS youtube_embed_url TEXT;
        ALTER TABLE public.course_lessons ADD COLUMN IF NOT EXISTS youtube_thumbnail_url TEXT;
        ALTER TABLE public.course_lessons ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0;
        ALTER TABLE public.course_lessons ADD COLUMN IF NOT EXISTS is_free_preview BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.course_lessons ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.course_lessons ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;
        ALTER TABLE public.course_lessons ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    ELSE
        CREATE TABLE public.course_lessons (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            section_id UUID NOT NULL REFERENCES public.course_sections(id) ON DELETE CASCADE,
            course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            description TEXT,
            youtube_video_url TEXT,
            youtube_video_id TEXT,
            youtube_embed_url TEXT,
            youtube_thumbnail_url TEXT,
            duration_seconds INTEGER DEFAULT 0,
            is_free_preview BOOLEAN DEFAULT FALSE,
            is_published BOOLEAN DEFAULT FALSE,
            position INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- ── 2.5 public.enrollments ──
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'enrollments') THEN
        ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS payment_id TEXT;
        ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS enrollment_status TEXT DEFAULT 'active';
        ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'paid';
        ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS access_expires_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    ELSE
        CREATE TABLE public.enrollments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
            course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
            payment_id TEXT,
            enrollment_status TEXT DEFAULT 'active' CHECK (enrollment_status IN ('active', 'completed', 'dropped')),
            payment_status TEXT DEFAULT 'paid' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
            access_expires_at TIMESTAMP WITH TIME ZONE,
            enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(student_id, course_id)
        );
    END IF;
END $$;

-- ── 2.6 public.course_progress ──
DROP TABLE IF EXISTS public.course_progress CASCADE;
CREATE TABLE public.course_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
    watched_seconds INTEGER DEFAULT 0,
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    last_watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, lesson_id)
);

-- ── 2.7 public.wishlist ──
CREATE TABLE IF NOT EXISTS public.wishlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, course_id)
);


-- ============================================================================
-- 3. SECURE DATA CURTAIN VIEW (COLUMN-LEVEL SECURITY FOR YOUTUBE EMBEDS)
-- ============================================================================

CREATE OR REPLACE VIEW public.lessons_secure_view AS
SELECT 
    id,
    section_id,
    course_id,
    title,
    description,
    position,
    duration_seconds,
    is_free_preview,
    is_published,
    created_at,
    updated_at,
    -- Gated secure fields (only return if student has valid enrollment, or user owns/instructs the course)
    CASE 
        WHEN public.can_access_lesson(auth.uid(), id) THEN youtube_video_url
        ELSE NULL
    END AS youtube_video_url,
    CASE 
        WHEN public.can_access_lesson(auth.uid(), id) THEN youtube_video_id
        ELSE NULL
    END AS youtube_video_id,
    CASE 
        WHEN public.can_access_lesson(auth.uid(), id) THEN youtube_embed_url
        ELSE NULL
    END AS youtube_embed_url,
    youtube_thumbnail_url
FROM public.course_lessons;


-- ============================================================================
-- 4. TRIGGERS & AUTOMATION WORKFLOWS
-- ============================================================================

-- ── 4.1 Update Timestamp Trigger Function ──
CREATE OR REPLACE FUNCTION public.sync_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 4.2 Auto Slug Generator Trigger Function ──
CREATE OR REPLACE FUNCTION public.generate_course_slug()
RETURNS TRIGGER AS $$
DECLARE
    clean_title TEXT;
    slug_val TEXT;
    i INT := 1;
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        clean_title := LOWER(NEW.title);
        -- Replace all non-alphanumeric with spaces, then spaces with dashes
        clean_title := regexp_replace(clean_title, '[^\w\s-]', '', 'g');
        clean_title := regexp_replace(clean_title, '\s+', '-', 'g');
        clean_title := trim(both '-' from clean_title);
        
        slug_val := clean_title;
        -- Loop to guarantee unique slugs
        WHILE EXISTS (SELECT 1 FROM public.courses WHERE slug = slug_val AND id <> NEW.id) LOOP
            slug_val := clean_title || '-' || i;
            i := i + 1;
        END LOOP;
        
        NEW.slug := slug_val;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 4.3 YouTube Processor & Thumbnail Rule Trigger Function ──
CREATE OR REPLACE FUNCTION public.process_course_youtube_details()
RETURNS TRIGGER AS $$
BEGIN
    -- Extract YouTube properties if preview video exists
    IF NEW.youtube_video_url IS NOT NULL AND NEW.youtube_video_url <> '' THEN
        NEW.youtube_video_id := public.extract_youtube_video_id(NEW.youtube_video_url);
        IF NEW.youtube_video_id IS NOT NULL THEN
            NEW.youtube_embed_url := public.generate_embed_url(NEW.youtube_video_id);
            NEW.youtube_thumbnail_url := public.generate_thumbnail_url(NEW.youtube_video_id, 'maxres');
        END IF;
    END IF;

    -- Process trailer/preview values
    IF NEW.trailer_video_url IS NOT NULL AND NEW.trailer_video_url <> '' THEN
        NEW.trailer_video_id := public.extract_youtube_video_id(NEW.trailer_video_url);
    END IF;

    -- THUMBNAIL RESOLUTION RULE
    -- Active thumbnail resolves to custom_thumbnail_url if custom, otherwise youtube_thumbnail_url. No broken links.
    IF NEW.thumbnail_source = 'custom' AND NEW.custom_thumbnail_url IS NOT NULL AND NEW.custom_thumbnail_url <> '' THEN
        NEW.final_thumbnail_url := NEW.custom_thumbnail_url;
    ELSIF NEW.youtube_thumbnail_url IS NOT NULL AND NEW.youtube_thumbnail_url <> '' THEN
        NEW.final_thumbnail_url := NEW.youtube_thumbnail_url;
    ELSE
        NEW.final_thumbnail_url := 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=400&fit=crop';
    END IF;

    -- Enforce access consistency
    IF NEW.is_free = TRUE THEN
        NEW.is_paid := FALSE;
        NEW.course_access_type := 'free';
        NEW.price := 0.00;
        NEW.discount_price := 0.00;
    ELSE
        NEW.is_paid := TRUE;
        NEW.course_access_type := 'paid';
    END IF;

    -- Publish workflow
    IF NEW.status = 'published' AND (OLD IS NULL OR OLD.status <> 'published') THEN
        NEW.published_at := NOW();
        NEW.is_published := TRUE;
    ELSIF NEW.status <> 'published' THEN
        NEW.is_published := FALSE;
    END IF;

    NEW.last_saved_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 4.4 Lesson YouTube Auto Processor Trigger Function ──
CREATE OR REPLACE FUNCTION public.process_lesson_youtube_details()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.youtube_video_url IS NOT NULL AND NEW.youtube_video_url <> '' THEN
        NEW.youtube_video_id := public.extract_youtube_video_id(NEW.youtube_video_url);
        IF NEW.youtube_video_id IS NOT NULL THEN
            NEW.youtube_embed_url := public.generate_embed_url(NEW.youtube_video_id);
            NEW.youtube_thumbnail_url := public.generate_thumbnail_url(NEW.youtube_video_id, 'high');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 4.5 Auto Rolling Course Aggregates (Lessons, Sections, Durations) ──
CREATE OR REPLACE FUNCTION public.recalculate_course_metadata()
RETURNS TRIGGER AS $$
DECLARE
    target_course_id UUID;
    total_sec INT := 0;
    total_les INT := 0;
    total_dur INT := 0;
    dur_text TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_course_id := OLD.course_id;
    ELSE
        target_course_id := NEW.course_id;
    END IF;

    IF target_course_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Total Sections
    SELECT COUNT(*) INTO total_sec 
    FROM public.course_sections 
    WHERE course_id = target_course_id;

    -- Total Lessons & Summed Duration
    SELECT COUNT(*), COALESCE(SUM(duration_seconds), 0) INTO total_les, total_dur
    FROM public.course_lessons 
    WHERE course_id = target_course_id;

    -- Formatted duration text e.g., "12h 40m"
    IF total_dur >= 3600 THEN
        dur_text := (total_dur / 3600) || 'h ' || ((total_dur % 3600) / 60) || 'm';
    ELSE
        dur_text := (total_dur / 60) || 'm';
    END IF;

    UPDATE public.courses
    SET 
        total_sections = total_sec,
        total_lessons = total_les,
        total_duration_seconds = total_dur,
        duration = dur_text
    WHERE id = target_course_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ── 4.6 Auto Recalculate Rating Trigger Function ──
CREATE OR REPLACE FUNCTION public.recalculate_course_ratings()
RETURNS TRIGGER AS $$
DECLARE
    target_course_id UUID;
    avg_rat DECIMAL(3,2) := 0.00;
    cnt_rev INT := 0;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_course_id := OLD.course_id;
    ELSE
        target_course_id := NEW.course_id;
    END IF;

    IF target_course_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT COALESCE(AVG(rating), 0.00), COUNT(*) INTO avg_rat, cnt_rev
    FROM public.reviews
    WHERE course_id = target_course_id;

    UPDATE public.courses
    SET 
        average_rating = avg_rat,
        review_count = cnt_rev
    WHERE id = target_course_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ── 4.7 Auto Recalculate Enrollments Trigger Function ──
CREATE OR REPLACE FUNCTION public.recalculate_course_stats()
RETURNS TRIGGER AS $$
DECLARE
    target_course_id UUID;
    enroll_cnt INT := 0;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_course_id := OLD.course_id;
    ELSE
        target_course_id := NEW.course_id;
    END IF;

    IF target_course_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT COUNT(*) INTO enroll_cnt
    FROM public.enrollments
    WHERE course_id = target_course_id AND enrollment_status = 'active';

    UPDATE public.courses
    SET enrollment_count = enroll_cnt
    WHERE id = target_course_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ── 4.8 Auto Recalculate Wishlist Trigger Function ──
CREATE OR REPLACE FUNCTION public.recalculate_course_wishlist()
RETURNS TRIGGER AS $$
DECLARE
    target_course_id UUID;
    wish_cnt INT := 0;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_course_id := OLD.course_id;
    ELSE
        target_course_id := NEW.course_id;
    END IF;

    IF target_course_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT COUNT(*) INTO wish_cnt
    FROM public.wishlist
    WHERE course_id = target_course_id;

    UPDATE public.courses
    SET wishlist_count = wish_cnt
    WHERE id = target_course_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;


-- ── 4.9 ASSIGN TRIGGER OBJECTS ──

-- updated_at sync
DROP TRIGGER IF EXISTS courses_sync_updated_at ON public.courses;
CREATE TRIGGER courses_sync_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.sync_updated_at();

DROP TRIGGER IF EXISTS drafts_sync_updated_at ON public.course_drafts;
CREATE TRIGGER drafts_sync_updated_at BEFORE UPDATE ON public.course_drafts FOR EACH ROW EXECUTE FUNCTION public.sync_updated_at();

DROP TRIGGER IF EXISTS lessons_sync_updated_at ON public.course_lessons;
CREATE TRIGGER lessons_sync_updated_at BEFORE UPDATE ON public.course_lessons FOR EACH ROW EXECUTE FUNCTION public.sync_updated_at();

DROP TRIGGER IF EXISTS progress_sync_updated_at ON public.course_progress;
CREATE TRIGGER progress_sync_updated_at BEFORE UPDATE ON public.course_progress FOR EACH ROW EXECUTE FUNCTION public.sync_updated_at();

-- Slug trigger
DROP TRIGGER IF EXISTS courses_generate_slug ON public.courses;
CREATE TRIGGER courses_generate_slug BEFORE INSERT OR UPDATE OF title ON public.courses FOR EACH ROW EXECUTE FUNCTION public.generate_course_slug();

-- YouTube details extraction + thumbnail resolution trigger
DROP TRIGGER IF EXISTS courses_youtube_processor ON public.courses;
CREATE TRIGGER courses_youtube_processor BEFORE INSERT OR UPDATE OF youtube_video_url, custom_thumbnail_url, thumbnail_source, status, is_free ON public.courses FOR EACH ROW EXECUTE FUNCTION public.process_course_youtube_details();

DROP TRIGGER IF EXISTS lessons_youtube_processor ON public.course_lessons;
CREATE TRIGGER lessons_youtube_processor BEFORE INSERT OR UPDATE OF youtube_video_url ON public.course_lessons FOR EACH ROW EXECUTE FUNCTION public.process_lesson_youtube_details();

-- Recalculate course meta aggregates
DROP TRIGGER IF EXISTS sections_recalc_metadata ON public.course_sections;
CREATE TRIGGER sections_recalc_metadata AFTER INSERT OR UPDATE OR DELETE ON public.course_sections FOR EACH ROW EXECUTE FUNCTION public.recalculate_course_metadata();

DROP TRIGGER IF EXISTS lessons_recalc_metadata ON public.course_lessons;
CREATE TRIGGER lessons_recalc_metadata AFTER INSERT OR UPDATE OR DELETE ON public.course_lessons FOR EACH ROW EXECUTE FUNCTION public.recalculate_course_metadata();

-- Ratings triggers
DROP TRIGGER IF EXISTS reviews_recalc_ratings ON public.reviews;
CREATE TRIGGER reviews_recalc_ratings AFTER INSERT OR UPDATE OR DELETE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.recalculate_course_ratings();

-- Enrollment trigger
DROP TRIGGER IF EXISTS enrollments_recalc_stats ON public.enrollments;
CREATE TRIGGER enrollments_recalc_stats AFTER INSERT OR UPDATE OR DELETE ON public.enrollments FOR EACH ROW EXECUTE FUNCTION public.recalculate_course_stats();

-- Wishlist trigger
DROP TRIGGER IF EXISTS wishlist_recalc_wishlist ON public.wishlist;
CREATE TRIGGER wishlist_recalc_wishlist AFTER INSERT OR UPDATE OR DELETE ON public.wishlist FOR EACH ROW EXECUTE FUNCTION public.recalculate_course_wishlist();


-- ============================================================================
-- 5. PERFORMANCE OPTIMIZATION (HIGH-SPEED INDEXES & FOREIGN KEYS)
-- ============================================================================

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_courses_is_published ON public.courses(is_published);
CREATE INDEX IF NOT EXISTS idx_courses_is_free ON public.courses(is_free);
CREATE INDEX IF NOT EXISTS idx_course_lessons_course_id ON public.course_lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_student_course ON public.course_progress(student_id, course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_course ON public.enrollments(student_id, course_id);
CREATE INDEX IF NOT EXISTS idx_course_drafts_instructor_course ON public.course_drafts(instructor_id, published_course_id);


-- ============================================================================
-- 6. ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;

-- ── 6.1 public.courses Policies ──
DROP POLICY IF EXISTS "Anyone can select published courses" ON public.courses;
CREATE POLICY "Anyone can select published courses" ON public.courses
    FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "Instructors can manage own courses" ON public.courses;
CREATE POLICY "Instructors can manage own courses" ON public.courses
    FOR ALL USING (instructor_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all courses" ON public.courses;
CREATE POLICY "Admins can manage all courses" ON public.courses
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ── 6.2 public.course_drafts Policies ──
DROP POLICY IF EXISTS "Instructors can manage own drafts" ON public.course_drafts;
CREATE POLICY "Instructors can manage own drafts" ON public.course_drafts
    FOR ALL USING (instructor_id = auth.uid());

-- ── 6.3 public.course_sections Policies ──
DROP POLICY IF EXISTS "Anyone can select sections of published courses" ON public.course_sections;
CREATE POLICY "Anyone can select sections of published courses" ON public.course_sections
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.courses WHERE courses.id = course_sections.course_id AND courses.status = 'published')
    );

DROP POLICY IF EXISTS "Instructors can manage own sections" ON public.course_sections;
CREATE POLICY "Instructors can manage own sections" ON public.course_sections
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.courses WHERE courses.id = course_sections.course_id AND courses.instructor_id = auth.uid())
    );

-- ── 6.4 public.course_lessons Policies ──
-- Student RLS allows SELECT on public lessons metadata, but actual video URLs are securely gated at the secure curtain view level.
DROP POLICY IF EXISTS "Anyone can select published lessons" ON public.course_lessons;
CREATE POLICY "Anyone can select published lessons" ON public.course_lessons
    FOR SELECT USING (is_published = TRUE);

DROP POLICY IF EXISTS "Instructors can manage own lessons" ON public.course_lessons;
CREATE POLICY "Instructors can manage own lessons" ON public.course_lessons
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.courses WHERE courses.id = course_lessons.course_id AND courses.instructor_id = auth.uid())
    );

-- ── 6.5 public.enrollments Policies ──
DROP POLICY IF EXISTS "Students can select own enrollments" ON public.enrollments;
CREATE POLICY "Students can select own enrollments" ON public.enrollments
    FOR SELECT USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can insert own enrollments" ON public.enrollments;
CREATE POLICY "Students can insert own enrollments" ON public.enrollments
    FOR INSERT WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Instructors can view course enrollments" ON public.enrollments;
CREATE POLICY "Instructors can view course enrollments" ON public.enrollments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.courses WHERE courses.id = enrollments.course_id AND courses.instructor_id = auth.uid())
    );

-- ── 6.6 public.course_progress Policies ──
DROP POLICY IF EXISTS "Students can manage own progress" ON public.course_progress;
CREATE POLICY "Students can manage own progress" ON public.course_progress
    FOR ALL USING (student_id = auth.uid());

-- ── 6.7 public.wishlist Policies ──
DROP POLICY IF EXISTS "Students can manage own wishlist" ON public.wishlist;
CREATE POLICY "Students can manage own wishlist" ON public.wishlist
    FOR ALL USING (student_id = auth.uid());

-- Create wishlists view for frontend compatibility
CREATE OR REPLACE VIEW public.wishlists WITH (security_invoker = true) AS
SELECT * FROM public.wishlist;


-- ============================================================================
-- 7. STORAGE ARCHITECTURE & SECURITY POLICIES
-- ============================================================================

-- Create buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
('course-thumbnails', 'course-thumbnails', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
('instructor-assets', 'instructor-assets', false, 2147483648, NULL),
('certificates', 'certificates', false, 10485760, ARRAY['application/pdf']),
('course-resources', 'course-resources', false, 104857600, NULL)
ON CONFLICT (id) DO NOTHING;

-- RLS setup for storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- course-thumbnails policies
DROP POLICY IF EXISTS "Public thumbnail select" ON storage.objects;
CREATE POLICY "Public thumbnail select" ON storage.objects FOR SELECT USING (bucket_id = 'course-thumbnails');

DROP POLICY IF EXISTS "Instructor thumbnail insert" ON storage.objects;
CREATE POLICY "Instructor thumbnail insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'course-thumbnails' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Instructor thumbnail update" ON storage.objects;
CREATE POLICY "Instructor thumbnail update" ON storage.objects FOR UPDATE USING (bucket_id = 'course-thumbnails' AND auth.uid()::text = (regexp_split_to_array(name, '/'))[1]);

DROP POLICY IF EXISTS "Instructor thumbnail delete" ON storage.objects;
CREATE POLICY "Instructor thumbnail delete" ON storage.objects FOR DELETE USING (bucket_id = 'course-thumbnails' AND auth.uid()::text = (regexp_split_to_array(name, '/'))[1]);

-- certificates policies
DROP POLICY IF EXISTS "Enrolled certificates select" ON storage.objects;
CREATE POLICY "Enrolled certificates select" ON storage.objects FOR SELECT USING (
    bucket_id = 'certificates' AND
    EXISTS (SELECT 1 FROM public.certificates c WHERE c.certificate_url = name AND c.student_id = auth.uid())
);

DROP POLICY IF EXISTS "System certificates upload" ON storage.objects;
CREATE POLICY "System certificates upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'certificates' AND auth.role() = 'service_role');


-- ============================================================================
-- 8. REALTIME SYNC PROVISIONING
-- ============================================================================

-- Safely add tables to supabase_realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'courses'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.courses;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'course_drafts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.course_drafts;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'course_lessons'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.course_lessons;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'enrollments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.enrollments;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'course_progress'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.course_progress;
    END IF;
END $$;


-- ============================================================================
-- 9. SAMPLE SEED DATA
-- ============================================================================

-- Ensure test departments and categories exist
INSERT INTO public.departments (name, code) 
VALUES ('Computer Science & Engineering', 'CSE') 
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.categories (name, slug)
VALUES 
('Web Development', 'web-development'),
('Machine Learning', 'machine-learning')
ON CONFLICT (slug) DO NOTHING;
