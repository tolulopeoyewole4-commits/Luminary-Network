-- Milestone 6: generated social and long-form content library.

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'generated_content_type' and n.nspname = 'public'
  ) then
    create type public.generated_content_type as enum (
      'linkedin_post',
      'instagram_caption',
      'x_thread',
      'youtube_script',
      'tiktok_script',
      'newsletter',
      'blog_outline',
      'social_post',
      'video_script',
      'blog',
      'devotional',
      'course_outline',
      'lesson',
      'quiz',
      'workbook',
      'title',
      'description',
      'hashtags'
    );
  end if;

  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'generation_status' and n.nspname = 'public'
  ) then
    create type public.generation_status as enum (
      'draft',
      'ready',
      'archived'
    );
  end if;
end $$;

create table if not exists public.generated_content (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  source_file_id uuid references public.source_files (id) on delete set null,
  content_type public.generated_content_type not null,
  title text not null,
  body text not null default '',
  tone text,
  length_label text,
  target_audience text,
  call_to_action text,
  platform text,
  generation_status public.generation_status not null default 'draft',
  source_references jsonb not null default '[]'::jsonb,
  duplicated_from_id uuid references public.generated_content (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint generated_content_title_not_blank check (char_length(trim(title)) > 0),
  constraint generated_content_title_length check (char_length(title) <= 200)
);

create index if not exists generated_content_user_id_idx
  on public.generated_content (user_id);

create index if not exists generated_content_project_id_idx
  on public.generated_content (project_id, created_at desc);

create index if not exists generated_content_type_idx
  on public.generated_content (project_id, content_type);

drop trigger if exists generated_content_set_updated_at on public.generated_content;
create trigger generated_content_set_updated_at
  before update on public.generated_content
  for each row execute function public.set_updated_at();
