import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/colors';
import { ChatStackParamList } from '../../navigation/types';
import { deleteDirectMessage, listDirectMessages, sendDirectMessage, subscribeToDirectMessages } from '../../data/dm';
import { DirectMessage } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { ScreenHeader } from '../../components/ScreenHeader';

type Props = NativeStackScreenProps<ChatStackParamList, 'DmRoom'>;

export default function DmRoomScreen({ route, navigation }: Props) {
  const { otherUserId, otherNickname } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    setMessages(await listDirectMessages(otherUserId));
  }, [otherUserId]);

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
      },
      (messageId) => {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      },
    );
    return unsubscribe;
  }, [otherUserId, user]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const body = input.trim();
    setInput('');
    try {
      const message = await sendDirectMessage(otherUserId, body);
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    } catch (e) {
      Alert.alert('전송 실패', e instanceof Error ? e.message : String(e));
    }
  };

  const handleDelete = (messageId: string) => {
    Alert.alert('메시지 삭제', '이 메시지를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDirectMessage(messageId);
            setMessages((prev) => prev.filter((m) => m.id !== messageId));
          } catch (e) {
            Alert.alert('삭제 실패', e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={otherNickname} onBack={() => navigation.goBack()} />
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const mine = item.senderId === user?.id;
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
  bubbleWithAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bubbleWithActionMine: { flexDirection: 'row-reverse' },
  deleteIcon: { padding: 4 },
  bubble: { maxWidth: '75%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.tile },
  bubbleMine: { backgroundColor: colors.goldLight },
  bubbleOther: { backgroundColor: colors.white },
  bubbleTextMine: { color: '#191c22' },
  bubbleTextOther: { color: colors.text },
  inputRow: { flexDirection: 'row', padding: spacing.md, gap: spacing.sm, backgroundColor: colors.white },
  input: { flex: 1, backgroundColor: colors.background, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 10 },
  sendButton: { backgroundColor: colors.gold, borderRadius: radius.pill, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  sendButtonText: { color: colors.white, fontWeight: '700' },
});
