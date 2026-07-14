import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { Crew, Post } from '../types';
import { CURRENT_USER_ID, mockPosts } from './mockStore';

export async function listPosts(): Promise<Post[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data as Post[];
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
      user_id: CURRENT_USER_ID,
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
    const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: CURRENT_USER_ID });
    if (error) throw error;
    return;
  }
  const post = mockPosts.find((p) => p.id === postId);
  if (post) post.likeCount += 1;
}
