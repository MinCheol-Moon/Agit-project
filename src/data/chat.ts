import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { getAuthUserId } from '../lib/session';
import { camelizeDeep } from '../lib/caseMap';
import { ChatMessage, ChatRoom } from '../types';
import { CURRENT_USER_ID, mockChatRooms, mockMessages } from './mockStore';

export async function listChatRooms(): Promise<ChatRoom[]> {
  if (isSupabaseConfigured && supabase) {
    // Preferred: the chat_room_previews view returns one latest message per
    // room in a single query (migration 0025). Fall back to the old
    // download-all-messages method if the view isn't created yet.
    const preview = await supabase.from('chat_room_previews').select('*');
    if (!preview.error) {
      return camelizeDeep<ChatRoom[]>(preview.data ?? []);
    }

    const { data, error } = await supabase.from('chat_rooms').select('*');
    if (error) throw error;
    const rooms = camelizeDeep<ChatRoom[]>(data ?? []);
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

export async function createChatRoom(name: string): Promise<ChatRoom> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('chat_rooms').insert({ name }).select().single();
    if (error) throw error;
    return camelizeDeep<ChatRoom>(data);
  }
  const room = { id: `r-${Date.now()}`, name } as ChatRoom;
  mockChatRooms.push(room);
  return room;
}

export async function deleteChatRoom(roomId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('chat_rooms').delete().eq('id', roomId).select('id');
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('삭제 권한이 없거나 서버 설정(마이그레이션)이 아직 반영되지 않았어요.');
    return;
  }
  const idx = mockChatRooms.findIndex((r) => r.id === roomId);
  if (idx >= 0) mockChatRooms.splice(idx, 1);
}

export const MESSAGE_PAGE_SIZE = 50;

// Returns messages newest-first (for an inverted FlatList). Pass `before` (an
// ISO createdAt) to page older messages when scrolling up.
export async function listMessages(roomId: string, before?: string): Promise<ChatMessage[]> {
  if (isSupabaseConfigured && supabase) {
    let query = supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(MESSAGE_PAGE_SIZE);
    if (before) query = query.lt('created_at', before);
    const { data, error } = await query;
    if (error) throw error;
    return camelizeDeep<ChatMessage[]>(data ?? []);
  }
  let list = mockMessages.filter((m) => m.roomId === roomId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (before) list = list.filter((m) => m.createdAt < before);
  return list.slice(0, MESSAGE_PAGE_SIZE);
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
    const { data, error } = await supabase.from('messages').delete().eq('id', messageId).select('id');
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('삭제 권한이 없거나 서버 설정(마이그레이션)이 아직 반영되지 않았어요.');
    return;
  }
  const idx = mockMessages.findIndex((m) => m.id === messageId);
  if (idx >= 0) mockMessages.splice(idx, 1);
}

export interface RoomRead {
  userId: string;
  lastReadAt: string;
}

// Records that the current user has read everything in the room up to now.
// Called when entering a room and whenever new messages arrive.
export async function markRoomRead(roomId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const userId = await getAuthUserId();
    await supabase
      .from('room_reads')
      .upsert({ room_id: roomId, user_id: userId, last_read_at: new Date().toISOString() }, { onConflict: 'room_id,user_id' });
    return;
  }
  // mock mode: nothing to persist
}

export async function listRoomReads(roomId: string): Promise<RoomRead[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('room_reads').select('user_id, last_read_at').eq('room_id', roomId);
    if (error) throw error;
    return camelizeDeep<RoomRead[]>(data ?? []);
  }
  return [];
}

// Fires whenever anyone's read marker in the room changes, so the sender's
// unread counts update live.
export function subscribeToRoomReads(roomId: string, onChange: () => void) {
  const client = supabase;
  if (isSupabaseConfigured && client) {
    const channel = client
      .channel(`reads-${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_reads', filter: `room_id=eq.${roomId}` },
        () => onChange(),
      )
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }
  return () => {};
}

export interface TypingUser {
  userId: string;
  nickname: string;
}

// "쓰는 중" indicator over Realtime Broadcast (no DB writes). channelKey is a
// stable per-conversation string (e.g. `room-<id>` or `dm-<a>-<b>`). The caller
// throttles notifyTyping and calls notifyStop on idle/send; receivers of a
// typing event auto-expire it after 5s in case a stop is missed.
export function subscribeToTyping(channelKey: string, selfId: string, onChange: (typers: TypingUser[]) => void) {
  const client = supabase;
  if (!isSupabaseConfigured || !client) {
    return { notifyTyping: () => {}, notifyStop: () => {}, unsubscribe: () => {} };
  }
  const active = new Map<string, { nickname: string; timer: ReturnType<typeof setTimeout> }>();
  const emit = () => onChange(Array.from(active.entries()).map(([userId, v]) => ({ userId, nickname: v.nickname })));
  const remove = (userId: string) => {
    const e = active.get(userId);
    if (e) {
      clearTimeout(e.timer);
      active.delete(userId);
      emit();
    }
  };
  const channel = client
    .channel(`typing-${channelKey}`, { config: { broadcast: { self: false } } })
    .on('broadcast', { event: 'typing' }, ({ payload }) => {
      const p = payload as TypingUser;
      if (!p?.userId || p.userId === selfId) return;
      const existing = active.get(p.userId);
      if (existing) clearTimeout(existing.timer);
      active.set(p.userId, { nickname: p.nickname, timer: setTimeout(() => remove(p.userId), 5000) });
      emit();
    })
    .on('broadcast', { event: 'stop' }, ({ payload }) => {
      const p = payload as TypingUser;
      if (p?.userId) remove(p.userId);
    })
    .subscribe();
  return {
    notifyTyping: (u: TypingUser) => {
      channel.send({ type: 'broadcast', event: 'typing', payload: u });
    },
    notifyStop: (u: TypingUser) => {
      channel.send({ type: 'broadcast', event: 'stop', payload: u });
    },
    unsubscribe: () => {
      active.forEach((v) => clearTimeout(v.timer));
      client.removeChannel(channel);
    },
  };
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
