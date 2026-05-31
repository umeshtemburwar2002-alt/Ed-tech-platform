-- ============================================================
-- Instructor Support Center Schema
-- Production-ready SQL for Supabase
-- ============================================================

-- 1. Create instructor_support_tickets table
CREATE TABLE IF NOT EXISTS instructor_support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instructor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instructor_name TEXT,
  instructor_email TEXT,
  ticket_number TEXT,
  subject TEXT NOT NULL,
  category TEXT NOT NULL,
  course_name TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  description TEXT NOT NULL,
  attachment_url TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create ticket_replies table
CREATE TABLE IF NOT EXISTS instructor_ticket_replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES instructor_support_tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL CHECK (author_type IN ('instructor', 'admin')),
  message TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_instructor_tickets_instructor_id ON instructor_support_tickets(instructor_id);
CREATE INDEX IF NOT EXISTS idx_instructor_tickets_ticket_number ON instructor_support_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_instructor_tickets_status ON instructor_support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_instructor_tickets_priority ON instructor_support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_instructor_tickets_created_at ON instructor_support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket_id ON instructor_ticket_replies(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_replies_created_at ON instructor_ticket_replies(created_at ASC);

-- 4. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger for instructor_support_tickets
DROP TRIGGER IF EXISTS update_instructor_support_tickets_updated_at ON instructor_support_tickets;
CREATE TRIGGER update_instructor_support_tickets_updated_at
  BEFORE UPDATE ON instructor_support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. Enable RLS (Row Level Security)
ALTER TABLE instructor_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_ticket_replies ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for instructor_support_tickets

-- Instructors can view their own tickets
CREATE POLICY "Instructors can view their own tickets"
  ON instructor_support_tickets
  FOR SELECT
  USING (auth.uid() = instructor_id);

-- Instructors can insert their own tickets
CREATE POLICY "Instructors can insert their own tickets"
  ON instructor_support_tickets
  FOR INSERT
  WITH CHECK (auth.uid() = instructor_id);

-- Instructors can update their own tickets (status, etc.)
CREATE POLICY "Instructors can update their own tickets"
  ON instructor_support_tickets
  FOR UPDATE
  USING (auth.uid() = instructor_id)
  WITH CHECK (auth.uid() = instructor_id);

-- 8. RLS Policies for instructor_ticket_replies

-- Instructors can view replies for their tickets
CREATE POLICY "Instructors can view replies for their tickets"
  ON instructor_ticket_replies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM instructor_support_tickets
      WHERE instructor_support_tickets.id = instructor_ticket_replies.ticket_id
      AND instructor_support_tickets.instructor_id = auth.uid()
    )
  );

-- Instructors can insert replies for their tickets
CREATE POLICY "Instructors can insert replies for their tickets"
  ON instructor_ticket_replies
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM instructor_support_tickets
      WHERE instructor_support_tickets.id = instructor_ticket_replies.ticket_id
      AND instructor_support_tickets.instructor_id = auth.uid()
    )
  );

-- 9. Storage Policies for support-attachments bucket
-- (Assuming bucket already exists, if not create it first)

-- Allow instructors to upload to their folder
CREATE POLICY "Instructors can upload to their folder"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    (storage.foldername(name))[1] = 'instructor' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Allow instructors to read their own files
CREATE POLICY "Instructors can read their own files"
  ON storage.objects
  FOR SELECT
  USING (
    (storage.foldername(name))[1] = 'instructor' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Allow instructors to delete their own files
CREATE POLICY "Instructors can delete their own files"
  ON storage.objects
  FOR DELETE
  USING (
    (storage.foldername(name))[1] = 'instructor' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Allow public access to attachments (optional but useful for previews)
CREATE POLICY "Public can view attachments"
  ON storage.objects
  FOR SELECT
  USING (true);
