'use client';

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import {
  CreditCard, CheckCircle, Clock, ArrowUpRight,
} from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import DataTable from '@/components/ui/data-table';
import SearchBar from '@/components/ui/search-bar';

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

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= meta.totalPages) setPage(p);
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Manajemen Pembayaran" onRefresh={fetchData} />

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

      <SearchBar
        search={search}
        onSearchChange={v => { setSearch(v); setPage(1); }}
        onReset={() => { setSearch(''); setPage(1); }}
        placeholder="Cari pembayaran (nama, no. anggota)..."
      />

      <DataTable
        columns={[
          { label: 'Anggota' },
          { label: 'No. Anggota', hidden: 'hidden sm:table-cell' },
          { label: 'Jumlah', align: 'right' },
          { label: 'Status' },
          { label: 'Tanggal Bayar', hidden: 'hidden md:table-cell' },
        ]}
        data={dues}
        loading={loading}
        empty={{
          icon: CreditCard,
          message: search ? 'Tidak ada pembayaran yang cocok dengan pencarian' : 'Belum ada data pembayaran',
          action: search ? { label: 'Reset pencarian', onClick: () => { setSearch(''); setPage(1); } } : undefined,
        }}
        page={page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={handlePageChange}
        colSpan={5}
        renderRow={(due: DuesRecord) => (
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
        )}
      />
    </div>
  );
}
