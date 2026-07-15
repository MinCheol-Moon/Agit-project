-- 1) Community posts: author or akatsuki can edit/delete their own post.
create policy posts_update_own_or_admin on posts for update
  using (user_id = auth.uid() or is_akatsuki());

create policy posts_delete_own_or_admin on posts for delete
  using (user_id = auth.uid() or is_akatsuki());

-- 2) Home notices ("공지글"): visible to everyone, written/deleted by akatsuki only.
create table notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now()
);

alter table notices enable row level security;

create policy notices_select on notices for select using (true);
create policy notices_insert on notices for insert with check (is_akatsuki());
create policy notices_update on notices for update using (is_akatsuki());
create policy notices_delete on notices for delete using (is_akatsuki());

-- 3) Dues: let any member (rank >= talbuchak) upload proof of their OWN
-- payment, tagged to their own member_id — no OCR name-matching needed since
-- the uploader IS the payer. Admin-only bulk upload (uploadReceipt
-- permission, rank >= akatsuki) still covers processing everyone else's
-- payments from a shared bank screenshot.
create policy dues_ledger_insert_self on dues_ledger for insert
  with check (current_tier_rank() >= 2 and type = 'income' and member_id = auth.uid());

create policy dues_receipts_self_write on storage.objects for insert
  with check (bucket_id = 'dues-receipts' and current_tier_rank() >= 2);

-- 4) Attendance: at most one check-in per member per calendar day (KST).
create unique index attendances_one_per_day
  on attendances (user_id, ((checked_at at time zone 'Asia/Seoul')::date));

-- 5) Allow system-authored chat messages (e.g. the monthly dues reminder)
-- with no member behind them.
alter table messages alter column user_id drop not null;
