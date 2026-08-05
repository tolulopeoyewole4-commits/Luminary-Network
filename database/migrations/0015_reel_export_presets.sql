-- Milestone 26: vertical reel/short export presets on exported clips.

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'clip_aspect_ratio' and n.nspname = 'public'
  ) then
    create type public.clip_aspect_ratio as enum (
      'original',
      '9:16',
      '1:1'
    );
  end if;
end $$;

alter table public.exported_clips
  add column if not exists aspect_ratio public.clip_aspect_ratio not null default 'original';

alter table public.exported_clips
  add column if not exists burn_captions boolean not null default false;

alter table public.exported_clips
  add column if not exists brand_stamp boolean not null default false;

comment on column public.exported_clips.aspect_ratio is
  'Export framing: original source, vertical 9:16 (Reels/Shorts/TikTok), or 1:1.';

comment on column public.exported_clips.burn_captions is
  'When true, caption cues overlapping the clip window are burned into the MP4.';

comment on column public.exported_clips.brand_stamp is
  'When true, creator display name is stamped onto the exported clip.';
