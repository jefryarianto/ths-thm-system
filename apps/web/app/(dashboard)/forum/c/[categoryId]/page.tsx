'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  MessageSquare,
  Eye,
  ArrowLeft,
  Plus,
  Search,
  FolderOpen,
  Pin,
  Flame,
  Lock,
  Clock,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';
import apiClient, { unwrap } from '@/lib/api-client';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import { MemberAvatar } from '@/components/ui/member-avatar';
import Link from 'next/link';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { getForumAuthorName } from '@/lib/forum-author';
import { useForumRealtime } from '@/lib/hooks/use-forum-realtime';

interface Thread {
  id: string;
  judul: string;
  konten: string;
  isPinned: boolean;
  isLocked: boolean;
  isHot?: boolean;
  viewCount: number;
  authorPostCount?: number;
  createdAt: string;
  author: {
    id: string;
    namaLengkap: string;
    nomorAnggota: string;
    tingkat?: string | null;
    createdAt?: string;
  } | null;
  authorName?: string | null;
  category: { id: string; nama: string };
  _count: { posts: number };
  lastPost?: {
    createdAt: string;
    authorName: string;
    authorNomorAnggota?: string | null;
    authorTingkat?: string | null;
  } | null;
}

interface Category {
  id: string;
  nama: string;
  _count?: { threads: number };
}

export default function CategoryThreadsPage() {
  const params = useParams();
  const categoryId = params.categoryId as string;
  const [threads, setThreads] = useState<Thread[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryName, setCategoryName] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const loadThreads = async (targetPage = page) => {
    try {
      const [threadsRes, catsRes] = await Promise.all([
        apiClient.get(`/forum/categories/${categoryId}/threads`, {
          params: {
            ...(debouncedSearch ? { search: debouncedSearch } : {}),
            page: targetPage,
            limit: 20,
          },
        }),
        apiClient.get('/forum/categories'),
      ]);
      const threadsData = unwrap<Thread[]>(threadsRes);
      if (threadsData) setThreads(threadsData);

      const meta = threadsRes.data?.meta;
      if (meta?.totalPages) {
        setTotalPages(meta.totalPages);
      }

      const catsData = unwrap<Category[]>(catsRes);
      if (catsData) {
        setCategories(catsData);
        const cat = catsData.find((c) => c.id === categoryId);
        if (cat) setCategoryName(cat.nama);
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  useEffect(() => {
    setPage(1);
    loadThreads(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, debouncedSearch]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    setLoading(true);
    loadThreads(newPage);
  };

  // Update realtime: thread baru/berubah/hapus dari pengguna lain.
  useForumRealtime({
    threadCreated: (data) => {
      const d = (data as { thread?: Thread }).thread ?? data;
      const t = d as Thread;
      if (t && t.category?.id === categoryId) {
        setThreads((prev) =>
          prev.some((x) => x.id === t.id) ? prev : [t, ...prev],
        );
      }
    },
    threadUpdated: (data) => {
      const d = (data as { thread?: Thread }).thread ?? data;
      const t = d as Thread;
      if (t && t.category?.id === categoryId) {
        setThreads((prev) =>
          prev.map((x) => (x.id === t.id ? t : x)),
        );
      }
    },
    threadDeleted: (data) => {
      const d = data as { id?: string; categoryId?: string };
      if (d && d.categoryId === categoryId && d.id) {
        setThreads((prev) => prev.filter((x) => x.id !== d.id));
      }
    },
  });

  const handleRefresh = async () => {
    setLoading(true);
    await loadThreads(page);
  };

  return (
    <PermissionGuard module="forum" action="view">
      <PageContainer>
        <PageHeader
          title={categoryName || 'Kategori Forum'}
          subtitle={
            loading
              ? 'Memuat diskusi…'
              : `${threads.length} thread ditampilkan${search ? ' • hasil pencarian' : ''}`
          }
          onRefresh={handleRefresh}
        >
          <Link
            href="/forum/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-sm font-semibold rounded-lg shadow-elegant transition-all hover:shadow-elegant-md"
          >
            <Plus size={16} /> Buat Thread
          </Link>
        </PageHeader>

        {/* ── Category Chips Strip (Kaskus / iOsGods Tab style) ── */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <Link
              href="/forum"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-surface text-muted hover:text-text hover:border-primary/40 transition-colors shrink-0"
            >
              <ArrowLeft size={12} /> Semua
            </Link>
            {categories.map((c) => {
              const active = c.id === categoryId;
              return (
                <Link
                  key={c.id}
                  href={`/forum/c/${c.id}`}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
                    active
                      ? 'bg-primary text-white shadow-elegant ring-2 ring-primary/20'
                      : 'bg-surface border border-border text-muted hover:text-text hover:border-primary/40'
                  }`}
                >
                  <span>{c.nama}</span>
                  {c._count?.threads !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-surface-variant text-muted'
                      }`}
                    >
                      {c._count.threads}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari topik diskusi atau konten…"
            aria-label="Cari thread"
            className="w-full pl-9 pr-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-text placeholder:text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
          />
        </div>

        {/* ── Thread List Container (Dense Kaskus / iOsGods Table Blend) ── */}
        <div className="bg-surface rounded-xl border border-border shadow-elegant overflow-hidden">
          {/* Table Header Row (Hidden on mobile) */}
          <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-5 py-3 bg-surface-variant/70 border-b border-border text-xs font-semibold text-muted uppercase tracking-wider">
            <div className="sm:col-span-7">Topik & Penulis</div>
            <div className="sm:col-span-2 text-center">Statistik</div>
            <div className="sm:col-span-3 text-right">Terakhir Dibalas</div>
          </div>

          {loading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 sm:p-5 flex items-center gap-4 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-surface-variant shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/2 bg-surface-variant rounded" />
                    <div className="h-3 w-1/4 bg-surface-variant rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {threads.map((t) => {
                const authorName = getForumAuthorName(t.author, t.authorName);
                const tingkat = t.author?.tingkat;
                const postCount = t.authorPostCount ?? 0;

                return (
                  <Link
                    key={t.id}
                    href={`/forum/t/${t.id}`}
                    className="group block p-4 sm:p-5 transition-colors duration-150 hover:bg-surface-variant/35 focus-visible:outline-none focus-visible:bg-surface-variant/50"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                      {/* Left: Author Avatar + Title + Badges + Meta */}
                      <div className="sm:col-span-7 flex items-start gap-3.5 min-w-0">
                        <MemberAvatar name={authorName} className="w-10 h-10 mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {t.isPinned && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-primary-container text-primary-on-container">
                                <Pin size={11} fill="currentColor" /> Sematan
                              </span>
                            )}
                            {t.isHot && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                <Flame size={11} fill="currentColor" /> HOT
                              </span>
                            )}
                            {t.isLocked && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-error-50 dark:bg-error-950 text-error border border-error/20">
                                <Lock size={11} /> Kunci
                              </span>
                            )}
                            <h3 className="text-[15px] font-bold text-text group-hover:text-primary transition-colors leading-snug">
                              {t.judul}
                            </h3>
                          </div>

                          <p className="text-xs text-muted mt-1 line-clamp-1 leading-relaxed">
                            {t.konten}
                          </p>

                          {/* Author & Creation Info */}
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted flex-wrap">
                            <span className="font-semibold text-text/90">{authorName}</span>
                            {tingkat && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-primary-container text-primary-on-container">
                                <Shield size={9} /> {tingkat}
                              </span>
                            )}
                            {postCount > 0 && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-variant font-medium text-muted">
                                {postCount} post
                              </span>
                            )}
                            <span>•</span>
                            <span className="inline-flex items-center gap-1">
                              <Clock size={11} />
                              {new Date(t.createdAt).toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Reply & View counts */}
                      <div className="sm:col-span-2 flex sm:flex-col sm:items-center justify-between sm:justify-center text-xs text-muted gap-1 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/50">
                        <span className="inline-flex items-center gap-1 font-semibold text-text/90">
                          <MessageSquare size={13} className="text-primary" />
                          {t._count.posts}{' '}
                          <span className="sm:hidden font-normal text-muted">balasan</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted">
                          <Eye size={12} /> {t.viewCount}{' '}
                          <span className="sm:hidden font-normal">views</span>
                        </span>
                      </div>

                      {/* Right: Last Post Info (Classic Kaskus / iOsGods staple) */}
                      <div className="sm:col-span-3 text-left sm:text-right text-xs text-muted">
                        {t.lastPost ? (
                          <div className="space-y-0.5">
                            <div className="font-medium text-text/85 truncate">
                              {t.lastPost.authorName}
                            </div>
                            <div className="text-[11px] text-muted">
                              {new Date(t.lastPost.createdAt).toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted/70 italic">Belum ada balasan</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}

              {threads.length === 0 && (
                <div className="text-center py-16 px-4">
                  <div className="mx-auto w-14 h-14 rounded-full bg-primary-container flex items-center justify-center mb-4">
                    <FolderOpen size={26} className="text-primary-on-container" />
                  </div>
                  <p className="font-semibold text-text">
                    {debouncedSearch
                      ? 'Tidak ada thread yang sesuai pencarian'
                      : 'Belum ada thread di kategori ini'}
                  </p>
                  <p className="text-xs text-muted mt-1">
                    {debouncedSearch
                      ? 'Coba kata kunci lain atau periksa ejaan.'
                      : 'Mulai percakapan baru di kategori ini sekarang.'}
                  </p>
                  {!debouncedSearch && (
                    <Link
                      href="/forum/new"
                      className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-sm font-semibold rounded-lg shadow-elegant transition-all"
                    >
                      <Plus size={15} /> Buat Thread Pertama
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Pagination Bar ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-surface text-xs font-semibold text-text hover:bg-surface-variant transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft size={14} /> Sebelumnya
            </button>
            <span className="text-xs font-medium text-muted">
              Halaman <span className="font-semibold text-text">{page}</span> dari {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-surface text-xs font-semibold text-text hover:bg-surface-variant transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              Selanjutnya <ChevronRight size={14} />
            </button>
          </div>
        )}
      </PageContainer>
    </PermissionGuard>
  );
}
