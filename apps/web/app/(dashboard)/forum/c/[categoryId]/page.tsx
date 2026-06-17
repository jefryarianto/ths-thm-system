'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { MessageSquare, Pin, Eye, ArrowLeft, Plus } from 'lucide-react';
import apiClient from '@/lib/api-client';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import Link from 'next/link';

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

  useEffect(() => {
    (async () => {
      try {
        const [threadsRes, catsRes] = await Promise.all([
          apiClient.get(`/forum/categories/${categoryId}/threads`),
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
  }, [categoryId]);

  return (
    <PageContainer>
      <PageHeader title={`${categoryName || 'Kategori'} (${threads.length} thread)`}>
        <Link
          href="/forum/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} /> Buat Thread
        </Link>
      </PageHeader>

      <Link
        href="/forum"
        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-4"
      >
        <ArrowLeft size={14} /> Kembali ke Forum
      </Link>

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
                    <span>{new Date(t.createdAt).toLocaleDateString('id-ID')}</span>
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
              <p>Belum ada thread di kategori ini</p>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
