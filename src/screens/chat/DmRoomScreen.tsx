import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/colors';
import { ChatStackParamList } from '../../navigation/types';
import {
  deleteDirectMessage,
  getPeerLastRead,
  listDirectMessages,
  markDmRead,
  sendDirectMessage,
  subscribeToDirectMessages,
  subscribeToDmReads,
  DM_PAGE_SIZE,
} from '../../data/dm';
import { subscribeToTyping } from '../../data/chat';
import { DirectMessage } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SendButton } from '../../components/SendButton';
import { confirmDestructive } from '../../lib/confirm';
import { alert } from '../../lib/alert';
import { useWebViewportRect } from '../../lib/useKeyboardInset';

type Props = NativeStackScreenProps<ChatStackParamList, 'DmRoom'>;

const DmBubble = React.memo(function DmBubble({
  item,
  mine,
  unread,
  onDelete,
  onRetry,
}: {
  item: DirectMessage;
  mine: boolean;
  unread: boolean;
  onDelete: (id: string) => void;
  onRetry: (item: DirectMessage) => void;
}) {
  return (
    <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
      <View style={[styles.bubbleWithAction, mine && styles.bubbleWithActionMine]}>
        {mine && !item.pending && !item.failed && (
          <TouchableOpacity onPress={() => onDelete(item.id)} style={styles.deleteIcon} hitSlop={8}>
            <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          activeOpacity={mine ? 0.6 : 1}
          onPress={mine && item.failed ? () => onRetry(item) : undefined}
          onLongPress={mine ? () => onDelete(item.id) : undefined}
          style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther, item.pending && styles.pendingBubble]}
        >
          <Text style={mine ? styles.bubbleTextMine : styles.bubbleTextOther}>{item.body}</Text>
        </TouchableOpacity>
        {mine && item.failed ? (
          <Text style={styles.retryText}>재전송</Text>
        ) : mine && item.pending ? (
          <Ionicons name="time-outline" size={12} color={colors.textMuted} />
        ) : unread ? (
          <Text style={styles.unreadCount}>1</Text>
        ) : null}
      </View>
    </View>
  );
});

export default function DmRoomScreen({ route, navigation }: Props) {
  const { otherUserId, otherNickname } = route.params;
  const { user } = useAuth();
  // Newest-first (inverted list).
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [input, setInput] = useState('');
  const [peerLastRead, setPeerLastRead] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const loadingMore = useRef(false);
  const typingApi = useRef<ReturnType<typeof subscribeToTyping> | null>(null);
  const typingState = useRef<{ lastSent: number; stop: ReturnType<typeof setTimeout> | null }>({ lastSent: 0, stop: null });
  const viewport = useWebViewportRect();
  const webPin = viewport
    ? ({ position: 'fixed', top: viewport.offsetTop, left: 0, right: 0, height: viewport.height, flex: undefined } as const)
    : null;

  const channelKey = user ? `dm-${[user.id, otherUserId].sort().join('-')}` : null;

  const refetchPeerRead = useCallback(() => {
    getPeerLastRead(otherUserId).then(setPeerLastRead).catch(() => {});
  }, [otherUserId]);

  const load = useCallback(async () => {
    const msgs = await listDirectMessages(otherUserId);
    setMessages(msgs);
    setHasMore(msgs.length >= DM_PAGE_SIZE);
    markDmRead(otherUserId).catch(() => {});
    refetchPeerRead();
  }, [otherUserId, refetchPeerRead]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToDirectMessages(
      otherUserId,
      user.id,
      (message) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          if (message.senderId === user.id) {
            const idx = prev.findIndex((m) => m.id.startsWith('temp-') && m.body === message.body && m.senderId === message.senderId);
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = message;
              return copy;
            }
          }
          return [message, ...prev];
        });
        markDmRead(otherUserId).catch(() => {});
      },
      (messageId) => {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      },
    );
    const unsubscribeReads = subscribeToDmReads(otherUserId, refetchPeerRead);
    const poll = setInterval(refetchPeerRead, 6000);
    return () => {
      unsubscribe();
      unsubscribeReads();
      clearInterval(poll);
    };
  }, [otherUserId, user, refetchPeerRead]);

  useEffect(() => {
    if (!user || !channelKey) return;
    const api = subscribeToTyping(channelKey, user.id, (typers) => setTyping(typers.length > 0));
    typingApi.current = api;
    return () => {
      api.unsubscribe();
      typingApi.current = null;
    };
  }, [channelKey, user]);

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

  const sendOptimistic = useCallback(
    async (body: string) => {
      if (!user) return;
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const temp: DirectMessage = { id: tempId, senderId: user.id, recipientId: otherUserId, body, createdAt: new Date().toISOString(), pending: true };
      setMessages((prev) => [temp, ...prev]);
      requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }));
      try {
        const server = await sendDirectMessage(otherUserId, body);
        setMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== tempId);
          if (withoutTemp.some((m) => m.id === server.id)) return withoutTemp;
          return [server, ...withoutTemp];
        });
      } catch {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)));
      }
    },
    [otherUserId, user],
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
        await deleteDirectMessage(messageId);
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      } catch (e) {
        alert('삭제 실패', e instanceof Error ? e.message : String(e));
      }
    });
  }, []);

  const handleRetry = useCallback(
    (item: DirectMessage) => {
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
      const older = await listDirectMessages(otherUserId, oldest);
      if (older.length < DM_PAGE_SIZE) setHasMore(false);
      if (older.length > 0) {
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          return [...prev, ...older.filter((m) => !ids.has(m.id))];
        });
      }
    } finally {
      loadingMore.current = false;
    }
  }, [otherUserId, hasMore, messages]);

  const peerReadTime = peerLastRead ? new Date(peerLastRead).getTime() : 0;

  return (
    <KeyboardAvoidingView style={[styles.screen, webPin as object]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={otherNickname} onBack={() => navigation.goBack()} />
      <FlatList
        ref={listRef}
        data={messages}
        inverted
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onEndReached={loadOlder}
        onEndReachedThreshold={0.4}
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        renderItem={({ item }) => {
          const mine = item.senderId === user?.id;
          const unread = mine && peerReadTime < new Date(item.createdAt).getTime();
          return <DmBubble item={item} mine={mine} unread={unread} onDelete={handleDelete} onRetry={handleRetry} />;
        }}
      />
      {typing && (
        <View style={styles.typingRow}>
          <Text style={styles.typingText}>입력 중...</Text>
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
  bubbleWithAction: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '80%' },
  bubbleWithActionMine: { flexDirection: 'row-reverse' },
  deleteIcon: { padding: 4 },
  unreadCount: { alignSelf: 'flex-end', fontSize: 11, fontWeight: '700', color: colors.gold, marginBottom: 2 },
  retryText: { alignSelf: 'flex-end', fontSize: 11, fontWeight: '700', color: colors.danger, marginBottom: 2 },
  bubble: { flexShrink: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.tile },
  bubbleMine: { backgroundColor: colors.goldLight },
  pendingBubble: { opacity: 0.5 },
  bubbleOther: { backgroundColor: colors.white },
  bubbleTextMine: { color: '#191c22' },
  bubbleTextOther: { color: colors.text },
  typingRow: { paddingHorizontal: spacing.lg, paddingBottom: 4 },
  typingText: { fontSize: 11, color: colors.creamText, fontStyle: 'italic' },
  inputRow: { flexDirection: 'row', padding: spacing.md, gap: spacing.sm, backgroundColor: colors.white },
  input: { flex: 1, backgroundColor: colors.background, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 10, color: colors.text },
});
