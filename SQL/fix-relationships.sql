-- =============================================
-- STEP 2: FIX FOREIGN KEY RELATIONSHIPS
-- =============================================

-- Drop ALL foreign keys between courses and categories (we'll recreate ONE clean one)
ALTER TABLE courses DROP CONSTRAINT IF EXISTS fk_course_category;
ALTER TABLE courses DROP CONSTRAINT IF EXISTS fk_courses_category;
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_category_id_fkey;

-- Drop any other potential duplicate constraints (safe)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'courses'::regclass
          AND contype = 'f' -- Foreign key constraints only
          AND (
            conname LIKE '%category%' OR
            conname LIKE '%courses%'
          )
    LOOP
        EXECUTE 'ALTER TABLE courses DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
        RAISE NOTICE 'Dropped constraint: %', r.conname;
    END LOOP;
END $$;

-- Now add ONE clean foreign key constraint with proper naming
ALTER TABLE courses
ADD CONSTRAINT courses_category_id_fkey
FOREIGN KEY (category_id)
REFERENCES categories (id)
ON DELETE SET NULL;

-- Verify the fix
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'courses'
ORDER BY tc.table_name, kcu.column_name;

SELECT '✅ All duplicate foreign keys removed! Only one clean relationship left!' as message;
