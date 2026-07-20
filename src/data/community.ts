import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { getAuthUserId } from '../lib/session';
import { camelizeDeep } from '../lib/caseMap';
import { Crew, Post, PostComment } from '../types';
import { CURRENT_USER_ID, mockPosts } from './mockStore';

function countByKey(rows: { [key: string]: unknown }[] | null, key: string): Map<string, number> {
  const counts = new Map<string, number>();
  (rows ?? []).forEach((row) => {
    const id = row[key] as string;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  });
  return counts;
}

export async function listPosts(): Promise<Post[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    const posts = camelizeDeep<Post[]>(data ?? []);

    // likeCount/commentCount aren't columns; count post_likes/comments client-side.
    const [{ data: likeRows, error: likeError }, { data: commentRows, error: commentError }] = await Promise.all([
      supabase.from('post_likes').select('post_id'),
      supabase.from('comments').select('post_id'),
    ]);
    if (likeError) throw likeError;
    if (commentError) throw commentError;
    const likeCounts = countByKey(likeRows, 'post_id');
    const commentCounts = countByKey(commentRows, 'post_id');

    return posts.map((p) => ({ ...p, likeCount: likeCounts.get(p.id) ?? 0, commentCount: commentCounts.get(p.id) ?? 0 }));
  }
  return [...mockPosts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listPopularPosts(): Promise<Post[]> {
  const posts = await listPosts();
  return [...posts].sort((a, b) => b.likeCount - a.likeCount).slice(0, 3);
}

export async function createPost(input: { title: string; body: string; crew?: Crew; imageUrl?: string }): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('posts').insert({
      user_id: await getAuthUserId(),
      crew: input.crew,
      title: input.title,
      body: input.body,
      image_url: input.imageUrl,
    });
    if (error) throw error;
    return;
  }
  mockPosts.push({
    id: `p-${Date.now()}`,
    userId: CURRENT_USER_ID,
    crew: input.crew,
    title: input.title,
    body: input.body,
    imageUrl: input.imageUrl,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0,
  });
}

export async function updatePost(postId: string, input: { title: string; body: string }): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    // ponytail: RLS blocks show up as a silent 0-row write, not an error.
    // .select() + a length check turns that into a real failure the UI can show.
    const { data, error } = await supabase
      .from('posts')
      .update({ title: input.title, body: input.body })
      .eq('id', postId)
      .select('id');
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('수정 권한이 없거나 서버 설정(마이그레이션)이 아직 반영되지 않았어요.');
    return;
  }
  const post = mockPosts.find((p) => p.id === postId);
  if (post) {
    post.title = input.title;
    post.body = input.body;
  }
}

export async function deletePost(postId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('posts').delete().eq('id', postId).select('id');
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('삭제 권한이 없거나 서버 설정(마이그레이션)이 아직 반영되지 않았어요.');
    return;
  }
  const idx = mockPosts.findIndex((p) => p.id === postId);
  if (idx >= 0) mockPosts.splice(idx, 1);
}

export async function listComments(postId: string): Promise<PostComment[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('comments').select('*').eq('post_id', postId).order('created_at');
    if (error) throw error;
    return camelizeDeep<PostComment[]>(data ?? []);
  }
  return [];
}

export async function addComment(postId: string, body: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('comments').insert({ post_id: postId, user_id: await getAuthUserId(), body });
    if (error) throw error;
    return;
  }
}

export async function deleteComment(commentId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('comments').delete().eq('id', commentId).select('id');
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('삭제 권한이 없어요.');
    return;
  }
}

// Uploads a photo to the public post-images bucket and returns its URL.
export async function uploadPostImage(fileUri: string): Promise<string> {
  if (isSupabaseConfigured && supabase) {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('로그인이 필요합니다.');
    const path = `${userId}/${Date.now()}.jpg`;
    const response = await fetch(fileUri);
    const blob = await response.blob();
    const { error: uploadError } = await supabase.storage
      .from('post-images')
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('post-images').getPublicUrl(path);
    return data.publicUrl;
  }
  return fileUri;
}

export async function likePost(postId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: await getAuthUserId() });
    if (error) throw error;
    return;
  }
  const post = mockPosts.find((p) => p.id === postId);
  if (post) post.likeCount += 1;
}
