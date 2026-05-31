-- =============================================
-- LIVE CLASSES PRODUCTION SCHEMA
-- =============================================

-- =============================================
-- STEP 1: ADD INSTRUCTOR_ID TO LIVE_CLASSES
-- =============================================

ALTER TABLE live_classes 
ADD COLUMN IF NOT EXISTS instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- =============================================
-- STEP 2: ADD INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_live_classes_instructor_id ON live_classes(instructor_id);
CREATE INDEX IF NOT EXISTS idx_live_classes_course_id ON live_classes(course_id);
CREATE INDEX IF NOT EXISTS idx_live_classes_scheduled_at ON live_classes(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_live_classes_status ON live_classes(status);

-- =============================================
-- STEP 3: ENABLE RLS AND CREATE POLICIES
-- =============================================

ALTER TABLE live_classes ENABLE ROW LEVEL SECURITY;

-- Policy 1: Instructors can view their own live classes
DROP POLICY IF EXISTS "Instructors can view their own live classes" ON live_classes;
CREATE POLICY "Instructors can view their own live classes"
  ON live_classes
  FOR SELECT
  USING (auth.uid() = instructor_id);

-- Policy 2: Students can view all live classes
DROP POLICY IF EXISTS "Students can view all live classes" ON live_classes;
CREATE POLICY "Students can view all live classes"
  ON live_classes
  FOR SELECT
  USING (true);

-- Policy 3: Instructors can insert their own live classes
DROP POLICY IF EXISTS "Instructors can insert their own live classes" ON live_classes;
CREATE POLICY "Instructors can insert their own live classes"
  ON live_classes
  FOR INSERT
  WITH CHECK (auth.uid() = instructor_id);

-- Policy 4: Instructors can update their own live classes
DROP POLICY IF EXISTS "Instructors can update their own live classes" ON live_classes;
CREATE POLICY "Instructors can update their own live classes"
  ON live_classes
  FOR UPDATE
  USING (auth.uid() = instructor_id)
  WITH CHECK (auth.uid() = instructor_id);

-- Policy 5: Instructors can delete their own live classes
DROP POLICY IF EXISTS "Instructors can delete their own live classes" ON live_classes;
CREATE POLICY "Instructors can delete their own live classes"
  ON live_classes
  FOR DELETE
  USING (auth.uid() = instructor_id);

-- =============================================
-- STEP 4: ADD UPDATED_AT TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_live_classes_updated_at ON live_classes;
CREATE TRIGGER update_live_classes_updated_at
  BEFORE UPDATE ON live_classes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Done!
-- =============================================
