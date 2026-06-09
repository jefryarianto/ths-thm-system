'use client';

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import {
  Send, Bell, BellOff, Filter, CheckCheck, Download, X, Settings,
  Search, ChevronLeft, ChevronRight, Trash2, RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

const TIPE_OPTIONS = [
  { value: '', label: 'Semua Tipe' },
  { value: 'umum', label: 'Umum' },
  { value: 'welcome', label: 'Selamat Datang' },
  { value: 'data_incomplete', label: 'Data Tidak Lengkap' },
  { value: 'reminder_latihan', label: 'Reminder Latihan' },
  { value: 'reminder_pendadaran', label: 'Reminder Pendadaran' },
  { value: 'reminder_iuran', label: 'Reminder Iuran' },
  { value: 'status_klaim', label: 'Status Klaim' },
  { value: 'dokumen_ready', label: 'Dokumen Ready' },
];

const tipeColors: Record<string, string> = {
  umum: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  welcome: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',
  data_incomplete: 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400',
  reminder_latihan: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400',
  reminder_pendadaran: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400',
  reminder_iuran: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400',
  status_klaim: 'bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-400',
  dokumen_ready: 'bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-400',
};

interface NotificationRow {
  [key: string]: unknown;
  id: string;
  judul: string;
  isi: string;
  tipe: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const [data, setData] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0, unreadCount: 0 });
  const [filterTipe, setFilterTipe] = useState('');
  const [markingAll, setMarkingAll] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [markingSelected, setMarkingSelected] = useState(false);

  // Send notification modal state
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendTarget, setSendTarget] = useState('broadcast');
  const [sendTargetRole, setSendTargetRole] = useState('admin_distrik');
  const [sendTargetUserId, setSendTargetUserId] = useState('');
  const [sendForm, setSendForm] = useState({ judul: '', isi: '', tipe: 'umum' });
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 10 };
      if (filterTipe) params.tipe = filterTipe;
      if (search) params.search = search;
      const { data: res } = await apiClient.get('/notifications', { params });
      setData(res.data);
      setMeta(res.meta);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, filterTipe, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Clear selection when data/page/filter changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [data, page, filterTipe, search]);

  // Real-time polling: refresh unread count every 30s
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const { data: res } = await apiClient.get('/notifications/count');
        setMeta((prev) => ({ ...prev, unreadCount: res.data?.count || 0 }));
      } catch { /* ignore */ }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const allIds = data.map((n) => n.id);
      const allSelected = allIds.every((id) => prev.has(id));
      return allSelected ? new Set() : new Set(allIds);
    });
  };

  const handleMarkSelectedRead = async () => {
    if (selectedIds.size === 0) return;
    setMarkingSelected(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => apiClient.patch(`/notifications/${id}/read`))
      );
      setData((prev) => prev.map((n) => selectedIds.has(n.id) ? { ...n, isRead: true } : n));
      setMeta((prev) => ({ ...prev, unreadCount: Math.max(0, prev.unreadCount - selectedIds.size) }));
      setSelectedIds(new Set());
    } catch { /* ignore */ }
    setMarkingSelected(false);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0 || !confirm(`Hapus ${selectedIds.size} notifikasi?`)) return;
    setDeleting(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => apiClient.delete(`/notifications/${id}`))
      );
      fetchData();
    } catch { /* ignore */ }
    setDeleting(false);
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await apiClient.patch('/notifications/read-all');
      setData((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setMeta((prev) => ({ ...prev, unreadCount: 0 }));
    } catch { /* ignore */ }
    setMarkingAll(false);
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      // Fetch all pages
      const allData: NotificationRow[] = [];
      if (!meta.total) {
        setExporting(false);
        return;
      }
      let p = 1;
      let hasMore = true;
      while (hasMore) {
        const params: Record<string, unknown> = { page: p, limit: 50 };
        if (filterTipe) params.tipe = filterTipe;
        const { data: res } = await apiClient.get('/notifications', { params });
        allData.push(...(res.data || []));
        hasMore = p < res.meta.totalPages;
        p++;
      }

      // Build CSV
      const headers = ['ID', 'Judul', 'Isi', 'Tipe', 'Dibaca', 'Tanggal'];
      const rows = allData.map((n: NotificationRow) => [
        n.id,
        JSON.stringify(n.judul || ''),
        JSON.stringify(n.isi || ''),
        n.tipe,
        n.isRead ? 'Ya' : 'Tidak',
        new Date(n.createdAt).toLocaleDateString('id-ID'),
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `notifikasi-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
    setExporting(false);
  };

  const handleSendNotification = async () => {
    if (!sendForm.judul || !sendForm.isi) return;
    setSending(true);
    setSendResult(null);
    try {
      let res;
      if (sendTarget === 'broadcast') {
        res = await apiClient.post('/notifications/broadcast', sendForm);
      } else if (sendTarget === 'role') {
        res = await apiClient.post('/notifications/role', { ...sendForm, role: sendTargetRole });
      } else if (sendTarget === 'user') {
        res = await apiClient.post('/notifications/send', { ...sendForm, userId: sendTargetUserId });
      }
      setSendResult(`Berhasil! ${res?.data?.data?.sentTo || 1} notifikasi terkirim.`);
      setSendForm({ judul: '', isi: '', tipe: 'umum' });
      setTimeout(() => { setSendResult(null); setShowSendModal(false); }, 2000);
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSendResult(apiErr || 'Gagal mengirim notifikasi');
    }
    setSending(false);
  };

  const handleFilterChange = (value: string) => {
    setFilterTipe(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifikasi</h1>
          {meta.unreadCount > 0 && (
            <span className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {meta.unreadCount} baru
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {meta.unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
            >
              <CheckCheck size={14} />
              {markingAll ? 'Memproses...' : 'Baca Semua'}
            </button>
          )}
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
          >
            <Download size={14} /> {exporting ? 'Export...' : 'CSV'}
          </button>
          <Link
            href="/notifications/report"
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <Download size={14} /> Laporan
          </Link>
          <Link
            href="/notifications/preferences"
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <Settings size={14} /> Pengaturan
          </Link>
          <button
            onClick={() => setShowSendModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
          >
            <Send size={14} /> Kirim
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950"><Bell size={18} className="text-blue-600 dark:text-blue-400" /></div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{meta.total}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-orange-50 dark:bg-orange-950"><Bell size={18} className="text-orange-600 dark:text-orange-400" /></div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Belum Dibaca</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{meta.unreadCount}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-green-50 dark:bg-green-950"><BellOff size={18} className="text-green-600 dark:text-green-400" /></div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Sudah Dibaca</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{meta.total - meta.unreadCount}</p>
          </div>
        </div>
      </div>

      {/* Filter + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400 dark:text-gray-500" />
          <select
            value={filterTipe}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            {TIPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {filterTipe && (
            <button onClick={() => handleFilterChange('')} className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
              Reset
            </button>
          )}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari notifikasi..."
            className="w-full pl-8 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
            Memuat notifikasi...
          </div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center">
            <BellOff size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Tidak ada notifikasi</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {search || filterTipe ? 'Coba ubah filter atau kata kunci pencarian' : 'Notifikasi akan muncul saat ada aktivitas'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="px-3 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={data.length > 0 && data.every((n) => selectedIds.has(n.id))}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Judul</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">Pesan</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Tipe</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((n) => (
                    <tr
                      key={n.id}
                      className={`border-b border-gray-100 dark:border-gray-800 transition cursor-pointer ${
                        selectedIds.has(n.id)
                          ? 'bg-blue-50 dark:bg-blue-950/40'
                          : !n.isRead
                          ? 'hover:bg-blue-50/50 dark:hover:bg-blue-950/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'
                      }`}
                      onClick={async () => {
                        if (!n.isRead) {
                          try {
                            await apiClient.patch(`/notifications/${n.id}/read`);
                            setData((prev) => prev.map((x) => x.id === n.id ? { ...x, isRead: true } : x));
                            setMeta((prev) => ({ ...prev, unreadCount: Math.max(0, prev.unreadCount - 1) }));
                          } catch { /* ignore */ }
                        }
                      }}
                    >
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(n.id)}
                          onChange={() => toggleSelect(n.id)}
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {!n.isRead && <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />}
                          <span className={`font-medium ${!n.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                            {n.judul}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-gray-500 dark:text-gray-400 text-xs">
                          {n.isi?.length > 60 ? n.isi.slice(0, 60) + '...' : n.isi || ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tipeColors[n.tipe] || 'bg-gray-100 text-gray-600'}`}>
                          {TIPE_OPTIONS.find(t => t.value === n.tipe)?.label || n.tipe}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {n.isRead
                          ? <span className="text-green-600 text-xs font-medium">Dibaca</span>
                          : <span className="text-blue-600 text-xs font-semibold">Baru</span>
                        }
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(n.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-700">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Halaman {page} dari {meta.totalPages} ({meta.total} total)
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition"
                  >
                    <ChevronLeft size={16} className="text-gray-600 dark:text-gray-400" />
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= meta.totalPages}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition"
                  >
                    <ChevronRight size={16} className="text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-5 py-3 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl">
          <span className="text-sm text-blue-700 dark:text-blue-300">
            <strong>{selectedIds.size}</strong> notifikasi dipilih
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              Batal
            </button>
            <button
              onClick={handleMarkSelectedRead}
              disabled={markingSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              <CheckCheck size={12} />
              {markingSelected ? '...' : `Baca ${selectedIds.size}`}
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition disabled:opacity-50"
            >
              {deleting ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
              {deleting ? '...' : `Hapus ${selectedIds.size}`}
            </button>
          </div>
        </div>
      )}

      {/* Send Notification Modal */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setShowSendModal(false); setSendResult(null); }}>            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Kirim Notifikasi</h2>
              <button onClick={() => { setShowSendModal(false); setSendResult(null); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X size={18} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Target */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kirim Ke</label>
              <select
                value={sendTarget}
                onChange={(e) => setSendTarget(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="broadcast">Semua Anggota</option>
                <option value="role">Berdasarkan Role</option>
                <option value="user">User Tertentu</option>
              </select>
            </div>

            {sendTarget === 'role' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                <select
                  value={sendTargetRole}
                  onChange={(e) => setSendTargetRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="superadmin">Superadmin</option>
                  <option value="admin_distrik">Admin Distrik</option>
                  <option value="admin_wilayah">Admin Wilayah</option>
                  <option value="admin_ranting">Admin Ranting</option>
                  <option value="anggota">Anggota</option>
                </select>
              </div>
            )}

            {sendTarget === 'user' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">User ID</label>
                <input
                  type="text"
                  value={sendTargetUserId}
                  onChange={(e) => setSendTargetUserId(e.target.value)}
                  placeholder="Masukkan User ID"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Form fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Judul</label>
              <input
                type="text"
                value={sendForm.judul}
                onChange={(e) => setSendForm((p) => ({ ...p, judul: e.target.value }))}
                placeholder="Judul notifikasi"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pesan</label>
              <textarea
                value={sendForm.isi}
                onChange={(e) => setSendForm((p) => ({ ...p, isi: e.target.value }))}
                placeholder="Isi notifikasi"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipe</label>
              <select
                value={sendForm.tipe}
                onChange={(e) => setSendForm((p) => ({ ...p, tipe: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                {TIPE_OPTIONS.filter(t => t.value).map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Result */}
            {sendResult && (
              <div className={`text-sm px-3 py-2 rounded-lg ${sendResult.includes('Berhasil') ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400'}`}>
                {sendResult}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setShowSendModal(false); setSendResult(null); }}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Batal
              </button>
              <button
                onClick={handleSendNotification}
                disabled={sending || !sendForm.judul || !sendForm.isi}
                className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                {sending ? 'Mengirim...' : 'Kirim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
