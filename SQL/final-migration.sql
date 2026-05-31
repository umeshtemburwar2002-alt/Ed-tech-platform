-- =============================================
-- FINAL COMPLETE MIGRATION FOR EDTECH PLATFORM
-- =============================================

-- =============================================
-- PART 1: INSPECT EXISTING FOREIGN KEYS
-- =============================================

SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_from,
  confrelid::regclass AS table_to
FROM pg_constraint
WHERE contype = 'f'
ORDER BY conrelid::regclass, conname;

-- =============================================
-- PART 2: CLEAN UP DUPLICATE FOREIGN KEYS
-- =============================================

-- Drop ALL foreign keys on courses that relate to categories
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_category_id_fkey;
ALTER TABLE courses DROP CONSTRAINT IF EXISTS fk_course_category;
ALTER TABLE courses DROP CONSTRAINT IF EXISTS fk_courses_category;
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_categories_id_fkey;
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_main_category_fkey;

-- Drop any other duplicate constraints dynamically (safe)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'courses'::regclass
          AND contype = 'f'
          AND (
            conname LIKE '%category%' OR
            conname LIKE '%courses%' OR
            confrelid = 'categories'::regclass
          )
    LOOP
        EXECUTE 'ALTER TABLE courses DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
        RAISE NOTICE 'Dropped constraint: %', r.conname;
    END LOOP;
END $$;

-- =============================================
-- PART 3: CREATE CLEAN, SINGLE FOREIGN KEY
-- =============================================

ALTER TABLE courses
ADD CONSTRAINT courses_category_id_fkey
FOREIGN KEY (category_id)
REFERENCES categories (id)
ON DELETE SET NULL;

-- =============================================
-- PART 4: INDEXES FOR PERFORMANCE
-- =============================================

-- Clean up duplicate indexes
DROP INDEX IF EXISTS idx_courses_instructor_id;
DROP INDEX IF EXISTS idx_courses_created_at;
DROP INDEX IF EXISTS courses_instructor_id_idx;
DROP INDEX IF EXISTS courses_status_idx;
DROP INDEX IF EXISTS courses_created_at_idx;
DROP INDEX IF EXISTS courses_category_id_idx;

-- Add clean, well-named indexes
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON courses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_courses_category_id ON courses(category_id);
CREATE INDEX IF NOT EXISTS idx_courses_instructor_status ON courses(instructor_id, status);

-- =============================================
-- PART 5: UPDATED_AT TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_courses_set_updated_at ON courses;
CREATE TRIGGER trg_courses_set_updated_at
BEFORE UPDATE ON courses
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =============================================
-- PART 6: RLS & POLICIES (SECURITY)
-- =============================================

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

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

-- =============================================
-- PART 7: REALTIME SUPPORT
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE courses;

-- =============================================
-- DONE!
-- =============================================

SELECT '✅ Migration complete! Single clean relationship between courses and categories!' as message;
