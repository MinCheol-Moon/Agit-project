-- RLS defaults to deny; add delete policies so members can remove their own
-- messages (group chat and DMs). Both tables already default (primary-key)
-- replica identity, which is enough for DELETE realtime events to carry the
-- row id so a deletion disappears live for everyone in the room.
create policy messages_delete_own on messages for delete
  using (user_id = auth.uid());

create policy direct_messages_delete_own on direct_messages for delete
  using (sender_id = auth.uid());
