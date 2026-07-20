-- Read state for 1:1 direct messages. Powers the KakaoTalk-style "1" shown
-- next to a sent DM until the recipient has opened the conversation.
-- reader_id read everything from peer_id up to last_read_at.
create table if not exists public.dm_reads (
  reader_id uuid not null references public.users(id) on delete cascade,
  peer_id uuid not null references public.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (reader_id, peer_id)
);

alter table public.dm_reads enable row level security;

-- You can see your own read marker and your peer's marker for you (so you can
-- tell whether they've read your messages).
drop policy if exists dm_reads_select on public.dm_reads;
create policy dm_reads_select on public.dm_reads
  for select using (reader_id = auth.uid() or peer_id = auth.uid());

drop policy if exists dm_reads_insert on public.dm_reads;
create policy dm_reads_insert on public.dm_reads
  for insert with check (reader_id = auth.uid());

drop policy if exists dm_reads_update on public.dm_reads;
create policy dm_reads_update on public.dm_reads
  for update using (reader_id = auth.uid()) with check (reader_id = auth.uid());

alter publication supabase_realtime add table public.dm_reads;
