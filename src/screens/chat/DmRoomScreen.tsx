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
} from '../../data/dm';
import { DirectMessage } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SendButton } from '../../components/SendButton';
import { confirmDestructive } from '../../lib/confirm';
import { alert } from '../../lib/alert';
import { useWebViewportRect } from '../../lib/useKeyboardInset';

type Props = NativeStackScreenProps<ChatStackParamList, 'DmRoom'>;

export default function DmRoomScreen({ route, navigation }: Props) {
  const { otherUserId, otherNickname } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [input, setInput] = useState('');
  // The moment the other person last read our conversation; a sent message
  // newer than this is still unread (shows a "1").
  const [peerLastRead, setPeerLastRead] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const viewport = useWebViewportRect();
  const webPin = viewport
    ? ({ position: 'fixed', top: viewport.offsetTop, left: 0, right: 0, height: viewport.height, flex: undefined } as const)
    : null;
  const webHeight = viewport?.height ?? null;

  useEffect(() => {
    const toEnd = () => listRef.current?.scrollToEnd({ animated: false });
    const id = requestAnimationFrame(toEnd);
    const t1 = setTimeout(toEnd, 150);
    const t2 = setTimeout(toEnd, 350);
    return () => {
      cancelAnimationFrame(id);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [messages.length, webHeight]);

  const refetchPeerRead = useCallback(() => {
    getPeerLastRead(otherUserId).then(setPeerLastRead).catch(() => {});
  }, [otherUserId]);

  const load = useCallback(async () => {
    setMessages(await listDirectMessages(otherUserId));
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
        setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
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

  const handleSend = async () => {
    if (!input.trim()) return;
    const body = input.trim();
    setInput('');
    inputRef.current?.focus();
    try {
      const message = await sendDirectMessage(otherUserId, body);
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    } catch (e) {
      alert('전송 실패', e instanceof Error ? e.message : String(e));
    }
  };

  const handleDelete = (messageId: string) => {
    confirmDestructive('메시지 삭제', '이 메시지를 삭제할까요?', async () => {
      try {
        await deleteDirectMessage(messageId);
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      } catch (e) {
        alert('삭제 실패', e instanceof Error ? e.message : String(e));
      }
    });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, webPin as object]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader title={otherNickname} onBack={() => navigation.goBack()} />
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          const mine = item.senderId === user?.id;
          // My message is unread until the other person's last-read passes it.
          const unread = mine && (!peerLastRead || new Date(peerLastRead).getTime() < new Date(item.createdAt).getTime());
          return (
            <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
              <View style={[styles.bubbleWithAction, mine && styles.bubbleWithActionMine]}>
                {mine && (
                  <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteIcon} hitSlop={8}>
                    <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  activeOpacity={mine ? 0.6 : 1}
                  onLongPress={mine ? () => handleDelete(item.id) : undefined}
                  style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}
                >
                  <Text style={mine ? styles.bubbleTextMine : styles.bubbleTextOther}>{item.body}</Text>
                </TouchableOpacity>
                {unread ? <Text style={styles.unreadCount}>1</Text> : null}
              </View>
            </View>
          );
        }}
      />
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="메시지 입력"
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
  bubble: { flexShrink: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.tile },
  bubbleMine: { backgroundColor: colors.goldLight },
  bubbleOther: { backgroundColor: colors.white },
  bubbleTextMine: { color: '#191c22' },
  bubbleTextOther: { color: colors.text },
  inputRow: { flexDirection: 'row', padding: spacing.md, gap: spacing.sm, backgroundColor: colors.white },
  input: { flex: 1, backgroundColor: colors.background, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 10 },
  sendButton: { backgroundColor: colors.gold, borderRadius: radius.pill, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  sendButtonText: { color: colors.white, fontWeight: '700' },
});
