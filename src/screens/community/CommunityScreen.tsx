import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, radius, spacing } from '../../theme/colors';
import { CommunityStackParamList } from '../../navigation/types';
import { listPopularPosts, listPosts } from '../../data/community';
import { Post } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../lib/permissions';
import { LockedOverlay } from '../../components/LockedOverlay';

type Props = NativeStackScreenProps<CommunityStackParamList, 'CommunityFeed'>;

export default function CommunityScreen({ navigation }: Props) {
  const { user } = useAuth();
  const tier = user?.tier ?? 'guest';
  const [posts, setPosts] = useState<Post[]>([]);
  const [popular, setPopular] = useState<Post[]>([]);

  useFocusEffect(
    useCallback(() => {
      listPosts().then(setPosts);
      listPopularPosts().then(setPopular);
    }, []),
  );

  if (!can(tier, 'community')) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>소통</Text>
        <View style={{ position: 'relative', flex: 1, margin: spacing.lg, borderRadius: radius.card, backgroundColor: colors.white }}>
          <LockedOverlay requiredTier="taljuninja" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>소통</Text>
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('NewPost')}>
          <Text style={styles.fabText}>+ 글쓰기</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          popular.length ? (
            <View style={styles.popularSection}>
              <Text style={styles.sectionTitle}>이주의 인기글</Text>
              {popular.map((p) => (
                <TouchableOpacity key={p.id} style={styles.popularChip} onPress={() => navigation.navigate('PostDetail', { postId: p.id })}>
                  <Text style={styles.popularText} numberOfLines={1}>❤️ {p.likeCount} · {p.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('PostDetail', { postId: item.id })}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardBody} numberOfLines={2}>{item.body}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardMeta}>❤️ {item.likeCount}</Text>
              <Text style={styles.cardMeta}>💬 {item.commentCount}</Text>
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
  fab: { backgroundColor: colors.gold, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill },
  fabText: { color: colors.white, fontWeight: '700', fontSize: 12 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  popularSection: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  popularChip: { backgroundColor: colors.cream, borderColor: colors.creamBorder, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 8, marginBottom: spacing.xs },
  popularText: { color: colors.creamText, fontSize: 12, fontWeight: '600' },
  card: { backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: spacing.lg },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  cardBody: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.sm },
  cardFooter: { flexDirection: 'row', gap: spacing.md },
  cardMeta: { fontSize: 12, color: colors.textMuted },
});
