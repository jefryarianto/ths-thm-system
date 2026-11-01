'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import apiClient, { unwrap, extractErrorMessage } from '@/lib/api-client';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast';
import { CanAdmin } from '@/components/auth/can';
import { ForumComposer } from '@/components/forum/forum-composer';

interface Category {
  id: string;
  nama: string;
}

export default function NewThreadPage() {
  const router = useRouter();
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [judul, setJudul] = useState('');
  const [konten, setKonten] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/forum/categories');
        const data = unwrap<Category[]>(res) || [];
        if (data) {
          setCategories(data);
          if (data.length > 0) setCategoryId(data[0].id);
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const handleSubmit = async (konten: string, images: string[]) => {
    if (!categoryId || !judul.trim() || !konten.trim()) {
      toast('error', 'Lengkapi kategori, judul, dan konten terlebih dahulu');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiClient.post('/forum/threads', {
        categoryId,
        judul: judul.trim(),
        konten: konten.trim(),
        ...(images.length > 0 && { images }),
      });
      const data = unwrap<{ id: string }>(res);
      if (data?.id) {
        router.push(`/forum/t/${data.id}`);
      }
    } catch (err: unknown) {
      toast('error', extractErrorMessage(err, 'Gagal membuat thread'));
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                disabled={categories.length === 0}
              >
                {categories.length === 0 ? (
                  <option value="">Belum ada kategori</option>
                ) : (
                  categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nama}
                    </option>
                  ))
                )}
              </select>
              {categories.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Belum ada kategori forum.{' '}
                  <CanAdmin module="forum">
                    <Link href="/forum/admin/categories" className="underline">
                      Buat kategori
                    </Link>
                  </CanAdmin>
                </p>
              )}
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
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Konten
            </label>
            <ForumComposer
              value={konten}
              onChange={setKonten}
              onSubmit={handleSubmit}
              submitLabel="Buat Thread"
              submitting={submitting}
              placeholder="Tulis konten thread... gunakan @ untuk mention anggota"
              rows={8}
            />
          </div>
        </div>
      </PageContainer>
    </PermissionGuard>
  );
}
