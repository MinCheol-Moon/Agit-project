-- Lets the client resolve "nickname or real name" -> the account's (synthetic)
-- auth email, so login can happen before any session exists. Security definer
-- so it can read auth.users; callable by anon since login precedes auth.
create or replace function resolve_login_email(identifier text) returns text
language sql security definer set search_path = public, auth as $$
  select au.email
  from users u
  join auth.users au on au.id = u.id
  where u.nickname = identifier or u.real_name = identifier
  limit 1
$$;

grant execute on function resolve_login_email(text) to anon, authenticated;
