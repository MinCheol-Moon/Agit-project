import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { getAuthUserId } from '../lib/session';
import { camelizeDeep } from '../lib/caseMap';
import { Notice } from '../types';
import { CURRENT_USER_ID, mockNotices } from './mockStore';

export async function listNotices(): Promise<Notice[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('notices').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return camelizeDeep<Notice[]>(data ?? []);
  }
  return [...mockNotices].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createNotice(input: { title: string; body: string }): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('notices').insert({
      title: input.title,
      body: input.body,
      created_by: await getAuthUserId(),
    });
    if (error) throw error;
    return;
  }
  mockNotices.unshift({
    id: `n-${Date.now()}`,
    title: input.title,
    body: input.body,
    createdBy: CURRENT_USER_ID,
    createdAt: new Date().toISOString(),
  });
}

export async function deleteNotice(noticeId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('notices').delete().eq('id', noticeId);
    if (error) throw error;
    return;
  }
  const idx = mockNotices.findIndex((n) => n.id === noticeId);
  if (idx >= 0) mockNotices.splice(idx, 1);
}
