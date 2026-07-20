import React, { useCallback, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/colors';
import { ChatStackParamList } from '../../navigation/types';
import { createChatRoom, deleteChatRoom, listChatRooms } from '../../data/chat';
import { ChatRoom } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../lib/permissions';
import { LockedOverlay } from '../../components/LockedOverlay';
import { confirmDestructive } from '../../lib/confirm';
import { alert } from '../../lib/alert';

type Props = NativeStackScreenProps<ChatStackParamList, 'ChatRoomList'>;

export default function ChatRoomListScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const tier = user?.tier ?? 'guest';
  // Matches the chat_rooms insert/delete RLS: akatsuki, admin, or master.
  const canManage = tier === 'akatsuki' || tier === 'admin' || Boolean(user?.isMaster);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const load = useCallback(() => {
    listChatRooms().then(setRooms);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createChatRoom(newName.trim());
      setNewName('');
      setCreating(false);
      load();
    } catch (e) {
      alert('대화방 생성 실패', e instanceof Error ? e.message : String(e));
    }
  };

  const handleDelete = (room: ChatRoom) => {
    confirmDestructive('대화방 삭제', `"${room.name}" 대화방을 삭제할까요? 대화 내용도 모두 사라져요.`, async () => {
      try {
        await deleteChatRoom(room.id);
        load();
      } catch (e) {
        alert('삭제 실패', e instanceof Error ? e.message : String(e));
      }
    });
  };

  if (!can(tier, 'chat')) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <Text style={styles.title}>채팅</Text>
        <View style={{ position: 'relative', flex: 1, margin: spacing.lg, borderRadius: radius.card, backgroundColor: colors.white }}>
          <LockedOverlay requiredTier="talbuchak" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>채팅</Text>
        <View style={styles.headerActions}>
          {canManage && (
            <TouchableOpacity style={styles.createButton} onPress={() => setCreating(true)}>
              <Ionicons name="add" size={16} color={colors.white} />
              <Text style={styles.createButtonText}>대화방</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.dmButton} onPress={() => navigation.navigate('DmList')}>
            <Text style={styles.dmButtonText}>개인 메시지 →</Text>
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.rowMain}
              onPress={() => navigation.navigate('ChatRoom', { roomId: item.id, roomName: item.name })}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.roomName}>{item.name}</Text>
                <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
              </View>
            </TouchableOpacity>
            {canManage && (
              <TouchableOpacity style={styles.deleteRoom} onPress={() => handleDelete(item)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      <Modal visible={creating} transparent animationType="fade" onRequestClose={() => setCreating(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setCreating(false)}>
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>새 대화방</Text>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="대화방 이름"
              placeholderTextColor={colors.placeholder}
              autoFocus
              onSubmitEditing={handleCreate}
            />
            <TouchableOpacity style={styles.modalSave} onPress={handleCreate}>
              <Text style={styles.modalSaveText}>만들기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setCreating(false)}>
              <Text style={styles.modalCancelText}>취소</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  createButton: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: colors.cardDark, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  createButtonText: { color: colors.white, fontWeight: '700', fontSize: 12 },
  dmButton: { backgroundColor: colors.gold, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill },
  dmButtonText: { color: colors.white, fontWeight: '700', fontSize: 12 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.line },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
  deleteRoom: { padding: spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.cardDark, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.goldLight, fontWeight: '700' },
  roomName: { fontSize: 15, fontWeight: '700', color: colors.text },
  lastMessage: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing.xl },
  modalCard: { backgroundColor: colors.white, borderRadius: radius.card, padding: spacing.lg },
  modalTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  modalInput: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.line, borderRadius: radius.tile, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 14, color: colors.text },
  modalSave: { backgroundColor: colors.gold, borderRadius: radius.pill, alignItems: 'center', paddingVertical: 12, marginTop: spacing.lg },
  modalSaveText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  modalCancel: { alignItems: 'center', paddingVertical: spacing.md, marginTop: 4 },
  modalCancelText: { color: colors.textMuted, fontWeight: '600' },
});
