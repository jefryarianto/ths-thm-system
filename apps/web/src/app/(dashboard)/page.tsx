'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import {
  Users, UserPlus, GraduationCap, CreditCard,
  AlertCircle, CheckCircle, TrendingUp,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

interface DashboardData {
  totalMembers: number;
  totalCandidates: number;
  totalGraduated: number;
  totalDuesCollected: number;
  pendingValidasi: number;
  incompleteData: number;
  memberStatus: Array<{ status: string; count: number }>;
  monthlyDues: Array<{ bulan: string; jumlah: number; transaksi: number }>;
}

const STATUS_COLORS: Record<string, string> = {
  aktif: '#22c55e',
  nonaktif: '#eab308',
  pindah: '#3b82f6',
  keluar: '#ef4444',
  meninggal: '#6b7280',
};

const STATUS_LABELS: Record<string, string> = {
  aktif: 'Aktif',
  nonaktif: 'Nonaktif',
  pindah: 'Pindah',
  keluar: 'Keluar',
  meninggal: 'Meninggal',
};

function formatRupiah(value: number) {
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)}jt`;
  if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(0)}rb`;
  return `Rp ${value.toLocaleString('id-ID')}`;
}

const statConfigs = [
  { key: 'totalMembers', label: 'Total Anggota', icon: Users, color: 'blue' as const },
  { key: 'totalCandidates', label: 'Calon Anggota', icon: UserPlus, color: 'purple' as const },
  { key: 'totalGraduated', label: 'Lulus Pendadaran', icon: GraduationCap, color: 'green' as const },
  { key: 'totalDuesCollected', label: 'Total Iuran Terkumpul', icon: CreditCard, color: 'yellow' as const, isCurrency: true },
  { key: 'pendingValidasi', label: 'Menunggu Validasi', icon: AlertCircle, color: 'yellow' as const },
  { key: 'incompleteData', label: 'Data Tidak Lengkap', icon: AlertCircle, color: 'red' as const },
];

const colorMap = {
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', ring: 'ring-blue-100' },
  green: { bg: 'bg-green-50', icon: 'text-green-600', ring: 'ring-green-100' },
  yellow: { bg: 'bg-yellow-50', icon: 'text-yellow-600', ring: 'ring-yellow-100' },
  red: { bg: 'bg-red-50', icon: 'text-red-600', ring: 'ring-red-100' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', ring: 'ring-purple-100' },
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: res } = await apiClient.get('/reports/dashboard');
        setData(res.data);
      } catch (err) {
        console.error('Failed to fetch dashboard:', err);
        setError('Gagal memuat data dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-600 font-medium">{error}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Periksa koneksi ke server API</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const pieData = (data.memberStatus || []).map((s) => ({
    name: STATUS_LABELS[s.status] || s.status,
    value: s.count,
    color: STATUS_COLORS[s.status] || '#6b7280',
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Ringkasan data THS-THM</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <TrendingUp size={16} />
          <span>Overview</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statConfigs.map(({ key, label, icon: Icon, color, isCurrency }) => {
          const styles = colorMap[color];
          const rawValue = (data as any)[key];
          const displayValue = isCurrency ? formatRupiah(Number(rawValue)) : rawValue?.toLocaleString('id-ID') || '0';
          return (
            <div
              key={key}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{displayValue}</p>
                </div>
                <div className={`p-3 rounded-xl ring-1 ${styles.ring} ${styles.bg}`}>
                  <Icon size={22} className={styles.icon} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart - Monthly Dues */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Iuran 6 Bulan Terakhir</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Total iuran terkumpul per bulan</p>
          </div>
          {data.monthlyDues && data.monthlyDues.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.monthlyDues} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="bulan"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatRupiah(v)}
                />
                <Tooltip
                  formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, 'Jumlah']}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Bar
                  dataKey="jumlah"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500 text-sm">
              Belum ada data iuran
            </div>
          )}
        </div>

        {/* Pie Chart - Member Status */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Status Keanggotaan</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Distribusi status anggota</p>
          </div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} stroke="white" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [value.toLocaleString('id-ID'), 'Anggota']}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
              Belum ada data anggota
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
