'use client';

import { BarChart3 } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { formatRupiah } from './DuesStatCards';

interface DuesStats {
  totalTransaksi: number;
  totalMenunggak: number;
  anggotaAktif: number;
  lunasBulanIni: number;
}

interface MonthlyTrend {
  bulan: string;
  jumlah: number;
  transaksi: number;
}

const PIE_COLORS: Record<string, string> = {
  lunas: '#22c55e',
  menunggak: '#ef4444',
  belum_dibayar: '#9ca3af',
};

interface DuesChartsProps {
  stats: DuesStats | null;
  monthlyTrend: MonthlyTrend[];
}

export default function DuesCharts({ stats, monthlyTrend }: DuesChartsProps) {
  const pieData = stats
    ? [
        {
          name: 'Lunas',
          value: Math.max(0, stats.totalTransaksi - stats.totalMenunggak),
          color: PIE_COLORS.lunas,
        },
        { name: 'Menunggak', value: stats.totalMenunggak, color: PIE_COLORS.menunggak },
        {
          name: 'Belum Dibayar',
          value: Math.max(0, stats.anggotaAktif - stats.lunasBulanIni - stats.totalMenunggak),
          color: PIE_COLORS.belum_dibayar,
        },
      ].filter((d) => d.value > 0)
    : [];

  const complianceRate =
    stats && stats.anggotaAktif > 0
      ? Math.round((stats.lunasBulanIni / stats.anggotaAktif) * 100)
      : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Monthly Trend Bar Chart */}
      <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Tren Iuran Bulanan
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Total iuran terkumpul per bulan
          </p>
        </div>
        {!stats ? (
          <div className="h-80 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse flex items-center justify-center">
            <BarChart3 size={32} className="text-gray-300 dark:text-gray-600" />
          </div>
        ) : monthlyTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyTrend} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="bulan"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => formatRupiah(v)}
              />
              <Tooltip
                formatter={(value: number) => [formatRupiah(value), 'Jumlah']}
                labelFormatter={(label: string) => `Periode: ${label}`}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Bar dataKey="jumlah" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500 text-sm">
            <BarChart3 size={32} className="mr-2 opacity-30" />
            Belum ada data tren bulanan
          </div>
        )}
      </div>

      {/* Pie Chart + Compliance */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Status Pembayaran
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Distribusi status iuran</p>
        </div>
        {!stats ? (
          <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse flex items-center justify-center">
            <BarChart3 size={32} className="text-gray-300 dark:text-gray-600" />
          </div>
        ) : pieData.length > 0 ? (
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
                formatter={(value: number) => [value.toLocaleString('id-ID'), 'Anggota']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span className="text-xs text-gray-600 dark:text-gray-400">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-500 text-sm">
            Belum ada data iuran
          </div>
        )}

        {/* Compliance Mini Card */}
        {stats && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Kepatuhan Bulan Ini</span>
              <span
                className={`font-bold ${complianceRate >= 70 ? 'text-green-600' : complianceRate >= 40 ? 'text-yellow-600' : 'text-red-600'}`}
              >
                {complianceRate}%
              </span>
            </div>
            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  complianceRate >= 70
                    ? 'bg-green-500'
                    : complianceRate >= 40
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }`}
                style={{ width: `${complianceRate}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
              {stats.lunasBulanIni} dari {stats.anggotaAktif} anggota telah membayar
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
