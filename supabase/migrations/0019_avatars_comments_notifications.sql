-- Profile photos, schedule comments (with replies), and chat push
-- notifications with a per-member on/off setting.

-- 1) Profile photo URL + chat-notification preference on the member row.
alter table users add column avatar_url text;
alter table users add column notify_chat boolean not null default true;

-- member_directory needs to expose avatar_url (nicknames next to photos in
-- chat/attendee lists). Recreated with an explicit column list - still no
-- real_name/phone/pin_hash/expo_push_token.
drop view member_directory;
create view member_directory as
  select id, nickname, crews, tier, is_master, status, avatar_url, monthly_attendance, total_attendance, created_at
  from users;
grant select on member_directory to authenticated;

-- 2) Public avatars bucket; each member may only write inside their own
-- {uid}/ folder. Public read is what makes plain public URLs work in <Image>.
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;

create policy avatars_read on storage.objects for select
  using (bucket_id = 'avatars');
create policy avatars_write_own on storage.objects for insert
  with check (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text);
create policy avatars_update_own on storage.objects for update
  using (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text);
create policy avatars_delete_own on storage.objects for delete
  using (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text);

-- 3) Comments (and one level of replies) on a schedule, KakaoTalk-style.
create table schedule_comments (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references schedules(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  parent_id uuid references schedule_comments(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index on schedule_comments (schedule_id, created_at);

alter table schedule_comments enable row level security;

create policy schedule_comments_select on schedule_comments for select
  using (current_tier_rank() >= 1);
create policy schedule_comments_insert on schedule_comments for insert
  with check (user_id = auth.uid() and current_tier_rank() >= 1);
create policy schedule_comments_delete on schedule_comments for delete
  using (user_id = auth.uid() or is_akatsuki());

-- 4) Chat push notifications, straight from Postgres to Expo's push API via
-- pg_net - no edge function to deploy. Failures are swallowed so a push
-- hiccup can never block the chat message itself.
create extension if not exists pg_net;

create or replace function notify_new_chat_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  sender_name text;
  payload jsonb;
begin
  if new.user_id is null then
    return new; -- system messages (dues reminder) skip push
  end if;

  select nickname into sender_name from users where id = new.user_id;

  select jsonb_agg(jsonb_build_object(
    'to', u.expo_push_token,
    'title', coalesce(sender_name, '회원'),
    'body', left(new.body, 100),
    'sound', 'default'
  ))
  into payload
  from users u
  where u.expo_push_token is not null
    and u.notify_chat
    and u.status = 'active'
    and u.id <> new.user_id
    and tier_rank(u.tier) >= 2;

  if payload is not null then
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := payload
    );
  end if;

  return new;
exception when others then
  return new;
end;
$$;

create trigger messages_push_notify
  after insert on messages
  for each row execute function notify_new_chat_message();

create or replace function notify_new_direct_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  sender_name text;
  recipient_token text;
begin
  select nickname into sender_name from users where id = new.sender_id;
  select expo_push_token into recipient_token
  from users
  where id = new.recipient_id and expo_push_token is not null and notify_chat and status = 'active';

  if recipient_token is not null then
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'to', recipient_token,
        'title', coalesce(sender_name, '회원'),
        'body', left(new.body, 100),
        'sound', 'default'
      )
    );
  end if;

  return new;
exception when others then
  return new;
end;
$$;

create trigger direct_messages_push_notify
  after insert on direct_messages
  for each row execute function notify_new_direct_message();
