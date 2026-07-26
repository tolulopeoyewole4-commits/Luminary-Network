-- Milestone 8: RLS for transcripts and transcript_segments.

alter table public.transcripts enable row level security;
alter table public.transcript_segments enable row level security;

drop policy if exists "Users can view own transcripts" on public.transcripts;
create policy "Users can view own transcripts"
  on public.transcripts for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own transcripts" on public.transcripts;
create policy "Users can create own transcripts"
  on public.transcripts for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.source_files sf
      where sf.id = source_file_id
        and sf.user_id = auth.uid()
        and sf.project_id = project_id
    )
  );

drop policy if exists "Users can update own transcripts" on public.transcripts;
create policy "Users can update own transcripts"
  on public.transcripts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own transcripts" on public.transcripts;
create policy "Users can delete own transcripts"
  on public.transcripts for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can view own transcript segments" on public.transcript_segments;
create policy "Users can view own transcript segments"
  on public.transcript_segments for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own transcript segments" on public.transcript_segments;
create policy "Users can create own transcript segments"
  on public.transcript_segments for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.transcripts t
      where t.id = transcript_id
        and t.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update own transcript segments" on public.transcript_segments;
create policy "Users can update own transcript segments"
  on public.transcript_segments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own transcript segments" on public.transcript_segments;
create policy "Users can delete own transcript segments"
  on public.transcript_segments for delete
  using (auth.uid() = user_id);
