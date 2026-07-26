-- Milestone 3: source file metadata for private uploads.

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'source_file_type' and n.nspname = 'public'
  ) then
    create type public.source_file_type as enum ('pdf', 'docx', 'txt', 'mp4', 'mov');
  end if;

  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'source_processing_status' and n.nspname = 'public'
  ) then
    create type public.source_processing_status as enum (
      'uploading',
      'uploaded',
      'processing',
      'ready',
      'failed'
    );
  end if;
end $$;

create table if not exists public.source_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  original_filename text not null,
  internal_storage_path text not null unique,
  file_type public.source_file_type not null,
  mime_type text not null,
  file_size bigint not null check (file_size > 0),
  processing_status public.source_processing_status not null default 'uploading',
  page_count integer,
  video_duration_seconds numeric(12, 3),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint source_files_filename_not_blank check (char_length(trim(original_filename)) > 0),
  constraint source_files_filename_length check (char_length(original_filename) <= 255),
  constraint source_files_path_not_blank check (char_length(trim(internal_storage_path)) > 0)
);

create index if not exists source_files_user_id_idx on public.source_files (user_id);
create index if not exists source_files_project_id_idx on public.source_files (project_id);
create index if not exists source_files_user_project_idx
  on public.source_files (user_id, project_id, created_at desc);

drop trigger if exists source_files_set_updated_at on public.source_files;
create trigger source_files_set_updated_at
  before update on public.source_files
  for each row execute function public.set_updated_at();
