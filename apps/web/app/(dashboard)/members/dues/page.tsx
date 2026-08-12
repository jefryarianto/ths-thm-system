'use client';

import { useState, useEffect, useCallback } from 'react';
import { Upload, Building2, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { PermissionGuard } from '@/components/auth/permission-guard';
import apiClient from '@/lib/api-client';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import { useToast } from '@/components/ui/toast';

interface DuesRecord {
  id: string;
  periode: string;
  jumlah: number;
  status: string;
  tanggalBayar: string | null;
  buktiBayarPath: string | null;
  createdAt: string;
}

interface BankInfo {
  bankName: string;
  accountNumber: string;
  accountName: string;
  qrisImageUrl: string | null;
}

export default function MemberDuesPage() {
  const toast = useToast();
  const [dues, setDues] = useState<DuesRecord[]>([]);
  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [proofFiles, setProofFiles] = useState<Record<string, File | null>>({});
  const [proofNotes, setProofNotes] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [duesRes, bankRes] = await Promise.all([
        apiClient.get('/dues/members/me'),
        apiClient.get('/payments/bank-info'),
      ]);
      if (duesRes.data.success) setDues(duesRes.data.data || []);
      // bankRes.data.data adalah ARRAY rekening aktif — ambil yang pertama (satu-satunya yg aktif)
      const bankList = bankRes.data?.data;
      if (Array.isArray(bankList) && bankList.length > 0) setBankInfo(bankList[0]);
      else setBankInfo(null);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFileChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setProofFiles((prev) => ({ ...prev, [id]: file }));
  };

  const handleUploadProof = async (id: string) => {
    const file = proofFiles[id];
    const note = proofNotes[id]?.trim() || '';

    if (!file && !note) {
      toast('error', 'Sertakan bukti foto atau catatan pembayaran');
      return;
    }

    setUploadingId(id);
    try {
      if (file) {
        const form = new FormData();
        form.append('bukti', file);
        if (note) form.append('catatan', note);
        await apiClient.post(`/payments/${id}/upload-proof`, form);
      } else {
        await apiClient.post(`/payments/${id}/upload-proof`, { catatan: note });
      }
      await fetchData();
      setProofFiles((prev) => ({ ...prev, [id]: null }));
      setProofNotes((prev) => ({ ...prev, [id]: '' }));
      toast('success', 'Bukti pembayaran berhasil dikirim');
    } catch (err: any) {
      toast('error', err?.response?.data?.message || 'Gagal mengirim bukti');
    }
    setUploadingId(null);
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  const canPay = (status: string) => status !== 'lunas' && status !== 'menunggu_verifikasi';

  const statusBadge = (status: string) => {
    switch (status) {
      case 'lunas':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400"><CheckCircle size={12} /> Lunas</span>;
      case 'menunggu_verifikasi':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400"><Clock size={12} /> Menunggu</span>;
      case 'menunggak':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400"><Clock size={12} /> Menunggak</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"><Clock size={12} /> Belum Dibayar</span>;
    }
  };

  return (
    <PermissionGuard module="dues" action="view">
      <PageContainer>
        <PageHeader title="Iuran Saya" onRefresh={fetchData} />

        {bankInfo && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 size={18} className="text-blue-600 dark:text-blue-400" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Informasi Pembayaran</h3>
            </div>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400 w-28">Bank</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{bankInfo.bankName}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400 w-28">No. Rekening</span>
                  <span className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">{bankInfo.accountNumber}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400 w-28">Atas Nama</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{bankInfo.accountName}</span>
                </div>
              </div>
              {bankInfo.qrisImageUrl && (
                <div className="flex flex-col items-center">
                  <img src={bankInfo.qrisImageUrl} alt="QRIS" className="w-36 h-36 object-contain border rounded-lg" />
                  <span className="text-xs text-gray-500 mt-1">Scan QRIS</span>
                </div>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-500">Memuat...</div>
        ) : dues.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p>Belum ada iuran</p>
          </div>
        ) : (
          <div className="space-y-4">
            {dues.map((due) => (
              <div key={due.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">Periode: {due.periode}</div>
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatRupiah(due.jumlah)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(due.status)}
                    {due.tanggalBayar && (
                      <span className="text-xs text-gray-500">
                        Dibayar: {new Date(due.tanggalBayar).toLocaleDateString('id-ID')}
                      </span>
                    )}
                  </div>
                </div>

                {canPay(due.status) && (
                  <div className="border-t border-gray-100 dark:border-gray-700 pt-3 mt-3 space-y-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <label className="flex-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Bukti foto (opsional)</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(due.id, e)}
                          className="mt-1 block w-full text-xs text-gray-600 dark:text-gray-300 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                      </label>
                      <div className="flex-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Catatan</span>
                        <input
                          type="text"
                          value={proofNotes[due.id] || ''}
                          onChange={(e) => setProofNotes((prev) => ({ ...prev, [due.id]: e.target.value }))}
                          placeholder="Nama pengirim, tanggal transfer..."
                          className="mt-1 w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleUploadProof(due.id)}
                        disabled={uploadingId === due.id}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        <Upload size={14} /> {uploadingId === due.id ? 'Mengirim...' : 'Kirim Bukti Pembayaran'}
                      </button>
                    </div>
                  </div>
                )}

                {due.buktiBayarPath && (
                  <div className="mt-2 text-xs text-gray-500">
                    Bukti: {due.buktiBayarPath.startsWith('http') || due.buktiBayarPath.startsWith('/api/uploads') ? (
                      <a href={due.buktiBayarPath.startsWith('http') ? due.buktiBayarPath : `${window.location.origin}${due.buktiBayarPath}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Lihat file</a>
                    ) : (
                      due.buktiBayarPath
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </PageContainer>
    </PermissionGuard>
  );
}
