-- ================================================================
-- Migration: Fix full_name for existing profiles
-- Run in: Supabase Dashboard → SQL Editor → Run
--
-- Problem: Existing profiles have full_name = '' because the
-- original registerWithSupabase did not write full_name.
--
-- This back-fills full_name from first_name + last_name for all
-- rows where full_name is blank, and also updates the trigger so
-- new signups via Supabase Auth always get full_name written.
-- ================================================================

-- ── 1. Back-fill existing rows ────────────────────────────────────────────────
UPDATE public.profiles
SET full_name = TRIM(CONCAT(first_name, ' ', last_name))
WHERE (full_name IS NULL OR full_name = '')
  AND (first_name != '' OR last_name != '');

-- ── 2. Drop and recreate handle_new_user trigger function ─────────────────────
--    This fires on every new auth.users INSERT (email + OAuth).
--    It reads raw_user_meta_data which Supabase writes from signUp options.data.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_first_name   TEXT;
  v_last_name    TEXT;
  v_full_name    TEXT;
  v_avatar_url   TEXT;
  v_account_type TEXT;
  v_provider     TEXT;
  v_email        TEXT;
BEGIN
  -- ── Extract email ──────────────────────────────────────────────────────────
  v_email := COALESCE(NEW.email, '');

  -- ── Extract provider ───────────────────────────────────────────────────────
  v_provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');

  -- ── Extract name (handles email signup + Google + GitHub) ─────────────────
  --    Email signup:  raw_user_meta_data has firstName, lastName, full_name
  --    Google OAuth:  raw_user_meta_data has full_name, name
  --    GitHub OAuth:  raw_user_meta_data has full_name, name (NOT login — avoids username)

  v_full_name :=
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
      ''
    );

  -- For email signups where first/last were passed separately
  IF v_full_name = '' THEN
    v_first_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'firstName'), ''), '');
    v_last_name  := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'lastName'),  ''), '');
    v_full_name  := TRIM(CONCAT(v_first_name, ' ', v_last_name));
  ELSE
    -- Split full_name into first + last
    v_first_name := SPLIT_PART(v_full_name, ' ', 1);
    v_last_name  := TRIM(SUBSTRING(v_full_name FROM POSITION(' ' IN v_full_name) + 1));
    IF v_last_name = v_full_name THEN v_last_name := ''; END IF;
  END IF;

  -- ── Extract avatar ─────────────────────────────────────────────────────────
  v_avatar_url :=
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''),
      NULLIF(NEW.raw_user_meta_data->>'picture', ''),
      ''
    );

  -- ── Extract role (email signup only — OAuth users set role via OAuthCallback) ──
  v_account_type :=
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'accountType', ''),
      'Student'
    );

  -- Normalize teacher → Instructor
  IF LOWER(v_account_type) IN ('teacher', 'instructor') THEN
    v_account_type := 'Instructor';
  ELSIF LOWER(v_account_type) = 'admin' THEN
    v_account_type := 'Admin';
  ELSE
    v_account_type := 'Student';
  END IF;

  -- ── Upsert profile row ─────────────────────────────────────────────────────
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    full_name,
    avatar_url,
    image,
    account_type,
    provider,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    v_email,
    v_first_name,
    v_last_name,
    v_full_name,
    v_avatar_url,
    v_avatar_url,
    v_account_type,
    v_provider,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    -- Only update name/avatar if they're currently blank (don't overwrite if user edited)
    first_name   = CASE WHEN profiles.first_name = '' THEN EXCLUDED.first_name   ELSE profiles.first_name   END,
    last_name    = CASE WHEN profiles.last_name  = '' THEN EXCLUDED.last_name    ELSE profiles.last_name    END,
    full_name    = CASE WHEN profiles.full_name  = '' THEN EXCLUDED.full_name    ELSE profiles.full_name    END,
    avatar_url   = CASE WHEN profiles.avatar_url = '' THEN EXCLUDED.avatar_url   ELSE profiles.avatar_url   END,
    image        = CASE WHEN profiles.image      = '' THEN EXCLUDED.image        ELSE profiles.image        END,
    updated_at   = NOW();

  RETURN NEW;
END;
$$;

-- ── 3. Re-attach trigger ───────────────────────────────────────────────────────
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 4. Verify results ─────────────────────────────────────────────────────────
-- Run this SELECT to confirm names are populated:
-- SELECT id, email, first_name, last_name, full_name, account_type FROM public.profiles LIMIT 20;
