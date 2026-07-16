import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { signInWithIdentifier, signOut, signUpAccount } from '../lib/session';
import { clearSavedLogin } from '../lib/savedLogin';
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
    // Correct credentials alone aren't enough to get into the app - only an
    // approved (active) member is let past the login screen. Sign back out
    // immediately so a pending/expelled account never ends up with a live
    // session, rather than relying on a post-login gate to hide the app.
    const user = await getCurrentUser();
    if (!user || user.status !== 'active') {
      await signOut();
      if (user?.status === 'pending') throw new Error('아직 마스터 승인 대기 중이에요. 승인 후 다시 로그인해주세요.');
      if (user?.status === 'expelled') throw new Error('탈퇴 처리된 계정이에요.');
      throw new Error('로그인할 수 없는 계정이에요.');
    }
    return;
  }
  // Mock mode has a single always-logged-in user; nothing to do.
}

export async function logOut(): Promise<void> {
  // Explicit logout also forgets the biometric quick-login credentials; the
  // 15-minute auto-logout (RootNavigator) intentionally keeps them so the
  // member can get back in with Face ID / fingerprint.
  await clearSavedLogin();
  await signOut();
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

// Uploads to a fixed per-user path (avatars/{uid}/avatar.jpg, upsert) so a
// re-upload replaces the old photo; a cache-busting query param makes the
// new image show up immediately despite the stable URL.
export async function updateAvatar(fileUri: string): Promise<string> {
  if (isSupabaseConfigured && supabase) {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('로그인이 필요합니다.');
    const path = `${userId}/avatar.jpg`;
    const response = await fetch(fileUri);
    const blob = await response.blob();
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    const url = `${data.publicUrl}?v=${Date.now()}`;
    const { error } = await supabase.from('users').update({ avatar_url: url }).eq('id', userId);
    if (error) throw error;
    return url;
  }
  const user = mockUsers.find((u) => u.id === CURRENT_USER_ID);
  if (user) user.avatarUrl = fileUri;
  return fileUri;
}

export async function removeAvatar(): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('로그인이 필요합니다.');
    await supabase.storage.from('avatars').remove([`${userId}/avatar.jpg`]);
    const { error } = await supabase.from('users').update({ avatar_url: null }).eq('id', userId);
    if (error) throw error;
    return;
  }
  const user = mockUsers.find((u) => u.id === CURRENT_USER_ID);
  if (user) user.avatarUrl = null;
}

export async function updateNotifyChat(value: boolean): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('로그인이 필요합니다.');
    const { error } = await supabase.from('users').update({ notify_chat: value }).eq('id', userId);
    if (error) throw error;
    return;
  }
  const user = mockUsers.find((u) => u.id === CURRENT_USER_ID);
  if (user) user.notifyChat = value;
}

export async function deleteMember(userId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.rpc('delete_member', { target_id: userId });
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
    // signUpAccount() leaves the new account signed in; sign back out so a
    // pending (not yet approved) account never gets a live session - same
    // "only an approved member gets in" rule as logIn().
    await signOut();
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
