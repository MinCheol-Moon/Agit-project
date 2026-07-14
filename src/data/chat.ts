import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { ChatMessage, ChatRoom } from '../types';
import { CURRENT_USER_ID, mockChatRooms, mockMessages } from './mockStore';

export async function listChatRooms(): Promise<ChatRoom[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('chat_rooms').select('*');
    if (error) throw error;
    return data as ChatRoom[];
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
    return data as ChatMessage[];
  }
  return mockMessages.filter((m) => m.roomId === roomId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function sendMessage(roomId: string, body: string): Promise<ChatMessage> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('messages')
      .insert({ room_id: roomId, user_id: CURRENT_USER_ID, body })
      .select()
      .single();
    if (error) throw error;
    return data as ChatMessage;
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

export function subscribeToRoom(roomId: string, onMessage: (message: ChatMessage) => void) {
  const client = supabase;
  if (isSupabaseConfigured && client) {
    const channel = client
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => onMessage(payload.new as ChatMessage),
      )
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }
  return () => {};
}
