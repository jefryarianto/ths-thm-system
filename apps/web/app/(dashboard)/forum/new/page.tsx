'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, PenLine, Tag } from 'lucide-react';
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
        <PageHeader title="Buat Thread Baru" subtitle="Mulai diskusi atau bagikan pengumuman" />

        <Link
          href="/forum"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary transition-colors"
        >
          <ArrowLeft size={14} /> Kembali ke Forum
        </Link>

        <div className="max-w-2xl bg-surface rounded-xl border border-border shadow-elegant overflow-hidden">
          {/* strip aksen */}
          <div className="h-1.5 bg-gradient-to-r from-primary-600 via-primary to-info" aria-hidden />

          <div className="p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-elegant">
                <PenLine size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-text">Detail Thread</h2>
                <p className="text-xs text-muted">
                  Gunakan @ untuk menyebut anggota dalam konten
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label
                htmlFor="thread-category"
                className="block text-sm font-medium text-text mb-1.5"
              >
                Kategori
              </label>
              <div className="relative">
                <Tag
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
                />
                <select
                  id="thread-category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-surface border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 disabled:opacity-60"
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
              </div>
              {categories.length === 0 && (
                <p className="text-xs text-warning mt-1.5">
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
              <label htmlFor="thread-title" className="block text-sm font-medium text-text mb-1.5">
                Judul
              </label>
              <input
                id="thread-title"
                type="text"
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                placeholder="Judul thread…"
                className="w-full border border-border bg-surface rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
              />
            </div>

            <div className="mb-1">
              <label className="block text-sm font-medium text-text mb-1.5">Konten</label>
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
        </div>
      </PageContainer>
    </PermissionGuard>
  );
}
