-- Milestone 5: courses, modules, and lessons for outline generation.

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'course_status' and n.nspname = 'public'
  ) then
    create type public.course_status as enum (
      'draft',
      'ready',
      'archived'
    );
  end if;

  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'course_difficulty' and n.nspname = 'public'
  ) then
    create type public.course_difficulty as enum (
      'beginner',
      'intermediate',
      'advanced'
    );
  end if;
end $$;

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  source_file_id uuid references public.source_files (id) on delete set null,
  title text not null,
  description text,
  target_audience text,
  course_objective text,
  duration_label text,
  difficulty_level public.course_difficulty not null default 'beginner',
  learning_outcomes jsonb not null default '[]'::jsonb,
  quiz_suggestions jsonb not null default '[]'::jsonb,
  source_references jsonb not null default '[]'::jsonb,
  status public.course_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint courses_title_not_blank check (char_length(trim(title)) > 0),
  constraint courses_title_length check (char_length(title) <= 200)
);

create index if not exists courses_user_id_idx on public.courses (user_id);
create index if not exists courses_project_id_idx on public.courses (project_id);

create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  description text,
  position integer not null check (position > 0),
  source_references jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_modules_title_not_blank check (char_length(trim(title)) > 0)
);

create index if not exists course_modules_course_id_idx
  on public.course_modules (course_id, position);

create table if not exists public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  module_id uuid not null references public.course_modules (id) on delete cascade,
  title text not null,
  learning_objectives jsonb not null default '[]'::jsonb,
  lesson_content text not null default '',
  position integer not null check (position > 0),
  source_references jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_lessons_title_not_blank check (char_length(trim(title)) > 0)
);

create index if not exists course_lessons_module_id_idx
  on public.course_lessons (module_id, position);

drop trigger if exists courses_set_updated_at on public.courses;
create trigger courses_set_updated_at
  before update on public.courses
  for each row execute function public.set_updated_at();

drop trigger if exists course_modules_set_updated_at on public.course_modules;
create trigger course_modules_set_updated_at
  before update on public.course_modules
  for each row execute function public.set_updated_at();

drop trigger if exists course_lessons_set_updated_at on public.course_lessons;
create trigger course_lessons_set_updated_at
  before update on public.course_lessons
  for each row execute function public.set_updated_at();
