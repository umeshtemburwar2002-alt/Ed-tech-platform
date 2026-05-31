-- ============================================================================
-- Production draft autosave schema for course-creation flow
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1) Draft root table
-- ----------------------------------------------------------------------------
create table if not exists public.course_drafts (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.profiles(id) on delete cascade,
  draft_data jsonb not null default '{}'::jsonb,
  current_step int not null default 0 check (current_step between 0 and 4),
  completion_percentage numeric(5,2) not null default 0 check (completion_percentage between 0 and 100),
  draft_status text not null default 'active'
    check (draft_status in ('active', 'in_progress', 'published', 'abandoned')),
  published_course_id uuid references public.courses(id) on delete set null,
  last_saved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One active/in-progress draft per instructor (prevents duplicate drafts)
create unique index if not exists uq_course_drafts_instructor_active
  on public.course_drafts (instructor_id)
  where draft_status in ('active', 'in_progress');

create index if not exists idx_course_drafts_instructor_updated
  on public.course_drafts (instructor_id, updated_at desc);

-- ----------------------------------------------------------------------------
-- 2) Normalized draft child tables
-- ----------------------------------------------------------------------------
create table if not exists public.course_sections (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.course_drafts(id) on delete cascade,
  title text not null,
  order_index int not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(draft_id, order_index)
);

create index if not exists idx_course_sections_draft_order
  on public.course_sections (draft_id, order_index);

create table if not exists public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.course_sections(id) on delete cascade,
  title text not null,
  description text,
  video_url text,
  time_duration text,
  is_preview boolean not null default false,
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(section_id, order_index)
);

create index if not exists idx_course_lessons_section_order
  on public.course_lessons (section_id, order_index);

create table if not exists public.course_draft_pricing (
  draft_id uuid primary key references public.course_drafts(id) on delete cascade,
  is_free boolean not null default false,
  price numeric(10,2) not null default 0,
  currency text not null default 'INR',
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_draft_publish_status (
  draft_id uuid primary key references public.course_drafts(id) on delete cascade,
  ready_to_publish boolean not null default false,
  published_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3) updated_at trigger helper
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_course_drafts_updated_at on public.course_drafts;
create trigger trg_course_drafts_updated_at
before update on public.course_drafts
for each row execute function public.set_updated_at();

drop trigger if exists trg_course_sections_updated_at on public.course_sections;
create trigger trg_course_sections_updated_at
before update on public.course_sections
for each row execute function public.set_updated_at();

drop trigger if exists trg_course_lessons_updated_at on public.course_lessons;
create trigger trg_course_lessons_updated_at
before update on public.course_lessons
for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 4) RLS
-- ----------------------------------------------------------------------------
alter table public.course_drafts enable row level security;
alter table public.course_sections enable row level security;
alter table public.course_lessons enable row level security;
alter table public.course_draft_pricing enable row level security;
alter table public.course_draft_publish_status enable row level security;

drop policy if exists "instructors_manage_own_course_drafts" on public.course_drafts;
create policy "instructors_manage_own_course_drafts"
on public.course_drafts
for all to authenticated
using (auth.uid() = instructor_id)
with check (auth.uid() = instructor_id);

drop policy if exists "instructors_manage_own_course_sections" on public.course_sections;
create policy "instructors_manage_own_course_sections"
on public.course_sections
for all to authenticated
using (
  exists (
    select 1
    from public.course_drafts d
    where d.id = course_sections.draft_id
      and d.instructor_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.course_drafts d
    where d.id = course_sections.draft_id
      and d.instructor_id = auth.uid()
  )
);

drop policy if exists "instructors_manage_own_course_lessons" on public.course_lessons;
create policy "instructors_manage_own_course_lessons"
on public.course_lessons
for all to authenticated
using (
  exists (
    select 1
    from public.course_sections s
    join public.course_drafts d on d.id = s.draft_id
    where s.id = course_lessons.section_id
      and d.instructor_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.course_sections s
    join public.course_drafts d on d.id = s.draft_id
    where s.id = course_lessons.section_id
      and d.instructor_id = auth.uid()
  )
);

drop policy if exists "instructors_manage_own_draft_pricing" on public.course_draft_pricing;
create policy "instructors_manage_own_draft_pricing"
on public.course_draft_pricing
for all to authenticated
using (
  exists (
    select 1 from public.course_drafts d
    where d.id = course_draft_pricing.draft_id
      and d.instructor_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.course_drafts d
    where d.id = course_draft_pricing.draft_id
      and d.instructor_id = auth.uid()
  )
);

drop policy if exists "instructors_manage_own_draft_publish_status" on public.course_draft_publish_status;
create policy "instructors_manage_own_draft_publish_status"
on public.course_draft_publish_status
for all to authenticated
using (
  exists (
    select 1 from public.course_drafts d
    where d.id = course_draft_publish_status.draft_id
      and d.instructor_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.course_drafts d
    where d.id = course_draft_publish_status.draft_id
      and d.instructor_id = auth.uid()
  )
);

-- ----------------------------------------------------------------------------
-- 5) Transactional upsert RPC for autosave
-- ----------------------------------------------------------------------------
create or replace function public.upsert_instructor_course_draft(
  p_instructor_id uuid,
  p_payload jsonb
)
returns public.course_drafts
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_draft public.course_drafts;
  v_step int := greatest(0, least(4, coalesce((p_payload ->> 'current_step')::int, 0)));
  v_completion numeric(5,2) := 0;
  v_title text := coalesce(p_payload ->> 'title', '');
  v_description text := coalesce(p_payload ->> 'description', '');
  v_category_id uuid := nullif(p_payload ->> 'category_id', '')::uuid;
  v_price numeric(10,2) := coalesce((p_payload ->> 'price')::numeric, 0);
  v_is_free boolean := coalesce((p_payload ->> 'is_free')::boolean, false);
  v_visibility text := coalesce(p_payload ->> 'visibility', 'private');
  sec jsonb;
  lec jsonb;
  v_section_id uuid;
  sec_idx int := 0;
  lec_idx int := 0;
begin
  if auth.uid() is distinct from p_instructor_id then
    raise exception 'Not allowed to save this instructor draft';
  end if;

  -- Lock existing active draft row for this instructor (if present).
  select *
  into v_draft
  from public.course_drafts d
  where d.instructor_id = p_instructor_id
    and d.draft_status in ('active', 'in_progress')
  order by d.updated_at desc
  limit 1
  for update;

  if v_draft.id is null then
    insert into public.course_drafts (
      instructor_id,
      draft_data,
      current_step,
      completion_percentage,
      draft_status,
      last_saved_at
    )
    values (
      p_instructor_id,
      p_payload,
      v_step,
      0,
      'active',
      now()
    )
    returning * into v_draft;
  end if;

  -- Lightweight completion scoring for UX progress bar/state.
  v_completion := (
    (case when length(trim(v_title)) > 0 then 20 else 0 end) +
    (case when length(trim(v_description)) > 0 then 20 else 0 end) +
    (case when v_category_id is not null then 15 else 0 end) +
    (case when jsonb_array_length(coalesce(p_payload -> 'sections', '[]'::jsonb)) > 0 then 20 else 0 end) +
    (case when (v_is_free or v_price > 0) then 15 else 0 end) +
    (case when v_step >= 3 then 10 else 0 end)
  );

  update public.course_drafts
  set
    draft_data = p_payload,
    current_step = v_step,
    completion_percentage = least(100, greatest(0, v_completion)),
    draft_status = case when v_step = 4 then 'published' else 'in_progress' end,
    last_saved_at = now()
  where id = v_draft.id
  returning * into v_draft;

  insert into public.course_draft_pricing (draft_id, is_free, price, visibility, updated_at)
  values (v_draft.id, v_is_free, v_price, v_visibility, now())
  on conflict (draft_id)
  do update
  set
    is_free = excluded.is_free,
    price = excluded.price,
    visibility = excluded.visibility,
    updated_at = now();

  insert into public.course_draft_publish_status (draft_id, ready_to_publish, updated_at)
  values (
    v_draft.id,
    (v_step >= 3 and length(trim(v_title)) > 0 and length(trim(v_description)) > 0),
    now()
  )
  on conflict (draft_id)
  do update
  set
    ready_to_publish = excluded.ready_to_publish,
    updated_at = now();

  -- Replace sections+lessons atomically inside this same transaction.
  delete from public.course_sections where draft_id = v_draft.id;

  for sec in
    select value
    from jsonb_array_elements(coalesce(p_payload -> 'sections', '[]'::jsonb))
  loop
    insert into public.course_sections (draft_id, title, order_index)
    values (v_draft.id, coalesce(sec ->> 'title', 'Untitled Section'), sec_idx)
    returning id into v_section_id;

    lec_idx := 0;
    for lec in
      select value
      from jsonb_array_elements(coalesce(sec -> 'lectures', '[]'::jsonb))
    loop
      insert into public.course_lessons (
        section_id, title, description, video_url, time_duration, is_preview, order_index
      )
      values (
        v_section_id,
        coalesce(lec ->> 'title', 'Untitled Lesson'),
        coalesce(lec ->> 'description', ''),
        nullif(lec ->> 'video_url', ''),
        coalesce(lec ->> 'time_duration', '0'),
        coalesce((lec ->> 'is_preview')::boolean, false),
        lec_idx
      );
      lec_idx := lec_idx + 1;
    end loop;

    sec_idx := sec_idx + 1;
  end loop;

  return v_draft;
end;
$$;

-- ----------------------------------------------------------------------------
-- 6) Grants (Supabase best practice)
-- ----------------------------------------------------------------------------
-- Tables are protected by RLS; grants allow PostgREST to access them for the
-- authenticated role.
grant select, insert, update, delete on table public.course_drafts to authenticated;
grant select, insert, update, delete on table public.course_sections to authenticated;
grant select, insert, update, delete on table public.course_lessons to authenticated;
grant select, insert, update, delete on table public.course_draft_pricing to authenticated;
grant select, insert, update, delete on table public.course_draft_publish_status to authenticated;

revoke all on function public.upsert_instructor_course_draft(uuid, jsonb) from public;
grant execute on function public.upsert_instructor_course_draft(uuid, jsonb) to authenticated;
