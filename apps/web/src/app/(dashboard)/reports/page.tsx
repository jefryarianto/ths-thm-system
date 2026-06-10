'use client';

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { useApi } from '@/lib/hooks/use-api';
import { type LucideIcon,
  BarChart3, Users, GraduationCap, CreditCard, AlertCircle,
  FileText, Download, RefreshCw, ChevronLeft, ChevronRight,
  Activity, Calendar, UserPlus, Shield, Dumbbell,
  ClipboardCheck,
} from 'lucide-react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

// ─── Types ───

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
  emailSummary: { totalSent: number; totalFailed: number; totalSkipped: number; totalSuppressed: number } | null;
}

interface MemberRow {
  id: string; namaLengkap: string; nomorAnggota: string;
  statusKeanggotaan: string; ranting?: { nama: string }; createdAt: string;
}

interface ScanStats {
  totalAbsensi: number; totalDokumen: number; activeKegiatan: number;
  absensiHarian: Array<{ tanggal: string; count: number }>;
  recentAbsensi: Array<{
    namaAnggota: string; nomorAnggota: string;
    kegiatan: string; hadir: boolean; catatan: string; tanggal: string;
  }>;
}

// ─── Colors ───

const STATUS_COLORS: Record<string, string> = {
  aktif: '#22c55e', nonaktif: '#eab308', pindah: '#3b82f6',
  keluar: '#ef4444', meninggal: '#6b7280',
};

const STATUS_LABELS: Record<string, string> = {
  aktif: 'Aktif', nonaktif: 'Nonaktif', pindah: 'Pindah',
  keluar: 'Keluar', meninggal: 'Meninggal',
};

function formatRupiah(value: number) {
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)}jt`;
  if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(0)}rb`;
  return `Rp ${value.toLocaleString('id-ID')}`;
}

// ─── Stat Card ───

function StatCard({ label, value, color, icon: Icon }: {
  label: string; value: string | number; color: string; icon: LucideIcon;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
          <p className={`text-xl font-bold mt-0.5 ${color}`}>{value}</p>
        </div>
        <div className={`p-2.5 rounded-lg ${color.replace('text-', 'bg-').replace('600', '50').replace('500', '50')} dark:opacity-80`}>
          <Icon size={18} className={color} />
        </div>
      </div>
    </div>
  );
}

// ─── Tabs ───

type ReportTab = 'overview' | 'members' | 'scan' | 'exports';

const tabs: Array<{ key: ReportTab; label: string; icon: LucideIcon }> = [
  { key: 'overview', label: 'Ringkasan', icon: BarChart3 },
  { key: 'members', label: 'Anggota', icon: Users },
  { key: 'scan', label: 'Absensi', icon: Activity },
  { key: 'exports', label: 'Ekspor Data', icon: Download },
];

// ─── Page ───

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');

  // Overview data
  const { data: dashboard, loading } = useApi<DashboardData>(
    () => apiClient.get('/reports/dashboard').then(r => r.data),
    []
  );

  // Members data
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberPage, setMemberPage] = useState(1);
  const [memberMeta, setMemberMeta] = useState({ total: 0, totalPages: 0 });
  const [memberSearch, setMemberSearch] = useState('');

  // Scan data
  const [scanStats, setScanStats] = useState<ScanStats | null>(null);
  const [scanLoading, setScanLoading] = useState(false);

  // Export
  const [exportType, setExportType] = useState('members');
  const [exportLoading, setExportLoading] = useState(false);

  // Fetch members
  const fetchMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const params: Record<string, unknown> = { page: memberPage, limit: 15 };
      if (memberSearch) params.search = memberSearch;
      const { data: res } = await apiClient.get('/members', { params });
      setMembers(res.data || []);
      setMemberMeta(res.meta || { total: 0, totalPages: 0 });
    } catch { /* ignore */ }
    setMembersLoading(false);
  }, [memberPage, memberSearch]);

  // Fetch scan stats
  const fetchScanStats = useCallback(async () => {
    setScanLoading(true);
    try {
      const { data: res } = await apiClient.get('/reports/scan-stats');
      setScanStats(res.data);
    } catch { /* ignore */ }
    setScanLoading(false);
  }, []);

  // Auto-fetch when tab changes
  useEffect(() => {
    if (activeTab === 'members') fetchMembers();
    if (activeTab === 'scan') fetchScanStats();
  }, [activeTab, fetchMembers, fetchScanStats]);

  // Export handler
  const handleExport = async () => {
    setExportLoading(true);
    try {
      const { data: res } = await apiClient.get(`/reports/export/${exportType}`);
      const rows = res.data || [];
      if (rows.length === 0) { setExportLoading(false); return; }

      const headers = Object.keys(rows[0]);
      const csv = [
        headers.join(','),
        ...rows.map((r: Record<string, unknown>) =>
          headers.map((h) => {
            const v = String(r[h] ?? '');
            return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
          }).join(',')
        ),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `laporan-${exportType}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
    setExportLoading(false);
  };

  const pieData = dashboard?.memberStatus
    ? dashboard.memberStatus.map((s) => ({
        name: STATUS_LABELS[s.status] || s.status,
        value: s.count,
        color: STATUS_COLORS[s.status] || '#6b7280',
      }))
    : [];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 size={24} className="text-blue-600" />
            Laporan & Statistik
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Data terpusat dari semua modul THS-THM
          </p>
        </div>
        {(activeTab === 'members' || activeTab === 'scan') && (
          <button onClick={() => {
            if (activeTab === 'members') fetchMembers();
            if (activeTab === 'scan') fetchScanStats();
          }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400">
            <RefreshCw size={16} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab: Overview ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1,2,3,4,5,6,7,8].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 animate-pulse h-20" />
              ))}
            </div>
          ) : dashboard ? (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                <StatCard label="Anggota" value={dashboard.totalMembers.toLocaleString('id-ID')} color="text-blue-600" icon={Users} />
                <StatCard label="Calon" value={dashboard.totalCandidates.toLocaleString('id-ID')} color="text-purple-600" icon={UserPlus} />
                <StatCard label="Lulus Pendadaran" value={dashboard.totalGraduated.toLocaleString('id-ID')} color="text-green-600" icon={GraduationCap} />
                <StatCard label="Iuran Terkumpul" value={formatRupiah(dashboard.totalDuesCollected)} color="text-yellow-600" icon={CreditCard} />
                <StatCard label="Pending Validasi" value={dashboard.pendingValidasi.toLocaleString('id-ID')} color="text-orange-600" icon={AlertCircle} />
                <StatCard label="Data Incomplete" value={dashboard.incompleteData.toLocaleString('id-ID')} color="text-red-600" icon={AlertCircle} />
                <StatCard label="Kegiatan Aktif" value={dashboard.totalKegiatan.toLocaleString('id-ID')} color="text-indigo-600" icon={Calendar} />
                <StatCard label="Total Latihan" value={dashboard.totalLatihan.toLocaleString('id-ID')} color="text-teal-600" icon={Dumbbell} />
                <StatCard label="Klaim Diproses" value={dashboard.totalKlaim.toLocaleString('id-ID')} color="text-pink-600" icon={ClipboardCheck} />
                <StatCard label="Dokumen" value={dashboard.totalDokumen.toLocaleString('id-ID')} color="text-cyan-600" icon={FileText} />
                <StatCard label="Pendaftaran Baru" value={dashboard.totalPendaftaran.toLocaleString('id-ID')} color="text-amber-600" icon={UserPlus} />
                <StatCard label="Admin Aktif" value={dashboard.totalUsers.toLocaleString('id-ID')} color="text-gray-600" icon={Shield} />
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Dues */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Iuran 6 Bulan Terakhir</h3>
                  {dashboard.monthlyDues && dashboard.monthlyDues.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={dashboard.monthlyDues} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="bulan" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={(v) => formatRupiah(v)} />
                        <Tooltip formatter={(v: number) => [`Rp ${v.toLocaleString('id-ID')}`, 'Jumlah']} />
                        <Bar dataKey="jumlah" fill="#3b82f6" radius={[4,4,0,0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-48 text-sm text-gray-400">Belum ada data</div>
                  )}
                </div>

                {/* Member Status Pie */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Status Keanggotaan</h3>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value">
                          {pieData.map((entry, i) => (<Cell key={i} fill={entry.color} stroke="white" strokeWidth={2} />))}
                        </Pie>
                        <Tooltip formatter={(v: number) => [v.toLocaleString('id-ID'), 'Anggota']} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-48 text-sm text-gray-400">Belum ada data</div>
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
                    <Link href="/settings/email" className="text-xs text-blue-600 hover:underline">Kelola →</Link>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-green-600">{dashboard.emailSummary.totalSent.toLocaleString('id-ID')}</p>
                      <p className="text-xs text-green-600 dark:text-green-400">Terkirim</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-950 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-red-600">{dashboard.emailSummary.totalFailed.toLocaleString('id-ID')}</p>
                      <p className="text-xs text-red-600 dark:text-red-400">Gagal</p>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-yellow-600">{dashboard.emailSummary.totalSkipped.toLocaleString('id-ID')}</p>
                      <p className="text-xs text-yellow-600 dark:text-yellow-400">Skip</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-gray-600 dark:text-gray-300">{dashboard.emailSummary.totalSuppressed.toLocaleString('id-ID')}</p>
                      <p className="text-xs text-gray-500">Supresi</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <BarChart3 size={40} className="mx-auto mb-3 opacity-40" />
              <p>Gagal memuat data laporan</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Members ── */}
      {activeTab === 'members' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          {/* Search */}
          <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700">
            <input
              type="text"
              value={memberSearch}
              onChange={(e) => { setMemberSearch(e.target.value); setMemberPage(1); }}
              placeholder="Cari anggota..."
              className="w-full max-w-xs px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Nama</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">No. Anggota</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">Ranting</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Terdaftar</th>
                </tr>
              </thead>
              <tbody>
                {membersLoading ? (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">Memuat...</td></tr>
                ) : members.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">Tidak ada data anggota</td></tr>
                ) : members.map((m) => (
                  <tr key={m.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition">
                    <td className="px-5 py-3"><span className="font-medium text-gray-900 dark:text-white">{m.namaLengkap}</span></td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-400">{m.nomorAnggota}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        m.statusKeanggotaan === 'aktif' ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400'
                        : m.statusKeanggotaan === 'nonaktif' ? 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {STATUS_LABELS[m.statusKeanggotaan] || m.statusKeanggotaan}
                      </span>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell text-gray-500">{m.ranting?.nama || '-'}</td>
                    <td className="px-5 py-3 hidden md:table-cell text-gray-500 text-xs">
                      {new Date(m.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {memberMeta.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-500">Halaman {memberPage} dari {memberMeta.totalPages} ({memberMeta.total} total)</span>
              <div className="flex gap-1">
                <button onClick={() => setMemberPage(memberPage - 1)} disabled={memberPage <= 1}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 transition">
                  <ChevronLeft size={16} className="text-gray-600" />
                </button>
                <button onClick={() => setMemberPage(memberPage + 1)} disabled={memberPage >= memberMeta.totalPages}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 transition">
                  <ChevronRight size={16} className="text-gray-600" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Scan / Absensi ── */}
      {activeTab === 'scan' && (
        <div className="space-y-6">
          {scanLoading ? (
            <div className="grid grid-cols-3 gap-4">{[1,2,3].map((i) => (<div key={i} className="bg-white dark:bg-gray-800 rounded-xl border p-6 animate-pulse h-24" />))}</div>
          ) : scanStats ? (
            <>
              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
                  <p className="text-xs text-gray-500">Total Absensi</p>
                  <p className="text-2xl font-bold text-blue-600">{scanStats.totalAbsensi.toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
                  <p className="text-xs text-gray-500">Dokumen Tersedia</p>
                  <p className="text-2xl font-bold text-purple-600">{scanStats.totalDokumen.toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
                  <p className="text-xs text-gray-500">Kegiatan Aktif</p>
                  <p className="text-2xl font-bold text-green-600">{scanStats.activeKegiatan.toLocaleString('id-ID')}</p>
                </div>
              </div>

              {/* Absensi Harian Chart */}
              {scanStats.absensiHarian && scanStats.absensiHarian.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Absensi 30 Hari Terakhir</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={scanStats.absensiHarian} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="tanggal" tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false}
                        tickFormatter={(v) => { const d = new Date(v + 'T00:00:00'); return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }); }}
                      />
                      <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip labelFormatter={(l) => new Date(l + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} />
                      <Bar dataKey="count" fill="#6366f1" radius={[2,2,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Recent Absensi */}
              {scanStats.recentAbsensi && scanStats.recentAbsensi.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Absensi Terbaru</h3>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {scanStats.recentAbsensi.slice(0, 10).map((a, i) => (
                      <div key={i} className="px-5 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{a.namaAnggota}</p>
                          <p className="text-xs text-gray-500">{a.kegiatan} · {a.nomorAnggota}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.hadir ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400'}`}>
                            {a.hadir ? 'Hadir' : 'Tidak'}
                          </span>
                          <span className="text-xs text-gray-400">{new Date(a.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Activity size={40} className="mx-auto mb-3 opacity-40" />
              <p>Gagal memuat data absensi</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Exports ── */}
      {activeTab === 'exports' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Ekspor Data</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Download data dalam format CSV untuk analisis lebih lanjut</p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <select
              value={exportType}
              onChange={(e) => setExportType(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 w-full sm:w-48"
            >
              <option value="members">Data Anggota</option>
              <option value="dues">Data Iuran</option>
              <option value="graduates">Data Lulusan</option>
            </select>
            <button
              onClick={handleExport}
              disabled={exportLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Download size={14} />
              {exportLoading ? 'Menyiapkan...' : 'Download CSV'}
            </button>
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-700 dark:text-blue-400">
              <strong>Informasi:</strong> Data yang diexport dibatasi hingga 5000 baris.
              Gunakan filter scope (ranting/wilayah/distrik) untuk data yang lebih spesifik.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link href="/settings/email" className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition">
              <FileText size={18} className="text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Laporan Email</p>
                <p className="text-xs text-gray-500">Statistik pengiriman & engagement email</p>
              </div>
            </Link>
            <Link href="/dues" className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition">
              <CreditCard size={18} className="text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Laporan Iuran</p>
                <p className="text-xs text-gray-500">Rekap pembayaran iuran anggota</p>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-gray-400 dark:text-gray-600 py-4 border-t border-gray-100 dark:border-gray-800">
        Data diperbarui secara real-time. Terakhir dimuat: {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
}
