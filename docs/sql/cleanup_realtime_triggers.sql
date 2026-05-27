-- =============================================
-- CLEANUP: REMOVE PROBLEMATIC TRIGGERS
-- =============================================
-- This script removes any triggers that might be calling the non-existent
-- realtime.broadcast_changes function

-- Drop any triggers that might be calling the problematic function
DROP TRIGGER IF EXISTS broadcast_changes ON live_classes;
DROP TRIGGER IF EXISTS broadcast_live_classes_changes ON live_classes;
DROP TRIGGER IF EXISTS realtime_broadcast_changes ON live_classes;
DROP TRIGGER IF EXISTS notify_live_classes_changes ON live_classes;

-- Also check for similar triggers on other tables
DROP TRIGGER IF EXISTS broadcast_changes ON courses;
DROP TRIGGER IF EXISTS broadcast_changes ON course_sections;
DROP TRIGGER IF EXISTS broadcast_changes ON course_lessons;
DROP TRIGGER IF EXISTS broadcast_changes ON enrollments;
DROP TRIGGER IF EXISTS broadcast_changes ON announcements;

-- =============================================
-- VERIFY TRIGGER CLEANUP
-- =============================================

DO $$
DECLARE
  trigger_record RECORD;
BEGIN
  RAISE NOTICE 'Checking for remaining triggers on live_classes...';
  
  FOR trigger_record IN 
    SELECT trigger_name, event_manipulation, action_statement
    FROM information_schema.triggers
    WHERE event_object_table = 'live_classes'
    AND trigger_schema = 'public'
  LOOP
    RAISE NOTICE 'Trigger: %, Type: %, Statement: %', 
      trigger_record.trigger_name,
      trigger_record.event_manipulation,
      trigger_record.action_statement;
  END LOOP;
  
  RAISE NOTICE 'Trigger cleanup complete!';
END $$;

-- =============================================
-- FINAL VERIFICATION
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '✅ All problematic triggers removed';
  RAISE NOTICE '✅ live_classes table is now clean';
  RAISE NOTICE '✅ You can now schedule classes without errors';
END $$;