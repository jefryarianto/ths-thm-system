'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import FormField from '@/components/ui/form-field';
import { FormLayout } from '@/components/crud';

export default function NewRegistrationPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    namaLengkap: '',
    jenisKelamin: 'L',
    tempatLahir: '',
    tanggalLahir: '',
    alamat: '',
    noHp: '',
    email: '',
    sumberInfo: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.namaLengkap) { setError('Nama lengkap harus diisi'); return; }
    setSaving(true); setError('');
    try {
      const body: Record<string, unknown> = { ...form };
      Object.keys(body).forEach((k) => { if (!body[k]) delete body[k]; });
      const { data: res } = await apiClient.post('/registrations', body);
      const newId = res.data?.id;
      if (newId) router.push(`/registrations/${newId}`);
      else router.push('/registrations');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Gagal menyimpan pendaftaran');
    }
    setSaving(false);
  };

  return (
      <PermissionGuard module="registrations" action="create">
        <FormLayout
              backHref="/registrations"
              title="Pendaftaran Baru"
              subtitle="Daftarkan anggota baru ke sistem"
              error={error}
              saving={saving}
              onCancel={() => router.push('/registrations')}
              onSubmit={handleSubmit}
              submitLabel="Simpan Pendaftaran"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <FormField label="Nama Lengkap" required>
                    <input type="text" value={form.namaLengkap} onChange={(e) => setForm({ ...form, namaLengkap: e.target.value })} required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition" />
                  </FormField>
                </div>
                <FormField label="Jenis Kelamin">
                  <select value={form.jenisKelamin} onChange={(e) => setForm({ ...form, jenisKelamin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition">
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </FormField>
                <FormField label="Sumber Info">
                  <input type="text" value={form.sumberInfo} onChange={(e) => setForm({ ...form, sumberInfo: e.target.value })} placeholder="Instagram, teman, dll"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition" />
                </FormField>
                <FormField label="Tempat Lahir">
                  <input type="text" value={form.tempatLahir} onChange={(e) => setForm({ ...form, tempatLahir: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition" />
                </FormField>
                <FormField label="Tanggal Lahir">
                  <input type="date" value={form.tanggalLahir} onChange={(e) => setForm({ ...form, tanggalLahir: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition" />
                </FormField>
                <div className="sm:col-span-2">
                  <FormField label="Alamat">
                    <textarea value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition" />
                  </FormField>
                </div>
                <FormField label="No. HP">
                  <input type="text" value={form.noHp} onChange={(e) => setForm({ ...form, noHp: e.target.value })} placeholder="08xxxxxxxxxx"
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
