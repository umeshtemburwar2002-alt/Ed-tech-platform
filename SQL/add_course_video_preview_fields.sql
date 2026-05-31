-- Production-Ready SQL Migration for YouTube Video Preview System
-- Run this in Supabase SQL Editor!

-- Add all required video preview fields to courses table
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS preview_video_url TEXT,
ADD COLUMN IF NOT EXISTS preview_video_id TEXT,
ADD COLUMN IF NOT EXISTS preview_video_thumbnail TEXT,
ADD COLUMN IF NOT EXISTS preview_video_embed_url TEXT,
ADD COLUMN IF NOT EXISTS video_provider TEXT DEFAULT 'youtube' CHECK (video_provider IN ('youtube', 'uploaded')),
ADD COLUMN IF NOT EXISTS preview_duration INTEGER,
ADD COLUMN IF NOT EXISTS preview_type TEXT DEFAULT 'video';

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_courses_video_provider ON courses(video_provider);
CREATE INDEX IF NOT EXISTS idx_courses_preview_video_id ON courses(preview_video_id);

-- Update existing courses to set default values (if needed)
UPDATE courses 
SET video_provider = 'youtube' 
WHERE video_provider IS NULL;
