-- ============================================================
-- Migration: Add full_name and avatar_url columns to profiles
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to run multiple times (idempotent)
-- ============================================================

-- Add full_name column if it doesn't exist
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT DEFAULT '';

-- Add avatar_url column if it doesn't exist
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '';

-- Add updated_at column if it doesn't exist
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add provider column if it doesn't exist
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'email';

-- ============================================================
-- Update existing rows: populate full_name from first+last
-- ============================================================
UPDATE public.profiles
SET full_name = TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
WHERE full_name = '' OR full_name IS NULL;

-- ============================================================
-- Make sure RLS allows users to upsert their own profile
-- (required for the upsertOAuthProfile function to work)
-- ============================================================

-- Enable RLS if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies (safe — won't error if they don't exist)
DROP POLICY IF EXISTS "profiles: users can read own"    ON public.profiles;
DROP POLICY IF EXISTS "profiles: users can insert own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles: users can update own"  ON public.profiles;

CREATE POLICY "profiles: users can read own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles: users can insert own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: users can update own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- Auto-create profile trigger for new OAuth signups
-- (safe to run again — replaces existing function/trigger)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _full_name  TEXT;
  _first_name TEXT;
  _last_name  TEXT;
  _avatar_url TEXT;
  _provider   TEXT;
BEGIN
  -- Extract name from OAuth metadata (works for Google, GitHub, email)
  _full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'login',       -- GitHub username
    split_part(NEW.email, '@', 1)           -- fallback: email prefix
  );

  _first_name := COALESCE(
    NEW.raw_user_meta_data->>'firstName',
    split_part(_full_name, ' ', 1)
  );

  _last_name := COALESCE(
    NEW.raw_user_meta_data->>'lastName',
    CASE
      WHEN position(' ' IN _full_name) > 0
      THEN TRIM(SUBSTR(_full_name, position(' ' IN _full_name)))
      ELSE ''
    END
  );

  _avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',  -- GitHub
    NEW.raw_user_meta_data->>'picture',     -- Google
    ''
  );

  _provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');

  -- Insert profile row; ON CONFLICT DO NOTHING = never clobber existing profiles
  INSERT INTO public.profiles (
    id, email, first_name, last_name, full_name,
    avatar_url, image, account_type, provider,
    created_at, updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    _first_name,
    _last_name,
    _full_name,
    _avatar_url,
    _avatar_url,
    -- IMPORTANT: account_type intentionally set to 'Student' as default.
    -- upsertOAuthProfile() in googleAuthAPI.js will UPDATE this to the
    -- role the user selected (stored in sessionStorage["oauth_selected_role"]).
    COALESCE(NEW.raw_user_meta_data->>'accountType', 'Student'),
    _provider,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Attach trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
