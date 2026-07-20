-- Per-user read state for group chat rooms. Powers the KakaoTalk-style
-- "unread by N people" count shown next to each of my own messages: the
-- number is (other active members) minus (those whose last_read_at is at or
-- after the message), and disappears once everyone has read it.

create table if not exists public.room_reads (
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

alter table public.room_reads enable row level security;

-- Any active member can read the whole table for a room so the client can
-- compute unread counts.
drop policy if exists room_reads_select on public.room_reads;
create policy room_reads_select on public.room_reads
  for select using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.status = 'active')
  );

-- A member may only insert/update their own read marker.
drop policy if exists room_reads_insert on public.room_reads;
create policy room_reads_insert on public.room_reads
  for insert with check (user_id = auth.uid());

drop policy if exists room_reads_update on public.room_reads;
create policy room_reads_update on public.room_reads
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Live updates so a sender sees the count drop as others open the room.
alter publication supabase_realtime add table public.room_reads;
