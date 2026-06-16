'use client';

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { useFilters } from '@/lib/hooks/use-filters';
import {
  Send,
  Bell,
  BellOff,
  CheckCheck,
  Download,
  Settings,
  ChevronLeft,
  ChevronRight,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import SearchBar from '@/components/ui/search-bar';
import FilterSelect from '@/components/ui/filter-select';
import StatCard from '@/components/cards/stat-card';
import SendNotificationModal from '@/components/notifications/SendNotificationModal';
import { TIPE_OPTIONS, tipeColors } from '@/components/notifications/constants';

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
  const [meta, setMeta] = useState({ total: 0, totalPages: 0, unreadCount: 0 });
  const [markingAll, setMarkingAll] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [markingSelected, setMarkingSelected] = useState(false);

  const {
    page,
    setPage,
    search,
    setSearch,
    filters,
    setFilter,
    hasActiveFilters,
    getApiParams,
    resetFilters,
  } = useFilters({
    filters: [{ key: 'tipe', defaultValue: '' }],
  });

  // Send notification modal state
  const [showSendModal, setShowSendModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = getApiParams({ limit: 10 });
      const { data: res } = await apiClient.get('/notifications', { params });
      setData(res.data);
      setMeta(res.meta);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [page, filters.tipe, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Clear selection when data/page/filter changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [data, page, filters.tipe, search]);

  // Real-time polling: refresh unread count every 30s
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const { data: res } = await apiClient.get('/notifications/count');
        setMeta((prev) => ({ ...prev, unreadCount: res.data?.count || 0 }));
      } catch {
        /* ignore */
      }
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
        Array.from(selectedIds).map((id) => apiClient.patch(`/notifications/${id}/read`)),
      );
      setData((prev) => prev.map((n) => (selectedIds.has(n.id) ? { ...n, isRead: true } : n)));
      setMeta((prev) => ({
        ...prev,
        unreadCount: Math.max(0, prev.unreadCount - selectedIds.size),
      }));
      setSelectedIds(new Set());
    } catch {
      /* ignore */
    }
    setMarkingSelected(false);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0 || !confirm(`Hapus ${selectedIds.size} notifikasi?`)) return;
    setDeleting(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => apiClient.delete(`/notifications/${id}`)),
      );
      fetchData();
    } catch {
      /* ignore */
    }
    setDeleting(false);
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await apiClient.patch('/notifications/read-all');
      setData((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setMeta((prev) => ({ ...prev, unreadCount: 0 }));
    } catch {
      /* ignore */
    }
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
        if (filters.tipe) params.tipe = filters.tipe;
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
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `notifikasi-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
    setExporting(false);
  };

  const handleFilterChange = (value: string) => {
    setFilter('tipe', value);
  };

  return (
    <PageContainer>
      <PageHeader title="Notifikasi" onRefresh={fetchData}>
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
      </PageHeader>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total"
          value={meta.total}
          icon={<Bell size={18} />}
          color="blue"
          variant="mini"
        />
        <StatCard
          label="Belum Dibaca"
          value={meta.unreadCount}
          icon={<Bell size={18} />}
          color="orange"
          variant="mini"
        />
        <StatCard
          label="Sudah Dibaca"
          value={meta.total - meta.unreadCount}
          icon={<BellOff size={18} />}
          color="green"
          variant="mini"
        />
      </div>

      {/* Filter + Search */}
      <SearchBar
        search={search}
        onSearchChange={setSearch}
        onReset={resetFilters}
        placeholder="Cari notifikasi..."
      >
        <FilterSelect
          value={filters.tipe}
          onChange={handleFilterChange}
          options={TIPE_OPTIONS.filter((t) => t.value).map((t) => ({
            value: t.value,
            label: t.label,
          }))}
          placeholder="Semua Tipe"
        />
      </SearchBar>

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
              {hasActiveFilters
                ? 'Coba ubah filter atau kata kunci pencarian'
                : 'Notifikasi akan muncul saat ada aktivitas'}
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
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                      Judul
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                      Pesan
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">
                      Tipe
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">
                      Tanggal
                    </th>
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
                            setData((prev) =>
                              prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)),
                            );
                            setMeta((prev) => ({
                              ...prev,
                              unreadCount: Math.max(0, prev.unreadCount - 1),
                            }));
                          } catch {
                            /* ignore */
                          }
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
                          {!n.isRead && (
                            <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                          )}
                          <span
                            className={`font-medium ${!n.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}
                          >
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
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${tipeColors[n.tipe] || 'bg-gray-100 text-gray-600'}`}
                        >
                          {TIPE_OPTIONS.find((t) => t.value === n.tipe)?.label || n.tipe}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {n.isRead ? (
                          <span className="text-green-600 text-xs font-medium">Dibaca</span>
                        ) : (
                          <span className="text-blue-600 text-xs font-semibold">Baru</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(n.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
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
      <SendNotificationModal isOpen={showSendModal} onClose={() => setShowSendModal(false)} />
    </PageContainer>
  );
}
