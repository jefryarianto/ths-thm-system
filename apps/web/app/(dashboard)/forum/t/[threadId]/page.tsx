'use client';

import { useState, useEffect, useCallback } from 'react';
import { useConfirm } from '@/components/ui/confirm-modal';
import { useParams } from 'next/navigation';
import { Pin, Lock, Eye, Trash2, CheckCircle, Edit3, MessageSquare, ArrowLeft } from 'lucide-react';
import { PermissionGuard } from '@/components/auth/permission-guard';
import { useAuth } from '@/hooks/use-auth';
import apiClient, { unwrap, extractErrorMessage } from '@/lib/api-client';
import PageContainer from '@/components/ui/page-container';
import Link from 'next/link';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import Badge from '@/components/ui/badge';
import Button from '@/components/ui/button';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { useToast } from '@/components/ui/toast';
import { getForumAuthorName } from '@/lib/forum-author';
import { useForumRealtime } from '@/lib/hooks/use-forum-realtime';
import { ReactionBar, type ReactionState } from '@/components/forum/reaction-bar';
import { ForumComposer } from '@/components/forum/forum-composer';

interface Post {
  id: string;
  konten: string;
  images?: string[];
  reactions?: Record<string, number>;
  currentUserEmoji?: string | null;
  createdAt: string;
  isSolution?: boolean;
  author: { id: string; namaLengkap: string; nomorAnggota: string } | null;
  authorName?: string | null;
}

interface Thread {
  id: string;
  judul: string;
  konten: string;
  images?: string[];
  reactions?: Record<string, number>;
  currentUserEmoji?: string | null;
  isPinned: boolean;
  isLocked: boolean;
  viewCount: number;
  createdAt: string;
  author: { id: string; namaLengkap: string; nomorAnggota: string } | null;
  authorName?: string | null;
  category: { id: string; nama: string };
  posts: Post[];
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const formatShortDate = (value: string) =>
  new Date(value).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function ThreadDetailPage() {
  const { confirm, confirmModal } = useConfirm();
  const toast = useToast();
  const params = useParams();
  const threadId = params.threadId as string;
  // PATCH /forum/threads/:id/{pin,lock} hanya superadmin s/d admin_ranting.
  const { hasMinRole } = useAuth();
  const canModerate = hasMinRole('admin_ranting');
  const [thread, setThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const fetchThread = useCallback(async () => {
    try {
      const res = await apiClient.get(`/forum/threads/${threadId}`);
      const data = unwrap<Thread>(res);
      if (data) setThread(data);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [threadId]);

  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  // Update realtime: balasan/thread berubah dari pengguna lain.
  useForumRealtime({
    threadUpdated: (data) => {
      const d = (data as { thread?: Thread }).thread ?? data;
      if (d && (d as Thread).id === threadId) fetchThread();
    },
    postCreated: (data) => {
      const d = data as { threadId?: string };
      if (d?.threadId === threadId) fetchThread();
    },
    postUpdated: (data) => {
      const d = data as { threadId?: string };
      if (d?.threadId === threadId) fetchThread();
    },
    postDeleted: (data) => {
      const d = data as { threadId?: string };
      if (d?.threadId === threadId) fetchThread();
    },
    reactionUpdated: (data) => {
      const d = data as { threadId?: string | null; postId?: string | null; targetType?: string };
      if (d?.targetType === 'thread' && d.threadId === threadId) {
        fetchThread();
        return;
      }
      if (d?.targetType === 'post' && d.postId && thread?.posts.some((p) => p.id === d.postId)) {
        fetchThread();
      }
    },
  });

  const handleReply = async (content: string, images: string[]) => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await apiClient.post(`/forum/threads/${threadId}/posts`, {
        konten: content.trim(),
        ...(images.length > 0 && { images }),
      });
      setReply('');
      await fetchThread();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    } catch (err: unknown) {
      toast('error', extractErrorMessage(err, 'Gagal mengirim balasan'));
    }
    setSubmitting(false);
  };

  const handleThreadReaction = (next: ReactionState) => {
    setThread((t) => (t ? { ...t, reactions: next.reactions, currentUserEmoji: next.currentUserEmoji } : t));
  };

  const handlePostReaction = (postId: string, next: ReactionState) => {
    setThread((t) =>
      t
        ? {
            ...t,
            posts: t.posts.map((p) =>
              p.id === postId
                ? { ...p, reactions: next.reactions, currentUserEmoji: next.currentUserEmoji }
                : p,
            ),
          }
        : t,
    );
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
    } catch (err: unknown) {
      toast('error', extractErrorMessage(err, 'Gagal memperbarui balasan'));
    }
  };

  const handleMarkSolution = async (postId: string) => {
    try {
      await apiClient.patch(`/forum/posts/${postId}/solution?threadId=${threadId}`);
      await fetchThread();
    } catch (err: unknown) {
      toast('error', extractErrorMessage(err, 'Gagal menandai solusi'));
    }
  };

  if (loading)
    return (
      <PageContainer>
        <div className="space-y-4">
          <div className="h-4 w-40 bg-surface-variant rounded animate-pulse" />
          <div className="bg-surface rounded-xl border border-border p-6 animate-pulse space-y-3">
            <div className="h-5 w-2/3 bg-surface-variant rounded" />
            <div className="h-3 w-1/3 bg-surface-variant rounded" />
            <div className="h-3 w-full bg-surface-variant rounded" />
            <div className="h-3 w-5/6 bg-surface-variant rounded" />
          </div>
          <div className="bg-surface rounded-xl border border-border p-6 animate-pulse space-y-3">
            <div className="h-3 w-1/4 bg-surface-variant rounded" />
            <div className="h-3 w-full bg-surface-variant rounded" />
          </div>
        </div>
      </PageContainer>
    );
  if (!thread)
    return (
      <PageContainer>
        <div className="text-center py-16 bg-surface rounded-xl border border-border">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary-container flex items-center justify-center mb-4">
            <MessageSquare size={26} className="text-primary-on-container" />
          </div>
          <p className="font-medium text-text">Thread tidak ditemukan</p>
          <p className="text-sm text-muted mt-1">
            Thread mungkin telah dihapus atau tautannya tidak valid.
          </p>
          <Link
            href="/forum"
            className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-link hover:underline"
          >
            <ArrowLeft size={14} /> Kembali ke Forum
          </Link>
        </div>
      </PageContainer>
    );

  const threadAuthorName = getForumAuthorName(thread.author, thread.authorName);

  return (
    <PermissionGuard module="forum" action="view">
      <Breadcrumbs suffix={{ href: '#', label: thread.judul || 'Detail' }} />
      <PageContainer>
        {/* ── Header thread ─────────────────────────────── */}
        <article className="bg-surface rounded-xl border border-border shadow-elegant overflow-hidden">
          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/forum/c/${thread.category.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary-container text-primary-on-container px-3 py-1 text-xs font-semibold hover:opacity-80 transition-opacity"
                  >
                    {thread.category.nama}
                  </Link>
                  {thread.isPinned && <Badge variant="primary" label="Disematkan" />}
                  {thread.isLocked && <Badge variant="danger" label="Dikunci" />}
                </div>
                <h1 className="mt-2.5 text-xl sm:text-2xl font-bold tracking-tight text-text leading-snug">
                  {thread.judul}
                </h1>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
                  <span className="inline-flex items-center gap-2">
                    <MemberAvatar name={threadAuthorName} className="w-7 h-7" textClassName="text-[10px]" />
                    <span className="font-semibold text-text">{threadAuthorName}</span>
                  </span>
                  <span>{formatDate(thread.createdAt)}</span>
                  <span className="inline-flex items-center gap-1">
                    <Eye size={13} /> {thread.viewCount} dilihat
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare size={13} /> {thread.posts.length} balasan
                  </span>
                </div>
              </div>

              {canModerate && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={handlePin}
                    className={`p-2 rounded-lg transition-colors ${
                      thread.isPinned
                        ? 'text-primary bg-primary-container'
                        : 'text-muted hover:text-primary hover:bg-surface-variant'
                    }`}
                    title={thread.isPinned ? 'Lepas sematan' : 'Sematkan thread'}
                    aria-label={thread.isPinned ? 'Lepas sematan' : 'Sematkan thread'}
                  >
                    <Pin size={16} fill={thread.isPinned ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    onClick={handleLock}
                    className={`p-2 rounded-lg transition-colors ${
                      thread.isLocked
                        ? 'text-error bg-error-50 dark:bg-error-950'
                        : 'text-muted hover:text-error hover:bg-surface-variant'
                    }`}
                    title={thread.isLocked ? 'Buka kunci' : 'Kunci thread'}
                    aria-label={thread.isLocked ? 'Buka kunci' : 'Kunci thread'}
                  >
                    <Lock size={16} fill={thread.isLocked ? 'currentColor' : 'none'} />
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4 text-[15px] leading-7 text-text/90 whitespace-pre-wrap">
              {thread.konten}
            </div>
            <ImageGrid images={thread.images} />
            <ReactionBar
              targetType="thread"
              targetId={thread.id}
              reactions={thread.reactions}
              currentUserEmoji={thread.currentUserEmoji}
              onChange={handleThreadReaction}
            />
          </div>
        </article>

        {/* ── Balasan ───────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text flex items-center gap-2">
            Balasan
            <span className="inline-flex items-center justify-center rounded-full bg-surface-variant px-2 py-0.5 text-xs font-semibold text-muted">
              {thread.posts.length}
            </span>
          </h3>
        </div>

        <div className="space-y-3 mb-6">
          {thread.posts.map((post) => {
            const postAuthorName = getForumAuthorName(post.author, post.authorName);
            return (
              <div
                key={post.id}
                className={`bg-surface rounded-xl border p-4 sm:p-5 transition-shadow hover:shadow-elegant ${
                  post.isSolution
                    ? 'border-success-300 dark:border-success-800 ring-1 ring-success-200 dark:ring-success-900 bg-success-50/40 dark:bg-success-950/30'
                    : 'border-border shadow-elegant'
                }`}
              >
                {post.isSolution && (
                  <div className="mb-3">
                    <Badge variant="success" label="Solusi Terpilih" />
                  </div>
                )}
                {editingPostId === post.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full bg-surface border border-border rounded-lg p-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                      rows={3}
                      aria-label="Edit balasan"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingPostId(null);
                          setEditContent('');
                        }}
                      >
                        Batal
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => submitEditPost(post.id)}
                        disabled={!editContent.trim()}
                      >
                        Simpan
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <MemberAvatar name={postAuthorName} className="w-8 h-8" textClassName="text-xs" />
                        <div className="min-w-0">
                          <span className="text-sm font-semibold text-text block truncate">
                            {postAuthorName}
                          </span>
                          <span className="text-xs text-muted">{formatShortDate(post.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => startEditPost(post)}
                          className="p-1.5 text-muted hover:text-primary hover:bg-surface-variant rounded-lg transition-colors"
                          title="Edit balasan"
                          aria-label="Edit balasan"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleMarkSolution(post.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            post.isSolution
                              ? 'text-success-600 bg-success-50 dark:bg-success-950'
                              : 'text-muted hover:text-success-600 hover:bg-surface-variant'
                          }`}
                          title={post.isSolution ? 'Solusi sudah ditandai' : 'Tandai sebagai solusi'}
                          aria-label="Tandai sebagai solusi"
                        >
                          <CheckCircle size={14} fill={post.isSolution ? 'currentColor' : 'none'} />
                        </button>
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="p-1.5 text-muted hover:text-error hover:bg-surface-variant rounded-lg transition-colors"
                          title="Hapus balasan"
                          aria-label="Hapus balasan"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 text-sm leading-7 text-text/90 whitespace-pre-wrap">
                      {post.konten}
                    </div>
                    <ImageGrid images={post.images} />
                    <ReactionBar
                      compact
                      targetType="post"
                      targetId={post.id}
                      reactions={post.reactions}
                      currentUserEmoji={post.currentUserEmoji}
                      onChange={(next) => handlePostReaction(post.id, next)}
                    />
                  </>
                )}
              </div>
            );
          })}

          {thread.posts.length === 0 && (
            <div className="text-center py-10 bg-surface rounded-xl border border-dashed border-border">
              <p className="text-sm text-muted">
                Belum ada balasan. Jadilah yang pertama merespons.
              </p>
            </div>
          )}
        </div>

        {!thread.isLocked ? (
          <div className="bg-surface rounded-xl border border-border shadow-elegant p-4 sm:p-5">
            <ForumComposer
              value={reply}
              onChange={setReply}
              onSubmit={handleReply}
              submitLabel="Kirim Balasan"
              submitting={submitting}
              placeholder="Tulis balasan... gunakan @ untuk mention anggota"
              rows={3}
            />
          </div>
        ) : (
          <div className="text-center py-4 bg-surface-variant rounded-xl border border-border text-sm text-muted">
            Thread ini dikunci — balasan baru tidak dapat dikirim.
          </div>
        )}
        {confirmModal}
      </PageContainer>
    </PermissionGuard>
  );
}

function ImageGrid({ images }: { images?: string[] }) {
  if (!images || images.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {images.map((url) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-24 h-24 rounded-lg overflow-hidden border border-border hover:opacity-80 transition-opacity"
        >
          <img src={url} alt="Lampiran" className="w-full h-full object-cover" />
        </a>
      ))}
    </div>
  );
}
