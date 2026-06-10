'use client';

import { useEffect, useState, useCallback } from 'react';
import apiClient, { unwrap } from '@/lib/api-client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Trophy, TrendingUp, Users, Target, Zap, Award, Activity,
  Calendar, ArrowUp, ArrowDown, Download,
} from 'lucide-react';

interface PointsReportEntry {
  rank: number;
  namaLengkap: string;
  points: number;
  level: string;
  events: number;
  lastActive: string;
}

interface DistributionEntry {
  level: string;
  icon: string;
  color: string;
  count: number;
}

interface GamificationStats {
  totalMembers: number;
  totalEvents: number;
  totalPointsAwarded: number;
  badgesAwarded: number;
}

const LEVEL_ORDER = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];

export default function ScoreboardPage() {
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [distribution, setDistribution] = useState<DistributionEntry[]>([]);
  const [weeklyReport, setWeeklyReport] = useState<PointsReportEntry[]>([]);
  const [monthlyReport, setMonthlyReport] = useState<PointsReportEntry[]>([]);
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [loading, setLoading] = useState(true);

  const [moduleBreakdown, setModuleBreakdown] = useState<Array<{ module: string; label: string; points: number; percentage: number; color: string }>>([]);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, distRes, weeklyRes, monthlyRes, breakdownRes] = await Promise.all([
        apiClient.get('/gamification/stats'),
        apiClient.get('/gamification/admin/points-distribution').catch(() => ({ data: { success: true, data: [] as DistributionEntry[] } })),
        apiClient.get('/gamification/admin/points-report?period=weekly&limit=10'),
        apiClient.get('/gamification/admin/points-report?period=monthly&limit=10'),
        apiClient.get('/gamification/scoreboard/breakdown'),
      ]);
      setStats(unwrap(statsRes));
      setDistribution(unwrap(distRes) || []);
      setWeeklyReport(unwrap(weeklyRes) || []);
      setMonthlyReport(unwrap(monthlyRes) || []);
      setModuleBreakdown(unwrap(breakdownRes) || []);
    } catch (err) {
      console.error('Failed to fetch scoreboard data:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const reportData = period === 'weekly' ? weeklyReport : monthlyReport;

  // Use real data from API — map to chart format
  const breakdownData = moduleBreakdown.map((m) => ({
    name: m.label,
    points: m.points,
    color: m.color,
    percentage: m.percentage,
  }));

  // Distribution pie data
  const pieData = distribution.map((d) => ({
    name: `${d.icon} ${d.level}`,
    value: d.count,
    color: d.color,
  }));

  const sortedDistribution = [...distribution].sort(
    (a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <p className="text-sm text-gray-500">Memuat data scoreboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scoreboard Gamifikasi</h1>
          <p className="text-sm text-gray-500 mt-1">Breakdown poin per modul dan peringkat anggota</p>
        </div>
        <button
          onClick={() => {
            const csv = [
              'Rank,Nama,Poin,Level,Events,Last Active',
              ...reportData.map((e) => `${e.rank},"${e.namaLengkap}",${e.points},${e.level},${e.events},${e.lastActive}`),
            ].join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `scoreboard-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex items-center gap-1.5 px-3 py-2 text-xs bg-green-50 hover:bg-green-100 rounded-lg text-green-700 font-medium transition"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* Stat Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Peserta Aktif" value={stats.totalMembers} color="blue" />
          <StatCard icon={Zap} label="Total Poin" value={stats.totalPointsAwarded} color="yellow" />
          <StatCard icon={Award} label="Badge Diraih" value={stats.badgesAwarded} color="green" />
          <StatCard icon={Activity} label="Total Aktivitas" value={stats.totalEvents} color="purple" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Module Breakdown — Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-500" />
            <h3 className="text-base font-semibold text-gray-900">Breakdown Poin per Modul</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={breakdownData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} />
              <Tooltip
                formatter={(value: number) => [value.toLocaleString('id-ID'), 'Poin']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Bar dataKey="points" radius={[6, 6, 0, 0]}>
                  {breakdownData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500">
            {breakdownData.map((m) => (
              <div key={m.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                <span>{m.name}: {m.percentage}%</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-2">* Data real dari seluruh event gamifikasi</p>
        </div>

        {/* Level Distribution — Pie Chart */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="mb-4 flex items-center gap-2">
            <Target size={20} className="text-purple-500" />
            <h3 className="text-base font-semibold text-gray-900">Distribusi Level</h3>
          </div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} stroke="white" strokeWidth={2} />
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
                  formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              Belum ada data distribusi
            </div>
          )}
          {/* Level counts */}
          <div className="grid grid-cols-5 gap-1 mt-3">
            {sortedDistribution.map((d) => (
              <div key={d.level} className="text-center p-1 rounded-lg bg-gray-50">
                <span className="text-lg">{d.icon}</span>
                <p className="text-xs font-bold text-gray-800">{d.count}</p>
                <p className="text-[9px] text-gray-500 truncate">{d.level}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Earners Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy size={20} className="text-yellow-500" />
            <h3 className="text-base font-semibold text-gray-900">Top Earners</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPeriod('weekly')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                period === 'weekly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Calendar size={12} />
              Mingguan
            </button>
            <button
              onClick={() => setPeriod('monthly')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                period === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Calendar size={12} />
              Bulanan
            </button>
          </div>
        </div>
        {reportData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Rank</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Nama</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Poin</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Level</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Events</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Aktivitas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reportData.map((entry) => (
                  <tr
                    key={entry.rank}
                    className={`hover:bg-blue-50 transition ${entry.rank <= 3 ? 'bg-yellow-50/30' : ''}`}
                  >
                    <td className="px-3 py-3">
                      <span className="text-base font-bold text-gray-700">
                        {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-sm font-medium text-gray-900">{entry.namaLengkap}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                        <Zap size={12} />
                        {entry.points.toLocaleString('id-ID')}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-sm text-gray-600">{entry.level}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-sm font-medium text-gray-700">{entry.events}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-xs text-gray-400">
                        {entry.lastActive
                          ? new Date(entry.lastActive).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
                          : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            Belum ada data untuk periode ini
          </div>
        )}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <ArrowUp size={14} className="text-green-500" />
            <span>Poin tertinggi: {reportData[0]?.points.toLocaleString('id-ID') || 0}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <ArrowDown size={14} className="text-blue-500" />
            <span>Rata-rata: {reportData.length > 0
              ? Math.round(reportData.reduce((s, e) => s + e.points, 0) / reportData.length).toLocaleString('id-ID')
              : 0}
            </span>
          </div>
        </div>
      </div>

      {/* Module Comparison Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {breakdownData.map((mod) => (
          <div
            key={mod.name}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-500">{mod.name}</p>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${mod.color}15` }}>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: mod.color }} />
              </div>
            </div>
            <p className="text-xl font-bold text-gray-900">{mod.points.toLocaleString('id-ID')}</p>
            <p className="text-xs text-gray-400 mt-1">{mod.percentage}% dari total</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: 'blue' | 'yellow' | 'green' | 'purple';
}) {
  const colorMap = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', ring: 'ring-blue-100' },
    green: { bg: 'bg-green-50', icon: 'text-green-600', ring: 'ring-green-100' },
    yellow: { bg: 'bg-yellow-50', icon: 'text-yellow-600', ring: 'ring-yellow-100' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600', ring: 'ring-purple-100' },
  };
  const s = colorMap[color];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {value.toLocaleString('id-ID')}
          </p>
        </div>
        <div className={`p-3 rounded-xl ring-1 ${s.ring} ${s.bg}`}>
          <Icon size={22} className={s.icon} />
        </div>
      </div>
    </div>
  );
}
