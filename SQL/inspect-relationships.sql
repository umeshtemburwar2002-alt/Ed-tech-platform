-- =============================================
-- STEP 1: INSPECT EXISTING FOREIGN KEY RELATIONSHIPS
-- =============================================

-- 1. List all foreign keys involving courses and categories
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
  AND (tc.table_name = 'courses' OR ccu.table_name = 'categories')
ORDER BY tc.table_name, kcu.column_name;

-- 2. List all constraints on courses table
SELECT
  conname AS constraint_name,
  contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'courses'::regclass
ORDER BY conname;

-- 3. Check categories table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'categories'
ORDER BY ordinal_position;
