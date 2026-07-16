import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/colors';
import { CommunityStackParamList } from '../../navigation/types';
import { deletePost, likePost, listPosts, updatePost } from '../../data/community';
import { Post } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { ScreenHeader } from '../../components/ScreenHeader';
import { confirmDestructive } from '../../lib/confirm';
import { alert } from '../../lib/alert';

type Props = NativeStackScreenProps<CommunityStackParamList, 'PostDetail'>;

export default function PostDetailScreen({ route, navigation }: Props) {
  const { postId } = route.params;
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

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

  const canManage = post.userId === user?.id || user?.tier === 'admin' || Boolean(user?.isMaster);

  const handleLike = async () => {
    try {
      await likePost(postId);
      load();
    } catch (e) {
      alert('좋아요 실패', e instanceof Error ? e.message : String(e));
    }
  };

  const startEdit = () => {
    setTitle(post.title);
    setBody(post.body);
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!title.trim() || !body.trim()) return;
    try {
      await updatePost(postId, { title: title.trim(), body: body.trim() });
      setEditing(false);
      load();
    } catch (e) {
      alert('수정 실패', e instanceof Error ? e.message : String(e));
    }
  };

  const handleDelete = () => {
    confirmDestructive('게시글 삭제', '이 게시글을 삭제할까요?', async () => {
      try {
        await deletePost(postId);
        navigation.goBack();
      } catch (e) {
        alert('삭제 실패', e instanceof Error ? e.message : String(e));
      }
    });
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="게시글"
        onBack={() => navigation.goBack()}
        right={
          canManage && !editing ? (
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={startEdit}>
                <Ionicons name="create-outline" size={20} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        {editing ? (
          <>
            <TextInput style={styles.titleInput} value={title} onChangeText={setTitle} placeholder="제목" />
            <TextInput style={styles.bodyInput} value={body} onChangeText={setBody} placeholder="내용" multiline />
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setEditing(false)}>
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit}>
                <Text style={styles.saveButtonText}>저장</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title}>{post.title}</Text>
            <Text style={styles.body}>{post.body}</Text>
            <TouchableOpacity style={styles.likeButton} onPress={handleLike}>
              <Ionicons name="heart" size={16} color={colors.danger} />
              <Text style={styles.likeText}>{post.likeCount}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  headerActions: { flexDirection: 'row', gap: spacing.md },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  body: { fontSize: 15, color: colors.text, lineHeight: 22, marginBottom: spacing.xl },
  likeButton: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  likeText: { fontWeight: '700', color: colors.text },
  titleInput: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.tile, padding: spacing.md, fontSize: 15, fontWeight: '700', marginBottom: spacing.md },
  bodyInput: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.tile, padding: spacing.md, fontSize: 14, minHeight: 160, textAlignVertical: 'top' },
  editActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  cancelButton: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: radius.card, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  cancelButtonText: { fontWeight: '700', color: colors.text },
  saveButton: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: radius.card, backgroundColor: colors.gold },
  saveButtonText: { fontWeight: '700', color: colors.white },
});
