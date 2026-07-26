-- Milestone 3: private storage bucket and path-scoped policies.
-- Object paths must be: {auth.uid()}/{project_id}/{object_name}

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'source-files',
  'source-files',
  false,
  524288000, -- 500 MB hard ceiling; app enforces tighter document limits
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'video/mp4',
    'video/quicktime'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read own source objects" on storage.objects;
create policy "Users can read own source objects"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'source-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can upload own source objects" on storage.objects;
create policy "Users can upload own source objects"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'source-files'
    and (storage.foldername(name))[1] = auth.uid()::text
    and array_length(storage.foldername(name), 1) >= 2
  );

drop policy if exists "Users can update own source objects" on storage.objects;
create policy "Users can update own source objects"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'source-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'source-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own source objects" on storage.objects;
create policy "Users can delete own source objects"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'source-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
