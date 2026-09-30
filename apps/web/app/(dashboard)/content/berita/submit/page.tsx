'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { Save, Check, Loader2 } from 'lucide-react';

import Breadcrumbs from '@/components/ui/breadcrumbs';
import { useToast } from '@/components/ui/toast';

interface BeritaSubmitForm {
  judul: string;
  ringkasan: string;
  konten: string;
  slug: string;
}

export default function BeritaSubmitPage() {
  const router = useRouter();
  const toast = useToast();

  const [form, setForm] = useState<BeritaSubmitForm>({
    judul: '',
    ringkasan: '',
    konten: '',
    slug: '',
  });

  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Auto-generate slug from judul when empty and judul changes
    if (form.judul && !form.slug) {
      const slug = form.judul
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // hapus karakter khusus
        .replace(/[\s_-]+/g, '-')   // ganti spasi dan underscore dengan strip
        .replace(/^-+|-+$/g, '');   // hapus strip di awal/akhir
      setForm(prev => ({ ...prev, slug }));
    }
  }, [form.judul]);

  const handleChange = (field: keyof BeritaSubmitForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.judul.trim() || !form.ringkasan.trim() || !form.konten.trim() || !form.slug.trim()) {
      toast('error', 'Semua field wajib diisi');
      return;
    }

    setSaving(true);

    try {
      // Endpoint submit memaksa isVisible=false untuk anggota, sehingga
      // berita masuk antrian approval sebelum tampil di situs publik.
      await apiClient.post('/content/berita/submit', form);

      setSubmitted(true);
      setSaving(false);

      toast('success', 'Berita berhasil diajukan! Menunggu persetujuan admin.');

      // Redirect to berita list after 2 seconds
      setTimeout(() => {
        router.push('/content/berita');
      }, 2000);
    } catch (error: any) {
      setSaving(false);
      const message =
        error.response?.data?.message || error.response?.data?.error || 'Gagal mengajukan berita';
      toast('error', `Error: ${message}`);
    }
  };

  if (submitted) {
    return (
      <PermissionGuard module="beritaSubmit" action="view">
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="text-center space-y-6">
            <Check size={48} className="text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Berita Diajukan!
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Berita Anda telah berhasil diajukan dan sedang menunggu persetujuan dari tim admin.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => router.push('/content/berita')}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Lihat Daftar Berita
              </button>
              <button
                onClick={() => router.push('/content/berita/submit')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Ajukan Berita Lainnya
              </button>
            </div>
          </div>
        </div>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard module="beritaSubmit" action="view">
      <div className="space-y-6">
        <Breadcrumbs pathname="/content/berita/submit" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Ajukan Berita Baru
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Judul *
            </label>
            <input
              type="text"
              value={form.judul}
              onChange={(e) => handleChange('judul', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Judul berita"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ringkasan *
            </label>
            <textarea
              value={form.ringkasan}
              onChange={(e) => handleChange('ringkasan', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ringkasan singkat berita"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Konten (HTML) *
            </label>
            <textarea
              value={form.konten}
              onChange={(e) => handleChange('konten', e.target.value)}
              rows={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
              placeholder="Tulis konten berita di sini (gunakan tag HTML seperti <p>, <h2>, <ul>, <li>, dll.)"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Slug *
            </label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => handleChange('slug', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="judul-berita (diisi otomatis dari judul)"
              required
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push('/content/berita')}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="mr-2" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  Ajukan Berita
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </PermissionGuard>
  );
}