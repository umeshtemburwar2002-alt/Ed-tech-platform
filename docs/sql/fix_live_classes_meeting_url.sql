-- ================================================================
-- FIX: Drop old columns and ensure live_classes schema matches code
-- ================================================================

-- Step 1: Drop the meeting_url column if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'live_classes' 
        AND column_name = 'meeting_url'
    ) THEN
        ALTER TABLE public.live_classes 
        DROP COLUMN IF EXISTS meeting_url;
        
        RAISE NOTICE '✅ Dropped meeting_url column';
    ELSE
        RAISE NOTICE 'ℹ️  Column meeting_url does not exist';
    END IF;
END $$;

-- Step 2: Drop the schedule column if it exists (code uses scheduled_at)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'live_classes' 
        AND column_name = 'schedule'
    ) THEN
        ALTER TABLE public.live_classes 
        DROP COLUMN IF EXISTS schedule;
        
        RAISE NOTICE '✅ Dropped schedule column';
    ELSE
        RAISE NOTICE 'ℹ️  Column schedule does not exist';
    END IF;
END $$;

-- Step 3: Add instructor_id column if missing (from production schema)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'live_classes' 
        AND column_name = 'instructor_id'
    ) THEN
        ALTER TABLE public.live_classes 
        ADD COLUMN IF NOT EXISTS instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        
        RAISE NOTICE '✅ Added instructor_id column';
    ELSE
        RAISE NOTICE 'ℹ️  Column instructor_id already exists';
    END IF;
END $$;

-- Step 4: Add status column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'live_classes' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.live_classes 
        ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled'));
        
        RAISE NOTICE '✅ Added status column';
    ELSE
        RAISE NOTICE 'ℹ️  Column status already exists';
    END IF;
END $$;

-- Step 2: If the column already exists as meeting_link but has no default, add it
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'live_classes' 
        AND column_name = 'meeting_link'
        AND column_default IS NULL
    ) THEN
        ALTER TABLE public.live_classes 
        ALTER COLUMN meeting_link SET DEFAULT '';
        
        RAISE NOTICE '✅ Added default value to meeting_link';
    END IF;
END $$;

-- Step 3: Update any existing NULL values to empty string
UPDATE public.live_classes 
SET meeting_link = '' 
WHERE meeting_link IS NULL;

-- Step 4: Ensure the column is NOT NULL
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'live_classes' 
        AND column_name = 'meeting_link'
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE public.live_classes 
        ALTER COLUMN meeting_link SET NOT NULL;
        
        RAISE NOTICE '✅ Set meeting_link to NOT NULL';
    END IF;
END $$;

-- ================================================================
-- VERIFICATION
-- ================================================================
DO $$
BEGIN
    RAISE NOTICE '====================================================';
    RAISE NOTICE '✅ live_classes table fix completed successfully!';
    RAISE NOTICE 'Column: meeting_link (NOT NULL, DEFAULT '')';
    RAISE NOTICE '====================================================';
END $$;
