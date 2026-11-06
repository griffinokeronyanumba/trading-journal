-- =====================================================================
-- 0004 · Screenshot storage
-- Private bucket "trade-screenshots". Files live at
--   {user_id}/{trade_id}/{random}.webp
-- A user can only read, upload or delete files in their own folder, and can
-- only upload into a folder named after a trade they own.
-- Images are served through short-lived signed URLs (never public).
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trade-screenshots', 'trade-screenshots', false, 5242880, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "trade-screenshots: read own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'trade-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "trade-screenshots: upload to own trade"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'trade-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.trades t
      where t.id::text = (storage.foldername(name))[2]
        and t.user_id = (select auth.uid())
    )
  );

create policy "trade-screenshots: delete own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'trade-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
