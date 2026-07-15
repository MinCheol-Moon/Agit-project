-- Replaces the client-side auth.updateUser({ email, password }) call used to
-- retrofit phone-code login onto pre-existing (e.g. old anonymous-flow)
-- accounts. That call bundles an email change with the password change, and
-- the email side can get stuck pending confirmation indefinitely for a fake
-- @agit.local address — leaving the account's real password in an unknown
-- state. This does the same update directly in one transaction, the same way
-- it was fixed manually, restricted to the caller's own row.
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
      encrypted_password = crypt(code, gen_salt('bf')),
      is_anonymous = false,
      updated_at = now()
  where id = target_id;
end;
$$;

grant execute on function activate_phone_login(text) to authenticated;
