-- Trim both sides so a stray leading/trailing space (e.g. from copy-pasting
-- the identifier) doesn't break the exact-match lookup in resolve_login_email.
create or replace function resolve_login_email(identifier text) returns text
language sql security definer set search_path = public, auth as $$
  select au.email
  from users u
  join auth.users au on au.id = u.id
  where trim(u.nickname) = trim(identifier) or trim(u.real_name) = trim(identifier)
  limit 1
$$;

grant execute on function resolve_login_email(text) to anon, authenticated;
