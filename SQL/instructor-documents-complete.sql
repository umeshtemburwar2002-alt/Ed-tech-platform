-- ============================================
-- Instructor Documents - Complete SQL Setup
-- ============================================

-- 1. Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.instructor_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  doc_type TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'instructor-documents',
  storage_object TEXT NOT NULL,
  original_filename TEXT,
  mime_type TEXT,
  file_size_bytes BIGINT,
  status TEXT NOT NULL DEFAULT 'uploaded',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add check constraint for doc_type
ALTER TABLE public.instructor_documents
DROP CONSTRAINT IF EXISTS instructor_documents_doc_type_check;

ALTER TABLE public.instructor_documents
ADD CONSTRAINT instructor_documents_doc_type_check
CHECK (
  doc_type = ANY (ARRAY[
    'id'::TEXT,
    'address_proof'::TEXT,
    'resume'::TEXT,
    'portfolio'::TEXT,
    'tax_form'::TEXT,
    'qualification_certificate'::TEXT,
    'other'::TEXT
  ])
);

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_instructor_documents_user_id
ON public.instructor_documents(user_id);

CREATE INDEX IF NOT EXISTS idx_instructor_documents_doc_type
ON public.instructor_documents(doc_type);

CREATE INDEX IF NOT EXISTS idx_instructor_documents_created_at
ON public.instructor_documents(created_at);

-- 4. Add updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_instructor_documents_set_updated_at
ON public.instructor_documents;

CREATE TRIGGER trg_instructor_documents_set_updated_at
BEFORE UPDATE ON public.instructor_documents
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 5. Enable RLS
ALTER TABLE public.instructor_documents ENABLE ROW LEVEL SECURITY;

-- 6. Drop existing policies (to avoid conflicts)
DROP POLICY IF EXISTS "Instructors can insert own documents" ON public.instructor_documents;
DROP POLICY IF EXISTS "Instructors can view own documents" ON public.instructor_documents;
DROP POLICY IF EXISTS "Instructors can update own documents" ON public.instructor_documents;
DROP POLICY IF EXISTS "Instructors can delete own documents" ON public.instructor_documents;

-- 7. Create RLS policies
CREATE POLICY "Instructors can insert own documents"
ON public.instructor_documents
FOR INSERT
WITH CHECK (auth.uid()::TEXT = user_id::TEXT);

CREATE POLICY "Instructors can view own documents"
ON public.instructor_documents
FOR SELECT
USING (auth.uid()::TEXT = user_id::TEXT);

CREATE POLICY "Instructors can update own documents"
ON public.instructor_documents
FOR UPDATE
USING (auth.uid()::TEXT = user_id::TEXT)
WITH CHECK (auth.uid()::TEXT = user_id::TEXT);

CREATE POLICY "Instructors can delete own documents"
ON public.instructor_documents
FOR DELETE
USING (auth.uid()::TEXT = user_id::TEXT);

-- ============================================
-- Storage Policies (Run in Supabase Storage > Policies)
-- ============================================
-- NOTE: These should be added in Supabase Dashboard > Storage > instructor-documents > Policies

-- Storage policy 1: Authenticated users can upload their own files
-- Policy name: "Authenticated users can upload to their own folder"
-- Allowed operation: INSERT
-- Policy definition: (auth.uid()::text = (storage.foldername(name))[1]::text)

-- Storage policy 2: Authenticated users can view their own files
-- Policy name: "Authenticated users can view their own files"
-- Allowed operation: SELECT
-- Policy definition: (auth.uid()::text = (storage.foldername(name))[1]::text)

-- Storage policy 3: Authenticated users can update their own files
-- Policy name: "Authenticated users can update their own files"
-- Allowed operation: UPDATE
-- Policy definition: (auth.uid()::text = (storage.foldername(name))[1]::text)

-- Storage policy 4: Authenticated users can delete their own files
-- Policy name: "Authenticated users can delete their own files"
-- Allowed operation: DELETE
-- Policy definition: (auth.uid()::text = (storage.foldername(name))[1]::text)
