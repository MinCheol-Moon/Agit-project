import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/colors';
import { ChatStackParamList } from '../../navigation/types';
import {
  deleteMessage,
  listMessages,
  listRoomReads,
  markRoomRead,
  sendMessage,
  subscribeToRoom,
  subscribeToRoomReads,
  subscribeToTyping,
  MESSAGE_PAGE_SIZE,
  RoomRead,
  TypingUser,
} from '../../data/chat';
import { ChatMessage } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { listMembers } from '../../data/users';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Avatar } from '../../components/Avatar';
import { SendButton } from '../../components/SendButton';
import { confirmDestructive } from '../../lib/confirm';
import { alert } from '../../lib/alert';
import { useWebViewportRect } from '../../lib/useKeyboardInset';

type Props = NativeStackScreenProps<ChatStackParamList, 'ChatRoom'>;
type Profile = { nickname: string; avatarUrl?: string | null };

// A single message row, memoized so a reads/typing change only re-renders the
// bubbles whose `unread` actually changed (not the whole list).
const MessageBubble = React.memo(function MessageBubble({
  item,
  mine,
  profile,
  unread,
  onDelete,
  onRetry,
}: {
  item: ChatMessage;
  mine: boolean;
  profile?: Profile;
  unread: number;
  onDelete: (id: string) => void;
  onRetry: (item: ChatMessage) => void;
}) {
  if (item.userId === null) {
    return (
      <View style={styles.systemRow}>
        <Text style={styles.systemText}>{item.body}</Text>
      </View>
    );
  }

  if (mine) {
    return (
      <View style={[styles.bubbleRow, styles.bubbleRowMine]}>
        <View style={[styles.bubbleWithAction, styles.bubbleWithActionMine]}>
          {!item.pending && !item.failed && (
            <TouchableOpacity onPress={() => onDelete(item.id)} style={styles.deleteIcon} hitSlop={8}>
              <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            activeOpacity={0.6}
            onPress={item.failed ? () => onRetry(item) : undefined}
            onLongPress={() => onDelete(item.id)}
            style={[styles.bubble, styles.bubbleMine, item.pending && styles.pendingBubble]}
          >
            <Text style={styles.bubbleTextMine}>{item.body}</Text>
          </TouchableOpacity>
          {item.failed ? (
            <Text style={styles.retryText}>재전송</Text>
          ) : item.pending ? (
            <Ionicons name="time-outline" size={12} color={colors.textMuted} />
          ) : unread > 0 ? (
            <Text style={styles.unreadCount}>{unread}</Text>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.otherRow}>
      <Avatar url={profile?.avatarUrl} name={profile?.nickname ?? '회원'} size={34} />
      <View style={styles.otherContent}>
        <Text style={styles.nickname}>{profile?.nickname ?? '회원'}</Text>
        <View style={styles.otherBubbleRow}>
          <View style={[styles.bubble, styles.bubbleOther, styles.bubbleOtherAlign]}>
            <Text style={styles.bubbleTextOther}>{item.body}</Text>
          </View>
          {unread > 0 && <Text style={styles.unreadCount}>{unread}</Text>}
        </View>
      </View>
    </View>
  );
});

export default function ChatRoomScreen({ route, navigation }: Props) {
  const { roomId, roomName } = route.params;
  const { user } = useAuth();
  // Newest-first (the list is inverted, so index 0 renders at the bottom).
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [input, setInput] = useState('');
  const [reads, setReads] = useState<RoomRead[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [typers, setTypers] = useState<TypingUser[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const loadingMore = useRef(false);
  const typingApi = useRef<ReturnType<typeof subscribeToTyping> | null>(null);
  const typingState = useRef<{ lastSent: number; stop: ReturnType<typeof setTimeout> | null }>({ lastSent: 0, stop: null });
  const viewport = useWebViewportRect();
  // Pin the screen to the visible viewport on iOS web so the header stays put.
  const webPin = viewport
    ? ({ position: 'fixed', top: viewport.offsetTop, left: 0, right: 0, height: viewport.height, flex: undefined } as const)
    : null;

  const refetchReads = useCallback(() => {
    listRoomReads(roomId).then(setReads).catch(() => {});
  }, [roomId]);

  const load = useCallback(async () => {
    const [msgs, members, readRows] = await Promise.all([listMessages(roomId), listMembers(), listRoomReads(roomId)]);
    setMessages(msgs);
    setHasMore(msgs.length >= MESSAGE_PAGE_SIZE);
    setMemberCount(members.length);
    setReads(readRows);
    setProfiles(Object.fromEntries(members.map((m) => [m.id, { nickname: m.nickname, avatarUrl: m.avatarUrl }])));
    markRoomRead(roomId).then(refetchReads).catch(() => {});
  }, [roomId, refetchReads]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    const unsubscribe = subscribeToRoom(
      roomId,
      (message) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          // Replace my own optimistic placeholder with the confirmed row.
          if (message.userId === user?.id) {
            const idx = prev.findIndex((m) => m.id.startsWith('temp-') && m.body === message.body && m.userId === message.userId);
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = message;
              return copy;
            }
          }
          return [message, ...prev];
        });
        markRoomRead(roomId).then(refetchReads).catch(() => {});
      },
      (messageId) => {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      },
    );
    const unsubscribeReads = subscribeToRoomReads(roomId, refetchReads);
    const poll = setInterval(refetchReads, 6000);
    return () => {
      unsubscribe();
      unsubscribeReads();
      clearInterval(poll);
    };
  }, [roomId, user, refetchReads]);

  // Typing indicator over Realtime Broadcast.
  useEffect(() => {
    if (!user) return;
    const api = subscribeToTyping(`room-${roomId}`, user.id, setTypers);
    typingApi.current = api;
    return () => {
      api.unsubscribe();
      typingApi.current = null;
    };
  }, [roomId, user]);

  const stopTyping = useCallback(() => {
    if (typingState.current.stop) clearTimeout(typingState.current.stop);
    typingState.current.stop = null;
    typingState.current.lastSent = 0;
    if (user) typingApi.current?.notifyStop({ userId: user.id, nickname: user.nickname });
  }, [user]);

  const onChangeInput = (text: string) => {
    setInput(text);
    if (!user || !typingApi.current) return;
    const now = Date.now();
    if (now - typingState.current.lastSent > 2000) {
      typingApi.current.notifyTyping({ userId: user.id, nickname: user.nickname });
      typingState.current.lastSent = now;
    }
    if (typingState.current.stop) clearTimeout(typingState.current.stop);
    typingState.current.stop = setTimeout(stopTyping, 3000);
  };

  const unreadFor = useCallback(
    (createdAt: string): number => {
      if (!user) return 0;
      const posted = new Date(createdAt).getTime();
      const readByOthers = reads.filter((r) => r.userId !== user.id && new Date(r.lastReadAt).getTime() >= posted).length;
      return Math.max(0, memberCount - 1 - readByOthers);
    },
    [reads, memberCount, user],
  );

  const sendOptimistic = useCallback(
    async (body: string) => {
      if (!user) return;
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const temp: ChatMessage = { id: tempId, roomId, userId: user.id, body, createdAt: new Date().toISOString(), pending: true };
      setMessages((prev) => [temp, ...prev]);
      requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }));
      try {
        const server = await sendMessage(roomId, body);
        setMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== tempId);
          if (withoutTemp.some((m) => m.id === server.id)) return withoutTemp; // realtime beat us
          return [server, ...withoutTemp];
        });
        markRoomRead(roomId).then(refetchReads).catch(() => {});
      } catch {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)));
      }
    },
    [roomId, user, refetchReads],
  );

  const handleSend = () => {
    const body = input.trim();
    if (!body) return;
    setInput('');
    inputRef.current?.focus();
    stopTyping();
    sendOptimistic(body);
  };

  const handleDelete = useCallback((messageId: string) => {
    if (messageId.startsWith('temp-')) {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      return;
    }
    confirmDestructive('메시지 삭제', '이 메시지를 삭제할까요?', async () => {
      try {
        await deleteMessage(messageId);
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      } catch (e) {
        alert('삭제 실패', e instanceof Error ? e.message : String(e));
      }
    });
  }, []);

  const handleRetry = useCallback(
    (item: ChatMessage) => {
      setMessages((prev) => prev.filter((m) => m.id !== item.id));
      sendOptimistic(item.body);
    },
    [sendOptimistic],
  );

  const loadOlder = useCallback(async () => {
    if (loadingMore.current || !hasMore || messages.length === 0) return;
    loadingMore.current = true;
    try {
      const oldest = messages[messages.length - 1]?.createdAt;
      const older = await listMessages(roomId, oldest);
      if (older.length < MESSAGE_PAGE_SIZE) setHasMore(false);
      if (older.length > 0) {
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          return [...prev, ...older.filter((m) => !ids.has(m.id))];
        });
      }
    } finally {
      loadingMore.current = false;
    }
  }, [roomId, hasMore, messages]);

  const typingLabel =
    typers.length === 0
      ? null
      : typers.length === 1
      ? `${typers[0].nickname}님이 입력 중...`
      : `${typers[0].nickname}님 외 ${typers.length - 1}명이 입력 중...`;

  return (
    <KeyboardAvoidingView style={[styles.screen, webPin as object]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={roomName} onBack={() => navigation.goBack()} />
      <FlatList
        ref={listRef}
        data={messages}
        inverted
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onEndReached={loadOlder}
        onEndReachedThreshold={0.4}
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        renderItem={({ item }) => (
          <MessageBubble
            item={item}
            mine={item.userId === user?.id}
            profile={item.userId ? profiles[item.userId] : undefined}
            unread={unreadFor(item.createdAt)}
            onDelete={handleDelete}
            onRetry={handleRetry}
          />
        )}
      />
      {typingLabel && (
        <View style={styles.typingRow}>
          <Text style={styles.typingText}>{typingLabel}</Text>
        </View>
      )}
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={input}
          onChangeText={onChangeInput}
          placeholder="메시지 입력"
          placeholderTextColor={colors.placeholder}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
          returnKeyType="send"
        />
        <SendButton onPress={handleSend} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#b2c7da' },
  list: { padding: spacing.lg, gap: spacing.sm },
  bubbleRow: { alignItems: 'flex-start', marginBottom: spacing.xs },
  bubbleRowMine: { alignItems: 'flex-end' },
  otherRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs, paddingRight: spacing.xl },
  otherContent: { flexShrink: 1 },
  otherBubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  nickname: { fontSize: 11, color: colors.textMuted, marginBottom: 2, marginLeft: 4 },
  bubbleWithAction: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '80%' },
  bubbleWithActionMine: { flexDirection: 'row-reverse' },
  deleteIcon: { padding: 4 },
  unreadCount: { alignSelf: 'flex-end', fontSize: 11, fontWeight: '700', color: colors.gold, marginBottom: 2 },
  retryText: { alignSelf: 'flex-end', fontSize: 11, fontWeight: '700', color: colors.danger, marginBottom: 2 },
  systemRow: { alignItems: 'center', marginBottom: spacing.xs },
  systemText: { fontSize: 12, color: colors.creamText, backgroundColor: colors.cream, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6, overflow: 'hidden' },
  bubble: { flexShrink: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.tile },
  bubbleMine: { backgroundColor: colors.goldLight },
  pendingBubble: { opacity: 0.5 },
  bubbleOther: { backgroundColor: colors.white },
  bubbleOtherAlign: { alignSelf: 'flex-start' },
  bubbleTextMine: { color: '#191c22' },
  bubbleTextOther: { color: colors.text },
  typingRow: { paddingHorizontal: spacing.lg, paddingBottom: 4 },
  typingText: { fontSize: 11, color: colors.creamText, fontStyle: 'italic' },
  inputRow: { flexDirection: 'row', padding: spacing.md, gap: spacing.sm, backgroundColor: colors.white },
  input: { flex: 1, backgroundColor: colors.background, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 10, color: colors.text },
});
