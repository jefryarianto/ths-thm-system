'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { MessageSquare, Eye, ArrowLeft, Plus, Search, FolderOpen } from 'lucide-react';
import apiClient, { unwrap } from '@/lib/api-client';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import Badge from '@/components/ui/badge';
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
  viewCount: number;
  createdAt: string;
  author: { id: string; namaLengkap: string; nomorAnggota: string } | null;
  authorName?: string | null;
  category: { id: string; nama: string };
  _count: { posts: number };
}

export default function CategoryThreadsPage() {
  const params = useParams();
  const categoryId = params.categoryId as string;
  const [threads, setThreads] = useState<Thread[]>([]);
  const [categoryName, setCategoryName] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const loadThreads = async () => {
    try {
      const [threadsRes, catsRes] = await Promise.all([
        apiClient.get(`/forum/categories/${categoryId}/threads`, {
          params: debouncedSearch ? { search: debouncedSearch } : undefined,
        }),
        apiClient.get('/forum/categories'),
      ]);
      const threadsData = unwrap<Thread[]>(threadsRes);
      if (threadsData) setThreads(threadsData);
      const catsData = unwrap<Array<{ id: string; nama: string }>>(catsRes);
      if (catsData) {
        const cat = catsData.find((c) => c.id === categoryId);
        if (cat) setCategoryName(cat.nama);
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  useEffect(() => {
    loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, debouncedSearch]);

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
    await loadThreads();
  };

  return (
    <PermissionGuard module="forum" action="view">
      <PageContainer>
        <PageHeader
          title={categoryName || 'Kategori'}
          subtitle={
            loading
              ? 'Memuat thread…'
              : `${threads.length} thread${search ? ' • hasil pencarian' : ''}`
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

        <div className="flex items-center gap-2 text-sm text-muted">
          <Link
            href="/forum"
            className="inline-flex items-center gap-1 hover:text-primary transition-colors"
          >
            <ArrowLeft size={14} /> Forum
          </Link>
          <span>/</span>
          <span className="text-text font-medium">{categoryName}</span>
        </div>

        {/* Pencarian */}
        <div className="relative max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul atau isi thread…"
            aria-label="Cari thread"
            className="w-full pl-9 pr-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-text placeholder:text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
          />
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-surface rounded-xl border border-border p-5 animate-pulse flex gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-surface-variant shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 bg-surface-variant rounded" />
                  <div className="h-3 w-full bg-surface-variant rounded" />
                  <div className="h-3 w-1/3 bg-surface-variant rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {threads.map((t) => {
              const authorName = getForumAuthorName(t.author, t.authorName);
              return (
                <Link
                  key={t.id}
                  href={`/forum/t/${t.id}`}
                  className="group block bg-surface rounded-xl border border-border p-4 sm:p-5 shadow-elegant transition-all duration-200 hover:shadow-elegant-md hover:border-primary/30 hover:-translate-y-0.5"
                >
                  <div className="flex items-start gap-3.5">
                    <MemberAvatar name={authorName} className="w-10 h-10" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {t.isPinned && <Badge variant="primary" label="Disematkan" />}
                        {t.isLocked && <Badge variant="danger" label="Dikunci" />}
                        <h3 className="text-base font-semibold text-text group-hover:text-primary transition-colors truncate w-fit">
                          {t.judul}
                        </h3>
                      </div>
                      <p className="text-sm text-muted mt-1 line-clamp-2 leading-relaxed">
                        {t.konten}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-xs text-muted">
                        <span className="font-medium text-text/80">{authorName}</span>
                        <span>
                          {new Date(t.createdAt).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare size={12} /> {t._count.posts} balasan
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Eye size={12} /> {t.viewCount} dilihat
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}

            {threads.length === 0 && (
              <div className="text-center py-16 bg-surface rounded-xl border border-border">
                <div className="mx-auto w-14 h-14 rounded-full bg-primary-container flex items-center justify-center mb-4">
                  <FolderOpen size={26} className="text-primary-on-container" />
                </div>
                <p className="font-medium text-text">
                  {debouncedSearch
                    ? 'Tidak ada thread yang sesuai pencarian'
                    : 'Belum ada thread di kategori ini'}
                </p>
                <p className="text-sm text-muted mt-1">
                  {debouncedSearch
                    ? 'Coba kata kunci lain.'
                    : 'Jadilah yang pertama memulai diskusi.'}
                </p>
                {!debouncedSearch && (
                  <Link
                    href="/forum/new"
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-sm font-semibold rounded-lg shadow-elegant transition-all"
                  >
                    <Plus size={15} /> Buat Thread
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </PageContainer>
    </PermissionGuard>
  );
}
