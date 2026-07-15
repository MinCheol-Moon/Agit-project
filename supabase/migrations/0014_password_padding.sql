-- Supabase Auth enforces a minimum password length (commonly 6+), but this
-- app's "password" is only the last 4 digits of the member's phone number.
-- The client now pads it to `agit-<code>` before sending it to the Auth API
-- (see src/lib/session.ts) so a 4-digit code is always accepted. Mirror the
-- same padding here so activated/retrofitted accounts use the identical
-- real password, and re-hash every existing member's password to match so
-- nobody already signed up gets locked out by this change.

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
      encrypted_password = crypt('agit-' || code, gen_salt('bf')),
      is_anonymous = false,
      updated_at = now()
  where id = target_id;
end;
$$;

update auth.users au
set encrypted_password = crypt('agit-' || right(regexp_replace(u.phone, '\D', '', 'g'), 4), gen_salt('bf'))
from public.users u
where au.id = u.id;
