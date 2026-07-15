import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { getAuthUserId } from '../lib/session';
import { camelizeDeep } from '../lib/caseMap';
import { ChatMessage, ChatRoom } from '../types';
import { CURRENT_USER_ID, mockChatRooms, mockMessages } from './mockStore';

export async function listChatRooms(): Promise<ChatRoom[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('chat_rooms').select('*');
    if (error) throw error;
    const rooms = camelizeDeep<ChatRoom[]>(data ?? []);

    // lastMessage/lastMessageAt aren't columns; derive from the most recent message per room.
    const { data: recentRows, error: msgError } = await supabase
      .from('messages')
      .select('room_id, body, created_at')
      .order('created_at', { ascending: false });
    if (msgError) throw msgError;
    const latestByRoom = new Map<string, { body: string; created_at: string }>();
    (recentRows ?? []).forEach((m) => {
      if (!latestByRoom.has(m.room_id)) latestByRoom.set(m.room_id, m);
    });

    return rooms.map((r) => {
      const latest = latestByRoom.get(r.id);
      return latest ? { ...r, lastMessage: latest.body, lastMessageAt: latest.created_at } : r;
    });
  }
  return mockChatRooms;
}

export async function listMessages(roomId: string): Promise<ChatMessage[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at');
    if (error) throw error;
    return camelizeDeep<ChatMessage[]>(data ?? []);
  }
  return mockMessages.filter((m) => m.roomId === roomId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function sendMessage(roomId: string, body: string): Promise<ChatMessage> {
  if (isSupabaseConfigured && supabase) {
    const userId = await getAuthUserId();
    const { data, error } = await supabase
      .from('messages')
      .insert({ room_id: roomId, user_id: userId, body })
      .select()
      .single();
    if (error) throw error;
    return camelizeDeep<ChatMessage>(data);
  }
  const message: ChatMessage = {
    id: `m-${Date.now()}`,
    roomId,
    userId: CURRENT_USER_ID,
    body,
    createdAt: new Date().toISOString(),
  };
  mockMessages.push(message);
  const room = mockChatRooms.find((r) => r.id === roomId);
  if (room) {
    room.lastMessage = body;
    room.lastMessageAt = message.createdAt;
  }
  return message;
}

export async function deleteMessage(messageId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('messages').delete().eq('id', messageId);
    if (error) throw error;
    return;
  }
  const idx = mockMessages.findIndex((m) => m.id === messageId);
  if (idx >= 0) mockMessages.splice(idx, 1);
}

export function subscribeToRoom(
  roomId: string,
  onInsert: (message: ChatMessage) => void,
  onDelete?: (messageId: string) => void,
) {
  const client = supabase;
  if (isSupabaseConfigured && client) {
    const channel = client
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => onInsert(camelizeDeep<ChatMessage>(payload.new)),
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => onDelete?.(payload.old.id as string),
      )
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }
  return () => {};
}
