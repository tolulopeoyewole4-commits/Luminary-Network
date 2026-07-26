-- Milestone 9: RLS for clip_candidates.

alter table public.clip_candidates enable row level security;

drop policy if exists "Users can view own clip candidates" on public.clip_candidates;
create policy "Users can view own clip candidates"
  on public.clip_candidates for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own clip candidates" on public.clip_candidates;
create policy "Users can create own clip candidates"
  on public.clip_candidates for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.source_files sf
      where sf.id = source_file_id
        and sf.user_id = auth.uid()
        and sf.project_id = project_id
    )
  );

drop policy if exists "Users can update own clip candidates" on public.clip_candidates;
create policy "Users can update own clip candidates"
  on public.clip_candidates for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own clip candidates" on public.clip_candidates;
create policy "Users can delete own clip candidates"
  on public.clip_candidates for delete
  using (auth.uid() = user_id);
