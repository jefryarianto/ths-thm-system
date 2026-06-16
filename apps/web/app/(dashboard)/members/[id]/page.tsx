'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  CheckCircle2,
  UserX,
  FileText,
  CreditCard,
  Award,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  MoreVertical,
  BadgeCheck,
  Users,
} from 'lucide-react';
import Modal from '@/components/ui/modal';
import {
  StatusBadge,
  InfoRow,
  DetailStats,
  DetailSkeleton,
  DUES_STATUS_STYLES,
  DOCUMENT_TYPES,
  FLAT_STATUS_LABELS,
  formatDate,
  formatRupiah,
} from '@/components/members/constants';

// ─── Types ───

interface MemberDetail {
  id: string;
  nomorAnggota: string;
  namaLengkap: string;
  jenisKelamin: 'L' | 'P';
  tempatLahir: string | null;
  tanggalLahir: string | null;
  alamat: string | null;
  noHp: string | null;
  email: string | null;
  fotoPath: string | null;
  statusKeanggotaan: string;
  tingkat: string | null;
  statusData: string;
  statusValidasi: string;
  missingFields: string[] | null;
  rantingId: string;
  ranting?: {
    id: string;
    nama: string;
    kodeRanting: string;
    lokasiLatihan: string | null;
    wilayah?: { id: string; nama: string; distrik?: { id: string; nama: string } };
  };
  dokumen: DocumentItem[];
  iuran: DuesItem[];
  createdAt: string;
  updatedAt: string;
}

interface DocumentItem {
  id: string;
  jenis: string;
  namaDokumen?: string;
  status: string;
  tokenVerifikasi?: string;
  createdAt: string;
}

interface DuesItem {
  id: string;
  periode: string;
  jumlah: number;
  status: string;
  tanggalBayar: string | null;
  createdAt: string;
}

// ─── Page Component ───

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'documents' | 'dues'>('info');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchMember = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: res } = await apiClient.get(`/members/${id}`);
      setMember(res.data);
      setError(null);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) setError('Anggota tidak ditemukan');
      else if (status === 403) setError('Akses ditolak: di luar cakupan wilayah Anda');
      else setError('Gagal memuat data anggota');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMember();
  }, [fetchMember]);

  const handleAction = async (action: string) => {
    if (!member) return;
    setActionLoading(action);
    try {
      let endpoint = '';
      if (action === 'suspend' || action === 'reactivate') {
        endpoint = `/members/${member.id}/${action}`;
        await apiClient.patch(endpoint, {});
      } else {
        endpoint = `/members/${member.id}/${action}`;
        await apiClient.post(endpoint, {});
      }
      await fetchMember();
    } catch {
      /* ignore */
    }
    setActionLoading(null);
  };

  const handleDelete = async () => {
    if (!member) return;
    setActionLoading('delete');
    try {
      await apiClient.delete(`/members/${member.id}`);
      router.push('/members');
    } catch {
      /* ignore */
    }
    setActionLoading(null);
    setShowDeleteModal(false);
  };

  if (loading) return <DetailSkeleton />;

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {error === 'Anggota tidak ditemukan' ? 'Anggota Tidak Ditemukan' : 'Gagal Memuat Data'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {error === 'Anggota tidak ditemukan'
              ? 'Anggota yang Anda cari mungkin telah dihapus atau tidak tersedia.'
              : error}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => router.push('/members')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              ← Kembali
            </button>
            <button
              onClick={fetchMember}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!member) return null;

  const initials = member.namaLengkap
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const totalPaid = member.iuran
    .filter((d: DuesItem) => d.status === 'lunas')
    .reduce((sum: number, d: DuesItem) => sum + Number(d.jumlah), 0);

  const totalDues = member.iuran.length;
  const paidDues = member.iuran.filter((d: DuesItem) => d.status === 'lunas').length;

  const orgPath =
    [member.ranting?.wilayah?.distrik?.nama, member.ranting?.wilayah?.nama, member.ranting?.nama]
      .filter(Boolean)
      .join(' › ') || '-';

  return (
    <div className="space-y-6">
      {/* ── Back Button ── */}
      <Link
        href="/members"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        Kembali ke Daftar Anggota
      </Link>

      {/* ── Profile Header ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 relative">
          <button
            onClick={fetchMember}
            className="absolute top-3 right-3 p-2 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm transition text-white"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-12">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg ring-4 ring-white dark:ring-gray-800">
              {initials}
            </div>
            <div className="flex-1 mt-2 sm:mt-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {member.namaLengkap}
                </h1>
                <span className="font-mono text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md">
                  {member.nomorAnggota}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <StatusBadge status={member.statusKeanggotaan} bordered />
                <StatusBadge status={member.statusValidasi} bordered />
                <StatusBadge status={member.statusData} bordered />
                {member.tingkat && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-400">
                    <Award size={12} />
                    {member.tingkat}
                  </span>
                )}
              </div>
            </div>
            {/* Quick Actions */}
            <div className="flex items-center gap-2 mt-4 sm:mt-0">
              {member.statusValidasi === 'pending' && (
                <button
                  onClick={() => handleAction('approve')}
                  disabled={actionLoading === 'approve'}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  <CheckCircle2 size={14} />
                  {actionLoading === 'approve' ? 'Memproses...' : 'Setujui'}
                </button>
              )}
              {member.statusKeanggotaan === 'aktif' ? (
                <button
                  onClick={() => handleAction('suspend')}
                  disabled={actionLoading === 'suspend'}
                  className="flex items-center gap-1.5 px-3 py-2 border border-yellow-300 dark:border-yellow-600 text-yellow-700 dark:text-yellow-400 rounded-lg text-xs font-medium hover:bg-yellow-50 dark:hover:bg-yellow-950 transition disabled:opacity-50"
                >
                  <UserX size={14} />
                  {actionLoading === 'suspend' ? 'Memproses...' : 'Nonaktifkan'}
                </button>
              ) : member.statusKeanggotaan === 'nonaktif' ? (
                <button
                  onClick={() => handleAction('reactivate')}
                  disabled={actionLoading === 'reactivate'}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  <Shield size={14} />
                  {actionLoading === 'reactivate' ? 'Memproses...' : 'Aktifkan'}
                </button>
              ) : null}
              {member.statusValidasi === 'rejected' && (
                <button
                  onClick={() => handleAction('approve')}
                  disabled={actionLoading === 'approve'}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition disabled:opacity-50"
                >
                  <BadgeCheck size={14} />
                  Setujui
                </button>
              )}
              <button
                onClick={() => setShowDeleteModal(true)}
                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition text-gray-400 hover:text-red-500"
                title="Hapus anggota"
              >
                <MoreVertical size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <DetailStats
        createdAt={member.createdAt}
        dokumenCount={member.dokumen.length}
        paidDues={paidDues}
        totalDues={totalDues}
        rantingNama={member.ranting?.nama || '-'}
      />

      {/* ── Tabs ── */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-6">
          {[
            { key: 'info', label: 'Informasi Pribadi', icon: User },
            { key: 'documents', label: `Dokumen (${member.dokumen.length})`, icon: FileText },
            { key: 'dues', label: `Riwayat Iuran (${totalDues})`, icon: CreditCard },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                  isActive
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab: Info Pribadi ── */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Info */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <User size={18} className="text-blue-500" />
              Data Pribadi
            </h3>
            <div className="space-y-2">
              <InfoRow icon={User} label="Nama Lengkap" value={member.namaLengkap} />
              <InfoRow
                icon={User}
                label="Jenis Kelamin"
                value={member.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
              />
              <InfoRow
                icon={Calendar}
                label="Tempat, Tgl Lahir"
                value={
                  [member.tempatLahir, member.tanggalLahir ? formatDate(member.tanggalLahir) : null]
                    .filter(Boolean)
                    .join(', ') || null
                }
              />
              <InfoRow icon={MapPin} label="Alamat" value={member.alamat} />
            </div>
          </div>

          {/* Contact & Organization */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <Mail size={18} className="text-blue-500" />
                Kontak
              </h3>
              <div className="space-y-2">
                <InfoRow
                  icon={Mail}
                  label="Email"
                  value={member.email}
                  href={member.email ? `mailto:${member.email}` : undefined}
                />
                <InfoRow
                  icon={Phone}
                  label="No. HP"
                  value={member.noHp}
                  href={member.noHp ? `tel:${member.noHp}` : undefined}
                />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <Users size={18} className="text-blue-500" />
                Organisasi
              </h3>
              <div className="space-y-2">
                <InfoRow icon={Users} label="Jalur Organisasi" value={orgPath} />
                <InfoRow icon={Award} label="Tingkat" value={member.tingkat || null} />
                <InfoRow
                  icon={Calendar}
                  label="Terakhir Diperbarui"
                  value={formatDate(member.updatedAt)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Dokumen ── */}
      {activeTab === 'documents' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText size={18} className="text-blue-500" />
              Dokumen Anggota
            </h3>
            <span className="text-xs text-gray-400">{member.dokumen.length} dokumen</span>
          </div>
          {member.dokumen.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                      Jenis
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                      Nama Dokumen
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                      Dibuat
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {member.dokumen.map((doc) => (
                    <tr
                      key={doc.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {DOCUMENT_TYPES[doc.jenis] || doc.jenis}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {doc.namaDokumen || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={doc.status} />
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-xs text-gray-500">
                        {formatDate(doc.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {doc.tokenVerifikasi && (
                            <Link
                              href={`/verify/${doc.tokenVerifikasi}`}
                              target="_blank"
                              className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950 transition"
                              title="Verifikasi Dokumen"
                            >
                              <BadgeCheck size={14} className="text-blue-600" />
                            </Link>
                          )}
                          <Link
                            href={`/documents?search=${doc.jenis}`}
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                            title="Lihat Detail"
                          >
                            <ExternalLink size={14} className="text-gray-400" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10">
              <FileText size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada dokumen</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Dokumen akan muncul setelah di-generate
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Iuran ── */}
      {activeTab === 'dues' && (
        <div className="space-y-6">
          {/* Dues Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950">
                  <CheckCircle2 size={18} className="text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Lunas</p>
                  <p className="text-lg font-bold text-green-600">{paidDues}x</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
                  <CreditCard size={18} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Dibayar</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatRupiah(totalPaid)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950">
                  <Award size={18} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Kepatuhan</p>
                  <p className="text-lg font-bold text-purple-600">
                    {totalDues > 0 ? Math.round((paidDues / totalDues) * 100) : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Dues Table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Riwayat Pembayaran Iuran
              </h3>
            </div>
            {member.iuran.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                      <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                        Periode
                      </th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                        Jumlah
                      </th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                        Status
                      </th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                        Tgl Bayar
                      </th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">
                        Tgl Input
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {member.iuran.map((dues) => (
                      <tr
                        key={dues.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition"
                      >
                        <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">
                          {dues.periode}
                        </td>
                        <td className="px-5 py-3 font-mono text-sm text-gray-700 dark:text-gray-300">
                          {formatRupiah(Number(dues.jumlah))}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${DUES_STATUS_STYLES[dues.status] || ''}`}
                          >
                            {FLAT_STATUS_LABELS[dues.status] || dues.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 hidden sm:table-cell text-xs text-gray-500">
                          {dues.tanggalBayar ? formatDate(dues.tanggalBayar) : '-'}
                        </td>
                        <td className="px-5 py-3 hidden md:table-cell text-xs text-gray-500">
                          {formatDate(dues.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10">
                <CreditCard size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada riwayat iuran</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Data iuran akan muncul setelah dicatat
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Hapus Anggota"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">
              Tindakan ini akan menghapus <strong>{member.namaLengkap}</strong> secara permanen.
            </p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Data yang terkait seperti dokumen dan riwayat iuran juga akan terhapus. Tindakan ini
            tidak dapat dibatalkan.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Batal
            </button>
            <button
              onClick={handleDelete}
              disabled={actionLoading === 'delete'}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
            >
              {actionLoading === 'delete' ? 'Menghapus...' : 'Ya, Hapus'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
