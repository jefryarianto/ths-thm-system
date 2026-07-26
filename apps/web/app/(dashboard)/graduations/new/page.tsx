'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import FormField from '@/components/ui/form-field';

import Breadcrumbs from '@/components/ui/breadcrumbs';

export default function NewGraduationPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nama: '',
    lokasi: '',
    tanggalMulai: '',
    tanggalSelesai: '',
    scopeType: 'ranting',
    scopeId: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama) { setError('Nama pendadaran harus diisi'); return; }
    if (!form.tanggalMulai) { setError('Tanggal mulai harus diisi'); return; }

    setSaving(true);
    setError('');
    try {
      const body: Record<string, unknown> = { ...form };
      if (!body.tanggalSelesai) delete body.tanggalSelesai;
      if (!body.scopeId) { delete body.scopeId; delete body.scopeType; }

      const { data: res } = await apiClient.post('/graduations', body);
      const newId = res.data?.id;
      if (newId) {
        router.push(`/graduations/${newId}`);
      } else {
        router.push('/graduations');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Gagal menyimpan pendadaran');
    }
    setSaving(false);
  };

  return (
      <PermissionGuard module="graduations" action="create">
        <Breadcrumbs />
        <div className="max-w-2xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push('/graduations')}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <ArrowLeft size={20} className="text-gray-500" />
                </button>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Pendadaran Baru
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Buat jadwal pendadaran baru untuk anggota
                  </p>
                </div>
              </div>
        
              {/* Error */}
              {error && (
                <div className="flex items-center gap-2.5 p-3.5 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
                  <AlertCircle size={16} className="shrink-0" />
                  {error}
                </div>
              )}
        
              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-5">
                  <FormField label="Nama Pendadaran" required>
                    <input
                      type="text"
                      value={form.nama}
                      onChange={(e) => setForm({ ...form, nama: e.target.value })}
                      placeholder="Contoh: Pendadaran THS TM Wilayah Larantuka"
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </FormField>
        
                  <FormField label="Lokasi">
                    <input
                      type="text"
                      value={form.lokasi}
                      onChange={(e) => setForm({ ...form, lokasi: e.target.value })}
                      placeholder="Contoh: Aula Serbaguna Larantuka"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </FormField>
        
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Tanggal Mulai" required>
                      <input
                        type="date"
                        value={form.tanggalMulai}
                        onChange={(e) => setForm({ ...form, tanggalMulai: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition"
                      />
                    </FormField>
                    <FormField label="Tanggal Selesai">
                      <input
                        type="date"
                        value={form.tanggalSelesai}
                        onChange={(e) => setForm({ ...form, tanggalSelesai: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition"
                      />
                    </FormField>
                  </div>
        
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      Ruang lingkup pendadaran (kosongkan untuk menggunakan scope akun Anda)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField label="Tipe Scope">
                        <select
                          value={form.scopeType}
                          onChange={(e) => setForm({ ...form, scopeType: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition"
                        >
                          <option value="ranting">Ranting</option>
                          <option value="wilayah">Wilayah</option>
                          <option value="distrik">Distrik</option>
                        </select>
                      </FormField>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ID Scope</label>
                        <input
                          type="text"
                          value={form.scopeId}
                          onChange={(e) => setForm({ ...form, scopeId: e.target.value })}
                          placeholder="Kosongkan untuk scope otomatis"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition"
                        />
                        <p className="mt-1 text-xs text-gray-400">ID ranting/wilayah/distrik</p>
                      </div>
                    </div>
                  </div>
                </div>
        
                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => router.push('/graduations')}
                    className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    <Save size={16} />
                    {saving ? 'Menyimpan...' : 'Simpan Pendadaran'}
                  </button>
                </div>
              </form>
            </div>
      </PermissionGuard>
    );
}
