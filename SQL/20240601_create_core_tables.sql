/* supabase/migrations/20240601_create_core_tables.sql */
-- Create core tables for the EdTech platform

-- Users table (extends auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  avatar_url text,
  role text default 'student',
  created_at timestamptz default now()
);

-- Courses table
create table if not exists public.courses (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  price numeric not null,
  thumbnail text,
  category text,
  instructor_id uuid references public.users(id),
  created_at timestamptz default now()
);

-- Wishlist table (many-to-many between users and courses)
create table if not exists public.wishlist (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  created_at timestamptz default now()
);

-- Cart items table
create table if not exists public.cart_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  quantity integer not null default 1,
  added_at timestamptz default now()
);

-- Orders table
create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  total numeric not null,
  status text default 'pending',
  created_at timestamptz default now()
);

-- Order items table
create table if not exists public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references public.orders(id) on delete cascade,
  course_id uuid references public.courses(id),
  price numeric not null,
  quantity integer not null default 1,
  created_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_wishlist_user on public.wishlist(user_id);
create index if not exists idx_cart_user on public.cart_items(user_id);
create index if not exists idx_orders_user on public.orders(user_id);
