-- ============================================
-- Instructor Documents - Complete RLS & Setup
-- ============================================

-- 1. Enable RLS
ALTER TABLE public.instructor_documents ENABLE ROW LEVEL SECURITY;

-- 2. Insert Policy
CREATE POLICY "Instructors can insert their own documents"
ON public.instructor_documents
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 3. Select Policy
CREATE POLICY "Instructors can view their own documents"
ON public.instructor_documents
FOR SELECT
USING (auth.uid() = user_id);

-- 4. Update Policy
CREATE POLICY "Instructors can update their own documents"
ON public.instructor_documents
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Delete Policy
CREATE POLICY "Instructors can delete their own documents"
ON public.instructor_documents
FOR DELETE
USING (auth.uid() = user_id);

-- 6. Add Indexes
CREATE INDEX IF NOT EXISTS idx_instructor_docs_user_id
ON public.instructor_documents(user_id);

CREATE INDEX IF NOT EXISTS idx_instructor_docs_doc_type
ON public.instructor_documents(doc_type);

-- ============================================
-- Storage Bucket Policies
-- ============================================
-- NOTE: Run these in Supabase Storage > Policies for "instructor-documents" bucket

-- Insert Policy
-- Policy name: "Instructors can upload their own documents"
-- Allowed operation: INSERT
-- Policy definition: (auth.uid()::text = (storage.foldername(name))[1])

-- Select Policy
-- Policy name: "Instructors can view their own documents"
-- Allowed operation: SELECT
-- Policy definition: (auth.uid()::text = (storage.foldername(name))[1])
