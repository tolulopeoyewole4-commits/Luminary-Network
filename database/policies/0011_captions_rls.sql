-- Milestone 11: RLS for captions and caption_cues.

alter table public.captions enable row level security;
alter table public.caption_cues enable row level security;

drop policy if exists "Users can view own captions" on public.captions;
create policy "Users can view own captions"
  on public.captions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own captions" on public.captions;
create policy "Users can create own captions"
  on public.captions for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.source_files sf
      where sf.id = source_file_id
        and sf.user_id = auth.uid()
        and sf.project_id = project_id
    )
  );

drop policy if exists "Users can update own captions" on public.captions;
create policy "Users can update own captions"
  on public.captions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own captions" on public.captions;
create policy "Users can delete own captions"
  on public.captions for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can view own caption cues" on public.caption_cues;
create policy "Users can view own caption cues"
  on public.caption_cues for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own caption cues" on public.caption_cues;
create policy "Users can create own caption cues"
  on public.caption_cues for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.captions c
      where c.id = caption_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update own caption cues" on public.caption_cues;
create policy "Users can update own caption cues"
  on public.caption_cues for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own caption cues" on public.caption_cues;
create policy "Users can delete own caption cues"
  on public.caption_cues for delete
  using (auth.uid() = user_id);
