'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import {
  CreditCard, Search, CheckCircle, Clock, ArrowUpRight, RefreshCw,
  ChevronLeft, ChevronRight,
} from 'lucide-react';

interface DuesRecord {
  id: string;
  anggotaId: string;
  jumlah: number;
  status: string;
  tanggalBayar: string | null;
  anggota?: { namaLengkap: string; nomorAnggota: string };
}

interface StatsData {
  totalCollected: number;
  pendingCount: number;
  paidCount: number;
  totalDues: number;
}

export default function PaymentsPage() {
  const router = useRouter();
  const [dues, setDues] = useState<DuesRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsData>({ totalCollected: 0, pendingCount: 0, paidCount: 0, totalDues: 0 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 10 };
      if (search) params.search = search;
      const [duesRes, statsRes] = await Promise.all([
        apiClient.get('/dues', { params }),
        apiClient.get('/dues/dashboard/stats'),
      ]);
      setDues(duesRes.data.data || []);
      setMeta(duesRes.data.meta || { total: 0, totalPages: 0 });
      if (statsRes.data.success) setStats(statsRes.data.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= meta.totalPages) setPage(p);
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  const renderPageNumbers = () => {
    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(meta.totalPages, page + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages.map(p => (
      <button
        key={p}
        onClick={() => handlePageChange(p)}
        className={`px-2.5 py-1 text-sm rounded-md ${p === page
          ? 'bg-blue-600 text-white'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        {p}
      </button>
    ));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Manajemen Pembayaran</h1>
        <button
          onClick={() => fetchData()}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Terkumpul', value: formatRupiah(stats.totalCollected), icon: CreditCard, bg: 'bg-blue-100 dark:bg-blue-950', iconColor: 'text-blue-600 dark:text-blue-400' },
          { label: 'Lunas', value: stats.paidCount, icon: CheckCircle, bg: 'bg-green-100 dark:bg-green-950', iconColor: 'text-green-600 dark:text-green-400' },
          { label: 'Belum Lunas', value: stats.pendingCount, icon: Clock, bg: 'bg-yellow-100 dark:bg-yellow-950', iconColor: 'text-yellow-600 dark:text-yellow-400' },
          { label: 'Total Iuran', value: stats.totalDues, icon: ArrowUpRight, bg: 'bg-purple-100 dark:bg-purple-950', iconColor: 'text-purple-600 dark:text-purple-400' },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${s.bg}`}>
                <s.icon size={20} className={s.iconColor} />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cari pembayaran (nama, no. anggota)..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cari
          </button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); setPage(1); }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Reset
            </button>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">Anggota</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap hidden sm:table-cell">No. Anggota</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">Jumlah</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap hidden md:table-cell">Tanggal Bayar</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : dues.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <CreditCard size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">
                      {search ? 'Tidak ada pembayaran yang cocok dengan pencarian' : 'Belum ada data pembayaran'}
                    </p>
                    {search && (
                      <button
                        onClick={() => { setSearch(''); setPage(1); }}
                        className="mt-2 text-sm text-blue-600 hover:underline"
                      >
                        Reset pencarian
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                dues.map((due) => (
                  <tr key={due.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{due.anggota?.namaLengkap || '-'}</td>
                    <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-400 hidden sm:table-cell">{due.anggota?.nomorAnggota || '-'}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatRupiah(due.jumlah)}</td>
                    <td className="px-4 py-3">
                      {due.status === 'lunas' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400">
                          <CheckCircle size={12} /> Lunas
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400">
                          <Clock size={12} /> Belum Lunas
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden md:table-cell">
                      {due.tanggalBayar ? new Date(due.tanggalBayar).toLocaleDateString('id-ID') : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">{meta.total} total</p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              {renderPageNumbers()}
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= meta.totalPages}
                className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
