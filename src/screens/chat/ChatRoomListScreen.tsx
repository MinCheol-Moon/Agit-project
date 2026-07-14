import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, radius, spacing } from '../../theme/colors';
import { ChatStackParamList } from '../../navigation/types';
import { listChatRooms } from '../../data/chat';
import { ChatRoom } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../lib/permissions';
import { LockedOverlay } from '../../components/LockedOverlay';

type Props = NativeStackScreenProps<ChatStackParamList, 'ChatRoomList'>;

export default function ChatRoomListScreen({ navigation }: Props) {
  const { user } = useAuth();
  const tier = user?.tier ?? 'guest';
  const [rooms, setRooms] = useState<ChatRoom[]>([]);

  useFocusEffect(
    useCallback(() => {
      listChatRooms().then(setRooms);
    }, []),
  );

  if (!can(tier, 'chat')) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>채팅</Text>
        <View style={{ position: 'relative', flex: 1, margin: spacing.lg, borderRadius: radius.card, backgroundColor: colors.white }}>
          <LockedOverlay requiredTier="talbuchak" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>채팅</Text>
        <TouchableOpacity style={styles.dmButton} onPress={() => navigation.navigate('DmList')}>
          <Text style={styles.dmButtonText}>개인 메시지 →</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
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
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  dmButton: { backgroundColor: colors.gold, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill },
  dmButtonText: { color: colors.white, fontWeight: '700', fontSize: 12 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.cardDark, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.goldLight, fontWeight: '700' },
  roomName: { fontSize: 15, fontWeight: '700', color: colors.text },
  lastMessage: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
