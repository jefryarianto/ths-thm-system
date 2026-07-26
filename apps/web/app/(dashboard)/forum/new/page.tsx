'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Send, ArrowLeft } from 'lucide-react';
import apiClient from '@/lib/api-client';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import Link from 'next/link';


interface Category {
  id: string;
  nama: string;
}

export default function NewThreadPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [judul, setJudul] = useState('');
  const [konten, setKonten] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/forum/categories');
        if (res.data.success) {
          setCategories(res.data.data);
          if (res.data.data.length > 0) setCategoryId(res.data.data[0].id);
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const handleSubmit = async () => {
    if (!categoryId || !judul.trim() || !konten.trim()) return;
    setSubmitting(true);
    try {
      const res = await apiClient.post('/forum/threads', {
        categoryId,
        judul: judul.trim(),
        konten: konten.trim(),
      });
      if (res.data.success) {
        router.push(`/forum/t/${res.data.data.id}`);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Gagal membuat thread');
    }
    setSubmitting(false);
  };

  return (
      <PermissionGuard module="forum" action="create">
        <PageContainer>
              <PageHeader title="Buat Thread Baru" />
        
              <Link
                href="/forum"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-6"
              >
                <ArrowLeft size={14} /> Kembali ke Forum
              </Link>
        
              <div className="max-w-2xl bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Kategori
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-750 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nama}
                      </option>
                    ))}
                  </select>
                </div>
        
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Judul
                  </label>
                  <input
                    type="text"
                    value={judul}
                    onChange={(e) => setJudul(e.target.value)}
                    placeholder="Judul thread..."
                    className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-750 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
        
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Konten
                  </label>
                  <textarea
                    value={konten}
                    onChange={(e) => setKonten(e.target.value)}
                    placeholder="Tulis konten thread..."
                    rows={8}
                    className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-750 rounded-lg p-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
        
                <div className="flex justify-end">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !categoryId || !judul.trim() || !konten.trim()}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <Send size={14} /> {submitting ? 'Membuat...' : 'Buat Thread'}
                  </button>
                </div>
              </div>
            </PageContainer>
      </PermissionGuard>
    );
}
