-- =============================================
-- COURSES TABLE PRODUCTION FIX
-- =============================================

-- Step 1: Drop old constraints if exists
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_status_check;

-- Step 2: Update status column with proper check constraint (case-insensitive via trigger)
ALTER TABLE courses
ALTER COLUMN status SET DEFAULT 'draft';

-- First, normalize existing statuses to lowercase
UPDATE courses SET status = LOWER(status) WHERE status IS NOT NULL;

ALTER TABLE courses
ADD CONSTRAINT courses_status_check
CHECK (LOWER(status) IN ('draft', 'pending', 'published', 'rejected', 'archived'));

-- Create trigger to auto-convert to lowercase on insert/update
CREATE OR REPLACE FUNCTION normalize_course_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.status = LOWER(NEW.status);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS normalize_course_status_trigger ON courses;
CREATE TRIGGER normalize_course_status_trigger
BEFORE INSERT OR UPDATE OF status ON courses
FOR EACH ROW
EXECUTE FUNCTION normalize_course_status();

-- Step 3: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_instructor_id ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_category_id ON courses(category_id);
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON courses(created_at DESC);

-- Step 4: Ensure updated_at trigger (if not already present)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
CREATE TRIGGER update_courses_updated_at
BEFORE UPDATE ON courses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Step 5: Ensure RLS is enabled
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Step 6: Instructor policies

-- Policy 1: Instructors can read their own courses
DROP POLICY IF EXISTS "instructors_read_own" ON courses;
CREATE POLICY "instructors_read_own"
ON courses
FOR SELECT
USING (auth.uid() = instructor_id);

-- Policy 2: Instructors can insert their own courses
DROP POLICY IF EXISTS "instructors_insert_own" ON courses;
CREATE POLICY "instructors_insert_own"
ON courses
FOR INSERT
WITH CHECK (auth.uid() = instructor_id);

-- Policy 3: Instructors can update their own courses
DROP POLICY IF EXISTS "instructors_update_own" ON courses;
CREATE POLICY "instructors_update_own"
ON courses
FOR UPDATE
USING (auth.uid() = instructor_id)
WITH CHECK (auth.uid() = instructor_id);

-- Policy 4: Instructors can delete their own courses
DROP POLICY IF EXISTS "instructors_delete_own" ON courses;
CREATE POLICY "instructors_delete_own"
ON courses
FOR DELETE
USING (auth.uid() = instructor_id);

-- Policy 5: Public can read published courses
DROP POLICY IF EXISTS "public_read_published" ON courses;
CREATE POLICY "public_read_published"
ON courses
FOR SELECT
USING (status = 'published');

-- Step 7: Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE courses;

-- Done!
SELECT 'Courses table fixed successfully!' as message;
