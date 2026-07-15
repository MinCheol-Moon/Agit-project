import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { activateLoginForCurrentAccount, signInWithIdentifier, signOut, signUpAccount } from '../lib/session';
import { camelizeDeep } from '../lib/caseMap';
import { AppUser } from '../types';
import { CURRENT_USER_ID, mockUsers } from './mockStore';

// Returns null when nobody is logged in on this device (never signed up, or
// signed out) — see screens/auth/{SignupScreen,LoginScreen}.
export async function getCurrentUser(): Promise<AppUser | null> {
  if (isSupabaseConfigured && supabase) {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', auth.user.id)
      .maybeSingle();
    if (error) throw error;
    return data ? camelizeDeep<AppUser>(data) : null;
  }
  return mockUsers.find((u) => u.id === CURRENT_USER_ID) ?? null;
}

export async function logIn(identifier: string, code: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    await signInWithIdentifier(identifier, code);
    return;
  }
  // Mock mode has a single always-logged-in user; nothing to do.
}

export async function logOut(): Promise<void> {
  await signOut();
}

// One-time retrofit for accounts created before phone-code login existed.
export async function activateMultiDeviceLogin(phone: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    await activateLoginForCurrentAccount(phone);
  }
}

export async function listMembers(): Promise<AppUser[]> {
  if (isSupabaseConfigured && supabase) {
    // member_directory excludes real_name/phone; only akatsuki can see those via getRealName().
    const { data, error } = await supabase.from('member_directory').select('*').eq('status', 'active');
    if (error) throw error;
    return camelizeDeep<AppUser[]>(data ?? []);
  }
  return mockUsers.filter((u) => u.status === 'active');
}

export async function getRealName(userId: string): Promise<string> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('users').select('real_name').eq('id', userId).single();
    if (error) throw error;
    await supabase.from('real_name_view_logs').insert({ viewer_id: (await supabase.auth.getUser()).data.user?.id, viewed_user_id: userId });
    return data.real_name as string;
  }
  return mockUsers.find((u) => u.id === userId)?.realName ?? '';
}

export async function listPendingMembers(): Promise<AppUser[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('users').select('*').eq('status', 'pending');
    if (error) throw error;
    return camelizeDeep<AppUser[]>(data ?? []);
  }
  return mockUsers.filter((u) => u.status === 'pending');
}

export async function approveMember(userId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('users').update({ status: 'active', tier: 'raljab' }).eq('id', userId);
    if (error) throw error;
    return;
  }
  const user = mockUsers.find((u) => u.id === userId);
  if (user) {
    user.status = 'active';
    user.tier = 'raljab';
  }
}

export async function rejectMember(userId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('users').update({ status: 'expelled' }).eq('id', userId);
    if (error) throw error;
    return;
  }
  const idx = mockUsers.findIndex((u) => u.id === userId);
  if (idx >= 0) mockUsers.splice(idx, 1);
}

export async function setMemberTier(userId: string, tier: AppUser['tier']): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('users').update({ tier }).eq('id', userId);
    if (error) throw error;
    return;
  }
  const user = mockUsers.find((u) => u.id === userId);
  if (user) user.tier = tier;
}

export async function signUp(input: {
  realName: string;
  nickname: string;
  phone: string;
  referrer?: string;
  intro?: string;
}): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const userId = await signUpAccount(input.phone);
    const { error } = await supabase.from('users').insert({
      id: userId,
      real_name: input.realName,
      nickname: input.nickname,
      phone: input.phone,
      referrer: input.referrer,
      intro: input.intro,
      crews: [],
      tier: 'guest',
      status: 'pending',
    });
    if (error) throw error;
    return;
  }
  mockUsers.push({
    id: `u-${Date.now()}`,
    realName: input.realName,
    nickname: input.nickname,
    phone: input.phone,
    referrer: input.referrer,
    intro: input.intro,
    crews: [],
    tier: 'guest',
    isMaster: false,
    status: 'pending',
    monthlyAttendance: 0,
    totalAttendance: 0,
    createdAt: new Date().toISOString(),
  });
}
