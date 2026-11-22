'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { PermissionGuard } from '@/components/auth/permission-guard';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import { SmallLogoSpinner } from '@/components/ui/logo-spinner';
import { useToast } from '@/components/ui/toast';

const INPUT_CLASS =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm';

interface BulkRow {
  namaLengkap: string;
  email: string;
  tempatDadar: string;
  tahunDadar: string;
  noHp: string;
  catatan: string;
}

const emptyRow = (): BulkRow => ({
  namaLengkap: '',
  email: '',
  tempatDadar: '',
  tahunDadar: '',
  noHp: '',
  catatan: '',
});

export default function BulkClaimPage() {
  const router = useRouter();
  const toast = useToast();
  const [rantingId, setRantingId] = useState('');
  const [batchName, setBatchName] = useState('');
  const [rows, setRows] = useState<BulkRow[]>([emptyRow()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient
      .get('/auth/me')
      .then(({ data }) => setRantingId(data?.rantingId || data?.data?.rantingId || ''))
      .catch(() => setRantingId(''));
  }, []);

  const updateRow = (index: number, field: keyof BulkRow, value: string) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rantingId) {
      toast('error', 'Akun admin ranting tidak memiliki ranting aktif');
      return;
    }
    if (rows.length > 100) {
      toast('error', 'Maksimal 100 klaim per batch');
      return;
    }
    for (const [index, row] of rows.entries()) {
      if (!row.namaLengkap.trim() || !row.email.trim() || !row.tempatDadar.trim() || !row.tahunDadar.trim()) {
        toast('error', `Baris ${index + 1}: nama, email, tempat dadar, dan tahun dadar wajib diisi`);
        return;
      }
    }
    setSaving(true);
    try {
      const response = await apiClient.post('/claims/bulk', {
        batchName: batchName.trim() || `Batch ${new Date().toLocaleDateString('id-ID')}`,
        claims: rows.map((row) => ({
          ...row,
          tipe: 'keanggotaan',
          rantingId,
        })),
      });
      toast('success', `${response.data?.count || rows.length} klaim berhasil dibuat`);
      router.push('/claims');
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast('error', message || 'Gagal membuat klaim massal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PermissionGuard module="claims" action="create">
      <Breadcrumbs />
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/claims')}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            aria-label="Kembali ke daftar klaim"
          >
            <ArrowLeft size={18} className="text-gray-500" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Bulk Klaim Anggota
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-6"
        >
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-200">
            Buat beberapa klaim keanggotaan sekaligus untuk ranting Anda. Bukti keanggotaan dapat
            diunggah kemudian setelah klaim dibuat.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="batchName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nama Batch
              </label>
              <input
                id="batchName"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                className={INPUT_CLASS}
                placeholder="Contoh: Klaim Ranting November"
                maxLength={100}
              />
            </div>
            <div>
              <label htmlFor="rantingId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ranting
              </label>
              <input
                id="rantingId"
                value={rantingId}
                readOnly
                className={`${INPUT_CLASS} bg-gray-100 dark:bg-gray-900`}
              />
            </div>
          </div>

          <fieldset>
            <legend className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Daftar Klaim ({rows.length}/100)
            </legend>
            <div className="space-y-4">
              {rows.map((row, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Klaim {index + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                      disabled={rows.length === 1}
                      className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-md disabled:opacity-40"
                      aria-label={`Hapus klaim ${index + 1}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Nama Lengkap *
                      </label>
                      <input
                        value={row.namaLengkap}
                        onChange={(e) => updateRow(index, 'namaLengkap', e.target.value)}
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={row.email}
                        onChange={(e) => updateRow(index, 'email', e.target.value)}
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Tempat Dadar *
                      </label>
                      <input
                        value={row.tempatDadar}
                        onChange={(e) => updateRow(index, 'tempatDadar', e.target.value)}
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Tahun Dadar *
                      </label>
                      <input
                        inputMode="numeric"
                        maxLength={4}
                        value={row.tahunDadar}
                        onChange={(e) => updateRow(index, 'tahunDadar', e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        No. HP
                      </label>
                      <input
                        type="tel"
                        value={row.noHp}
                        onChange={(e) => updateRow(index, 'noHp', e.target.value)}
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Catatan
                      </label>
                      <input
                        value={row.catatan}
                        onChange={(e) => updateRow(index, 'catatan', e.target.value)}
                        className={INPUT_CLASS}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setRows((prev) => [...prev, emptyRow()])}
              disabled={rows.length >= 100}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-md disabled:opacity-40"
            >
              <Plus size={15} /> Tambah Baris
            </button>
          </fieldset>

          <button
            type="submit"
            disabled={saving || !rantingId}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition flex items-center justify-center gap-2 text-sm"
          >
            {saving ? (
              <>
                <SmallLogoSpinner size={18} /> Menyimpan...
              </>
            ) : (
              <>
                <Save size={18} /> Simpan {rows.length} Klaim
              </>
            )}
          </button>
        </form>
      </div>
    </PermissionGuard>
  );
}
