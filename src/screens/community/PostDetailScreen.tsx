import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/colors';
import { CommunityStackParamList } from '../../navigation/types';
import { likePost, listPosts } from '../../data/community';
import { Post } from '../../types';
import { ScreenHeader } from '../../components/ScreenHeader';

type Props = NativeStackScreenProps<CommunityStackParamList, 'PostDetail'>;

export default function PostDetailScreen({ route, navigation }: Props) {
  const { postId } = route.params;
  const [post, setPost] = useState<Post | null>(null);

  const load = useCallback(async () => {
    const posts = await listPosts();
    setPost(posts.find((p) => p.id === postId) ?? null);
  }, [postId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!post) return null;

  const handleLike = async () => {
    try {
      await likePost(postId);
      load();
    } catch (e) {
      Alert.alert('좋아요 실패', e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="게시글" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{post.title}</Text>
        <Text style={styles.body}>{post.body}</Text>
        <TouchableOpacity style={styles.likeButton} onPress={handleLike}>
          <Ionicons name="heart" size={16} color={colors.danger} />
          <Text style={styles.likeText}>{post.likeCount}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  body: { fontSize: 15, color: colors.text, lineHeight: 22, marginBottom: spacing.xl },
  likeButton: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  likeText: { fontWeight: '700', color: colors.text },
});
