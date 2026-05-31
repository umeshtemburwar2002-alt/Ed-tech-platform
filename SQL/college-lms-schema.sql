-- College LMS - Complete Supabase SQL Schema
-- This schema includes all tables, indexes, triggers, RLS policies, and realtime setup

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE (Auto-created from auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    roll_number TEXT UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('student', 'instructor', 'hod', 'admin')),
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    semester INTEGER CHECK (semester >= 1 AND semester <= 8),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_profiles_roll_number ON public.profiles(roll_number);

-- Auto-create profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'student')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.updated_at_trigger()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.updated_at_trigger();

-- ============================================================================
-- DEPARTMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    hod_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departments_code ON public.departments(code);

-- ============================================================================
-- CATEGORIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_department ON public.categories(department_id);

-- ============================================================================
-- COURSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    thumbnail_url TEXT,
    price DECIMAL(10, 2) DEFAULT 0,
    discount INTEGER DEFAULT 0 CHECK (discount >= 0 AND discount <= 100),
    level TEXT CHECK (level IN ('beginner', 'intermediate', 'advanced')),
    language TEXT DEFAULT 'English',
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    semester INTEGER CHECK (semester >= 1 AND semester <= 8),
    subject_code TEXT,
    is_free BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_instructor ON public.courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_slug ON public.courses(slug);
CREATE INDEX IF NOT EXISTS idx_courses_status ON public.courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_department ON public.courses(department_id);
CREATE INDEX IF NOT EXISTS idx_courses_subject_code ON public.courses(subject_code);

CREATE TRIGGER courses_updated_at
    BEFORE UPDATE ON public.courses
    FOR EACH ROW EXECUTE FUNCTION public.updated_at_trigger();

-- ============================================================================
-- COURSE TAGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.course_tags (
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    PRIMARY KEY (course_id, tag)
);

-- ============================================================================
-- COURSE OUTCOMES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.course_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    outcome TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_course_outcomes_course ON public.course_outcomes(course_id);

-- ============================================================================
-- COURSE REQUIREMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.course_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    requirement TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_course_requirements_course ON public.course_requirements(course_id);

-- ============================================================================
-- COURSE SECTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.course_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_sections_course ON public.course_sections(course_id);

-- ============================================================================
-- COURSE LESSONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.course_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES public.course_sections(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('video', 'pdf', 'article', 'quiz', 'assignment')),
    video_url TEXT,
    pdf_url TEXT,
    article_content TEXT,
    duration INTEGER, -- in minutes
    order_index INTEGER NOT NULL DEFAULT 0,
    is_preview BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_lessons_section ON public.course_lessons(section_id);
CREATE INDEX IF NOT EXISTS idx_course_lessons_type ON public.course_lessons(type);

-- ============================================================================
-- LESSON RESOURCES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.lesson_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    size BIGINT -- in bytes
);

CREATE INDEX IF NOT EXISTS idx_lesson_resources_lesson ON public.lesson_resources(lesson_id);

-- ============================================================================
-- QUIZZES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID REFERENCES public.course_lessons(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    passing_score INTEGER DEFAULT 70 CHECK (passing_score >= 0 AND passing_score <= 100),
    timer_minutes INTEGER,
    is_published BOOLEAN DEFAULT FALSE,
    show_answers BOOLEAN DEFAULT TRUE,
    allow_retakes BOOLEAN DEFAULT TRUE,
    max_attempts INTEGER DEFAULT 3
);

CREATE INDEX IF NOT EXISTS idx_quizzes_lesson ON public.quizzes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_course ON public.quizzes(course_id);

-- ============================================================================
-- QUIZ QUESTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('multiple_choice', 'true_false', 'short_answer')),
    options JSONB, -- For multiple choice: ["A", "B", "C", "D"]
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    order_index INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON public.quiz_questions(quiz_id);

-- ============================================================================
-- QUIZ ATTEMPTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    passed BOOLEAN NOT NULL,
    answers JSONB, -- Store student answers
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON public.quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON public.quiz_attempts(student_id);

-- ============================================================================
-- ASSIGNMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    max_marks INTEGER DEFAULT 100,
    allowed_types TEXT[], -- e.g., ['pdf', 'doc', 'docx']
    max_size BIGINT DEFAULT 10485760 -- 10MB default
);

CREATE INDEX IF NOT EXISTS idx_assignments_lesson ON public.assignments(lesson_id);

-- ============================================================================
-- ASSIGNMENT SUBMISSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    marks INTEGER,
    feedback TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment ON public.assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student ON public.assignment_submissions(student_id);

-- ============================================================================
-- ENROLLMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(course_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_course ON public.enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON public.enrollments(status);

-- ============================================================================
-- LESSON PROGRESS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT FALSE,
    watch_time INTEGER DEFAULT 0, -- in seconds
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(lesson_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON public.lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_student ON public.lesson_progress(student_id);

-- ============================================================================
-- ATTENDANCE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late')),
    marked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(lesson_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_lesson ON public.attendance(lesson_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance(student_id);

-- ============================================================================
-- REVIEWS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_course ON public.reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_reviews_student ON public.reviews(student_id);

-- ============================================================================
-- WISHLISTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlists_course ON public.wishlists(course_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_student ON public.wishlists(student_id);

-- ============================================================================
-- CERTIFICATES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    certificate_url TEXT,
    uuid_token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX IF NOT EXISTS idx_certificates_course ON public.certificates(course_id);
CREATE INDEX IF NOT EXISTS idx_certificates_student ON public.certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_uuid ON public.certificates(uuid_token);

-- ============================================================================
-- ANNOUNCEMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    instructor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_course ON public.announcements(course_id);
CREATE INDEX IF NOT EXISTS idx_announcements_department ON public.announcements(department_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Instructors can view students in their courses" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.enrollments e
            JOIN public.courses c ON e.course_id = c.id
            WHERE c.instructor_id = auth.uid() AND e.student_id = profiles.id
        )
    );

-- Courses policies
CREATE POLICY "Anyone can view published courses" ON public.courses
    FOR SELECT USING (status = 'published');

CREATE POLICY "Instructors can manage own courses" ON public.courses
    FOR ALL USING (instructor_id = auth.uid());

CREATE POLICY "Admins can manage all courses" ON public.courses
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Enrollments policies
CREATE POLICY "Students can view own enrollments" ON public.enrollments
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can create enrollments" ON public.enrollments
    FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Instructors can view enrollments in their courses" ON public.enrollments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE id = enrollments.course_id AND instructor_id = auth.uid()
        )
    );

-- Lesson progress policies
CREATE POLICY "Students can manage own progress" ON public.lesson_progress
    FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Instructors can view progress in their courses" ON public.lesson_progress
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.course_lessons l
            JOIN public.courses c ON l.section_id IN (
                SELECT id FROM public.course_sections WHERE course_id = c.id
            )
            WHERE l.id = lesson_progress.lesson_id AND c.instructor_id = auth.uid()
        )
    );

-- Certificates policies
CREATE POLICY "Students can view own certificates" ON public.certificates
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Public can verify certificates by UUID" ON public.certificates
    FOR SELECT USING (true);

-- Announcements policies
CREATE POLICY "Students can view announcements" ON public.announcements
    FOR SELECT USING (
        course_id IN (
            SELECT course_id FROM public.enrollments WHERE student_id = auth.uid()
        ) OR
        department_id IN (
            SELECT department_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Instructors can manage course announcements" ON public.announcements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE id = announcements.course_id AND instructor_id = auth.uid()
        )
    );

-- ============================================================================
-- REALTIME SETUP
-- ============================================================================

-- Enable realtime on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.courses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.enrollments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lesson_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quizzes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_attempts;

-- ============================================================================
-- SAMPLE DATA (DEPARTMENTS)
-- ============================================================================
INSERT INTO public.departments (name, code) VALUES
('Computer Science', 'CS'),
('Electronics & Communication', 'ECE'),
('Mechanical Engineering', 'ME'),
('Master of Business Administration', 'MBA')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- STORAGE BUCKETS SETUP (Run in Supabase Dashboard)
-- ============================================================================
/*
Instructions for creating storage buckets in Supabase Dashboard:

1. Go to Storage > Create a new bucket
2. Create the following buckets with these settings:

course-thumbnails:
- Public: Yes
- File size limit: 5MB
- Allowed MIME types: image/*
- RLS Policy: Public read, authenticated write

lesson-videos:
- Public: No
- File size limit: 2GB
- Allowed MIME types: video/mp4, video/webm, video/quicktime
- RLS Policy: Enrolled students + instructors can read, instructors can write

lesson-pdfs:
- Public: No
- File size limit: 50MB
- Allowed MIME types: application/pdf
- RLS Policy: Enrolled students can read, instructors can write

lesson-resources:
- Public: No
- File size limit: 100MB
- Allowed MIME types: *
- RLS Policy: Enrolled students can read, instructors can write

assignment-files:
- Public: No
- File size limit: 50MB
- Allowed MIME types: *
- RLS Policy: Instructors can read/write, students can submit to own assignments

user-avatars:
- Public: Yes
- File size limit: 2MB
- Allowed MIME types: image/*
- RLS Policy: Public read, authenticated users can write own

certificates:
- Public: No
- File size limit: 10MB
- Allowed MIME types: application/pdf
- RLS Policy: Public read by uuid_token verification only

Example RLS policy for course-thumbnails:
CREATE POLICY "Public can read thumbnails" ON storage.objects
  FOR SELECT USING (bucket_id = 'course-thumbnails');

CREATE POLICY "Authenticated can upload thumbnails" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'course-thumbnails' AND 
    auth.role() = 'authenticated'
  );
*/
