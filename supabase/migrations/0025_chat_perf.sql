-- Chat performance: a view that returns one latest message per room via a
-- lateral join, so the room list no longer downloads every message just to
-- build previews. security_invoker makes the view run with the caller's
-- privileges, so it inherits the existing chat_rooms / messages RLS (a member
-- only sees rooms/messages they're already allowed to select).
--
-- NOTE: not applied automatically - run this in the Supabase SQL editor when
-- ready. Until then listChatRooms() falls back to the old method.

create or replace view public.chat_room_previews
with (security_invoker = true) as
select
  r.*,
  m.body        as last_message,
  m.created_at  as last_message_at
from public.chat_rooms r
left join lateral (
  select body, created_at
  from public.messages
  where room_id = r.id
  order by created_at desc
  limit 1
) m on true;

grant select on public.chat_room_previews to authenticated;

-- The lateral subquery is served by the existing messages (room_id, created_at)
-- index from 0001_schema.sql, so no extra index is needed.
