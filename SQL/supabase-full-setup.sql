-- ============================================================
-- Supabase Full Setup (DB schema + RLS + Storage buckets)
-- Project: Ed tech platform
-- Paste into Supabase Dashboard -> SQL editor and run.
-- ============================================================

-- -------------------------
-- Extensions
-- -------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- -------------------------
-- Core tables
-- -------------------------

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  first_name text not null,
  last_name text not null,
  email text unique not null,
  account_type text check (account_type in ('Admin', 'Student', 'Instructor')) not null,
  image text,
  contact_number text,
  gender text,
  date_of_birth text,
  about text,
  active boolean default true,
  approved boolean default true,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

create table if not exists public.categories (
  id uuid default uuid_generate_v4() primary key,
  name text not null unique,
  description text,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create table if not exists public.courses (
  id uuid default uuid_generate_v4() primary key,
  course_name text not null,
  course_description text,
  instructor_id uuid references public.profiles(id) on delete cascade not null,
  what_you_will_learn text,
  price numeric default 0,
  thumbnail text,
  category_id uuid references public.categories(id) on delete set null,
  status text check (status in ('Draft', 'Published')) default 'Draft',
  instructions text[],
  tags text[],
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

create table if not exists public.sections (
  id uuid default uuid_generate_v4() primary key,
  course_id uuid references public.courses(id) on delete cascade not null,
  section_name text not null,
  order_index int default 0,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create table if not exists public.sub_sections (
  id uuid default uuid_generate_v4() primary key,
  section_id uuid references public.sections(id) on delete cascade not null,
  title text not null,
  description text,
  video_url text,
  time_duration text,
  order_index int default 0,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create table if not exists public.enrollments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete cascade not null,
  enrolled_at timestamptz default timezone('utc'::text, now()) not null,
  unique(user_id, course_id)
);

create table if not exists public.course_progress (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete cascade not null,
  completed_videos uuid[] default '{}',
  updated_at timestamptz default timezone('utc'::text, now()) not null,
  unique(user_id, course_id)
);

create table if not exists public.ratings_reviews (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete cascade not null,
  rating numeric check (rating >= 1 and rating <= 5) not null,
  review text,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- -------------------------
-- Instructor support system
-- -------------------------

create table if not exists public.instructor_support_tickets (
  id uuid default gen_random_uuid() primary key,
  instructor_id uuid not null references auth.users(id) on delete cascade,
  name text,
  email text,
  subject text not null,
  category text,
  course_name text,
  priority text default 'medium',
  message text not null,
  attachment_url text,
  status text default 'open',
  admin_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_instructor_support_tickets_instructor_id
  on public.instructor_support_tickets(instructor_id);
create index if not exists idx_instructor_support_tickets_status
  on public.instructor_support_tickets(status);
create index if not exists idx_instructor_support_tickets_created_at
  on public.instructor_support_tickets(created_at desc);

-- -------------------------
-- updated_at trigger helper
-- -------------------------

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_instructor_support_tickets_updated_at on public.instructor_support_tickets;
create trigger update_instructor_support_tickets_updated_at
before update on public.instructor_support_tickets
for each row execute function public.update_updated_at_column();

-- -------------------------
-- RLS enablement
-- -------------------------

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.courses enable row level security;
alter table public.sections enable row level security;
alter table public.sub_sections enable row level security;
alter table public.enrollments enable row level security;
alter table public.course_progress enable row level security;
alter table public.ratings_reviews enable row level security;
alter table public.instructor_support_tickets enable row level security;

-- -------------------------
-- RLS policies (minimal set aligned with your code)
-- -------------------------

-- profiles
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
create policy "Public profiles are viewable by everyone."
  on public.profiles for select using (true);

drop policy if exists "Users can insert own profile." on public.profiles;
create policy "Users can insert own profile."
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile." on public.profiles;
create policy "Users can update own profile."
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- categories
drop policy if exists "Categories are viewable by everyone." on public.categories;
create policy "Categories are viewable by everyone."
  on public.categories for select using (true);

drop policy if exists "Admins can manage categories." on public.categories;
create policy "Admins can manage categories."
  on public.categories for all to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.account_type = 'Admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.account_type = 'Admin'
    )
  );

-- courses
drop policy if exists "Published courses are viewable by everyone." on public.courses;
create policy "Published courses are viewable by everyone."
  on public.courses for select
  using (status = 'Published' or auth.uid() = instructor_id);

drop policy if exists "Instructors can create courses." on public.courses;
create policy "Instructors can create courses."
  on public.courses for insert
  with check (auth.uid() = instructor_id);

drop policy if exists "Instructors can update own courses." on public.courses;
create policy "Instructors can update own courses."
  on public.courses for update
  using (auth.uid() = instructor_id)
  with check (auth.uid() = instructor_id);

-- sections
drop policy if exists "Sections are viewable for published courses (or owner)." on public.sections;
create policy "Sections are viewable for published courses (or owner)."
  on public.sections for select
  using (
    exists (
      select 1
      from public.courses c
      where c.id = sections.course_id
        and (c.status = 'Published' or c.instructor_id = auth.uid())
    )
  );

drop policy if exists "Instructors can manage own sections." on public.sections;
create policy "Instructors can manage own sections."
  on public.sections for all to authenticated
  using (
    exists (
      select 1 from public.courses c
      where c.id = sections.course_id and c.instructor_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.courses c
      where c.id = sections.course_id and c.instructor_id = auth.uid()
    )
  );

-- sub_sections
drop policy if exists "Lessons are viewable for published courses (or owner)." on public.sub_sections;
create policy "Lessons are viewable for published courses (or owner)."
  on public.sub_sections for select
  using (
    exists (
      select 1
      from public.sections s
      join public.courses c on c.id = s.course_id
      where s.id = sub_sections.section_id
        and (c.status = 'Published' or c.instructor_id = auth.uid())
    )
  );

drop policy if exists "Instructors can manage own lessons." on public.sub_sections;
create policy "Instructors can manage own lessons."
  on public.sub_sections for all to authenticated
  using (
    exists (
      select 1
      from public.sections s
      join public.courses c on c.id = s.course_id
      where s.id = sub_sections.section_id
        and c.instructor_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.sections s
      join public.courses c on c.id = s.course_id
      where s.id = sub_sections.section_id
        and c.instructor_id = auth.uid()
    )
  );

-- enrollments
drop policy if exists "Users can view own enrollments." on public.enrollments;
create policy "Users can view own enrollments."
  on public.enrollments for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Instructors can view enrollments for own courses." on public.enrollments;
create policy "Instructors can view enrollments for own courses."
  on public.enrollments for select to authenticated
  using (
    exists (
      select 1
      from public.courses c
      where c.id = enrollments.course_id and c.instructor_id = auth.uid()
    )
  );

drop policy if exists "Users can enroll themselves." on public.enrollments;
create policy "Users can enroll themselves."
  on public.enrollments for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can unenroll themselves." on public.enrollments;
create policy "Users can unenroll themselves."
  on public.enrollments for delete to authenticated
  using (user_id = auth.uid());

-- course_progress
drop policy if exists "Users can view own course progress." on public.course_progress;
create policy "Users can view own course progress."
  on public.course_progress for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can create own course progress." on public.course_progress;
create policy "Users can create own course progress."
  on public.course_progress for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update own course progress." on public.course_progress;
create policy "Users can update own course progress."
  on public.course_progress for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ratings_reviews
drop policy if exists "Ratings are viewable by everyone." on public.ratings_reviews;
create policy "Ratings are viewable by everyone."
  on public.ratings_reviews for select using (true);

drop policy if exists "Users can create own reviews." on public.ratings_reviews;
create policy "Users can create own reviews."
  on public.ratings_reviews for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update own reviews." on public.ratings_reviews;
create policy "Users can update own reviews."
  on public.ratings_reviews for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own reviews." on public.ratings_reviews;
create policy "Users can delete own reviews."
  on public.ratings_reviews for delete to authenticated
  using (user_id = auth.uid());

-- instructor_support_tickets
drop policy if exists "Instructors can view own tickets" on public.instructor_support_tickets;
create policy "Instructors can view own tickets"
  on public.instructor_support_tickets
  for select to authenticated
  using (instructor_id = auth.uid());

drop policy if exists "Instructors can insert own tickets" on public.instructor_support_tickets;
create policy "Instructors can insert own tickets"
  on public.instructor_support_tickets
  for insert to authenticated
  with check (instructor_id = auth.uid());

drop policy if exists "Instructors can update own tickets" on public.instructor_support_tickets;
create policy "Instructors can update own tickets"
  on public.instructor_support_tickets
  for update to authenticated
  using (instructor_id = auth.uid())
  with check (instructor_id = auth.uid());

-- -------------------------
-- updated_at triggers (optional but helps consistency)
-- -------------------------

drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();

drop trigger if exists update_courses_updated_at on public.courses;
create trigger update_courses_updated_at
before update on public.courses
for each row execute function public.update_updated_at_column();

drop trigger if exists update_course_progress_updated_at on public.course_progress;
create trigger update_course_progress_updated_at
before update on public.course_progress
for each row execute function public.update_updated_at_column();

-- -------------------------
-- Storage buckets (create via SQL)
-- Note: inserting into storage.buckets is supported in Supabase.
-- -------------------------

insert into storage.buckets (id, name, public)
values
  ('thumbnails', 'thumbnails', true),
  ('videos', 'videos', false),
  ('support-attachments', 'support-attachments', false)
on conflict (id) do nothing;

-- Storage RLS policies for objects
alter table storage.objects enable row level security;

-- Allow reading thumbnails publicly (bucket is public, still keep a SELECT policy)
drop policy if exists "Public can read thumbnails" on storage.objects;
create policy "Public can read thumbnails"
  on storage.objects for select
  using (bucket_id = 'thumbnails');

-- Videos: only authenticated users can read (you can tighten later to "enrolled only")
drop policy if exists "Authenticated can read videos" on storage.objects;
create policy "Authenticated can read videos"
  on storage.objects for select to authenticated
  using (bucket_id = 'videos');

-- Support attachments: authenticated users can upload/read/delete their own files.
-- Path convention (recommended):
-- support-attachments/<auth.uid()>/<student|instructor>/<filename>

drop policy if exists "Users can upload support attachments to own folder" on storage.objects;
create policy "Users can upload support attachments to own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'support-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (storage.foldername(name))[2] in ('student', 'instructor')
  );

drop policy if exists "Users can read own support attachments" on storage.objects;
create policy "Users can read own support attachments"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'support-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own support attachments" on storage.objects;
create policy "Users can delete own support attachments"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'support-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- IMPORTANT: If your app uses storage "upsert"/replace, you also need UPDATE.
drop policy if exists "Users can update own support attachments" on storage.objects;
create policy "Users can update own support attachments"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'support-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'support-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

