'use client';

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { usePaginatedList } from '@/lib/hooks/use-api';
import DataTable from '@/components/tables/data-table';
import {
  Plus, CreditCard, TrendingUp, AlertTriangle, CheckCircle,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
} from 'recharts';

interface DuesStats {
  totalIuran: number;
  totalTransaksi: number;
  totalLunas: number;
  totalMenunggak: number;
  iuranBulanIni: number;
  lunasBulanIni: number;
  belumBayarBulanIni: number;
  anggotaAktif: number;
}

interface DuesRow {
  id: string;
  anggota?: { namaLengkap: string };
  periode: string;
  jumlah: number;
  status: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  lunas: '#22c55e',
  menunggak: '#ef4444',
  belum_dibayar: '#9ca3af',
  menunggu_verifikasi: '#eab308',
};

const STATUS_LABELS: Record<string, string> = {
  lunas: 'Lunas',
  menunggak: 'Menunggak',
  belum_dibayar: 'Belum Dibayar',
  menunggu_verifikasi: 'Menunggu Verifikasi',
};

const statusColors: Record<string, string> = {
  lunas: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400',
  menunggak: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400',
  belum_dibayar: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  menunggu_verifikasi: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400',
};

const statColorMap = [
  { bg: 'bg-green-50', icon: 'text-green-600', ring: 'ring-green-100' },
  { bg: 'bg-red-50', icon: 'text-red-600', ring: 'ring-red-100' },
  { bg: 'bg-blue-50', icon: 'text-blue-600', ring: 'ring-blue-100' },
  { bg: 'bg-yellow-50', icon: 'text-yellow-600', ring: 'ring-yellow-100' },
];

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

const columns = [
  { key: 'anggota', label: 'Anggota', render: (d: DuesRow) => <span className="font-medium">{d.anggota?.namaLengkap || '-'}</span> },
  { key: 'periode', label: 'Periode' },
  { key: 'jumlah', label: 'Jumlah', render: (d: DuesRow) => formatRupiah(Number(d.jumlah)) },
  {
    key: 'status',
    label: 'Status',
    render: (d: DuesRow) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[d.status] || ''}`}>
        {STATUS_LABELS[d.status] || d.status}
      </span>
    ),
  },
  { key: 'createdAt', label: 'Tanggal', render: (d: DuesRow) => new Date(d.createdAt).toLocaleDateString('id-ID') },
];

export default function DuesPage() {
  const [stats, setStats] = useState<DuesStats | null>(null);
  const [page, setPage] = useState(1);

  const { data, meta, loading, refetch } = usePaginatedList<DuesRow>(
    () => apiClient.get('/dues', { params: { page, limit: 10 } }).then(r => r.data),
    [page]
  );

  const fetchStats = useCallback(async () => {
    try {
      const { data: res } = await apiClient.get('/dues/dashboard/stats');
      setStats(res.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const pieData = stats ? [
    { name: 'Lunas', value: Math.max(0, stats.totalTransaksi - stats.totalMenunggak - stats.belumBayarBulanIni), color: STATUS_COLORS.lunas },
    { name: 'Menunggak', value: stats.totalMenunggak, color: STATUS_COLORS.menunggak },
    { name: 'Belum Dibayar', value: Math.max(0, stats.anggotaAktif - stats.lunasBulanIni - stats.totalMenunggak), color: STATUS_COLORS.belum_dibayar },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manajemen Iuran</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Kelola pembayaran iuran anggota</p>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
          <Plus size={16} /> Tambah Iuran
        </button>
      </div>

      {/* Stat Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Iuran', value: formatRupiah(stats.totalIuran), icon: CreditCard, colorIdx: 2 },
            { label: 'Iuran Bulan Ini', value: formatRupiah(stats.iuranBulanIni), icon: TrendingUp, colorIdx: 0 },
            { label: 'Total Menunggak', value: formatRupiah(stats.totalMenunggak), icon: AlertTriangle, colorIdx: 1 },
            { label: 'Anggota Lunas', value: `${stats.lunasBulanIni} / ${stats.anggotaAktif}`, icon: CheckCircle, colorIdx: 0 },
          ].map((s) => {
            const styles = statColorMap[s.colorIdx];
            return (
              <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{s.label}</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{s.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ring-1 ${styles.ring} ${styles.bg}`}>
                    <s.icon size={20} className={styles.icon} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pie Chart + Table Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Status Pembayaran</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Distribusi status iuran keseluruhan</p>
          </div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} stroke="white" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [value.toLocaleString('id-ID'), 'Jumlah']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span className="text-xs text-gray-600 dark:text-gray-400">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-500 text-sm">
              Belum ada data iuran
            </div>
          )}
        </div>

        {/* Table */}
        <div className="lg:col-span-2">
          <DataTable
            data={data}
            loading={loading}
            page={page}
            totalPages={meta.totalPages}
            total={meta.total}
            onPageChange={setPage}
            columns={columns}
          />
        </div>
      </div>
    </div>
  );
}
