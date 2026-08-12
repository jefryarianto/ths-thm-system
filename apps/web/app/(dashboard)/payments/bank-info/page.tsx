'use client';

import { useState, useEffect } from 'react';
import { useConfirm } from '@/components/ui/confirm-modal';
import { Plus, Pencil, Trash2, X, Save } from 'lucide-react';
import { PermissionGuard } from '@/components/auth/permission-guard';
import apiClient from '@/lib/api-client';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast';

interface BankInfo {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  qrisImageUrl: string | null;
  isActive: boolean;
}

interface BankFormData {
  bankName: string;
  accountNumber: string;
  accountName: string;
  qrisImageUrl: string;
  isActive: boolean;
}

const emptyForm: BankFormData = {
  bankName: '',
  accountNumber: '',
  accountName: '',
  qrisImageUrl: '',
  isActive: true,
};

export default function BankInfoPage() {
  const { confirm, confirmModal } = useConfirm();
  const toast = useToast();
  const [banks, setBanks] = useState<BankInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BankFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchBanks = async () => {
    setLoading(true);
    try {
      const { data: res } = await apiClient.get('/payments/bank-info/all');
      if (res.success) setBanks(res.data);
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBanks();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (bank: BankInfo) => {
    setForm({
      bankName: bank.bankName,
      accountNumber: bank.accountNumber,
      accountName: bank.accountName,
      qrisImageUrl: bank.qrisImageUrl || '',
      isActive: bank.isActive,
    });
    setEditingId(bank.id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.bankName.trim() || !form.accountNumber.trim() || !form.accountName.trim()) {
      toast('error', 'Bank, nomor rekening, dan nama rekening wajib diisi');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        bankName: form.bankName.trim(),
        accountNumber: form.accountNumber.trim(),
        accountName: form.accountName.trim(),
        qrisImageUrl: form.qrisImageUrl.trim() || undefined,
        isActive: form.isActive,
      };

      if (editingId) {
        await apiClient.patch(`/payments/bank-info/${editingId}`, payload);
      } else {
        await apiClient.post('/payments/bank-info', payload);
      }
      await fetchBanks();
      resetForm();
      toast('success', editingId ? 'Rekening berhasil diperbarui' : 'Rekening berhasil ditambahkan');
    } catch (err: any) {
      toast('error', err?.response?.data?.message || 'Gagal menyimpan');
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm('Hapus rekening bank ini?'))) return;
    try {
      await apiClient.delete(`/payments/bank-info/${id}`);
      await fetchBanks();
      toast('success', 'Rekening berhasil dihapus');
    } catch (err: any) {
      toast('error', err?.response?.data?.message || 'Gagal menghapus');
    }
  };

  const toggleActive = async (bank: BankInfo) => {
    try {
      await apiClient.patch(`/payments/bank-info/${bank.id}`, { isActive: !bank.isActive });
      await fetchBanks();
      toast('success', bank.isActive ? 'Rekening dinonaktifkan' : 'Rekening diaktifkan');
    } catch (err: any) {
      toast('error', err?.response?.data?.message || 'Gagal memperbarui');
    }
  };

  return (
    <PermissionGuard module="payments" action="admin">
      <PageContainer>
        <PageHeader
          title="Kelola Rekening Bank"
          onRefresh={fetchBanks}
        >
          <Link
            href="/payments"
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            ← Kembali ke Pembayaran
          </Link>
          {!showForm && (
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus size={16} /> Tambah Rekening
            </button>
          )}
        </PageHeader>

        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {editingId ? 'Edit Rekening Bank' : 'Tambah Rekening Bank'}
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Bank</label>
                <input
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  placeholder="Contoh: BCA"
                  className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nomor Rekening</label>
                <input
                  value={form.accountNumber}
                  onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                  placeholder="Contoh: 1234567890"
                  className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Atas Nama</label>
                <input
                  value={form.accountName}
                  onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                  placeholder="Contoh: Yayasan THS-THM"
                  className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL QRIS (opsional)</label>
                <input
                  value={form.qrisImageUrl}
                  onChange={(e) => setForm({ ...form, qrisImageUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2 md:col-span-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">
                  Aktif (ditampilkan ke anggota)
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Save size={14} /> {submitting ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-500">Memuat...</div>
        ) : banks.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p>Belum ada rekening bank. Tambah rekening untuk ditampilkan ke anggota.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {banks.map((bank) => (
              <div
                key={bank.id}
                className={`bg-white dark:bg-gray-800 rounded-lg border p-5 ${
                  bank.isActive
                    ? 'border-gray-200 dark:border-gray-700'
                    : 'border-gray-100 dark:border-gray-700 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {bank.bankName}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      bank.isActive
                        ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                    }`}
                  >
                    {bank.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">No. Rekening:</span>{' '}
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      {bank.accountNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Atas Nama:</span>{' '}
                    <span className="font-medium">{bank.accountName}</span>
                  </div>
                  {bank.qrisImageUrl && (
                    <div className="mt-3">
                      <img
                        src={bank.qrisImageUrl}
                        alt="QRIS"
                        className="w-28 h-28 object-contain border rounded-lg"
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <button
                    onClick={() => startEdit(bank)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded transition-colors"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => toggleActive(bank)}
                    className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                      bank.isActive
                        ? 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950'
                        : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-950'
                    }`}
                  >
                    {bank.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <button
                    onClick={() => handleDelete(bank.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-colors"
                    title="Hapus"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {confirmModal}
      </PageContainer>
    </PermissionGuard>
  );
}
