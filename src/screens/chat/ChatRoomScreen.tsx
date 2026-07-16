import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/colors';
import { ChatStackParamList } from '../../navigation/types';
import { deleteMessage, listMessages, sendMessage, subscribeToRoom } from '../../data/chat';
import { ChatMessage } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { listMembers } from '../../data/users';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Avatar } from '../../components/Avatar';
import { confirmDestructive } from '../../lib/confirm';
import { alert } from '../../lib/alert';
import { useWebViewportHeight } from '../../lib/useKeyboardInset';

type Props = NativeStackScreenProps<ChatStackParamList, 'ChatRoom'>;

export default function ChatRoomScreen({ route, navigation }: Props) {
  const { roomId, roomName } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { nickname: string; avatarUrl?: string | null }>>({});
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);
  const webHeight = useWebViewportHeight();

  const load = useCallback(async () => {
    const [msgs, members] = await Promise.all([listMessages(roomId), listMembers()]);
    setMessages(msgs);
    setProfiles(Object.fromEntries(members.map((m) => [m.id, { nickname: m.nickname, avatarUrl: m.avatarUrl }])));
  }, [roomId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    const unsubscribe = subscribeToRoom(
      roomId,
      (message) => {
        setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      },
      (messageId) => {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      },
    );
    return unsubscribe;
  }, [roomId]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const body = input.trim();
    setInput('');
    try {
      const message = await sendMessage(roomId, body);
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    } catch (e) {
      alert('전송 실패', e instanceof Error ? e.message : String(e));
    }
  };

  const handleDelete = (messageId: string) => {
    confirmDestructive('메시지 삭제', '이 메시지를 삭제할까요?', async () => {
      try {
        await deleteMessage(messageId);
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      } catch (e) {
        alert('삭제 실패', e instanceof Error ? e.message : String(e));
      }
    });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, webHeight != null && { height: webHeight, flex: undefined }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader title={roomName} onBack={() => navigation.goBack()} />
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          if (item.userId === null) {
            return (
              <View style={styles.systemRow}>
                <Text style={styles.systemText}>{item.body}</Text>
              </View>
            );
          }
          const mine = item.userId === user?.id;
          if (mine) {
            return (
              <View style={[styles.bubbleRow, styles.bubbleRowMine]}>
                <View style={[styles.bubbleWithAction, styles.bubbleWithActionMine]}>
                  <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteIcon} hitSlop={8}>
                    <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.6}
                    onLongPress={() => handleDelete(item.id)}
                    style={[styles.bubble, styles.bubbleMine]}
                  >
                    <Text style={styles.bubbleTextMine}>{item.body}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }
          const profile = profiles[item.userId];
          return (
            <View style={styles.otherRow}>
              <Avatar url={profile?.avatarUrl} name={profile?.nickname ?? '회원'} size={34} />
              <View style={styles.otherContent}>
                <Text style={styles.nickname}>{profile?.nickname ?? '회원'}</Text>
                <View style={[styles.bubble, styles.bubbleOther, styles.bubbleOtherAlign]}>
                  <Text style={styles.bubbleTextOther}>{item.body}</Text>
                </View>
              </View>
            </View>
          );
        }}
      />
      <View style={styles.inputRow}>
        <TextInput style={styles.input} value={input} onChangeText={setInput} placeholder="메시지 입력" />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Text style={styles.sendButtonText}>전송</Text>
        </TouchableOpacity>
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
  nickname: { fontSize: 11, color: colors.textMuted, marginBottom: 2, marginLeft: 4 },
  // ponytail: maxWidth must live on the outer row-constrained wrapper - a
  // percentage on the auto-sized bubble referenced its own auto width and
  // collapsed the text to one character per line.
  bubbleWithAction: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '80%' },
  bubbleWithActionMine: { flexDirection: 'row-reverse' },
  deleteIcon: { padding: 4 },
  systemRow: { alignItems: 'center', marginBottom: spacing.xs },
  systemText: { fontSize: 12, color: colors.creamText, backgroundColor: colors.cream, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6, overflow: 'hidden' },
  bubble: { flexShrink: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.tile },
  bubbleMine: { backgroundColor: colors.goldLight },
  bubbleOther: { backgroundColor: colors.white },
  bubbleOtherAlign: { alignSelf: 'flex-start' },
  bubbleTextMine: { color: '#191c22' },
  bubbleTextOther: { color: colors.text },
  inputRow: { flexDirection: 'row', padding: spacing.md, gap: spacing.sm, backgroundColor: colors.white },
  input: { flex: 1, backgroundColor: colors.background, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 10 },
  sendButton: { backgroundColor: colors.gold, borderRadius: radius.pill, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  sendButtonText: { color: colors.white, fontWeight: '700' },
});
