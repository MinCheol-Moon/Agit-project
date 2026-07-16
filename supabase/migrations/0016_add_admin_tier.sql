-- Add the new 'admin' tier, sitting above 'akatsuki'.
--
-- IMPORTANT: run this file ALONE, by itself, and let it finish before running
-- 0017_admin_tier_permissions.sql. Postgres cannot safely use a brand-new
-- enum value inside the same transaction that adds it, and the Supabase SQL
-- Editor runs a pasted script as a single transaction - splitting it into two
-- files/two separate "Run" clicks is what makes this safe.
alter type tier add value 'admin';
