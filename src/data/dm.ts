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

// Every DM insert this user is party to matches RLS regardless of sender/recipient,
// so an unfiltered subscription plus a client-side check covers both directions.
export function subscribeToDirectMessages(otherUserId: string, myUserId: string, onMessage: (message: DirectMessage) => void) {
  const client = supabase;
  if (isSupabaseConfigured && client) {
    const channel = client
      .channel(`dm-${[myUserId, otherUserId].sort().join('-')}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (payload) => {
        const message = camelizeDeep<DirectMessage>(payload.new);
        const isThisConversation =
          (message.senderId === myUserId && message.recipientId === otherUserId) ||
          (message.senderId === otherUserId && message.recipientId === myUserId);
        if (isThisConversation) onMessage(message);
      })
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
