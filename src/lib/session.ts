import { isSupabaseConfigured, supabase } from './supabase';

// Supabase Auth needs an email; members log in with nickname or real name
// instead (no email is collected), so every account gets a random,
// unconfirmable email under a fixed fake domain and the actual identifier
// lookup happens through the resolve_login_email() RPC (see migration 0008).
// The "password" is always the last 4 digits of the phone number collected
// at signup — nothing extra to set or remember, entered on a shuffled keypad.
// Requires "Confirm email" to be OFF in Supabase Auth settings.
function randomFakeEmail(): string {
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `u${id}@agit.local`;
}

export function phoneLoginCode(phone: string): string {
  return phone.replace(/\D/g, '').slice(-4);
}

// Supabase Auth rejects passwords under its configured minimum length
// (commonly 6+), but our "password" is only a 4-digit phone suffix. Pad it
// with a fixed prefix before it ever reaches the Auth API so it's always
// accepted, regardless of that project setting. Used consistently for
// signup, sign-in, and the activate_phone_login RPC (migration 0014) so a
// given phone code always maps to the same real password.
function authPassword(code: string): string {
  return `agit-${code}`;
}

// Creates a brand-new auth account and returns its id, to be used as the new
// `users` row's id. Used only for first-time signup.
export async function signUpAccount(phone: string): Promise<string> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.auth.signUp({
    email: randomFakeEmail(),
    password: authPassword(phoneLoginCode(phone)),
  });
  if (error) throw error;
  if (!data.user) throw new Error('가입에 실패했습니다. 다시 시도해주세요.');
  return data.user.id;
}

export async function signInWithIdentifier(identifier: string, code: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase is not configured');
  const { data: email, error } = await supabase.rpc('resolve_login_email', { identifier: identifier.trim() });
  if (error) throw error;
  if (!email) throw new Error('일치하는 계정을 찾을 수 없습니다.');
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: authPassword(code) });
  if (signInError) throw new Error('전화번호 뒷 4자리가 올바르지 않습니다.');
}

// Retrofits accounts created before this login flow existed (e.g. via the
// old silent-anonymous flow) so they can log in from other devices too.
// Goes through the activate_phone_login() RPC (migration 0010) rather than
// auth.updateUser({ email, password }) directly — that call bundles an email
// change with the password change, and the email side can get stuck pending
// confirmation indefinitely for a fake @agit.local address, leaving the
// password in an unknown state. The RPC applies both in one transaction.
export async function activateLoginForCurrentAccount(phone: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase is not configured');
  const { error } = await supabase.rpc('activate_phone_login', { new_phone: phone });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  await supabase.auth.signOut();
}

export async function hasSession(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}

// The authenticated user's id, i.e. the value auth.uid() resolves to in RLS
// policies. Callers must already be inside an `isSupabaseConfigured && supabase`
// branch — this throws otherwise, since there is no auth id in mock mode.
export async function getAuthUserId(): Promise<string> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase is not configured');
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('로그인이 필요합니다.');
  return data.user.id;
}
