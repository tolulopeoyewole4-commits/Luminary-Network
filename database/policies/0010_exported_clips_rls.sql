-- Milestone 10: RLS for exported_clips.

alter table public.exported_clips enable row level security;

drop policy if exists "Users can view own exported clips" on public.exported_clips;
create policy "Users can view own exported clips"
  on public.exported_clips for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own exported clips" on public.exported_clips;
create policy "Users can create own exported clips"
  on public.exported_clips for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.clip_candidates c
      where c.id = clip_candidate_id
        and c.user_id = auth.uid()
        and c.source_file_id = source_file_id
        and c.project_id = project_id
    )
  );

drop policy if exists "Users can update own exported clips" on public.exported_clips;
create policy "Users can update own exported clips"
  on public.exported_clips for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own exported clips" on public.exported_clips;
create policy "Users can delete own exported clips"
  on public.exported_clips for delete
  using (auth.uid() = user_id);
