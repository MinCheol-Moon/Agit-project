import React, { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/colors';
import { CommunityStackParamList } from '../../navigation/types';
import { addComment, deleteComment, deletePost, likePost, listComments, listPosts, updatePost } from '../../data/community';
import { listMembers } from '../../data/users';
import { Post, PostComment } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Avatar } from '../../components/Avatar';
import { confirmDestructive } from '../../lib/confirm';
import { alert } from '../../lib/alert';

type Props = NativeStackScreenProps<CommunityStackParamList, 'PostDetail'>;

type Profile = { nickname: string; avatarUrl?: string | null };

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function PostDetailScreen({ route, navigation }: Props) {
  const { postId } = route.params;
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [commentInput, setCommentInput] = useState('');
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const load = useCallback(async () => {
    const [posts, cmts, members] = await Promise.all([listPosts(), listComments(postId), listMembers()]);
    setPost(posts.find((p) => p.id === postId) ?? null);
    setComments(cmts);
    setProfiles(Object.fromEntries(members.map((m) => [m.id, { nickname: m.nickname, avatarUrl: m.avatarUrl }])));
  }, [postId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!post) return null;

  const canManage = post.userId === user?.id || user?.tier === 'admin' || Boolean(user?.isMaster);
  const authorProfile = profiles[post.userId];

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

  const handleAddComment = async () => {
    if (!commentInput.trim()) return;
    const body = commentInput.trim();
    setCommentInput('');
    try {
      await addComment(postId, body);
      load();
    } catch (e) {
      alert('댓글 등록 실패', e instanceof Error ? e.message : String(e));
    }
  };

  const handleDeleteComment = (comment: PostComment) => {
    confirmDestructive('댓글 삭제', '이 댓글을 삭제할까요?', async () => {
      try {
        await deleteComment(comment.id);
        load();
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
            <TextInput style={styles.titleInput} value={title} onChangeText={setTitle} placeholder="제목" placeholderTextColor={colors.placeholder} />
            <TextInput style={styles.bodyInput} value={body} onChangeText={setBody} placeholder="내용" placeholderTextColor={colors.placeholder} multiline />
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
            <View style={styles.authorRow}>
              <Avatar url={authorProfile?.avatarUrl} name={authorProfile?.nickname ?? '회원'} size={34} />
              <View>
                <Text style={styles.authorName}>{authorProfile?.nickname ?? '회원'}</Text>
                <Text style={styles.authorDate}>{fmt(post.createdAt)}</Text>
              </View>
            </View>
            <Text style={styles.title}>{post.title}</Text>
            <Text style={styles.body}>{post.body}</Text>
            {post.imageUrl ? <Image source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" /> : null}
            <TouchableOpacity style={styles.likeButton} onPress={handleLike}>
              <Ionicons name="heart" size={16} color={colors.danger} />
              <Text style={styles.likeText}>{post.likeCount}</Text>
            </TouchableOpacity>

            <View style={styles.commentSection}>
              <Text style={styles.commentTitle}>댓글 {comments.length > 0 ? comments.length : ''}</Text>
              {comments.map((c) => {
                const p = profiles[c.userId];
                const mine = c.userId === user?.id || user?.tier === 'admin' || Boolean(user?.isMaster);
                return (
                  <View key={c.id} style={styles.commentRow}>
                    <Avatar url={p?.avatarUrl} name={p?.nickname ?? '회원'} size={28} />
                    <View style={{ flex: 1 }}>
                      <View style={styles.commentHead}>
                        <Text style={styles.commentAuthor}>{p?.nickname ?? '회원'}</Text>
                        <Text style={styles.commentDate}>{fmt(c.createdAt)}</Text>
                        {mine && (
                          <TouchableOpacity onPress={() => handleDeleteComment(c)} hitSlop={8}>
                            <Ionicons name="trash-outline" size={13} color={colors.textMuted} />
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text style={styles.commentBody}>{c.body}</Text>
                    </View>
                  </View>
                );
              })}
              <View style={styles.commentInputRow}>
                <TextInput
                  style={styles.commentInput}
                  value={commentInput}
                  onChangeText={setCommentInput}
                  placeholder="댓글 입력"
                  placeholderTextColor={colors.placeholder}
                  onSubmitEditing={handleAddComment}
                />
                <TouchableOpacity style={styles.commentSend} onPress={handleAddComment}>
                  <Text style={styles.commentSendText}>등록</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  headerActions: { flexDirection: 'row', gap: spacing.md },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  authorName: { fontSize: 13, fontWeight: '700', color: colors.text },
  authorDate: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  body: { fontSize: 15, color: colors.text, lineHeight: 22, marginBottom: spacing.md },
  postImage: { width: '100%', height: 240, borderRadius: radius.tile, backgroundColor: colors.line, marginBottom: spacing.lg },
  likeButton: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  likeText: { fontWeight: '700', color: colors.text },
  titleInput: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.tile, padding: spacing.md, fontSize: 15, fontWeight: '700', marginBottom: spacing.md, color: colors.text },
  bodyInput: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.tile, padding: spacing.md, fontSize: 14, minHeight: 160, textAlignVertical: 'top', color: colors.text },
  editActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  cancelButton: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: radius.card, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  cancelButtonText: { fontWeight: '700', color: colors.text },
  saveButton: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: radius.card, backgroundColor: colors.gold },
  saveButtonText: { fontWeight: '700', color: colors.white },
  commentSection: { marginTop: spacing.xl, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.lg },
  commentTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  commentRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  commentHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  commentAuthor: { fontSize: 12, fontWeight: '700', color: colors.text },
  commentDate: { fontSize: 10, color: colors.textMuted },
  commentBody: { fontSize: 13, color: colors.text, marginTop: 2, lineHeight: 18 },
  commentInputRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  commentInput: { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 13, color: colors.text },
  commentSend: { backgroundColor: colors.gold, borderRadius: radius.pill, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  commentSendText: { color: colors.white, fontWeight: '700', fontSize: 13 },
});
