import apiClient, { unwrap } from '../lib/api-client';
import { useApi } from './use-api';
import type { ForumCategory, ForumThread, ForumPost } from '../types';

/**
 * Fetch the current user's Anggota.id (forum `authorId` references Anggota).
 * Used to compare ownership in forum screens.
 */
export function useCurrentMemberId() {
  return useApi<string | null>(
    () =>
      apiClient
        .get('/members/me')
        .then((r) => {
          const member = unwrap<{ id?: string } | null>(r);
          return member?.id ?? null;
        })
        .catch(() => null),
    [],
  );
}

export function useForumCategories() {
  return useApi<ForumCategory[]>(
    () =>
      apiClient
        .get('/forum/categories')
        .then((r) => {
          const data = unwrap(r);
          return (data ?? []) as ForumCategory[];
        }),
    [],
  );
}

export function useForumThreads(categoryId: string, search?: string) {
  return useApi<ForumThread[]>(
    () =>
      apiClient
        .get(`/forum/categories/${categoryId}/threads`, {
          params: search?.trim() ? { search: search.trim() } : undefined,
        })
        .then((r) => {
          const data = unwrap(r);
          return (data ?? []) as ForumThread[];
        }),
    [categoryId, search],
  );
}

export function useForumThread(id: string) {
  return useApi<ForumThread & { posts: ForumPost[] }>(
    () =>
      apiClient
        .get(`/forum/threads/${id}`)
        .then((r) => unwrap(r) as ForumThread & { posts: ForumPost[] }),
    [id],
  );
}

export async function createForumThread(
  categoryId: string,
  judul: string,
  konten: string,
) {
  const res = await apiClient.post('/forum/threads', { categoryId, judul, konten });
  return unwrap(res);
}

export async function createForumPost(threadId: string, konten: string) {
  const res = await apiClient.post(`/forum/threads/${threadId}/posts`, { konten });
  return unwrap(res);
}

export async function updateForumPost(postId: string, konten: string) {
  const res = await apiClient.patch(`/forum/posts/${postId}`, { konten });
  return unwrap(res);
}

export async function deleteForumPost(postId: string) {
  await apiClient.delete(`/forum/posts/${postId}`);
}

export async function markAsSolution(postId: string, threadId: string) {
  const res = await apiClient.patch(`/forum/posts/${postId}/solution?threadId=${threadId}`);
  return unwrap(res);
}

export async function togglePinThread(threadId: string) {
  const res = await apiClient.patch(`/forum/threads/${threadId}/pin`);
  return unwrap(res);
}

export async function toggleLockThread(threadId: string) {
  const res = await apiClient.patch(`/forum/threads/${threadId}/lock`);
  return unwrap(res);
}
