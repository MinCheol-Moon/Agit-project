import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { getAuthUserId } from '../lib/session';
import { camelizeDeep } from '../lib/caseMap';
import { Crew, Post } from '../types';
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

export async function likePost(postId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: await getAuthUserId() });
    if (error) throw error;
    return;
  }
  const post = mockPosts.find((p) => p.id === postId);
  if (post) post.likeCount += 1;
}
