-- =============================================
-- FINAL COURSES TABLE FIX
-- =============================================

-- Step 1: Drop duplicate constraints
ALTER TABLE courses DROP CONSTRAINT IF EXISTS fk_course_category;

-- Step 2: Drop duplicate indexes (keep the best ones)
DROP INDEX IF EXISTS idx_courses_instructor_id; -- Keep courses_instructor_id_idx
DROP INDEX IF EXISTS idx_courses_created_at; -- Keep courses_created_at_idx
DROP INDEX IF EXISTS courses_instructor_id_idx; -- Keep courses_instructor_id_status_idx

-- Step 3: Ensure status check constraint works with lowercase and uppercase
DROP CONSTRAINT IF EXISTS courses_status_check;
ALTER TABLE courses
ADD CONSTRAINT courses_status_check
CHECK (
  LOWER(status) IN ('draft', 'pending', 'published', 'rejected', 'archived')
);

-- Step 4: Create trigger to normalize status to lowercase (backward compatible)
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

-- Step 5: Ensure we have the compatibility trigger for duplicate columns
-- (keeps both title/course_name, description/course_description, etc. in sync)
CREATE OR REPLACE FUNCTION courses_title_compat_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Keep title and course_name in sync
  IF NEW.title IS NOT NULL AND NEW.course_name IS NULL THEN
    NEW.course_name = NEW.title;
  ELSIF NEW.course_name IS NOT NULL AND NEW.title IS NULL THEN
    NEW.title = NEW.course_name;
  END IF;

  -- Keep description and course_description in sync
  IF NEW.description IS NOT NULL AND NEW.course_description IS NULL THEN
    NEW.course_description = NEW.description;
  ELSIF NEW.course_description IS NOT NULL AND NEW.description IS NULL THEN
    NEW.description = NEW.course_description;
  END IF;

  -- Keep thumbnail and thumbnail_url in sync
  IF NEW.thumbnail IS NOT NULL AND NEW.thumbnail_url IS NULL THEN
    NEW.thumbnail_url = NEW.thumbnail;
  ELSIF NEW.thumbnail_url IS NOT NULL AND NEW.thumbnail IS NULL THEN
    NEW.thumbnail = NEW.thumbnail_url;
  END IF;

  -- Keep trailer_video and trailer_url in sync
  IF NEW.trailer_video IS NOT NULL AND NEW.trailer_url IS NULL THEN
    NEW.trailer_url = NEW.trailer_video;
  ELSIF NEW.trailer_url IS NOT NULL AND NEW.trailer_video IS NULL THEN
    NEW.trailer_video = NEW.trailer_url;
  END IF;

  -- Keep what_you_will_learn and learning_outcomes in sync
  IF NEW.what_you_will_learn IS NOT NULL AND NEW.learning_outcomes IS NULL THEN
    NEW.learning_outcomes = NEW.what_you_will_learn;
  ELSIF NEW.learning_outcomes IS NOT NULL AND NEW.what_you_will_learn IS NULL THEN
    NEW.what_you_will_learn = NEW.learning_outcomes;
  END IF;

  -- Keep duration and total_duration in sync
  IF NEW.duration IS NOT NULL AND NEW.total_duration = 0 THEN
    NEW.total_duration = NEW.duration;
  ELSIF NEW.total_duration IS NOT NULL AND NEW.duration = 0 THEN
    NEW.duration = NEW.total_duration;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Done!
SELECT 'Courses table fixed successfully! Now supports both schema versions!' as message;
