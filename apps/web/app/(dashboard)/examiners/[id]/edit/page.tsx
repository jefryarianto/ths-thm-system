'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { ArrowLeft, Save, AlertCircle, RefreshCw } from 'lucide-react';
import FormField from '@/components/ui/form-field';

import Breadcrumbs from '@/components/ui/breadcrumbs';

export default function EditExaminerPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [form, setForm] = useState({ namaLengkap: '', email: '', password: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data: res } = await apiClient.get(`/examiners/${id}`);
        const ex = res.data;
        setForm({ namaLengkap: ex.namaLengkap || ex.user?.namaLengkap || '', email: ex.email || ex.user?.email || '', password: '' });
        setError(null);
      } catch {
        setError('Gagal memuat data penguji');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.namaLengkap || !form.email) {
      setError('Nama lengkap dan email harus diisi');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { namaLengkap: form.namaLengkap, email: form.email };
      if (form.password) body.password = form.password;
      await apiClient.patch(`/examiners/${id}`, body);
      router.push('/examiners');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Gagal menyimpan data penguji');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-36" />
        <div className="bg-white dark:bg-gray-800 rounded-2xl border p-6 space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (error && !form.namaLengkap) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <AlertCircle size={40} className="mx-auto text-red-400 mb-3" />
          <p className="text-red-600 font-medium mb-2">{error}</p>
          <button onClick={() => router.push('/examiners')} className="text-sm text-blue-600 hover:underline">← Kembali ke Penguji</button>
        </div>
      </div>
    );
  }

  return (
      <PermissionGuard module="examiners" action="edit">
        <Breadcrumbs />
        <div className="max-w-2xl mx-auto space-y-6">
              <Link href="/examiners" className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition group">
                <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                Kembali ke Penguji
              </Link>
        
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950">
                  <RefreshCw size={20} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Penguji</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Perbarui data penguji</p>
                </div>
              </div>
        
              {error && (
                <div className="flex items-center gap-2.5 p-3.5 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
                  <AlertCircle size={16} className="shrink-0" />
                  {error}
                </div>
              )}
        
              <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-5">
                <FormField label="Nama Lengkap" required>
                  <input type="text" value={form.namaLengkap} onChange={(e) => setForm({ ...form, namaLengkap: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition" />
                </FormField>
        
                <FormField label="Email" required>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition" />
                </FormField>
        
                <FormField label="Password Baru (kosongkan jika tidak diubah)">
                  <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Biarkan kosong jika tidak ingin ganti password" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition" />
                </FormField>
        
                <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <button type="button" onClick={() => router.push('/examiners')} className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    Batal
                  </button>
                  <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
                    <Save size={16} />
                    {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </div>
      </PermissionGuard>
    );
}
