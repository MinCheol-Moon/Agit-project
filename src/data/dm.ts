import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { getAuthUserId } from '../lib/session';
import { camelizeDeep } from '../lib/caseMap';
import { DirectMessage } from '../types';
import { CURRENT_USER_ID, mockDirectMessages } from './mockStore';

export async function listDirectMessages(otherUserId: string): Promise<DirectMessage[]> {
  if (isSupabaseConfigured && supabase) {
    const me = await getAuthUserId();
    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`and(sender_id.eq.${me},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${me})`)
      .order('created_at');
    if (error) throw error;
    return camelizeDeep<DirectMessage[]>(data ?? []);
  }
  return mockDirectMessages
    .filter(
      (m) =>
        (m.senderId === CURRENT_USER_ID && m.recipientId === otherUserId) ||
        (m.senderId === otherUserId && m.recipientId === CURRENT_USER_ID),
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function sendDirectMessage(recipientId: string, body: string): Promise<DirectMessage> {
  if (isSupabaseConfigured && supabase) {
    const senderId = await getAuthUserId();
    const { data, error } = await supabase
      .from('direct_messages')
      .insert({ sender_id: senderId, recipient_id: recipientId, body })
      .select()
      .single();
    if (error) throw error;
    return camelizeDeep<DirectMessage>(data);
  }
  const message: DirectMessage = {
    id: `d-${Date.now()}`,
    senderId: CURRENT_USER_ID,
    recipientId,
    body,
    createdAt: new Date().toISOString(),
  };
  mockDirectMessages.push(message);
  return message;
}

export async function deleteDirectMessage(messageId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('direct_messages').delete().eq('id', messageId).select('id');
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('삭제 권한이 없거나 서버 설정(마이그레이션)이 아직 반영되지 않았어요.');
    return;
  }
  const idx = mockDirectMessages.findIndex((m) => m.id === messageId);
  if (idx >= 0) mockDirectMessages.splice(idx, 1);
}

// Every DM insert/delete this user is party to matches RLS regardless of sender/recipient,
// so an unfiltered subscription plus a client-side check covers both directions.
export function subscribeToDirectMessages(
  otherUserId: string,
  myUserId: string,
  onInsert: (message: DirectMessage) => void,
  onDelete?: (messageId: string) => void,
) {
  const client = supabase;
  if (isSupabaseConfigured && client) {
    const isThisConversation = (m: DirectMessage) =>
      (m.senderId === myUserId && m.recipientId === otherUserId) || (m.senderId === otherUserId && m.recipientId === myUserId);
    const channel = client
      .channel(`dm-${[myUserId, otherUserId].sort().join('-')}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (payload) => {
        const message = camelizeDeep<DirectMessage>(payload.new);
        if (isThisConversation(message)) onInsert(message);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'direct_messages' }, (payload) => {
        onDelete?.(payload.old.id as string);
      })
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }
  return () => {};
}

// Records that I've read the conversation with `otherUserId` up to now.
export async function markDmRead(otherUserId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const me = await getAuthUserId();
    await supabase
      .from('dm_reads')
      .upsert({ reader_id: me, peer_id: otherUserId, last_read_at: new Date().toISOString() }, { onConflict: 'reader_id,peer_id' });
    return;
  }
}

// When the other person last read messages from me - so I can mark my sent
// messages read once this passes their timestamp. null = they never opened it.
export async function getPeerLastRead(otherUserId: string): Promise<string | null> {
  if (isSupabaseConfigured && supabase) {
    const me = await getAuthUserId();
    const { data, error } = await supabase
      .from('dm_reads')
      .select('last_read_at')
      .eq('reader_id', otherUserId)
      .eq('peer_id', me)
      .maybeSingle();
    if (error) return null;
    return (data?.last_read_at as string) ?? null;
  }
  return null;
}

export function subscribeToDmReads(otherUserId: string, onChange: () => void) {
  const client = supabase;
  if (isSupabaseConfigured && client) {
    const channel = client
      .channel(`dm-reads-${otherUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dm_reads' }, () => onChange())
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }
  return () => {};
}

export async function listDmPreviews(): Promise<Map<string, DirectMessage>> {
  if (isSupabaseConfigured && supabase) {
    const me = await getAuthUserId();
    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`sender_id.eq.${me},recipient_id.eq.${me}`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const messages = camelizeDeep<DirectMessage[]>(data ?? []);
    const latestByPartner = new Map<string, DirectMessage>();
    messages.forEach((m) => {
      const partnerId = m.senderId === me ? m.recipientId : m.senderId;
      if (!latestByPartner.has(partnerId)) latestByPartner.set(partnerId, m);
    });
    return latestByPartner;
  }
  const latestByPartner = new Map<string, DirectMessage>();
  [...mockDirectMessages]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .forEach((m) => {
      if (m.senderId !== CURRENT_USER_ID && m.recipientId !== CURRENT_USER_ID) return;
      const partnerId = m.senderId === CURRENT_USER_ID ? m.recipientId : m.senderId;
      if (!latestByPartner.has(partnerId)) latestByPartner.set(partnerId, m);
    });
  return latestByPartner;
}
