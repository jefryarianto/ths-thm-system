'use client';

import { useState, useEffect } from 'react';
import { useConfirm } from '@/components/ui/confirm-modal';
import { useParams } from 'next/navigation';
import { Pin, Lock, Eye, Trash2, Send, CheckCircle, Edit3, X } from 'lucide-react';
import { PermissionGuard } from '@/components/auth/permission-guard';
import apiClient from '@/lib/api-client';
import PageContainer from '@/components/ui/page-container';
import Link from 'next/link';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import { useToast } from '@/components/ui/toast';

interface Post {
  id: string;
  konten: string;
  createdAt: string;
  isSolution?: boolean;
  author: { id: string; namaLengkap: string; nomorAnggota: string };
}

interface Thread {
  id: string;
  judul: string;
  konten: string;
  isPinned: boolean;
  isLocked: boolean;
  viewCount: number;
  createdAt: string;
  author: { id: string; namaLengkap: string; nomorAnggota: string };
  category: { id: string; nama: string };
  posts: Post[];
}

export default function ThreadDetailPage() {
  const { confirm, confirmModal } = useConfirm();
  const toast = useToast();
  const params = useParams();
  const threadId = params.threadId as string;
  const [thread, setThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const fetchThread = async () => {
    try {
      const res = await apiClient.get(`/forum/threads/${threadId}`);
      if (res.data.success) setThread(res.data.data);
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  const handleReply = async () => {
    if (!reply.trim()) return;
    setSubmitting(true);
    try {
      await apiClient.post(`/forum/threads/${threadId}/posts`, { konten: reply.trim() });
      setReply('');
      await fetchThread();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    } catch (err: any) {
      toast('error', err?.response?.data?.message || 'Gagal mengirim balasan');
    }
    setSubmitting(false);
  };

  const handleDeletePost = async (postId: string) => {
    if (!(await confirm('Hapus balasan ini?'))) return;
    await apiClient.delete(`/forum/posts/${postId}`);
    await fetchThread();
  };

  const handlePin = async () => {
    await apiClient.patch(`/forum/threads/${threadId}/pin`);
    await fetchThread();
  };

  const handleLock = async () => {
    await apiClient.patch(`/forum/threads/${threadId}/lock`);
    await fetchThread();
  };

  const startEditPost = (post: Post) => {
    setEditingPostId(post.id);
    setEditContent(post.konten);
  };

  const submitEditPost = async (postId: string) => {
    if (!editContent.trim()) return;
    try {
      await apiClient.patch(`/forum/posts/${postId}`, { konten: editContent.trim() });
      setEditingPostId(null);
      setEditContent('');
      await fetchThread();
    } catch (err: any) {
      toast('error', err?.response?.data?.message || 'Gagal memperbarui balasan');
    }
  };

  const handleMarkSolution = async (postId: string) => {
    try {
      await apiClient.patch(`/forum/posts/${postId}/solution?threadId=${threadId}`);
      await fetchThread();
    } catch (err: any) {
      toast('error', err?.response?.data?.message || 'Gagal menandai solusi');
    }
  };

  if (loading)
    return (
      <PageContainer>
        <div className="text-center py-16 text-gray-500">Memuat...</div>
      </PageContainer>
    );
  if (!thread)
    return (
      <PageContainer>
        <div className="text-center py-16 text-gray-400">Thread tidak ditemukan</div>
      </PageContainer>
    );

  return (
    <PermissionGuard module="forum" action="view">
      <Breadcrumbs suffix={{ href: '#', label: thread?.judul || 'Detail' }} />
      <PageContainer>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/forum" className="hover:text-blue-600">
            Forum
          </Link>
          <span>/</span>
          <Link href={`/forum/c/${thread.category.id}`} className="hover:text-blue-600">
            {thread.category.nama}
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {thread.isPinned && <Pin size={14} className="text-blue-500" />}
                {thread.isLocked && <Lock size={14} className="text-red-500" />}
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{thread.judul}</h1>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400 mt-2">
                <span className="font-medium text-gray-600 dark:text-gray-300">
                  {thread.author.namaLengkap}
                </span>
                <span>
                  {new Date(thread.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Eye size={12} /> {thread.viewCount}
                </span>
              </div>
              <div className="mt-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {thread.konten}
              </div>
            </div>
            <div className="flex items-center gap-1 ml-4">
              <button
                onClick={handlePin}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded transition-colors"
                title={thread.isPinned ? 'Unpin' : 'Pin'}
              >
                <Pin size={16} fill={thread.isPinned ? 'currentColor' : 'none'} />
              </button>
              <button
                onClick={handleLock}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-colors"
                title={thread.isLocked ? 'Unlock' : 'Lock'}
              >
                <Lock size={16} fill={thread.isLocked ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>
        </div>

        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          {thread.posts.length} Balasan
        </h3>

        <div className="space-y-3 mb-6">
          {thread.posts.map((post) => (
            <div
              key={post.id}
              className={`bg-white dark:bg-gray-800 rounded-lg border p-4 ${
                post.isSolution
                  ? 'border-green-300 dark:border-green-700 ring-1 ring-green-200 dark:ring-green-800'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              {post.isSolution && (
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-medium mb-2">
                  <CheckCircle size={14} />
                  Solusi
                </div>
              )}
              {editingPostId === post.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-750 rounded-lg p-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditingPostId(null);
                        setEditContent('');
                      }}
                      className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => submitEditPost(post.id)}
                      disabled={!editContent.trim()}
                      className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                      Simpan
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-600">
                          {post.author.namaLengkap.charAt(0)}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {post.author.namaLengkap}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(post.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEditPost(post)}
                        className="p-1.5 text-gray-300 hover:text-blue-600 transition-colors"
                        title="Edit"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleMarkSolution(post.id)}
                        className="p-1.5 text-gray-300 hover:text-green-600 transition-colors"
                        title="Tandai Solusi"
                      >
                        <CheckCircle size={14} />
                      </button>
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {post.konten}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {!thread.isLocked && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Tulis balasan..."
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-750 rounded-lg p-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
            />
            <div className="flex justify-end mt-3">
              <button
                onClick={handleReply}
                disabled={submitting || !reply.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Send size={14} /> {submitting ? 'Mengirim...' : 'Kirim Balasan'}
              </button>
            </div>
          </div>
        )}
        {confirmModal}
      </PageContainer>
    </PermissionGuard>
  );
}
