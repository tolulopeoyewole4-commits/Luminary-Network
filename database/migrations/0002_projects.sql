-- Milestone 2: projects table for creator workspaces.

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'project_type' and n.nspname = 'public'
  ) then
    create type public.project_type as enum ('video', 'document', 'course', 'mixed');
  end if;

  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'project_status' and n.nspname = 'public'
  ) then
    create type public.project_status as enum ('active', 'archived');
  end if;
end $$;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  project_type public.project_type not null default 'mixed',
  status public.project_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_name_not_blank check (char_length(trim(name)) > 0),
  constraint projects_name_length check (char_length(name) <= 120),
  constraint projects_description_length check (
    description is null or char_length(description) <= 2000
  )
);

create index if not exists projects_user_id_idx on public.projects (user_id);
create index if not exists projects_user_status_idx on public.projects (user_id, status);
create index if not exists projects_user_updated_at_idx on public.projects (user_id, updated_at desc);

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();
