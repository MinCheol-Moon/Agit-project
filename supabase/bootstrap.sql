-- One-shot copy/paste version of supabase/migrations/0001-0006 for people without the
-- Supabase CLI installed: Dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
-- If you do have the CLI, use `supabase db push` against the numbered files instead; don't run both.
-- Core schema for 아지트 (Agit) app
create extension if not exists "pgcrypto";

create type tier as enum ('guest', 'raljab', 'talbuchak', 'taljuninja', 'akatsuki');
create type user_status as enum ('pending', 'active', 'expelled');
create type crew as enum ('game', 'tea', 'fishing', 'hiking');
create type rsvp_status as enum ('yes', 'no');
create type ledger_type as enum ('income', 'expense');

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  real_name text not null,
  nickname text not null unique,
  phone text not null,
  referrer text,
  intro text,
  crews crew[] not null default '{}',
  tier tier not null default 'guest',
  is_master boolean not null default false,
  status user_status not null default 'pending',
  pin_hash text,
  expo_push_token text,
  monthly_attendance int not null default 0,
  total_attendance int not null default 0,
  consecutive_absent_months int not null default 0,
  created_at timestamptz not null default now()
);

create table schedules (
  id uuid primary key default gen_random_uuid(),
  crew crew not null,
  title text not null,
  start_at timestamptz not null,
  place text not null,
  capacity int not null default 10,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now()
);

create table rsvps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  schedule_id uuid not null references schedules(id) on delete cascade,
  status rsvp_status not null,
  created_at timestamptz not null default now(),
  unique (user_id, schedule_id)
);

create table attendances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  schedule_id uuid not null references schedules(id) on delete cascade,
  checked_at timestamptz not null default now()
);

create table dues_ledger (
  id uuid primary key default gen_random_uuid(),
  type ledger_type not null,
  amount numeric not null,
  memo text not null default '',
  member_id uuid references users(id),
  auto_recognized boolean not null default false,
  receipt_url text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table dues_settings (
  id int primary key default 1,
  monthly_fee numeric not null default 30000,
  deposit_day int not null default 5,
  notify_on boolean not null default true,
  constraint single_row check (id = 1)
);
insert into dues_settings (id) values (1) on conflict do nothing;

create table posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  crew crew,
  title text not null,
  body text not null,
  image_url text,
  created_at timestamptz not null default now()
);

create table post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table chat_rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  crew crew,
  min_tier tier not null default 'talbuchak',
  created_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references chat_rooms(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table votes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  deadline timestamptz not null,
  scope text not null default '전체',
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

create table vote_options (
  id uuid primary key default gen_random_uuid(),
  vote_id uuid not null references votes(id) on delete cascade,
  label text not null
);

create table vote_responses (
  id uuid primary key default gen_random_uuid(),
  vote_id uuid not null references votes(id) on delete cascade,
  option_id uuid not null references vote_options(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (vote_id, user_id)
);

create table tier_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  from_tier tier not null,
  to_tier tier not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table real_name_view_logs (
  id uuid primary key default gen_random_uuid(),
  viewer_id uuid not null references users(id),
  viewed_user_id uuid not null references users(id),
  viewed_at timestamptz not null default now()
);

create table attendance_month (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  year_month text not null,
  count int not null default 0,
  unique (user_id, year_month)
);

create index on rsvps (schedule_id);
create index on attendances (schedule_id, checked_at);
create index on messages (room_id, created_at);
create index on dues_ledger (occurred_at desc);
create index on posts (created_at desc);
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
-- Monthly promotion/demotion batch (spec section 5): runs at 00:05 on the 1st of each month.
create extension if not exists pg_cron;

create or replace function run_monthly_tier_batch() returns void
language plpgsql security definer set search_path = public as $$
declare
  prev_month text := to_char(now() - interval '1 month', 'YYYY-MM');
  member record;
  next_tier tier;
  tier_order tier[] := array['guest', 'raljab', 'talbuchak', 'taljuninja', 'akatsuki'];
  current_idx int;
begin
  for member in
    select u.*, coalesce(am.count, 0) as prev_attendance
    from users u
    left join attendance_month am on am.user_id = u.id and am.year_month = prev_month
    where u.status = 'active'
  loop
    current_idx := array_position(tier_order, member.tier);

    if member.prev_attendance >= 4 and member.tier <> 'akatsuki' then
      next_tier := tier_order[least(current_idx + 1, 4)];
      if next_tier <> member.tier then
        update users set tier = next_tier, consecutive_absent_months = 0 where id = member.id;
        insert into tier_logs (user_id, from_tier, to_tier, reason) values (member.id, member.tier, next_tier, '월 4회 이상 출석');
      end if;

    elsif member.prev_attendance = 0 then
      update users set consecutive_absent_months = member.consecutive_absent_months + 1 where id = member.id;

      if member.consecutive_absent_months + 1 >= 3 then
        update users set status = 'expelled' where id = member.id;
        insert into tier_logs (user_id, from_tier, to_tier, reason) values (member.id, member.tier, member.tier, '3개월 연속 미참석 - 탈퇴');
      elsif member.tier <> 'raljab' and member.tier <> 'guest' then
        next_tier := tier_order[greatest(current_idx - 1, 1)];
        update users set tier = next_tier where id = member.id;
        insert into tier_logs (user_id, from_tier, to_tier, reason) values (member.id, member.tier, next_tier, '월 미참석 - 강등');
      end if;
    else
      update users set consecutive_absent_months = 0 where id = member.id;
    end if;
  end loop;
end;
$$;

select cron.schedule('agit-monthly-tier-batch', '5 0 1 * *', $$select run_monthly_tier_batch()$$);

-- Keeps attendance_month current so the batch above (and the app's monthly progress bar) stay accurate.
create or replace function record_attendance_month() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into attendance_month (user_id, year_month, count)
  values (new.user_id, to_char(new.checked_at, 'YYYY-MM'), 1)
  on conflict (user_id, year_month) do update set count = attendance_month.count + 1;

  update users
  set monthly_attendance = (
        select count from attendance_month
        where user_id = new.user_id and year_month = to_char(now(), 'YYYY-MM')
      ),
      total_attendance = total_attendance + 1
  where id = new.user_id;

  return new;
end;
$$;

create trigger attendances_after_insert
  after insert on attendances
  for each row execute function record_attendance_month();
-- Deposit-day and schedule/approval/tier-change push notifications (spec section 10).
create extension if not exists pg_net;

-- Re-schedules itself daily; fires the edge function only when today matches dues_settings.deposit_day.
create or replace function trigger_deposit_reminder() returns void
language plpgsql security definer set search_path = public as $$
declare
  settings dues_settings;
begin
  select * into settings from dues_settings where id = 1;
  if settings.notify_on and extract(day from now()) = settings.deposit_day then
    perform net.http_post(
      url := current_setting('app.settings.edge_function_url') || '/send-push',
      headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'), 'Content-Type', 'application/json'),
      body := jsonb_build_object('type', 'deposit_reminder', 'amount', settings.monthly_fee)
    );
  end if;
end;
$$;

select cron.schedule('agit-daily-deposit-check', '0 9 * * *', $$select trigger_deposit_reminder()$$);

comment on function trigger_deposit_reminder is
  'Requires app.settings.edge_function_url and app.settings.service_role_key to be set via ALTER DATABASE ... SET, see README for setup.';
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
insert into chat_rooms (name, crew, min_tier) values
  ('전체방', null, 'talbuchak'),
  ('게임 크루', 'game', 'talbuchak'),
  ('차 크루', 'tea', 'talbuchak'),
  ('낚시 크루', 'fishing', 'talbuchak'),
  ('등산 크루', 'hiking', 'talbuchak')
on conflict do nothing;

-- 1:1 direct messages between members (rank >= talbuchak, same as group chat).
create table direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references users(id) on delete cascade,
  recipient_id uuid not null references users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint dm_not_self check (sender_id <> recipient_id)
);

create index on direct_messages (sender_id, recipient_id, created_at);
create index on direct_messages (recipient_id, sender_id, created_at);

alter table direct_messages enable row level security;

create policy direct_messages_select on direct_messages for select
  using ((sender_id = auth.uid() or recipient_id = auth.uid()) and current_tier_rank() >= 2);

create policy direct_messages_insert on direct_messages for insert
  with check (sender_id = auth.uid() and current_tier_rank() >= 2);

-- Postgres Changes only delivers realtime events for tables added to this
-- publication; guarded so re-running this file doesn't error if already added.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'direct_messages'
  ) then
    alter publication supabase_realtime add table direct_messages;
  end if;
end $$;

-- Lets the client resolve "nickname or real name" -> the account's (synthetic)
-- auth email, so login can happen before any session exists. Security definer
-- so it can read auth.users; callable by anon since login precedes auth.
create or replace function resolve_login_email(identifier text) returns text
language sql security definer set search_path = public, auth as $$
  select au.email
  from users u
  join auth.users au on au.id = u.id
  where trim(u.nickname) = trim(identifier) or trim(u.real_name) = trim(identifier)
  limit 1
$$;

grant execute on function resolve_login_email(text) to anon, authenticated;

-- Retrofits phone-code login onto accounts created before this login flow
-- existed (e.g. old anonymous-flow accounts). Does the email+password update
-- directly in one transaction rather than through auth.updateUser(), which
-- can leave the email side stuck pending confirmation for a fake address.
create or replace function activate_phone_login(new_phone text) returns void
language plpgsql security definer set search_path = public, auth as $$
declare
  target_id uuid := auth.uid();
  code text := right(regexp_replace(new_phone, '\D', '', 'g'), 4);
  fake_email text := 'u' || replace(gen_random_uuid()::text, '-', '') || '@agit.local';
begin
  if target_id is null then
    raise exception 'Not authenticated';
  end if;

  update auth.users
  set email = fake_email,
      email_confirmed_at = now(),
      email_change = '',
      email_change_token_new = '',
      email_change_confirm_status = 0,
      encrypted_password = crypt(code, gen_salt('bf')),
      is_anonymous = false,
      updated_at = now()
  where id = target_id;
end;
$$;

grant execute on function activate_phone_login(text) to authenticated;

-- ---------------------------------------------------------------------------
-- MANUAL, ONE-TIME: run this separately AFTER you've opened the app once and
-- submitted the signup form yourself (that creates your `pending` row). It
-- promotes you to the master admin so you can approve everyone else.
-- update users set is_master = true, tier = 'akatsuki', status = 'active'
--   where nickname = '여기에_본인_닉네임';
-- ---------------------------------------------------------------------------

