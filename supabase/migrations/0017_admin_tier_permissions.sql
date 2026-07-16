-- Run this AFTER 0016_add_admin_tier.sql has finished on its own.
--
-- Splits "top attendance tier" from "has admin powers": 아카츠키 (akatsuki)
-- is now just the highest ordinary member tier, with no special powers of
-- its own. Admin actions (tier changes, member approval, real-name lookup,
-- dues/receipt management, notices) now require the new 'admin' tier -
-- appointed by the master only - or the master account itself.

create or replace function tier_rank(t tier) returns int
language sql immutable as $$
  select case t
    when 'guest' then 0
    when 'raljab' then 1
    when 'talbuchak' then 2
    when 'taljuninja' then 3
    when 'akatsuki' then 4
    when 'admin' then 5
  end
$$;

-- Despite the name (kept as-is so every existing policy that already calls
-- it keeps working without being redefined), this now checks the 'admin'
-- tier - not 'akatsuki', which no longer carries admin powers on its own.
create or replace function is_akatsuki() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select tier = 'admin' or is_master from users where id = auth.uid()), false)
$$;

-- These were raw rank>=4 (akatsuki) checks; move them onto the same
-- is_akatsuki() helper so they consistently mean "admin or master" now.
alter policy dues_ledger_insert on dues_ledger with check (is_akatsuki());
alter policy dues_ledger_update on dues_ledger using (is_akatsuki());
alter policy dues_settings_update on dues_settings using (is_akatsuki());
alter policy dues_receipts_admin_write on storage.objects with check (bucket_id = 'dues-receipts' and is_akatsuki());
alter policy dues_receipts_admin_read on storage.objects using (bucket_id = 'dues-receipts' and is_akatsuki());

-- Schedules: the update policy already allowed the creator or an admin;
-- there was no delete policy at all until now.
create policy schedules_delete_own_or_admin on schedules for delete
  using (created_by = auth.uid() or is_akatsuki());

-- Give the current master account the 'admin' tier so every existing
-- rank-based check (client and server) recognizes them as an admin, instead
-- of relying on an is_master OR-clause everywhere.
update users set tier = 'admin' where is_master = true;
