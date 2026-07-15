-- Let the master account fully remove a member (not just mark them
-- "expelled") from 회원 관리. Deleting auth.users cascades to public.users
-- (existing FK), which needs to cascade/detach through everything that
-- references a member. Most child tables already cascade, but a few
-- historical/audit links were left as the default NO ACTION, which would
-- block the delete outright - detach those (SET NULL) instead of wiping out
-- the schedules/dues/vote history they belong to.

alter table schedules alter column created_by drop not null;
alter table schedules drop constraint schedules_created_by_fkey;
alter table schedules add constraint schedules_created_by_fkey
  foreign key (created_by) references users(id) on delete set null;

alter table votes drop constraint votes_created_by_fkey;
alter table votes add constraint votes_created_by_fkey
  foreign key (created_by) references users(id) on delete set null;

alter table dues_ledger drop constraint dues_ledger_member_id_fkey;
alter table dues_ledger add constraint dues_ledger_member_id_fkey
  foreign key (member_id) references users(id) on delete set null;

alter table notices alter column created_by drop not null;
alter table notices drop constraint notices_created_by_fkey;
alter table notices add constraint notices_created_by_fkey
  foreign key (created_by) references users(id) on delete set null;

alter table real_name_view_logs drop constraint real_name_view_logs_viewer_id_fkey;
alter table real_name_view_logs add constraint real_name_view_logs_viewer_id_fkey
  foreign key (viewer_id) references users(id) on delete cascade;

alter table real_name_view_logs drop constraint real_name_view_logs_viewed_user_id_fkey;
alter table real_name_view_logs add constraint real_name_view_logs_viewed_user_id_fkey
  foreign key (viewed_user_id) references users(id) on delete cascade;

create or replace function delete_member(target_id uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
declare
  caller_is_master boolean;
begin
  select is_master into caller_is_master from users where id = auth.uid();
  if not coalesce(caller_is_master, false) then
    raise exception 'Only the master account can delete members';
  end if;
  if target_id = auth.uid() then
    raise exception 'Cannot delete your own account';
  end if;

  delete from auth.users where id = target_id;
end;
$$;

grant execute on function delete_member(uuid) to authenticated;
