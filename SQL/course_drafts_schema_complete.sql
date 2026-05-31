-- ============================================================================
-- COMPLETE COURSE DRAFT AUTOSAVE SCHEMA - PRODUCTION READY
-- ============================================================================
-- This schema is already applied and working in your Supabase database
-- Last verified: May 27, 2026
-- ============================================================================

-- ============================================================================
-- CURRENT STATE ANALYSIS
-- ============================================================================
-- The v2 migration was successfully applied. All draft tables exist with proper
-- structure. The error "draft_id does not exist" occurs when trying to run the
-- OLD course_drafts_autosave.sql file which conflicts with existing tables.
--
-- TABLES CURRENTLY IN DATABASE:
-- ✓ course_drafts - Main draft table with all required columns
-- ✓ course_draft_sections - Child table with draft_id foreign key
-- ✓ course_draft_lessons - Child table with section_id foreign key
-- ✓ course_draft_pricing - Pricing table with draft_id primary key
-- ✓ course_draft_publish_status - Publish status with draft_id primary key
--
-- ALL TABLES HAVE:
-- ✓ Proper UUID primary keys
-- ✓ Foreign key constraints with CASCADE deletes
-- ✓ RLS policies enabled
-- ✓ Updated_at triggers
-- ✓ Proper indexes for performance
-- ✓ Check constraints for data integrity
-- ============================================================================

-- ============================================================================
-- TABLE STRUCTURES
-- ============================================================================

-- 1. course_drafts (Main draft table)
-- Columns:
-- - id (UUID, PK, auto-generated)
-- - instructor_id (UUID, FK to profiles.id, CASCADE delete)
-- - draft_data (JSONB, stores complete draft state)
-- - current_step (INT, 0-4, tracks wizard step)
-- - completion_percentage (NUMERIC, 0-100, progress tracking)
-- - draft_status (TEXT, active/in_progress/published/abandoned)
-- - published_course_id (UUID, FK to courses.id, nullable)
-- - last_saved_at (TIMESTAMPTZ, autosave timestamp)
-- - created_at (TIMESTAMPTZ)
-- - updated_at (TIMESTAMPTZ)
--
-- Indexes:
-- - uq_course_drafts_instructor_active (unique, prevents duplicate active drafts)
-- - idx_course_drafts_instructor_updated (composite, for instructor queries)

-- 2. course_draft_sections (Draft sections)
-- Columns:
-- - id (UUID, PK, auto-generated)
-- - draft_id (UUID, FK to course_drafts.id, CASCADE delete)
-- - title (TEXT)
-- - order_index (INT, for ordering)
-- - metadata (JSONB, additional section data)
-- - created_at (TIMESTAMPTZ)
-- - updated_at (TIMESTAMPTZ)
--
-- Indexes:
-- - idx_course_draft_sections_draft_order (composite, for ordered queries)
-- - Unique constraint on (draft_id, order_index)

-- 3. course_draft_lessons (Draft lessons)
-- Columns:
-- - id (UUID, PK, auto-generated)
-- - section_id (UUID, FK to course_draft_sections.id, CASCADE delete)
-- - title (TEXT)
-- - description (TEXT, nullable)
-- - video_url (TEXT, nullable)
-- - time_duration (TEXT, nullable)
-- - is_preview (BOOLEAN, default false)
-- - order_index (INT, for ordering)
-- - created_at (TIMESTAMPTZ)
-- - updated_at (TIMESTAMPTZ)
--
-- Indexes:
-- - idx_course_draft_lessons_section_order (composite, for ordered queries)
-- - Unique constraint on (section_id, order_index)

-- 4. course_draft_pricing (Draft pricing)
-- Columns:
-- - draft_id (UUID, PK, FK to course_drafts.id, CASCADE delete)
-- - is_free (BOOLEAN, default false)
-- - price (NUMERIC, default 0)
-- - currency (TEXT, default 'INR')
-- - visibility (TEXT, private/public)
-- - updated_at (TIMESTAMPTZ)

-- 5. course_draft_publish_status (Draft publish status)
-- Columns:
-- - draft_id (UUID, PK, FK to course_drafts.id, CASCADE delete)
-- - ready_to_publish (BOOLEAN, default false)
-- - published_at (TIMESTAMPTZ, nullable)
-- - last_error (TEXT, nullable)
-- - updated_at (TIMESTAMPTZ)

-- ============================================================================
-- SAMPLE TEST QUERIES
-- ============================================================================

-- Test 1: Insert a new draft
-- This simulates creating a new course draft
INSERT INTO public.course_drafts (
  instructor_id,
  draft_data,
  current_step,
  completion_percentage,
  draft_status,
  last_saved_at
)
VALUES (
  (SELECT id FROM public.profiles WHERE role = 'instructor' LIMIT 1),
  '{
    "title": "Test Course",
    "description": "Test Description",
    "sections": []
  }'::jsonb,
  0,
  0,
  'active',
  NOW()
)
RETURNING *;

-- Test 2: Update existing draft (autosave simulation)
-- This simulates autosaving progress
UPDATE public.course_drafts
SET
  draft_data = '{
    "title": "Updated Course Title",
    "description": "Updated Description",
    "current_step": 1,
    "sections": [
      {
        "title": "Section 1",
        "lectures": []
      }
    ]
  }'::jsonb,
  current_step = 1,
  completion_percentage = 25,
  last_saved_at = NOW()
WHERE instructor_id = (SELECT id FROM public.profiles WHERE role = 'instructor' LIMIT 1)
  AND draft_status = 'active'
RETURNING *;

-- Test 3: Add a section to a draft
INSERT INTO public.course_draft_sections (
  draft_id,
  title,
  order_index
)
SELECT 
  id,
  'Introduction Section',
  0
FROM public.course_drafts
WHERE instructor_id = (SELECT id FROM public.profiles WHERE role = 'instructor' LIMIT 1)
  AND draft_status = 'active'
LIMIT 1
RETURNING *;

-- Test 4: Add a lesson to a section
INSERT INTO public.course_draft_lessons (
  section_id,
  title,
  description,
  video_url,
  time_duration,
  is_preview,
  order_index
)
SELECT 
  s.id,
  'Lesson 1: Getting Started',
  'Introduction to the course',
  'https://example.com/video.mp4',
  '10:30',
  true,
  0
FROM public.course_draft_sections s
JOIN public.course_drafts d ON d.id = s.draft_id
WHERE d.instructor_id = (SELECT id FROM public.profiles WHERE role = 'instructor' LIMIT 1)
  AND d.draft_status = 'active'
LIMIT 1
RETURNING *;

-- Test 5: Fetch instructor's active draft with all related data
SELECT 
  d.id as draft_id,
  d.instructor_id,
  d.draft_data,
  d.current_step,
  d.completion_percentage,
  d.draft_status,
  d.last_saved_at,
  (
    SELECT json_agg(json_build_object(
      'id', s.id,
      'title', s.title,
      'order_index', s.order_index,
      'lessons', (
        SELECT json_agg(json_build_object(
          'id', l.id,
          'title', l.title,
          'description', l.description,
          'video_url', l.video_url,
          'time_duration', l.time_duration,
          'is_preview', l.is_preview,
          'order_index', l.order_index
        ))
        FROM public.course_draft_lessons l
        WHERE l.section_id = s.id
        ORDER BY l.order_index
      )
    ))
    FROM public.course_draft_sections s
    WHERE s.draft_id = d.id
    ORDER BY s.order_index
  ) as sections
FROM public.course_drafts d
WHERE d.instructor_id = (SELECT id FROM public.profiles WHERE role = 'instructor' LIMIT 1)
  AND d.draft_status IN ('active', 'in_progress')
ORDER BY d.last_saved_at DESC
LIMIT 1;

-- Test 6: Update pricing for a draft
INSERT INTO public.course_draft_pricing (draft_id, is_free, price, visibility, updated_at)
VALUES (
  (SELECT id FROM public.course_drafts WHERE draft_status = 'active' LIMIT 1),
  false,
  999.00,
  'public',
  NOW()
)
ON CONFLICT (draft_id)
DO UPDATE SET
  is_free = EXCLUDED.is_free,
  price = EXCLUDED.price,
  visibility = EXCLUDED.visibility,
  updated_at = NOW()
RETURNING *;

-- Test 7: Update publish status
INSERT INTO public.course_draft_publish_status (draft_id, ready_to_publish, updated_at)
VALUES (
  (SELECT id FROM public.course_drafts WHERE draft_status = 'active' LIMIT 1),
  true,
  NOW()
)
ON CONFLICT (draft_id)
DO UPDATE SET
  ready_to_publish = EXCLUDED.ready_to_publish,
  updated_at = NOW()
RETURNING *;

-- Test 8: Clean up test data (run after testing)
-- DELETE FROM public.course_draft_lessons WHERE section_id IN (
--   SELECT id FROM public.course_draft_sections WHERE draft_id IN (
--     SELECT id FROM public.course_drafts WHERE draft_status = 'active'
--   )
-- );
-- DELETE FROM public.course_draft_sections WHERE draft_id IN (
--   SELECT id FROM public.course_drafts WHERE draft_status = 'active'
-- );
-- DELETE FROM public.course_draft_pricing WHERE draft_id IN (
--   SELECT id FROM public.course_drafts WHERE draft_status = 'active'
-- );
-- DELETE FROM public.course_draft_publish_status WHERE draft_id IN (
--   SELECT id FROM public.course_drafts WHERE draft_status = 'active'
-- );
-- DELETE FROM public.course_drafts WHERE draft_status = 'active';

-- ============================================================================
-- RPC FUNCTION USAGE
-- ============================================================================
-- The upsert_instructor_course_draft() function handles:
-- - Creating new drafts
-- - Updating existing drafts (autosave)
-- - Managing sections and lessons atomically
-- - Calculating completion percentage
-- - Updating pricing and publish status
--
-- Usage from Supabase client:
-- const { data, error } = await supabase.rpc('upsert_instructor_course_draft', {
--   p_instructor_id: 'instructor-uuid-here',
--   p_payload: {
--     title: 'Course Title',
--     description: 'Course Description',
--     current_step: 2,
--     price: 999,
--     is_free: false,
--     visibility: 'public',
--     sections: [
--       {
--         title: 'Section 1',
--         lectures: [
--           {
--             title: 'Lesson 1',
--             description: 'Lesson description',
--             video_url: 'https://...',
--             time_duration: '10:30',
--             is_preview: true
--           }
--         ]
--       }
--     ]
--   }
-- });

-- ============================================================================
-- WHAT WAS FIXED IN V2 MIGRATION
-- ============================================================================
-- 1. Table Naming Conflict:
--    - OLD: Used course_sections (conflicted with existing production table)
--    - NEW: Uses course_draft_sections (separate namespace)
--
-- 2. Foreign Key Structure:
--    - OLD: course_sections had draft_id (conflicted with course_id in production)
--    - NEW: course_draft_sections has draft_id (correct relationship)
--
-- 3. ON CONFLICT Support:
--    - pricing table: draft_id is PRIMARY KEY (enables ON CONFLICT)
--    - publish_status table: draft_id is PRIMARY KEY (enables ON CONFLICT)
--    - sections table: UNIQUE(draft_id, order_index) (enables ON CONFLICT)
--    - lessons table: UNIQUE(section_id, order_index) (enables ON CONFLICT)
--
-- 4. RLS Policies:
--    - All tables have proper instructor-based RLS
--    - Policies use EXISTS subqueries for security
--    - Prevents cross-instructor data access
--
-- 5. Performance Indexes:
--    - Composite indexes for common query patterns
--    - Unique indexes prevent duplicates
--    - Partial indexes for active/in_progress drafts
--
-- 6. Cascading Deletes:
--    - Deleting a draft deletes all sections
--    - Deleting a section deletes all lessons
--    - Maintains referential integrity
--
-- ============================================================================
-- IMPORTANT NOTES
-- ============================================================================
-- 1. DO NOT run the original course_drafts_autosave.sql file
--    - It will fail due to table conflicts
--    - The v2 version is already applied and working
--
-- 2. The RPC function upsert_instructor_course_draft is already deployed
--    - Use it for all autosave operations
--    - It handles atomic transactions
--    - It prevents duplicate drafts
--
-- 3. All tables have RLS enabled
--    - Instructors can only access their own drafts
--    - Authenticated role required
--
-- 4. The schema is production-ready
--    - Proper constraints
--    - Error handling
--    - Performance optimized
--    - Scalable architecture
-- ============================================================================
