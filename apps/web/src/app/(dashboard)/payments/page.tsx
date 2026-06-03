'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { CreditCard, Search, CheckCircle, Clock, ArrowUpRight } from 'lucide-react';

interface DuesRecord {
  id: string;
  anggotaId: string;
  jumlah: number;
  status: string;
  tanggalBayar: string | null;
  anggota?: { namaLengkap: string; nomorAnggota: string };
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
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

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) { router.push('/login'); return; }
    fetchData();
  }, [page, search]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [duesRes, statsRes] = await Promise.all([
        apiClient.get<PaginatedResponse<DuesRecord>>('/dues', { params: { page, limit: 10, search } }),
        apiClient.get<{ success: boolean; data: StatsData }>('/dues/dashboard/stats'),
      ]);
      setDues(duesRes.data.data);
      setMeta(duesRes.data.meta);
      if (statsRes.data.success) setStats(statsRes.data.data);
    } catch (err) {
      console.error('Failed to fetch payments data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'lunas') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle size={12} /> Lunas
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <Clock size={12} /> Belum Lunas
      </span>
    );
  };

  return (
    <div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><CreditCard size={20} className="text-blue-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Total Terkumpul</p>
              <p className="text-lg font-bold text-gray-900">{formatRupiah(stats.totalCollected)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg"><CheckCircle size={20} className="text-green-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Lunas</p>
              <p className="text-lg font-bold text-gray-900">{stats.paidCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg"><Clock size={20} className="text-yellow-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Belum Lunas</p>
              <p className="text-lg font-bold text-gray-900">{stats.pendingCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg"><ArrowUpRight size={20} className="text-purple-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Total Iuran</p>
              <p className="text-lg font-bold text-gray-900">{stats.totalDues}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex items-center gap-2 mb-6">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari pembayaran..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-80"
          />
        </div>
        <button type="submit" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition">
          Cari
        </button>
      </form>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Anggota</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">No. Anggota</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tanggal Bayar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-500">Memuat data...</td>
                </tr>
              ) : dues.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-500">Tidak ada data pembayaran</td>
                </tr>
              ) : (
                dues.map((due) => (
                  <tr key={due.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{due.anggota?.namaLengkap || '-'}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{due.anggota?.nomorAnggota || '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatRupiah(due.jumlah)}</td>
                    <td className="px-4 py-3">{getStatusBadge(due.status)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{due.tanggalBayar ? new Date(due.tanggalBayar).toLocaleDateString('id-ID') : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <span className="text-sm text-gray-600">Total {meta.total} pembayaran</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
              >
                Sebelumnya
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">{page} / {meta.totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}