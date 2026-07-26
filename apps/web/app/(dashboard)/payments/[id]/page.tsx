'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import {

  ArrowLeft, CreditCard, CheckCircle, Clock, XCircle, User, Building2, Calendar,
  AlertCircle, RefreshCw, Download, FileText, Ban,
} from 'lucide-react';

interface PaymentDetail {
  id: string;
  anggotaId: string;
  jumlah: number;
  status: string;
  tanggalBayar: string | null;
  metodeBayar: string | null;
  buktiBayarPath: string | null;
  catatan: string | null;
  diverifikasiOleh: string | null;
  diverifikasiAt: string | null;
  createdAt: string;
  anggota: {
    id: string;
    namaLengkap: string;
    nomorAnggota: string;
    ranting?: { id: string; nama: string };
  } | null;
  verifikator?: {
    id: string;
    namaLengkap: string;
    email: string;
  } | null;
  periode: string;
}

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  lunas: { label: 'Lunas', color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 border-green-200 dark:border-green-800', icon: <CheckCircle size={14} /> },
  menunggu_verifikasi: { label: 'Menunggu Verifikasi', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800', icon: <Clock size={14} /> },
  belum_dibayar: { label: 'Belum Dibayar', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-600', icon: <XCircle size={14} /> },
};

export default function PaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPayment = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: res } = await apiClient.get(`/payments/${id}`);
      setPayment(res.data);
      setError(null);
    } catch {
      setError('Gagal memuat data pembayaran');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchPayment(); }, [fetchPayment]);

  const handleVerify = async () => {
    if (!payment) return;
    if (!confirm('Verifikasi pembayaran ini? Status akan berubah menjadi LUNAS.')) return;
    setActionLoading('verify');
    try {
      await apiClient.patch(`/payments/${payment.id}/verify`);
      await fetchPayment();
    } catch { alert('Gagal memverifikasi pembayaran'); }
    setActionLoading(null);
  };

  const handleReject = async () => {
    if (!payment) return;
    if (!confirm('Tolak pembayaran ini? Status akan dikembalikan ke Belum Dibayar.')) return;
    setActionLoading('reject');
    try {
      await apiClient.patch(`/payments/${payment.id}/reject`);
      await fetchPayment();
    } catch { alert('Gagal menolak pembayaran'); }
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-36" />
        <div className="bg-white dark:bg-gray-800 rounded-2xl border p-6 space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
        </div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center max-w-md">
          <AlertCircle size={40} className="mx-auto text-red-400 mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Pembayaran Tidak Ditemukan</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <button onClick={() => router.push('/payments')} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            ← Kembali ke Pembayaran
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = statusConfig[payment.status] || statusConfig.belum_dibayar;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Breadcrumbs suffix={{ href: '#', label: payment?.anggota?.namaLengkap || 'Detail' }} />
      <Link href="/payments" className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition group">
        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        Kembali ke Pembayaran
      </Link>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className={`h-2 ${payment.status === 'lunas' ? 'bg-green-500' : payment.status === 'menunggu_verifikasi' ? 'bg-yellow-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-lg ${
                payment.status === 'lunas' ? 'bg-gradient-to-br from-green-500 to-emerald-600' :
                payment.status === 'menunggu_verifikasi' ? 'bg-gradient-to-br from-yellow-500 to-amber-600' :
                'bg-gradient-to-br from-gray-400 to-gray-500'
              }`}>
                <CreditCard size={24} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Detail Pembayaran</h1>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                    {statusInfo.icon}
                    {statusInfo.label}
                  </span>
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{formatRupiah(payment.jumlah)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  ID: {payment.id}
                </p>
              </div>
            </div>
            <button onClick={fetchPayment} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400" title="Refresh">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      {payment.status === 'menunggu_verifikasi' && (
        <div className="flex gap-3">
          <button onClick={handleVerify} disabled={actionLoading !== null} className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors shadow-sm flex-1 justify-center">
            {actionLoading === 'verify' ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <CheckCircle size={16} />}
            Verifikasi Pembayaran
          </button>
          <button onClick={handleReject} disabled={actionLoading !== null} className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors shadow-sm flex-1 justify-center">
            {actionLoading === 'reject' ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Ban size={16} />}
            Tolak Pembayaran
          </button>
        </div>
      )}

      {/* Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Info */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <CreditCard size={18} className="text-blue-500" />
            Informasi Pembayaran
          </h3>
          <div className="space-y-3">
            <InfoRow icon={CreditCard} label="Jumlah" value={formatRupiah(payment.jumlah)} />
            <InfoRow icon={FileText} label="Periode" value={payment.periode || '-'} />
            <InfoRow icon={FileText} label="Metode Bayar" value={payment.metodeBayar || '-'} />
          </div>
        </div>

        {/* Member Info */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <User size={18} className="text-blue-500" />
            Data Anggota
          </h3>
          {payment.anggota ? (
            <div className="space-y-3">
              <InfoRow icon={User} label="Nama" value={payment.anggota.namaLengkap} />
              <InfoRow icon={FileText} label="No. Anggota" value={payment.anggota.nomorAnggota} />
              <InfoRow icon={Building2} label="Ranting" value={payment.anggota.ranting?.nama || '-'} />
              <div className="pt-2">
                <Link
                  href={`/members/${payment.anggotaId}`}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Lihat Profil Anggota →
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Data anggota tidak tersedia</p>
          )}
        </div>
      </div>

      {/* Verification Timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
          <Clock size={18} className="text-blue-500" />
          Timeline Verifikasi
        </h3>
        <div className="space-y-4">
          <TimelineItem
            icon={CreditCard}
            title="Pembayaran Dibuat"
            date={payment.createdAt}
            status="completed"
          />
          {payment.tanggalBayar && (
            <TimelineItem
              icon={CheckCircle}
              title="Pembayaran Dilakukan"
              date={payment.tanggalBayar}
              status="completed"
            />
          )}
          {payment.status === 'lunas' && payment.diverifikasiAt && (
            <TimelineItem
              icon={CheckCircle}
              title="Diverifikasi"
              date={payment.diverifikasiAt}
              subtitle={payment.verifikator?.namaLengkap ? `Oleh: ${payment.verifikator.namaLengkap}` : undefined}
              status="completed"
            />
          )}
          {payment.status === 'belum_dibayar' && !payment.tanggalBayar && (
            <TimelineItem
              icon={XCircle}
              title="Menunggu Pembayaran"
              status="pending"
            />
          )}
          {payment.status === 'menunggu_verifikasi' && (
            <TimelineItem
              icon={Clock}
              title="Menunggu Verifikasi Admin"
              status="pending"
            />
          )}
        </div>
      </div>

      {/* Bukti Bayar */}
      {payment.buktiBayarPath && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText size={18} className="text-blue-500" />
              Bukti Pembayaran
            </h3>
            <a
              href={payment.buktiBayarPath}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition"
            >
              <Download size={14} /> Lihat File
            </a>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-800/50 p-4">
            <p className="text-xs font-mono text-gray-500 dark:text-gray-400 break-all">{payment.buktiBayarPath}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
      <Icon size={16} className="text-gray-400 mt-0.5" />
      <div>
        <p className="text-xs text-gray-500 uppercase">{label}</p>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function TimelineItem({ icon: Icon, title, date, subtitle, status }: {
  icon: React.ElementType;
  title: string;
  date?: string;
  subtitle?: string;
  status: 'completed' | 'pending';
}) {
  return (
      <PermissionGuard module="payments" action="view">
        <div className="flex gap-3">
              <div className={`flex flex-col items-center`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  status === 'completed' ? 'bg-green-100 dark:bg-green-950' : 'bg-yellow-100 dark:bg-yellow-950'
                }`}>
                  <Icon size={14} className={status === 'completed' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'} />
                </div>
                <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-700 mt-1" />
              </div>
              <div className="pb-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
                {date && <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
                {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
              </div>
            </div>
      </PermissionGuard>
    );
}
