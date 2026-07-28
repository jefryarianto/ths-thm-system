'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import FormField from '@/components/ui/form-field';
import { DetailSkeleton, ErrorPage, FormLayout } from '@/components/crud';
import { TINGKAT_OPTIONS } from '@/components/members/constants';

interface CandidateDetail {
  id: string;
  namaLengkap: string;
  jenisKelamin: 'L' | 'P';
  tempatLahir: string | null;
  tanggalLahir: string | null;
  alamat: string | null;
  noHp: string | null;
  email: string | null;
  tingkat: string | null;
}

export default function EditCandidatePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fetchError, setFetchError] = useState('');

  const [form, setForm] = useState({
    namaLengkap: '',
    jenisKelamin: 'L' as 'L' | 'P',
    tempatLahir: '',
    tanggalLahir: '',
    alamat: '',
    noHp: '',
    email: '',
    tingkat: '',
  });

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const { data: res } = await apiClient.get(`/candidates/${id}`);
        const c: CandidateDetail = res.data;
        setForm({
          namaLengkap: c.namaLengkap,
          jenisKelamin: c.jenisKelamin,
          tempatLahir: c.tempatLahir || '',
          tanggalLahir: c.tanggalLahir || '',
          alamat: c.alamat || '',
          noHp: c.noHp || '',
          email: c.email || '',
          tingkat: c.tingkat || '',
        });
      } catch {
        setFetchError('Gagal memuat data calon anggota');
      }
      setLoading(false);
    })();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.namaLengkap) { setError('Nama lengkap harus diisi'); return; }
    setSaving(true); setError('');
    try {
      const { data: orig } = await apiClient.get(`/candidates/${id}`);
      const original: CandidateDetail = orig.data;
      const payload: Record<string, unknown> = {};
      if (form.namaLengkap !== original.namaLengkap) payload.namaLengkap = form.namaLengkap;
      if (form.jenisKelamin !== original.jenisKelamin) payload.jenisKelamin = form.jenisKelamin;
      if (form.tempatLahir !== (original.tempatLahir || '')) payload.tempatLahir = form.tempatLahir;
      if (form.tanggalLahir !== (original.tanggalLahir || '')) payload.tanggalLahir = form.tanggalLahir;
      if (form.alamat !== (original.alamat || '')) payload.alamat = form.alamat;
      if (form.noHp !== (original.noHp || '')) payload.noHp = form.noHp;
      if (form.email !== (original.email || '')) payload.email = form.email;
      if (form.tingkat !== (original.tingkat || '')) payload.tingkat = form.tingkat;
      if (Object.keys(payload).length === 0) { setError('Tidak ada perubahan'); setSaving(false); return; }
      await apiClient.patch(`/candidates/${id}`, payload);
      router.push(`/candidates/${id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Gagal menyimpan perubahan');
    }
    setSaving(false);
  };

  if (loading) return <DetailSkeleton />;
  if (fetchError) return <ErrorPage message={fetchError} backHref={`/candidates/${id}`} backLabel="Kembali ke Calon" />;

  return (
      <PermissionGuard module="candidates" action="edit">
        <FormLayout
              backHref={`/candidates/${id}`}
              title="Edit Calon Anggota"
              subtitle={form.namaLengkap}
              error={error}
              saving={saving}
              onCancel={() => router.push(`/candidates/${id}`)}
              onSubmit={handleSubmit}
              submitLabel="Simpan Perubahan"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <FormField label="Nama Lengkap" required>
                    <input type="text" value={form.namaLengkap} onChange={(e) => setForm({ ...form, namaLengkap: e.target.value })} required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition" />
                  </FormField>
                </div>
                <FormField label="Jenis Kelamin">
                  <select value={form.jenisKelamin} onChange={(e) => setForm({ ...form, jenisKelamin: e.target.value as 'L' | 'P' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition">
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </FormField>
                <FormField label="Tingkat">
                  <select value={form.tingkat} onChange={(e) => setForm({ ...form, tingkat: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition">
                    <option value="">Pilih Tingkat</option>
                    {TINGKAT_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Tempat Lahir">
                  <input type="text" value={form.tempatLahir} onChange={(e) => setForm({ ...form, tempatLahir: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition" />
                </FormField>
                <FormField label="Tanggal Lahir">
                  <input type="date" value={form.tanggalLahir ? form.tanggalLahir.split('T')[0] : ''} onChange={(e) => setForm({ ...form, tanggalLahir: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition" />
                </FormField>
                <div className="sm:col-span-2">
                  <FormField label="Alamat">
                    <textarea value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition" />
                  </FormField>
                </div>
                <FormField label="No. HP">
                  <input type="text" value={form.noHp} onChange={(e) => setForm({ ...form, noHp: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition" />
                </FormField>
                <FormField label="Email">
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition" />
                </FormField>
              </div>
            </FormLayout>
      </PermissionGuard>
    );
}
