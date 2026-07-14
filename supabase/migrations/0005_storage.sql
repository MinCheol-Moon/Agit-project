insert into storage.buckets (id, name, public) values ('dues-receipts', 'dues-receipts', false) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('post-images', 'post-images', true) on conflict do nothing;

create policy dues_receipts_admin_write on storage.objects for insert
  with check (bucket_id = 'dues-receipts' and current_tier_rank() >= 4);

create policy dues_receipts_admin_read on storage.objects for select
  using (bucket_id = 'dues-receipts' and current_tier_rank() >= 4);

create policy post_images_read on storage.objects for select
  using (bucket_id = 'post-images');

create policy post_images_write on storage.objects for insert
  with check (bucket_id = 'post-images' and current_tier_rank() >= 3);
