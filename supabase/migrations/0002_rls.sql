-- Row Level Security: enforce the tier permission matrix server-side.
create or replace function tier_rank(t tier) returns int
language sql immutable as $$
  select case t
    when 'guest' then 0
    when 'raljab' then 1
    when 'talbuchak' then 2
    when 'taljuninja' then 3
    when 'akatsuki' then 4
  end
$$;

create or replace function current_user_row() returns users
language sql stable security definer set search_path = public as $$
  select * from users where id = auth.uid()
$$;

create or replace function current_tier_rank() returns int
language sql stable security definer set search_path = public as $$
  select coalesce(tier_rank((select tier from users where id = auth.uid())), 0)
$$;

create or replace function is_akatsuki() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select tier = 'akatsuki' or is_master from users where id = auth.uid()), false)
$$;

alter table users enable row level security;
alter table schedules enable row level security;
alter table rsvps enable row level security;
alter table attendances enable row level security;
alter table dues_ledger enable row level security;
alter table dues_settings enable row level security;
alter table posts enable row level security;
alter table post_likes enable row level security;
alter table comments enable row level security;
alter table chat_rooms enable row level security;
alter table messages enable row level security;
alter table votes enable row level security;
alter table vote_options enable row level security;
alter table vote_responses enable row level security;
alter table tier_logs enable row level security;
alter table real_name_view_logs enable row level security;
alter table attendance_month enable row level security;

-- users: base table only selectable by self or akatsuki (real_name/phone live here).
-- Everyone else reads the member_directory view below, which excludes real_name/phone/pin_hash.
create policy users_select_self_or_admin on users for select using (id = auth.uid() or is_akatsuki());
create policy users_insert_self on users for insert with check (id = auth.uid());
create policy users_update_self on users for update using (id = auth.uid()) with check (id = auth.uid());
create policy users_admin_update on users for update using (is_akatsuki());

-- Runs with the migration role's privileges (table owner), so it is not subject to the
-- restrictive base-table RLS above; this is what makes it safe to expose to all members.
create view member_directory as
  select id, nickname, crews, tier, is_master, status, monthly_attendance, total_attendance, created_at
  from users;

grant select on member_directory to authenticated, anon;

-- schedules: view >= 0 (guest), create >= 3 (taljuninja)
create policy schedules_select on schedules for select using (true);
create policy schedules_insert on schedules for insert with check (current_tier_rank() >= 3);
create policy schedules_update_own on schedules for update using (created_by = auth.uid() or is_akatsuki());

-- rsvps: view own / all, write requires rank >= 1 (raljab)
create policy rsvps_select on rsvps for select using (current_tier_rank() >= 1);
create policy rsvps_upsert on rsvps for insert with check (user_id = auth.uid() and current_tier_rank() >= 1);
create policy rsvps_update on rsvps for update using (user_id = auth.uid() and current_tier_rank() >= 1);

-- attendances: check-in requires rank >= 1
create policy attendances_select on attendances for select using (current_tier_rank() >= 1);
create policy attendances_insert on attendances for insert with check (user_id = auth.uid() and current_tier_rank() >= 1);

-- dues_ledger: expenses visible to all, income/balance detail requires rank >= 2, write requires rank >= 4
create policy dues_ledger_select_expense on dues_ledger for select using (type = 'expense' or current_tier_rank() >= 2);
create policy dues_ledger_insert on dues_ledger for insert with check (current_tier_rank() >= 4);
create policy dues_ledger_update on dues_ledger for update using (current_tier_rank() >= 4);

-- dues_settings: read requires rank >= 2 (balance context), write requires rank >= 4
create policy dues_settings_select on dues_settings for select using (current_tier_rank() >= 2);
create policy dues_settings_update on dues_settings for update using (current_tier_rank() >= 4);

-- posts/comments/likes: community requires rank >= 3
create policy posts_select on posts for select using (current_tier_rank() >= 3);
create policy posts_insert on posts for insert with check (user_id = auth.uid() and current_tier_rank() >= 3);
create policy post_likes_select on post_likes for select using (current_tier_rank() >= 3);
create policy post_likes_insert on post_likes for insert with check (user_id = auth.uid() and current_tier_rank() >= 3);
create policy comments_select on comments for select using (current_tier_rank() >= 3);
create policy comments_insert on comments for insert with check (user_id = auth.uid() and current_tier_rank() >= 3);

-- chat: requires rank >= 2
create policy chat_rooms_select on chat_rooms for select using (current_tier_rank() >= 2);
create policy messages_select on messages for select using (current_tier_rank() >= 2);
create policy messages_insert on messages for insert with check (user_id = auth.uid() and current_tier_rank() >= 2);

-- votes: view/respond requires rank >= 3
create policy votes_select on votes for select using (current_tier_rank() >= 3);
create policy vote_options_select on vote_options for select using (current_tier_rank() >= 3);
create policy vote_responses_select on vote_responses for select using (current_tier_rank() >= 3);
create policy votes_insert on votes for insert with check (current_tier_rank() >= 3);
create policy vote_options_insert on vote_options for insert with check (current_tier_rank() >= 3);
create policy vote_responses_insert on vote_responses for insert with check (user_id = auth.uid() and current_tier_rank() >= 3);

-- tier_logs / real_name_view_logs: akatsuki only
create policy tier_logs_select on tier_logs for select using (user_id = auth.uid() or is_akatsuki());
create policy real_name_logs_select on real_name_view_logs for select using (is_akatsuki());
create policy real_name_logs_insert on real_name_view_logs for insert with check (viewer_id = auth.uid() and is_akatsuki());

-- attendance_month: self or admin
create policy attendance_month_select on attendance_month for select using (user_id = auth.uid() or current_tier_rank() >= 3);
