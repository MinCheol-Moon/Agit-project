-- Allow un-liking a post (there was only insert, no delete, so a like could
-- never be removed) and open likes to all members for consistency with
-- comments.
drop policy if exists post_likes_select on post_likes;
create policy post_likes_select on post_likes
  for select using (current_tier_rank() >= 1);

drop policy if exists post_likes_insert on post_likes;
create policy post_likes_insert on post_likes
  for insert with check (user_id = auth.uid() and current_tier_rank() >= 1);

drop policy if exists post_likes_delete on post_likes;
create policy post_likes_delete on post_likes
  for delete using (user_id = auth.uid());
