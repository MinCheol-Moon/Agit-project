-- Open community post comments to all members (were taljuninja+ only) and
-- add a delete policy so an author (or admin/master) can remove a comment.
drop policy if exists comments_select on comments;
create policy comments_select on comments
  for select using (current_tier_rank() >= 1);

drop policy if exists comments_insert on comments;
create policy comments_insert on comments
  for insert with check (user_id = auth.uid() and current_tier_rank() >= 1);

drop policy if exists comments_delete on comments;
create policy comments_delete on comments
  for delete using (user_id = auth.uid() or is_akatsuki() or current_tier_rank() >= 5);
