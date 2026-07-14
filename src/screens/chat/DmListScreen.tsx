import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, radius, spacing } from '../../theme/colors';
import { ChatStackParamList } from '../../navigation/types';
import { listMembers } from '../../data/users';
import { listDmPreviews } from '../../data/dm';
import { AppUser, DirectMessage } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { ScreenHeader } from '../../components/ScreenHeader';

type Props = NativeStackScreenProps<ChatStackParamList, 'DmList'>;

export default function DmListScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [members, setMembers] = useState<AppUser[]>([]);
  const [previews, setPreviews] = useState<Map<string, DirectMessage>>(new Map());

  useFocusEffect(
    useCallback(() => {
      listMembers().then((list) => setMembers(list.filter((m) => m.id !== user?.id)));
      listDmPreviews().then(setPreviews);
    }, [user?.id]),
  );

  const sorted = [...members].sort((a, b) => {
    const aTime = previews.get(a.id)?.createdAt ?? '';
    const bTime = previews.get(b.id)?.createdAt ?? '';
    return bTime.localeCompare(aTime);
  });

  return (
    <View style={styles.screen}>
      <ScreenHeader title="개인 메시지" onBack={() => navigation.goBack()} />
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const preview = previews.get(item.id);
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate('DmRoom', { otherUserId: item.id, otherNickname: item.nickname })}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.nickname[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.nickname}</Text>
                <Text style={styles.preview} numberOfLines={1}>{preview?.body ?? '대화 시작하기'}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.cardDark, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.goldLight, fontWeight: '700' },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  preview: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
