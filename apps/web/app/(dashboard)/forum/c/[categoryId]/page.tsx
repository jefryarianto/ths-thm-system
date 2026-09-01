'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { MessageSquare, Pin, Eye, ArrowLeft, Plus, Search, RefreshCw } from 'lucide-react';
import apiClient from '@/lib/api-client';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import Link from 'next/link';
import { useDebounce } from '@/lib/hooks/use-debounce';


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

  useEffect(() => {
    (async () => {
      try {
        const [threadsRes, catsRes] = await Promise.all([
          apiClient.get(`/forum/categories/${categoryId}/threads`, {
            params: debouncedSearch ? { search: debouncedSearch } : undefined,
          }),
          apiClient.get('/forum/categories'),
        ]);
        if (threadsRes.data.success) setThreads(threadsRes.data.data);
        if (catsRes.data.success) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cat = catsRes.data.data.find((c: any) => c.id === categoryId);
          if (cat) setCategoryName(cat.nama);
        }
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, [categoryId, debouncedSearch]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const [threadsRes, catsRes] = await Promise.all([
        apiClient.get(`/forum/categories/${categoryId}/threads`, {
          params: debouncedSearch ? { search: debouncedSearch } : undefined,
        }),
        apiClient.get('/forum/categories'),
      ]);
      if (threadsRes.data.success) setThreads(threadsRes.data.data);
      if (catsRes.data.success) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cat = catsRes.data.data.find((c: any) => c.id === categoryId);
        if (cat) setCategoryName(cat.nama);
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  return (
      <PermissionGuard module="forum" action="view">
        <PageContainer>
              <PageHeader title={`${categoryName || 'Kategori'} (${threads.length} thread)`} onRefresh={handleRefresh}>
                <Link
                  href="/forum/new"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Plus size={16} /> Buat Thread
                </Link>
              </PageHeader>

              <div className="flex items-center gap-2 mb-4">
                <Link
                  href="/forum"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  <ArrowLeft size={14} /> Forum
                </Link>
                <span className="text-gray-400">/</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">{categoryName}</span>
              </div>

              <div className="mb-4">
                <div className="relative max-w-md">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari thread..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {loading ? (
                <div className="text-center py-16 text-gray-500">Memuat...</div>
              ) : (
                <div className="space-y-2">
                  {threads.map((t) => (
                    <Link
                      key={t.id}
                      href={`/forum/t/${t.id}`}
                      className="block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg mt-0.5">
                          <MessageSquare size={16} className="text-gray-500 dark:text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {t.isPinned && <Pin size={14} className="text-blue-500" />}
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {t.judul}
                            </h3>
                            {t.isLocked && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded">
                                Dikunci
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                            {t.konten}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                            <span>{t.author.namaLengkap}</span>
                            <span>·</span>
                            <span>{new Date(t.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <MessageSquare size={10} /> {t._count.posts} balasan
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye size={10} /> {t.viewCount}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                  {threads.length === 0 && (
                    <div className="text-center py-16 text-gray-400">
                      <MessageSquare size={48} className="mx-auto mb-4 opacity-30" />
                      <p>
                        {debouncedSearch
                          ? 'Tidak ada thread yang sesuai pencarian'
                          : 'Belum ada thread di kategori ini'}
                      </p>
                    </div>
                  )}
                </div>
              )}
        </PageContainer>
      </PermissionGuard>
    );
}
