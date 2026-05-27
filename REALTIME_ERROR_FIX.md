# 🔧 realtime.broadcast_changes Error Fix

## ❌ Problem
आपको यह error आ रहा है:
```
function realtime.broadcast_changes(text, text, name, name, live_classes, live_classes) does not exist
```

यह तब होता है जब आप live class schedule करने की कोशिश करते हैं।

## 🎯 Solution

### Step 1: Run Cleanup Script (पहले यह run करें)
Supabase Dashboard में जाएं → SQL Editor → यह script run करें:

```sql
-- File: docs/sql/cleanup_realtime_triggers.sql
```

इस script से सभी problematic triggers remove हो जाएंगे जो गलत function को call कर रहे थे।

### Step 2: Run Fix Script (फिर यह run करें)
```sql
-- File: docs/sql/fix_realtime_broadcast_function.sql
```

इस script से:
- ✅ सही function create होगा
- ✅ live_classes table verify होगी
- ✅ RLS policies apply होंगी
- ✅ Proper triggers setup होंगे

### Step 3: Enable Supabase Realtime (Optional)
अगर आप real-time updates चाहते हैं:

1. Supabase Dashboard में जाएं
2. Replication section में जाएं
3. `live_classes` table को enable करें
4. सभी columns को select करें या जो चाहें

## 🚀 Quick Fix (अगर ऊपर वाला काम नहीं करना है)

अगर आप सिर्फ quick fix चाहते हैं, तो सिर्फ यह SQL run करें:

```sql
-- Quick fix - Remove problematic triggers
DROP TRIGGER IF EXISTS broadcast_changes ON live_classes;
DROP TRIGGER IF EXISTS broadcast_live_classes_changes ON live_classes;
DROP TRIGGER IF EXISTS realtime_broadcast_changes ON live_classes;
DROP TRIGGER IF EXISTS notify_live_classes_changes ON live_classes;

-- Verify table exists and has proper structure
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'live_classes') THEN
    CREATE TABLE public.live_classes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
      instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      meeting_link TEXT NOT NULL,
      meeting_password TEXT,
      scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
      duration INTEGER DEFAULT 60,
      status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
      recording_url TEXT,
      attendees_count INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX idx_live_classes_course_id ON public.live_classes(course_id);
    CREATE INDEX idx_live_classes_instructor_id ON public.live_classes(instructor_id);
    CREATE INDEX idx_live_classes_scheduled_at ON public.live_classes(scheduled_at);
    CREATE INDEX idx_live_classes_status ON public.live_classes(status);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.live_classes ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Instructors can view their own live classes"
  ON public.live_classes
  FOR SELECT
  USING (auth.uid() = instructor_id);

CREATE POLICY "Instructors can insert their own live classes"
  ON public.live_classes
  FOR INSERT
  WITH CHECK (auth.uid() = instructor_id);

CREATE POLICY "Instructors can update their own live classes"
  ON public.live_classes
  FOR UPDATE
  USING (auth.uid() = instructor_id)
  WITH CHECK (auth.uid() = instructor_id);

CREATE POLICY "Instructors can delete their own live classes"
  ON public.live_classes
  FOR DELETE
  USING (auth.uid() = instructor_id);

CREATE POLICY "Students can view all live classes"
  ON public.live_classes
  FOR SELECT
  USING (true);
```

## 📋 क्या हो रहा था?

### प्रॉब्लम:
- कोई पुराना trigger था जो `realtime.broadcast_changes` function को call कर रहा था
- यह function database में मौजूद नहीं था
- जब आप live class schedule करते थे, तो trigger fire होता था और error आता था

### समाधान:
- ⚠️ Problematic triggers remove कर दिए
- ✅ सही table structure verify की
- ✅ Proper RLS policies apply की
- ✅ Simple और safe triggers बनाए

## ✅ Verification

इन steps के बाद verify करें:

1. **Supabase SQL Editor में:**
```sql
-- Check table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'live_classes';

-- Check triggers
SELECT trigger_name, event_manipulation 
FROM information_schema.triggers 
WHERE event_object_table = 'live_classes';
```

2. **Frontend में:**
- Live class schedule करने की कोशिश करें
- Error नहीं आना चाहिए
- Class successfully save होनी चाहिए

## 🎉 Result

अब आप:
- ✅ बिना error के live classes schedule कर सकते हैं
- ✅ Live classes को manage कर सकते हैं
- ✅ Real-time updates (optional) enable कर सकते हैं

## 🆘 अगर फिर भी error आए

1. Browser console में error message check करें
2. Supabase logs में देखें
3. `live_classes` table के columns verify करें
4. RLS policies check करें

---

**Generated with [Devin](https://cli.devin.ai/docs)**