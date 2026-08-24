'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import {

  ArrowLeft, CreditCard, User, Calendar, DollarSign,
  RefreshCw, AlertCircle, CheckCircle2, Clock, XCircle,
  FileText, Receipt, Banknote, Building,
} from 'lucide-react';
import {
  DUES_STATUS_STYLES,
  FLAT_STATUS_LABELS,
  formatDate,
  formatRupiah,
} from '@/components/members/constants';

interface DuesDetail {
  id: string;
  periode: string;
  jumlah: number;
  status: string;
  tanggalBayar: string | null;
  metodeBayar: string | null;
  buktiBayarPath: string | null;
  anggotaId: string;
  anggota: {
    id: string;
    nomorAnggota: string;
    namaLengkap: string;
    email: string | null;
    noHp: string | null;
    ranting?: { id: string; nama: string };
    tingkat?: string;
  };
  createdAt: string;
  updatedAt: string;
}

const METODE_LABELS: Record<string, string> = {
  manual: 'Manual (Tunai)',
  transfer: 'Transfer Bank',
  online: 'Online',
};

export default function DuesDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [dues, setDues] = useState<DuesDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDues = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: res } = await apiClient.get(`/dues/${id}`);
      setDues(res.data);
      setError(null);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) setError('Iuran tidak ditemukan');
      else setError('Gagal memuat data iuran');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDues(); }, [fetchDues]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-36" />
        <div className="bg-white dark:bg-gray-800 rounded-2xl border p-6 space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !dues) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center max-w-md">
          <AlertCircle size={40} className="mx-auto text-red-400 mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {error === 'Iuran tidak ditemukan' ? 'Iuran Tidak Ditemukan' : 'Gagal Memuat Data'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <button onClick={() => router.push('/dues')} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            ← Kembali ke Iuran
          </button>
        </div>
      </div>
    );
  }

  return (
      <PermissionGuard module="dues" action="view">
        <Breadcrumbs suffix={{ href: '#', label: dues?.anggota?.namaLengkap && dues?.periode ? dues.anggota.namaLengkap + ' - ' + dues.periode : 'Detail' }} />
        <div className="max-w-2xl mx-auto space-y-6">
              {/* Back */}
              <Link href="/dues" className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition group">
                <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                Kembali ke Iuran
              </Link>
        
              {/* Header */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="h-16 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 relative">
                  <button onClick={fetchDues} className="absolute top-3 right-3 p-2 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm transition text-white" title="Refresh">
                    <RefreshCw size={14} />
                  </button>
                </div>
                <div className="px-6 pb-6 -mt-6">
                  <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                    <div className="w-14 h-14 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-gray-800">
                      <Receipt size={22} className="text-emerald-600" />
                    </div>
                    <div className="flex-1 mt-2 sm:mt-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                          Iuran {dues.periode}
                        </h1>
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${DUES_STATUS_STYLES[dues.status] || ''}`}>
                          {FLAT_STATUS_LABELS[dues.status] || dues.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {formatRupiah(Number(dues.jumlah))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
        
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
                      <Calendar size={18} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Periode</p>
                      <p className="text-base font-bold text-gray-900 dark:text-white">{dues.periode}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950">
                      <DollarSign size={18} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Jumlah</p>
                      <p className="text-base font-bold text-gray-900 dark:text-white font-mono">{formatRupiah(Number(dues.jumlah))}</p>
                    </div>
                  </div>
                </div>
                {dues.status === 'lunas' ? (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950">
                        <CheckCircle2 size={18} className="text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Tgl Bayar</p>
                        <p className="text-base font-bold text-gray-900 dark:text-white">
                          {dues.tanggalBayar ? formatDate(dues.tanggalBayar) : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : dues.status === 'menunggu_verifikasi' ? (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-950">
                        <Clock size={18} className="text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Menunggu</p>
                        <p className="text-base font-bold text-yellow-600">Verifikasi</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950">
                        <XCircle size={18} className="text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                        <p className="text-base font-bold text-red-600">Belum Dibayar</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
        
              {/* Detail Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                  <CreditCard size={18} className="text-blue-500" />
                  Detail Pembayaran
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <User size={16} className="text-gray-400 dark:text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Anggota</p>
                      <Link href={`/members/${dues.anggota.id}`} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                        {dues.anggota.namaLengkap}
                      </Link>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{dues.anggota.nomorAnggota}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <Banknote size={16} className="text-gray-400 dark:text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Metode Pembayaran</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {METODE_LABELS[dues.metodeBayar || ''] || dues.metodeBayar || '-'}
                      </p>
                    </div>
                  </div>
                  {dues.buktiBayarPath && (
                    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                      <FileText size={16} className="text-gray-400 dark:text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Bukti Bayar</p>
                        <a href={`/api/uploads/${dues.buktiBayarPath}`} target="_blank" rel="noopener noreferrer"
                          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                          Lihat Bukti Pembayaran
                        </a>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <Calendar size={16} className="text-gray-400 dark:text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Dibuat</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatDate(dues.createdAt)}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">Terakhir diperbarui: {formatDate(dues.updatedAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
        
              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Link
                  href={`/dues/new`}
                  className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Tambah Iuran Baru
                </Link>
              </div>
            </div>
      </PermissionGuard>
    );
}
