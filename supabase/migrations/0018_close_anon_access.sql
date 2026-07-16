-- Close the gap where unauthenticated requests (the public anon key, with no
-- login at all) could read club data directly via the Supabase REST API,
-- bypassing the app's PIN screen and signup-approval flow entirely.
--
-- None of this affects real members: every active account is at least rank 1
-- (raljab) - 'guest'/rank 0 only ever exists on a still-pending signup, and
-- pending accounts can no longer hold a session at all (logIn/signUp sign
-- them back out immediately), so nothing legitimate was relying on rank-0 or
-- anonymous access here.

-- member_directory (nicknames/tiers/attendance) was readable with no login
-- at all.
revoke select on member_directory from anon;

-- schedules and notices had no tier check whatsoever.
alter policy schedules_select on schedules using (current_tier_rank() >= 1);
alter policy notices_select on notices using (current_tier_rank() >= 1);

-- The 'expense' branch had no tier check either, making expense entries
-- (and by extension confirming this table's existence/shape) publicly
-- readable with no login.
alter policy dues_ledger_select_expense on dues_ledger
  using ((type = 'expense' and current_tier_rank() >= 1) or current_tier_rank() >= 2);
