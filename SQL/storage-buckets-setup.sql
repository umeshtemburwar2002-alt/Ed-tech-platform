-- College LMS - Storage Buckets Setup
-- Run this SQL in Supabase SQL Editor after creating the schema

-- ============================================================================
-- STORAGE BUCKETS CREATION
-- ============================================================================

-- Insert storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
('course-thumbnails', 'course-thumbnails', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
('lesson-videos', 'lesson-videos', false, 2147483648, ARRAY['video/mp4', 'video/webm', 'video/quicktime']),
('lesson-pdfs', 'lesson-pdfs', false, 52428800, ARRAY['application/pdf']),
('lesson-resources', 'lesson-resources', false, 104857600, NULL),
('assignment-files', 'assignment-files', false, 52428800, NULL),
('user-avatars', 'user-avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
('certificates', 'certificates', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE RLS POLICIES
-- ============================================================================

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- course-thumbnails policies
CREATE POLICY "Public can read course thumbnails" ON storage.objects
  FOR SELECT USING (bucket_id = 'course-thumbnails');

CREATE POLICY "Authenticated can upload course thumbnails" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'course-thumbnails' AND 
    auth.role() = 'authenticated'
  );

CREATE POLICY "Instructors can update own course thumbnails" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'course-thumbnails' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Instructors can delete own course thumbnails" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'course-thumbnails' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- lesson-videos policies
CREATE POLICY "Enrolled students can read lesson videos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'lesson-videos' AND
    EXISTS (
      SELECT 1 FROM public.enrollments e
      JOIN public.course_lessons l ON l.id::text = (storage.foldername(name))[2]
      JOIN public.course_sections s ON s.id = l.section_id
      JOIN public.courses c ON c.id = s.course_id
      WHERE e.student_id = auth.uid() AND e.course_id = c.id AND e.status = 'active'
    )
  );

CREATE POLICY "Instructors can read own lesson videos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'lesson-videos' AND
    EXISTS (
      SELECT 1 FROM public.course_lessons l
      JOIN public.course_sections s ON s.id = l.section_id
      JOIN public.courses c ON c.id = s.course_id
      WHERE c.instructor_id = auth.uid() AND l.id::text = (storage.foldername(name))[2]
    )
  );

CREATE POLICY "Instructors can upload lesson videos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'lesson-videos' AND 
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('instructor', 'admin')
    )
  );

CREATE POLICY "Instructors can update own lesson videos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'lesson-videos' AND
    EXISTS (
      SELECT 1 FROM public.course_lessons l
      JOIN public.course_sections s ON s.id = l.section_id
      JOIN public.courses c ON c.id = s.course_id
      WHERE c.instructor_id = auth.uid() AND l.id::text = (storage.foldername(name))[2]
    )
  );

CREATE POLICY "Instructors can delete own lesson videos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'lesson-videos' AND
    EXISTS (
      SELECT 1 FROM public.course_lessons l
      JOIN public.course_sections s ON s.id = l.section_id
      JOIN public.courses c ON c.id = s.course_id
      WHERE c.instructor_id = auth.uid() AND l.id::text = (storage.foldername(name))[2]
    )
  );

-- lesson-pdfs policies
CREATE POLICY "Enrolled students can read lesson PDFs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'lesson-pdfs' AND
    EXISTS (
      SELECT 1 FROM public.enrollments e
      JOIN public.course_lessons l ON l.id::text = (storage.foldername(name))[2]
      JOIN public.course_sections s ON s.id = l.section_id
      JOIN public.courses c ON c.id = s.course_id
      WHERE e.student_id = auth.uid() AND e.course_id = c.id AND e.status = 'active'
    )
  );

CREATE POLICY "Instructors can read own lesson PDFs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'lesson-pdfs' AND
    EXISTS (
      SELECT 1 FROM public.course_lessons l
      JOIN public.course_sections s ON s.id = l.section_id
      JOIN public.courses c ON c.id = s.course_id
      WHERE c.instructor_id = auth.uid() AND l.id::text = (storage.foldername(name))[2]
    )
  );

CREATE POLICY "Instructors can upload lesson PDFs" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'lesson-pdfs' AND 
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('instructor', 'admin')
    )
  );

CREATE POLICY "Instructors can update own lesson PDFs" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'lesson-pdfs' AND
    EXISTS (
      SELECT 1 FROM public.course_lessons l
      JOIN public.course_sections s ON s.id = l.section_id
      JOIN public.courses c ON c.id = s.course_id
      WHERE c.instructor_id = auth.uid() AND l.id::text = (storage.foldername(name))[2]
    )
  );

CREATE POLICY "Instructors can delete own lesson PDFs" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'lesson-pdfs' AND
    EXISTS (
      SELECT 1 FROM public.course_lessons l
      JOIN public.course_sections s ON s.id = l.section_id
      JOIN public.courses c ON c.id = s.course_id
      WHERE c.instructor_id = auth.uid() AND l.id::text = (storage.foldername(name))[2]
    )
  );

-- lesson-resources policies
CREATE POLICY "Enrolled students can read lesson resources" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'lesson-resources' AND
    EXISTS (
      SELECT 1 FROM public.enrollments e
      JOIN public.lesson_resources lr ON lr.file_url = storage.path(id)
      JOIN public.course_lessons l ON l.id = lr.lesson_id
      JOIN public.course_sections s ON s.id = l.section_id
      JOIN public.courses c ON c.id = s.course_id
      WHERE e.student_id = auth.uid() AND e.course_id = c.id AND e.status = 'active'
    )
  );

CREATE POLICY "Instructors can read own lesson resources" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'lesson-resources' AND
    EXISTS (
      SELECT 1 FROM public.lesson_resources lr ON lr.file_url = storage.path(id)
      JOIN public.course_lessons l ON l.id = lr.lesson_id
      JOIN public.course_sections s ON s.id = l.section_id
      JOIN public.courses c ON c.id = s.course_id
      WHERE c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can upload lesson resources" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'lesson-resources' AND 
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('instructor', 'admin')
    )
  );

CREATE POLICY "Instructors can delete own lesson resources" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'lesson-resources' AND
    EXISTS (
      SELECT 1 FROM public.lesson_resources lr ON lr.file_url = storage.path(id)
      JOIN public.course_lessons l ON l.id = lr.lesson_id
      JOIN public.course_sections s ON s.id = l.section_id
      JOIN public.courses c ON c.id = s.course_id
      WHERE c.instructor_id = auth.uid()
    )
  );

-- assignment-files policies
CREATE POLICY "Students can upload assignment files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'assignment-files' AND 
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'student'
    )
  );

CREATE POLICY "Students can read own assignment files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'assignment-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Instructors can read assignment files for their courses" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'assignment-files' AND
    EXISTS (
      SELECT 1 FROM public.assignment_submissions asub
      JOIN public.assignments a ON a.id = asub.assignment_id
      JOIN public.course_lessons l ON l.id = a.lesson_id
      JOIN public.course_sections s ON s.id = l.section_id
      JOIN public.courses c ON c.id = s.course_id
      WHERE asub.file_url = storage.path(id) AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Students can delete own assignment files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'assignment-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- user-avatars policies
CREATE POLICY "Public can read user avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'user-avatars');

CREATE POLICY "Authenticated can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-avatars' AND 
    auth.role() = 'authenticated' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'user-avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'user-avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- certificates policies
CREATE POLICY "Public can verify certificates by UUID" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'certificates' AND
    EXISTS (
      SELECT 1 FROM public.certificates c
      WHERE c.certificate_url = storage.path(id) AND
      (storage.foldername(name))[1] = c.uuid_token
    )
  );

CREATE POLICY "Students can read own certificates" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'certificates' AND
    EXISTS (
      SELECT 1 FROM public.certificates c
      WHERE c.certificate_url = storage.path(id) AND c.student_id = auth.uid()
    )
  );

CREATE POLICY "System can upload certificates" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'certificates' AND 
    auth.role() = 'service_role'
  );

-- ============================================================================
-- HELPER FUNCTION FOR FOLDER NAME EXTRACTION
-- ============================================================================

CREATE OR REPLACE FUNCTION storage.foldername(path text)
RETURNS text[] AS $$
BEGIN
  RETURN regexp_split_to_array(path, '/');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- STORAGE BUCKET FOLDER STRUCTURE GUIDE
-- ============================================================================

/*
Recommended folder structure for each bucket:

course-thumbnails/
  {instructor_id}/
    {course_id}/
      thumbnail.jpg

lesson-videos/
  {course_id}/
    {lesson_id}/
      video.mp4

lesson-pdfs/
  {course_id}/
    {lesson_id}/
      lesson.pdf

lesson-resources/
  {course_id}/
    {lesson_id}/
      {resource_name}.{ext}

assignment-files/
  {student_id}/
    {assignment_id}/
      submission.{ext}

user-avatars/
  {user_id}/
    avatar.jpg

certificates/
  {uuid_token}/
    certificate.pdf
*/
