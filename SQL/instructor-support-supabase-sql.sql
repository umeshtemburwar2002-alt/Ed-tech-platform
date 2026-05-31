-- =============================================
-- Instructor Support System - Supabase SQL
-- =============================================

-- 1. Create instructor_support_tickets table
CREATE TABLE IF NOT EXISTS instructor_support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instructor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  subject TEXT NOT NULL,
  category TEXT,
  course_name TEXT,
  priority TEXT DEFAULT 'medium',
  message TEXT NOT NULL,
  attachment_url TEXT,
  status TEXT DEFAULT 'open',
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_instructor_support_tickets_instructor_id ON instructor_support_tickets(instructor_id);
CREATE INDEX IF NOT EXISTS idx_instructor_support_tickets_status ON instructor_support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_instructor_support_tickets_created_at ON instructor_support_tickets(created_at DESC);

-- 3. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_instructor_support_tickets_updated_at
  BEFORE UPDATE ON instructor_support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS Policies for instructor_support_tickets
ALTER TABLE instructor_support_tickets ENABLE ROW LEVEL SECURITY;

-- Policy: Instructors can view their own tickets
CREATE POLICY "Instructors can view own tickets"
  ON instructor_support_tickets
  FOR SELECT
  TO authenticated
  USING (instructor_id = auth.uid());

-- Policy: Instructors can insert their own tickets
CREATE POLICY "Instructors can insert own tickets"
  ON instructor_support_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (instructor_id = auth.uid());

-- Policy: Instructors can update their own tickets (limited fields)
CREATE POLICY "Instructors can update own tickets"
  ON instructor_support_tickets
  FOR UPDATE
  TO authenticated
  USING (instructor_id = auth.uid())
  WITH CHECK (instructor_id = auth.uid());

-- Policy: Admins have full access (modify based on your admin logic)
-- CREATE POLICY "Admins have full access to instructor tickets"
--   ON instructor_support_tickets
--   FOR ALL
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM profiles
--       WHERE id = auth.uid() AND account_type = 'Admin'
--     )
--   );

-- =============================================
-- Storage Policies for support-attachments bucket
-- =============================================

-- First, create the bucket if it doesn't exist (run via Supabase Dashboard or SQL)
-- Note: Bucket creation is usually done via Supabase Dashboard UI

-- Policy: Authenticated users can upload to their own folder
CREATE POLICY "Authenticated users can upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  (storage.foldername(name))[1] IN ('student', 'instructor') AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy: Authenticated users can read their own files
CREATE POLICY "Authenticated users can read own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  (storage.foldername(name))[1] IN ('student', 'instructor') AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy: Authenticated users can delete their own files
CREATE POLICY "Authenticated users can delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  (storage.foldername(name))[1] IN ('student', 'instructor') AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy: Admins have full access to storage
-- CREATE POLICY "Admins have full storage access"
-- ON storage.objects
-- FOR ALL
-- TO authenticated
-- USING (
--   EXISTS (
--     SELECT 1 FROM profiles
--     WHERE id = auth.uid() AND account_type = 'Admin'
--   )
-- );

-- =============================================
-- Optional: Add admin_note column if missing
-- =============================================
-- ALTER TABLE instructor_support_tickets ADD COLUMN IF NOT EXISTS admin_note TEXT;
