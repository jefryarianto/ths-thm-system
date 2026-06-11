'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { usePaginatedList } from '@/lib/hooks/use-api';
import { useDebounce } from '@/lib/hooks/use-debounce';
import type { Member } from '@/types';
import {
  Plus, Search, Download, Upload, MoreVertical,
  Users, UserCheck, AlertCircle, Clock, RefreshCw,
  ChevronLeft, ChevronRight, CheckCircle2,
  Shield, UserX, Eye,
} from 'lucide-react';

// ─── Helpers ───

const STATUS_BADGES: Record<string, string> = {
  aktif: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400',
  nonaktif: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400',
  pending: 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400',
  approved: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',
  rejected: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400',
  complete: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400',
  incomplete: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
};

function StatusBadge({ status, labels }: { status: string; labels?: Record<string, string> }) {
  const label = labels?.[status] || status;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGES[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
      {label}
    </span>
  );
}

const STATUS_LABELS: Record<string, Record<string, string>> = {
  keanggotaan: { aktif: 'Aktif', nonaktif: 'Nonaktif', pindah: 'Pindah', keluar: 'Keluar', meninggal: 'Meninggal' },
  data: { complete: 'Lengkap', incomplete: 'Belum Lengkap' },
  validasi: { pending: 'Pending', approved: 'Disetujui', rejected: 'Ditolak' },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Page ───

export default function MembersPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterData, setFilterData] = useState('');
  const [filterValidasi, setFilterValidasi] = useState('');

  // Stats
  const [stats, setStats] = useState({ total: 0, aktif: 0, pendingValidasi: 0, incomplete: 0 });

  const debouncedSearch = useDebounce(search, 300);

  const { data: members, meta, loading, error, refetch } = usePaginatedList<Member>(
    () => {
      const params: Record<string, unknown> = { page, limit: 15 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filterStatus) params.statusKeanggotaan = filterStatus;
      if (filterData) params.statusData = filterData;
      if (filterValidasi) params.statusValidasi = filterValidasi;
      return apiClient.get('/members', { params }).then(r => r.data);
    },
    [page, debouncedSearch, filterStatus, filterData, filterValidasi]
  );

  const fetchStats = useCallback(async () => {
    try {
      const { data: res } = await apiClient.get('/reports/dashboard');
      const d = res.data;
      setStats({
        total: d.totalMembers || 0,
        aktif: d.memberStatus?.find((s: { status: string }) => s.status === 'aktif')?.count || 0,
        pendingValidasi: d.pendingValidasi || 0,
        incomplete: d.incompleteData || 0,
      });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, filterStatus, filterData, filterValidasi]);

  // ─── Actions ───

  const handleAction = async (id: string, action: string) => {
    setActionLoading(id);
    try {
      if (action === 'suspend' || action === 'reactivate') {
        await apiClient.patch(`/members/${id}/${action}`, {});
      } else {
        await apiClient.post(`/members/${id}/${action}`, {});
      }
      refetch();
      fetchStats();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  // ─── Render ───

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users size={24} className="text-blue-600" />
            Anggota
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Kelola data anggota THS-THM
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <Upload size={14} /> Import
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <Download size={14} /> Export
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
            <Plus size={16} /> Tambah
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
                <Users size={18} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Anggota</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.total.toLocaleString('id-ID')}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950">
                <UserCheck size={18} className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Aktif</p>
                <p className="text-lg font-bold text-green-600">{stats.aktif.toLocaleString('id-ID')}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950">
                <Clock size={18} className="text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Pending Validasi</p>
                <p className="text-lg font-bold text-orange-600">{stats.pendingValidasi.toLocaleString('id-ID')}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                <AlertCircle size={18} className="text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Data Incomplete</p>
                <p className="text-lg font-bold text-gray-600 dark:text-gray-300">{stats.incomplete.toLocaleString('id-ID')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-xs w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, nomor anggota, email..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Semua Status</option>
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Nonaktif</option>
            <option value="pindah">Pindah</option>
            <option value="keluar">Keluar</option>
            <option value="meninggal">Meninggal</option>
          </select>
          <select
            value={filterData}
            onChange={(e) => setFilterData(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Semua Data</option>
            <option value="complete">Lengkap</option>
            <option value="incomplete">Belum Lengkap</option>
          </select>
          <select
            value={filterValidasi}
            onChange={(e) => setFilterValidasi(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Semua Validasi</option>
            <option value="pending">Pending</option>
            <option value="approved">Disetujui</option>
            <option value="rejected">Ditolak</option>
          </select>
          {(filterStatus || filterData || filterValidasi || search) && (
            <button
              onClick={() => { setFilterStatus(''); setFilterData(''); setFilterValidasi(''); setSearch(''); }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
            >
              Reset filter
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={refetch} className="underline hover:no-underline text-xs">Coba lagi</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">No. Anggota</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Nama</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">JK</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">No. HP</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">Ranting</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Data</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Validasi</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Tgl Daftar</th>
                <th className="text-right px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-gray-400">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
                    Memuat data...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center">
                    <Users size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Tidak ada data anggota</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {search || filterStatus || filterData || filterValidasi
                        ? 'Coba ubah filter atau kata kunci pencarian'
                        : 'Belum ada anggota terdaftar'}
                    </p>
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition">
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{member.nomorAnggota}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-medium text-gray-900 dark:text-white">{member.namaLengkap}</span>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell text-gray-600 dark:text-gray-400">{member.jenisKelamin}</td>
                    <td className="px-5 py-3 hidden md:table-cell text-gray-600 dark:text-gray-400">{member.noHp || '-'}</td>
                    <td className="px-5 py-3 hidden lg:table-cell text-gray-500">{member.ranting?.nama || '-'}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={member.statusKeanggotaan} labels={STATUS_LABELS.keanggotaan} />
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={member.statusData} labels={STATUS_LABELS.data} />
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={member.statusValidasi} labels={STATUS_LABELS.validasi} />
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell text-xs text-gray-500">
                      {formatDate(member.createdAt)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Quick Actions */}
                        {member.statusValidasi === 'pending' && (
                          <button
                            onClick={() => handleAction(member.id, 'approve')}
                            disabled={actionLoading === member.id}
                            className="p-1.5 rounded hover:bg-green-50 dark:hover:bg-green-950 transition disabled:opacity-30"
                            title="Setujui"
                          >
                            <CheckCircle2 size={14} className="text-green-600" />
                          </button>
                        )}
                        {member.statusKeanggotaan === 'aktif' ? (
                          <button
                            onClick={() => handleAction(member.id, 'suspend')}
                            disabled={actionLoading === member.id}
                            className="p-1.5 rounded hover:bg-yellow-50 dark:hover:bg-yellow-950 transition disabled:opacity-30"
                            title="Nonaktifkan"
                          >
                            <UserX size={14} className="text-yellow-600" />
                          </button>
                        ) : member.statusKeanggotaan === 'nonaktif' ? (
                          <button
                            onClick={() => handleAction(member.id, 'reactivate')}
                            disabled={actionLoading === member.id}
                            className="p-1.5 rounded hover:bg-green-50 dark:hover:bg-green-950 transition disabled:opacity-30"
                            title="Aktifkan kembali"
                          >
                            <Shield size={14} className="text-green-600" />
                          </button>
                        ) : null}
                        <button
                          onClick={() => router.push(`/members/${member.id}`)}
                          className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950 transition"
                          title="Detail"
                        >
                          <Eye size={14} className="text-blue-600" />
                        </button>
                        <div className="relative group">
                          <button className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                            <MoreVertical size={14} className="text-gray-400" />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-700">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {meta.total} anggota — Halaman {page} dari {meta.totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition"
              >
                <ChevronLeft size={16} className="text-gray-600 dark:text-gray-400" />
              </button>
              {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
                const start = Math.max(1, page - 2);
                const num = start + i;
                if (num > meta.totalPages) return null;
                return (
                  <button
                    key={num}
                    onClick={() => setPage(num)}
                    className={`w-7 h-7 rounded text-xs font-medium transition ${
                      num === page
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition"
              >
                <ChevronRight size={16} className="text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
