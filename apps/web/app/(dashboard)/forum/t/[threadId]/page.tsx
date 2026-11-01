'use client';

import { useState, useEffect, useCallback } from 'react';
import { useConfirm } from '@/components/ui/confirm-modal';
import { useParams } from 'next/navigation';
import {
  Pin,
  Lock,
  Eye,
  Trash2,
  CheckCircle,
  Edit3,
  MessageSquare,
  ArrowLeft,
  Flame,
  Shield,
  Calendar,
  Layers,
  Clock,
} from 'lucide-react';
import { PermissionGuard } from '@/components/auth/permission-guard';
import { useAuth } from '@/hooks/use-auth';
import apiClient, { unwrap, extractErrorMessage } from '@/lib/api-client';
import PageContainer from '@/components/ui/page-container';
import Link from 'next/link';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import Button from '@/components/ui/button';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { useToast } from '@/components/ui/toast';
import { getForumAuthorName } from '@/lib/forum-author';
import { useForumRealtime } from '@/lib/hooks/use-forum-realtime';
import { ReactionBar, type ReactionState } from '@/components/forum/reaction-bar';
import { ForumComposer } from '@/components/forum/forum-composer';

interface AuthorInfo {
  id: string;
  namaLengkap: string;
  nomorAnggota: string;
  tingkat?: string | null;
  createdAt?: string;
  postCount?: number;
}

interface Post {
  id: string;
  konten: string;
  images?: string[];
  reactions?: Record<string, number>;
  currentUserEmoji?: string | null;
  createdAt: string;
  isSolution?: boolean;
  author: AuthorInfo | null;
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
  isHot?: boolean;
  viewCount: number;
  createdAt: string;
  author: AuthorInfo | null;
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
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const formatJoinDate = (value?: string) => {
  if (!value) return null;
  return new Date(value).toLocaleDateString('id-ID', {
    month: 'short',
    year: 'numeric',
  });
};

export default function ThreadDetailPage() {
  const { confirm, confirmModal } = useConfirm();
  const toast = useToast();
  const params = useParams();
  const threadId = params.threadId as string;
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
          <p className="font-semibold text-text">Thread tidak ditemukan</p>
          <p className="text-sm text-muted mt-1">
            Thread mungkin telah dihapus atau tautannya tidak valid.
          </p>
          <Link
            href="/forum"
            className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-primary hover:underline"
          >
            <ArrowLeft size={14} /> Kembali ke Forum
          </Link>
        </div>
      </PageContainer>
    );

  const threadAuthorName = getForumAuthorName(thread.author, thread.authorName);
  const threadAuthorTingkat = thread.author?.tingkat;
  const threadAuthorPostCount = thread.author?.postCount ?? 0;
  const threadAuthorJoinDate = formatJoinDate(thread.author?.createdAt);

  return (
    <PermissionGuard module="forum" action="view">
      <Breadcrumbs suffix={{ href: '#', label: thread.judul || 'Detail' }} />
      <PageContainer>
        {/* ── Thread Header Bar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/70">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/forum/c/${thread.category.id}`}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-container text-primary-on-container text-xs font-semibold hover:opacity-85 transition-opacity"
            >
              <ArrowLeft size={12} /> {thread.category.nama}
            </Link>
            {thread.isPinned && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-primary-container text-primary-on-container">
                <Pin size={11} fill="currentColor" /> Sematan
              </span>
            )}
            {thread.isHot && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Flame size={11} fill="currentColor" /> HOT
              </span>
            )}
            {thread.isLocked && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-error-50 dark:bg-error-950 text-error border border-error/20">
                <Lock size={11} /> Terkunci
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <Eye size={13} /> {thread.viewCount} dilihat
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageSquare size={13} /> {thread.posts.length} balasan
            </span>
            {canModerate && (
              <div className="flex items-center gap-1 ml-2 pl-2 border-l border-border">
                <button
                  onClick={handlePin}
                  className={`p-1.5 rounded-lg transition-colors ${
                    thread.isPinned
                      ? 'text-primary bg-primary-container'
                      : 'text-muted hover:text-primary hover:bg-surface-variant'
                  }`}
                  title={thread.isPinned ? 'Lepas sematan' : 'Sematkan thread'}
                  aria-label="Sematkan thread"
                >
                  <Pin size={15} fill={thread.isPinned ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={handleLock}
                  className={`p-1.5 rounded-lg transition-colors ${
                    thread.isLocked
                      ? 'text-error bg-error-50 dark:bg-error-950'
                      : 'text-muted hover:text-error hover:bg-surface-variant'
                  }`}
                  title={thread.isLocked ? 'Buka kunci' : 'Kunci thread'}
                  aria-label="Kunci thread"
                >
                  <Lock size={15} fill={thread.isLocked ? 'currentColor' : 'none'} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── OP Thread (Kaskus / iOsGods Author Rail Blend) ── */}
        <article className="bg-surface rounded-xl border border-border shadow-elegant overflow-hidden">
          {/* Title Banner */}
          <div className="px-5 py-4 bg-surface-variant/40 border-b border-border">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text leading-snug">
              {thread.judul}
            </h1>
          </div>

          <div className="flex flex-col sm:flex-row">
            {/* Left Column: Author Rail */}
            <aside className="sm:w-52 shrink-0 p-5 bg-surface-variant/20 border-b sm:border-b-0 sm:border-r border-border flex sm:flex-col items-center sm:items-center gap-3.5 text-center">
              <MemberAvatar name={threadAuthorName} className="w-14 h-14 text-lg shadow-sm" />
              <div className="flex-1 sm:flex-initial text-left sm:text-center min-w-0">
                <div className="font-bold text-sm text-text truncate">{threadAuthorName}</div>
                {threadAuthorTingkat && (
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-primary-container text-primary-on-container">
                    <Shield size={10} /> {threadAuthorTingkat}
                  </span>
                )}
                <div className="mt-2 space-y-0.5 text-[11px] text-muted">
                  {thread.author?.nomorAnggota && (
                    <div className="truncate">No: {thread.author.nomorAnggota}</div>
                  )}
                  {threadAuthorPostCount > 0 && (
                    <div className="inline-flex items-center gap-1">
                      <Layers size={10} /> {threadAuthorPostCount} Postingan
                    </div>
                  )}
                  {threadAuthorJoinDate && (
                    <div className="inline-flex items-center gap-1">
                      <Calendar size={10} /> {threadAuthorJoinDate}
                    </div>
                  )}
                </div>
              </div>
            </aside>

            {/* Right Column: Content Body */}
            <div className="flex-1 p-5 sm:p-6 min-w-0 flex flex-col justify-between">
              <div>
                {/* Meta sub-bar */}
                <div className="flex items-center justify-between text-xs text-muted pb-3 mb-4 border-b border-border/60">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock size={12} />
                    Diposting pada {formatDate(thread.createdAt)}
                  </span>
                  <span className="font-semibold text-primary text-[11px] px-2 py-0.5 rounded bg-primary-container">
                    #1 (OP)
                  </span>
                </div>

                {/* Content */}
                <div className="text-[15px] leading-relaxed text-text/95 whitespace-pre-wrap">
                  {thread.konten}
                </div>
                <ImageGrid images={thread.images} />
              </div>

              <div className="mt-6 pt-4 border-t border-border/60">
                <ReactionBar
                  targetType="thread"
                  targetId={thread.id}
                  reactions={thread.reactions}
                  currentUserEmoji={thread.currentUserEmoji}
                  onChange={handleThreadReaction}
                />
              </div>
            </div>
          </div>
        </article>

        {/* ── Replies Section ── */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-text flex items-center gap-2">
              <MessageSquare size={18} className="text-primary" />
              Balasan Diskusi
              <span className="inline-flex items-center justify-center rounded-full bg-surface-variant px-2.5 py-0.5 text-xs font-semibold text-muted">
                {thread.posts.length}
              </span>
            </h2>
          </div>

          <div className="space-y-4 mb-6">
            {thread.posts.map((post, index) => {
              const postAuthorName = getForumAuthorName(post.author, post.authorName);
              const postAuthorTingkat = post.author?.tingkat;
              const postAuthorPostCount = post.author?.postCount ?? 0;
              const postAuthorJoinDate = formatJoinDate(post.author?.createdAt);

              return (
                <div
                  key={post.id}
                  className={`bg-surface rounded-xl border shadow-elegant overflow-hidden transition-shadow ${
                    post.isSolution
                      ? 'border-success-300 dark:border-success-800 ring-2 ring-success-200 dark:ring-success-900 bg-success-50/20'
                      : 'border-border'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row">
                    {/* Left: Author Rail */}
                    <aside className="sm:w-52 shrink-0 p-4 sm:p-5 bg-surface-variant/20 border-b sm:border-b-0 sm:border-r border-border flex sm:flex-col items-center sm:items-center gap-3 text-center">
                      <MemberAvatar name={postAuthorName} className="w-12 h-12 text-base shadow-sm" />
                      <div className="flex-1 sm:flex-initial text-left sm:text-center min-w-0">
                        <div className="font-bold text-sm text-text truncate">{postAuthorName}</div>
                        {postAuthorTingkat && (
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-primary-container text-primary-on-container">
                            <Shield size={9} /> {postAuthorTingkat}
                          </span>
                        )}
                        <div className="mt-1.5 space-y-0.5 text-[11px] text-muted">
                          {post.author?.nomorAnggota && (
                            <div className="truncate">No: {post.author.nomorAnggota}</div>
                          )}
                          {postAuthorPostCount > 0 && (
                            <div>{postAuthorPostCount} Postingan</div>
                          )}
                          {postAuthorJoinDate && <div>Bergabung {postAuthorJoinDate}</div>}
                        </div>
                      </div>
                    </aside>

                    {/* Right: Post Content */}
                    <div className="flex-1 p-4 sm:p-5 min-w-0 flex flex-col justify-between">
                      <div>
                        {/* Post Header Line */}
                        <div className="flex items-center justify-between text-xs text-muted pb-2.5 mb-3 border-b border-border/50">
                          <div className="flex items-center gap-2">
                            <span>{formatShortDate(post.createdAt)}</span>
                            {post.isSolution && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-success-50 dark:bg-success-950 text-success-600 border border-success-200 dark:border-success-800">
                                <CheckCircle size={10} fill="currentColor" /> SOLUSI TERPILIH
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-medium text-muted">#{index + 2}</span>
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => startEditPost(post)}
                                className="p-1 text-muted hover:text-primary hover:bg-surface-variant rounded transition-colors"
                                title="Edit balasan"
                                aria-label="Edit balasan"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                onClick={() => handleMarkSolution(post.id)}
                                className={`p-1 rounded transition-colors ${
                                  post.isSolution
                                    ? 'text-success-600 bg-success-50 dark:bg-success-950'
                                    : 'text-muted hover:text-success-600 hover:bg-surface-variant'
                                }`}
                                title={post.isSolution ? 'Solusi terpilih' : 'Tandai solusi'}
                                aria-label="Tandai solusi"
                              >
                                <CheckCircle size={13} fill={post.isSolution ? 'currentColor' : 'none'} />
                              </button>
                              <button
                                onClick={() => handleDeletePost(post.id)}
                                className="p-1 text-muted hover:text-error hover:bg-surface-variant rounded transition-colors"
                                title="Hapus balasan"
                                aria-label="Hapus balasan"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {editingPostId === post.id ? (
                          <div className="space-y-2 mt-2">
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
                            <div className="text-sm leading-relaxed text-text/90 whitespace-pre-wrap">
                              {post.konten}
                            </div>
                            <ImageGrid images={post.images} />
                          </>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-border/50">
                        <ReactionBar
                          compact
                          targetType="post"
                          targetId={post.id}
                          reactions={post.reactions}
                          currentUserEmoji={post.currentUserEmoji}
                          onChange={(next) => handlePostReaction(post.id, next)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {thread.posts.length === 0 && (
              <div className="text-center py-12 bg-surface rounded-xl border border-dashed border-border">
                <MessageSquare size={24} className="mx-auto text-muted/60 mb-2" />
                <p className="text-sm font-semibold text-text">Belum ada balasan</p>
                <p className="text-xs text-muted mt-0.5">
                  Jadilah anggota pertama yang merespons topik ini.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Quick Reply Composer ── */}
        {!thread.isLocked ? (
          <div className="bg-surface rounded-xl border border-border shadow-elegant p-5">
            <h3 className="text-sm font-bold text-text mb-3 flex items-center gap-1.5">
              <MessageSquare size={15} className="text-primary" />
              Tulis Balasan Cepat
            </h3>
            <ForumComposer
              value={reply}
              onChange={setReply}
              onSubmit={handleReply}
              submitLabel="Kirim Balasan"
              submitting={submitting}
              placeholder="Tulis balasan Anda... gunakan @ untuk mention anggota lain"
              rows={3}
            />
          </div>
        ) : (
          <div className="text-center py-4 bg-surface-variant rounded-xl border border-border text-sm text-muted flex items-center justify-center gap-2">
            <Lock size={15} /> Thread ini dikunci oleh pengurus — balasan baru tidak dapat dikirim.
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
