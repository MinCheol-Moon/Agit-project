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
-- publication; `messages` was missing this from the original migration too.
-- Guarded so re-running this file doesn't error if a table's already in it.
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
