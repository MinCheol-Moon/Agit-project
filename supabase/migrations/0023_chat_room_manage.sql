-- Let admins/master create and delete chat rooms (0002 only had a select
-- policy, so every insert/delete was silently blocked by RLS).
drop policy if exists chat_rooms_insert on chat_rooms;
create policy chat_rooms_insert on chat_rooms
  for insert with check (is_akatsuki() or current_tier_rank() >= 5);

drop policy if exists chat_rooms_delete on chat_rooms;
create policy chat_rooms_delete on chat_rooms
  for delete using (is_akatsuki() or current_tier_rank() >= 5);
