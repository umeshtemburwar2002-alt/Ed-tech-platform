-- ================================================================
-- Relationship Testing & Validation Script
-- ================================================================
-- Run these queries to verify your relationships are working
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- TEST 1: Verify Foreign Keys Exist
-- ────────────────────────────────────────────────────────────────
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'enrollments'
ORDER BY tc.constraint_name;

-- Expected Output:
-- enrollments_course_id_fkey | enrollments | course_id | courses | id
-- enrollments_user_id_fkey   | enrollments | user_id   | profiles | id

-- ────────────────────────────────────────────────────────────────
-- TEST 2: Verify Indexes Exist
-- ────────────────────────────────────────────────────────────────
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'enrollments'
  AND schemaname = 'public'
ORDER BY indexname;

-- Expected Output (at least):
-- idx_enrollments_course_id
-- idx_enrollments_user_id
-- idx_enrollments_user_course

-- ────────────────────────────────────────────────────────────────
-- TEST 3: Test Basic Relationship Query
-- ────────────────────────────────────────────────────────────────
-- This should work WITHOUT errors if relationships are properly set up
SELECT 
  id,
  course_name,
  status,
  enrollments(count)
FROM courses
WHERE status = 'Published'
LIMIT 5;

-- Expected: Returns courses with enrollment counts (no error!)

-- ────────────────────────────────────────────────────────────────
-- TEST 4: Test Nested Relationship Query
-- ────────────────────────────────────────────────────────────────
SELECT 
  id,
  course_name,
  enrollments(
    id,
    created_at,
    profiles(
      full_name,
      email
    )
  )
FROM courses
LIMIT 1;

-- Expected: Returns course with nested enrollment and profile data

-- ────────────────────────────────────────────────────────────────
-- TEST 5: Test Reverse Relationship (enrollments → courses)
-- ────────────────────────────────────────────────────────────────
SELECT 
  id,
  created_at,
  courses(
    course_name,
    price,
    status
  )
FROM enrollments
LIMIT 5;

-- Expected: Returns enrollments with nested course data

-- ────────────────────────────────────────────────────────────────
-- TEST 6: Verify RLS Policies
-- ────────────────────────────────────────────────────────────────
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'enrollments'
ORDER BY policyname;

-- Expected Output (at least):
-- enrollments_student_own
-- enrollments_insert
-- enrollments_instructor_read
-- enrollments_admin_all

-- ────────────────────────────────────────────────────────────────
-- TEST 7: Count Enrollments Per Course
-- ────────────────────────────────────────────────────────────────
SELECT 
  c.id,
  c.course_name,
  c.status,
  COUNT(e.id) as enrollment_count
FROM courses c
LEFT JOIN enrollments e ON e.course_id = c.id
GROUP BY c.id, c.course_name, c.status
ORDER BY enrollment_count DESC
LIMIT 10;

-- Expected: Shows courses with their enrollment counts

-- ────────────────────────────────────────────────────────────────
-- TEST 8: Verify Data Integrity
-- ────────────────────────────────────────────────────────────────

-- Check for orphaned enrollments (should return 0)
SELECT COUNT(*) as orphaned_enrollments
FROM enrollments e
WHERE NOT EXISTS (
  SELECT 1 FROM courses c WHERE c.id = e.course_id
);

-- Check for invalid user references (should return 0)
SELECT COUNT(*) as invalid_users
FROM enrollments e
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = e.user_id
);

-- ────────────────────────────────────────────────────────────────
-- TEST 9: Performance Test (Explain Analyze)
-- ────────────────────────────────────────────────────────────────
EXPLAIN ANALYZE
SELECT 
  c.id,
  c.course_name,
  COUNT(e.id) as enrollment_count
FROM courses c
LEFT JOIN enrollments e ON e.course_id = c.id
WHERE c.instructor_id = (SELECT id FROM profiles WHERE account_type = 'Instructor' LIMIT 1)
GROUP BY c.id, c.course_name;

-- Expected: Should use indexes (Index Scan, not Seq Scan)

-- ────────────────────────────────────────────────────────────────
-- TEST 10: Schema Cache Status
-- ────────────────────────────────────────────────────────────────
-- Check when schema was last reloaded
SELECT 
  pg_postmaster_start_time() as postmaster_start,
  NOW() as current_time,
  NOW() - pg_postmaster_start_time() as uptime;

-- If you just ran the fix script, manually reload:
-- NOTIFY pgrst, 'reload schema';

-- ────────────────────────────────────────────────────────────────
-- TROUBLESHOOTING QUERIES
-- ────────────────────────────────────────────────────────────────

-- If relationships still don't work, check these:

-- 1. Verify table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'enrollments'
) as enrollments_table_exists;

-- 2. Check column types match
SELECT 
  c.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable
FROM information_schema.columns c
WHERE c.table_name IN ('courses', 'enrollments', 'profiles')
  AND c.column_name IN ('id', 'course_id', 'user_id')
ORDER BY c.table_name, c.column_name;

-- 3. Check for constraint violations
SELECT 
  conname as constraint_name,
  conrelid::regclass as table_name,
  confrelid::regclass as referenced_table,
  contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'enrollments'::regclass;

-- ================================================================
-- ✅ ALL TESTS PASSED?
-- ================================================================
-- If all queries above work without errors:
-- 1. Your relationships are properly configured
-- 2. Schema cache is up to date
-- 3. RLS policies are in place
-- 4. Indexes are optimized
-- 5. Your dashboard should work perfectly!
-- ================================================================
