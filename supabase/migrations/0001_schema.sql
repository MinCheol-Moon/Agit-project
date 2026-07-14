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
