'use client';

import { formatRupiah } from '@/lib/format';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  GraduationCap,
  CreditCard,
  AlertCircle,
  FileText,
  Calendar,
  Dumbbell,
  ClipboardCheck,
  Shield,
  BarChart3,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import ReportsStatCard from './ReportsStatCard';
import { STATUS_COLORS, STATUS_LABELS } from './constants';

interface DashboardData {
  totalMembers: number;
  totalCandidates: number;
  totalGraduated: number;
  totalDuesCollected: number;
  pendingValidasi: number;
  incompleteData: number;
  totalKegiatan: number;
  totalLatihan: number;
  totalKlaim: number;
  totalDokumen: number;
  totalPendaftaran: number;
  totalUsers: number;
  memberStatus: Array<{ status: string; count: number }>;
  monthlyDues: Array<{ bulan: string; jumlah: number; transaksi: number }>;
  emailSummary: {
    totalSent: number;
    totalFailed: number;
    totalSkipped: number;
    totalSuppressed: number;
  } | null;
}

interface OverviewTabProps {
  dashboard: DashboardData | null;
  loading: boolean;
}

export default function OverviewTab({ dashboard, loading }: OverviewTabProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 animate-pulse h-20"
          />
        ))}
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="text-center py-12 text-gray-500">
        <BarChart3 size={40} className="mx-auto mb-3 opacity-40" />
        <p>Gagal memuat data laporan</p>
      </div>
    );
  }

  const pieData = dashboard.memberStatus
    ? dashboard.memberStatus.map((s) => ({
        name: STATUS_LABELS[s.status] || s.status,
        value: s.count,
        color: STATUS_COLORS[s.status] || '#6b7280',
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <ReportsStatCard
          label="Anggota"
          value={dashboard.totalMembers.toLocaleString('id-ID')}
          color="text-blue-600"
          icon={Users}
        />
        <ReportsStatCard
          label="Calon"
          value={dashboard.totalCandidates.toLocaleString('id-ID')}
          color="text-purple-600"
          icon={UserPlus}
        />
        <ReportsStatCard
          label="Lulus Pendadaran"
          value={dashboard.totalGraduated.toLocaleString('id-ID')}
          color="text-green-600"
          icon={GraduationCap}
        />
        <ReportsStatCard
          label="Iuran Terkumpul"
          value={formatRupiah(dashboard.totalDuesCollected)}
          color="text-yellow-600"
          icon={CreditCard}
        />
        <ReportsStatCard
          label="Pending Validasi"
          value={dashboard.pendingValidasi.toLocaleString('id-ID')}
          color="text-orange-600"
          icon={AlertCircle}
        />
        <ReportsStatCard
          label="Data Incomplete"
          value={dashboard.incompleteData.toLocaleString('id-ID')}
          color="text-red-600"
          icon={AlertCircle}
        />
        <ReportsStatCard
          label="Kegiatan Aktif"
          value={dashboard.totalKegiatan.toLocaleString('id-ID')}
          color="text-indigo-600"
          icon={Calendar}
        />
        <ReportsStatCard
          label="Total Latihan"
          value={dashboard.totalLatihan.toLocaleString('id-ID')}
          color="text-teal-600"
          icon={Dumbbell}
        />
        <ReportsStatCard
          label="Klaim Diproses"
          value={dashboard.totalKlaim.toLocaleString('id-ID')}
          color="text-pink-600"
          icon={ClipboardCheck}
        />
        <ReportsStatCard
          label="Dokumen"
          value={dashboard.totalDokumen.toLocaleString('id-ID')}
          color="text-cyan-600"
          icon={FileText}
        />
        <ReportsStatCard
          label="Pendaftaran Baru"
          value={dashboard.totalPendaftaran.toLocaleString('id-ID')}
          color="text-amber-600"
          icon={UserPlus}
        />
        <ReportsStatCard
          label="Admin Aktif"
          value={dashboard.totalUsers.toLocaleString('id-ID')}
          color="text-gray-600"
          icon={Shield}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Dues */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Iuran 6 Bulan Terakhir
          </h3>
          {dashboard.monthlyDues && dashboard.monthlyDues.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={dashboard.monthlyDues}
                margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="bulan"
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatRupiah(v)}
                />
                <Tooltip formatter={(v: number) => [`Rp ${v.toLocaleString('id-ID')}`, 'Jumlah']} />
                <Bar dataKey="jumlah" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-sm text-gray-400">
              Belum ada data
            </div>
          )}
        </div>

        {/* Member Status Pie */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Status Keanggotaan
          </h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="white" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [v.toLocaleString('id-ID'), 'Anggota']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-sm text-gray-400">
              Belum ada data
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {pieData.map((d) => (
              <span key={d.name} className="flex items-center gap-1 text-xs text-gray-500">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name}: {d.value}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Email Summary */}
      {dashboard.emailSummary && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
              <FileText size={15} className="text-blue-500" />
              Statistik Email
            </h3>
            <Link href="/settings/email" className="text-xs text-blue-600 hover:underline">
              Kelola →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-green-600">
                {dashboard.emailSummary.totalSent.toLocaleString('id-ID')}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">Terkirim</p>
            </div>
            <div className="bg-red-50 dark:bg-red-950 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-red-600">
                {dashboard.emailSummary.totalFailed.toLocaleString('id-ID')}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">Gagal</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-yellow-600">
                {dashboard.emailSummary.totalSkipped.toLocaleString('id-ID')}
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400">Skip</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-gray-600 dark:text-gray-300">
                {dashboard.emailSummary.totalSuppressed.toLocaleString('id-ID')}
              </p>
              <p className="text-xs text-gray-500">Supresi</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
