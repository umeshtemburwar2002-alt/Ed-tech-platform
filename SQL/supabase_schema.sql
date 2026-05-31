-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- USERS TABLE
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
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- CATEGORIES TABLE
create table if not exists public.categories (
  id uuid default uuid_generate_v4() primary key,
  name text not null unique,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- COURSES TABLE
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
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SECTIONS TABLE
create table if not exists public.sections (
  id uuid default uuid_generate_v4() primary key,
  course_id uuid references public.courses(id) on delete cascade not null,
  section_name text not null,
  order_index int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SUB_SECTIONS (LESSONS) TABLE
create table if not exists public.sub_sections (
  id uuid default uuid_generate_v4() primary key,
  section_id uuid references public.sections(id) on delete cascade not null,
  title text not null,
  description text,
  video_url text,
  time_duration text,
  order_index int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ENROLLMENTS TABLE
create table if not exists public.enrollments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete cascade not null,
  enrolled_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, course_id)
);

-- COURSE PROGRESS TABLE
create table if not exists public.course_progress (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete cascade not null,
  completed_videos uuid[] default '{}',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, course_id)
);

-- RATING AND REVIEWS TABLE
create table if not exists public.ratings_reviews (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete cascade not null,
  rating numeric check (rating >= 1 and rating <= 5) not null,
  review text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ENABLE ROW LEVEL SECURITY (RLS)
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.courses enable row level security;
alter table public.sections enable row level security;
alter table public.sub_sections enable row level security;
alter table public.enrollments enable row level security;
alter table public.course_progress enable row level security;
alter table public.ratings_reviews enable row level security;

-- RLS POLICIES (BASIC)
-- Profiles: Users can view all, but edit only their own
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

-- Categories: Viewable by all, editable by admin (via service role or custom logic)
create policy "Categories are viewable by everyone." on public.categories for select using (true);

-- Courses: Viewable by all if published, editable by instructor
create policy "Published courses are viewable by everyone." on public.courses for select using (status = 'Published' or auth.uid() = instructor_id);
create policy "Instructors can create courses." on public.courses for insert with check (auth.uid() = instructor_id);
create policy "Instructors can update own courses." on public.courses for update using (auth.uid() = instructor_id);

-- Storage Buckets (Run manually in Supabase Dashboard)
-- Create 'thumbnails' and 'videos' buckets and set public/private access.
