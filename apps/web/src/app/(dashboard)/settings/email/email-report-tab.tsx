'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Mail } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { useApi } from '@/lib/hooks/use-api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import {
  type LogStats, type UsedModule, type Engagement, MODULES,
  EngagementCard,
} from './shared';

export default function EmailReportTab() {
  const [logsModuleFilter, setLogsModuleFilter] = useState('');

  const statsFilteredKey = JSON.stringify({ module: logsModuleFilter });
  const { data: logsStats, loading: statsLoading, refetch: refetchStats } = useApi<LogStats>(
    () => apiClient.get('/mail/logs/stats', { params: logsModuleFilter ? { module: logsModuleFilter } : {} }).then(r => r.data.data),
    [statsFilteredKey],
    true,
  );

  const { data: engagement, loading: engagementLoading } = useApi<Engagement>(
    () => apiClient.get('/mail/logs/engagement').then(r => r.data.data),
    [],
    true,
  );

  const { data: usedModules } = useApi<UsedModule[]>(
    () => apiClient.get('/mail/modules').then(r => r.data.data),
    [],
    true,
  );

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Re-fetch when filters change
  useEffect(() => {
    refetchStats();
  }, [startDate, endDate]);

  if (statsLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse h-80" />
        ))}
      </div>
    );
  }

  if (!logsStats) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 text-sm text-yellow-700 dark:text-yellow-400 text-center">
        <BarChart3 size={32} className="mx-auto mb-2 opacity-50" />
        <p>Belum ada data laporan. Kirim email terlebih dahulu.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Modul:</span>
        <select
          value={logsModuleFilter}
          onChange={(e) => setLogsModuleFilter(e.target.value)}
          className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Semua Modul</option>
          {(usedModules || []).length > 0 ? (usedModules || []).map((m) => {
            const label = MODULES.find(sm => sm.value === m.module)?.label || m.module;
            return <option key={m.module} value={m.module}>{label} ({m.count})</option>;
          }) : MODULES.filter(m => m.value).map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Tanggal:</span>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
          className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 w-32" />
        <span className="text-xs text-gray-400">–</span>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
          className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 w-32" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Dikirim</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{logsStats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-green-200 dark:border-green-800 shadow-sm p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Berhasil</p>
          <p className="text-2xl font-bold text-green-600">{logsStats.sent}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-800 shadow-sm p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Gagal</p>
          <p className="text-2xl font-bold text-red-600">{logsStats.failed}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Success Rate</p>
          <p className={`text-2xl font-bold ${logsStats.successRate >= 90 ? 'text-green-600' : logsStats.successRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
            {logsStats.successRate}%
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Trend Bar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Tren Pengiriman 7 Hari</h3>
          {logsStats.dailyStats.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={logsStats.dailyStats} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickFormatter={(val) => { const d = new Date(val + 'T00:00:00'); return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }); }} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = { sent: 'Terkirim', failed: 'Gagal', skipped: 'Skip' };
                    return [value, labels[name] || name];
                  }} labelFormatter={(label) => { const d = new Date(label + 'T00:00:00'); return d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="sent" name="sent" fill="#22c55e" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="failed" name="failed" fill="#ef4444" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="skipped" name="skipped" fill="#eab308" stackId="a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-6 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-green-500" /> Terkirim</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-red-500" /> Gagal</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-yellow-500" /> Skip</span>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500 text-sm">Belum ada data pengiriman 7 hari terakhir</div>
          )}
        </div>

        {/* Pie Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Distribusi Status</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={[
                { name: 'Terkirim', value: logsStats.sent, color: '#22c55e' },
                { name: 'Gagal', value: logsStats.failed, color: '#ef4444' },
                { name: 'Skip', value: logsStats.skipped, color: '#eab308' },
              ].filter(d => d.value > 0)} cx="50%" cy="45%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {[
                  { name: 'Terkirim', value: logsStats.sent, color: '#22c55e' },
                  { name: 'Gagal', value: logsStats.failed, color: '#ef4444' },
                  { name: 'Skip', value: logsStats.skipped, color: '#eab308' },
                ].filter(d => d.value > 0).map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} stroke="white" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number, name: string) => [value.toLocaleString('id-ID'), name]}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend verticalAlign="bottom" height={30} iconType="circle" iconSize={8}
                formatter={(value) => <span className="text-xs text-gray-600 dark:text-gray-400">{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
          <div className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2">
            {logsStats.total > 0 ? `${logsStats.sent} dari ${logsStats.total} berhasil (${logsStats.successRate}%)` : 'Belum ada data'}
          </div>
        </div>
      </div>

      {/* Module Comparison */}
      {usedModules && usedModules.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Perbandingan per Modul</h3>
          <ResponsiveContainer width="100%" height={Math.max(200, usedModules.length * 36)}>
            <BarChart data={[...usedModules].map(m => ({ name: MODULES.find(sm => sm.value === m.module)?.label || m.module, count: m.count })).sort((a, b) => b.count - a.count)}
              layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} width={75} />
              <Tooltip formatter={(value: number) => [value.toLocaleString('id-ID'), 'Email']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Engagement */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Engagement Email</h3>
        {engagementLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="bg-gray-100 dark:bg-gray-700 rounded-lg h-20 animate-pulse" />)}
          </div>
        ) : engagement && engagement.totalSent > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
              <EngagementCard label="Dikirim" value={engagement.totalSent} color="text-blue-600" />
              <EngagementCard label="Delivered" value={engagement.rates.delivered + '%'} color="text-green-600" />
              <EngagementCard label="Open Rate" value={engagement.rates.opened + '%'} color="text-indigo-600" />
              <EngagementCard label="Click Rate" value={engagement.rates.clicked + '%'} color="text-purple-600" />
              <EngagementCard label="Bounce Rate" value={engagement.rates.bounced + '%'} color={engagement.rates.bounced > 5 ? 'text-red-600' : 'text-yellow-600'} />
            </div>
            {engagement.dailyTrend && engagement.dailyTrend.some(d => d.sent > 0) && (
              <>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Tren 7 Hari (Open, Click, Bounce Rate)</p>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={engagement.dailyTrend} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }}
                      tickFormatter={(val) => { const d = new Date(val + 'T00:00:00'); return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }); }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} />
                    <Tooltip formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = { openRate: 'Open', clickRate: 'Click', bounceRate: 'Bounce' };
                      return [`${value}%`, labels[name] || name];
                    }} labelFormatter={(label) => { const d = new Date(label + 'T00:00:00'); return d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey="openRate" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} name="openRate" />
                    <Line type="monotone" dataKey="clickRate" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} name="clickRate" />
                    <Line type="monotone" dataKey="bounceRate" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="bounceRate" />
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center gap-4 mt-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-indigo-500" /> Open</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-purple-500" /> Click</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Bounce</span>
                </div>
              </>
            )}
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={[
                { name: 'Delivered', value: engagement.rates.delivered, fill: '#22c55e' },
                { name: 'Open', value: engagement.rates.opened, fill: '#6366f1' },
                { name: 'Click', value: engagement.rates.clicked, fill: '#a855f7' },
                { name: 'Bounce', value: engagement.rates.bounced, fill: '#ef4444' },
                { name: 'Complain', value: engagement.rates.complained, fill: '#f59e0b' },
              ].filter(d => d.value > 0)} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip formatter={(value: number) => [`${value}%`, 'Rate']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {[{ name: 'Delivered', value: engagement.rates.delivered, fill: '#22c55e' },
                    { name: 'Open', value: engagement.rates.opened, fill: '#6366f1' },
                    { name: 'Click', value: engagement.rates.clicked, fill: '#a855f7' },
                    { name: 'Bounce', value: engagement.rates.bounced, fill: '#ef4444' },
                    { name: 'Complain', value: engagement.rates.complained, fill: '#f59e0b' },
                  ].filter(d => d.value > 0).map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        ) : (
          <div className="text-center py-6 text-sm text-gray-400 dark:text-gray-500">
            <Mail size={24} className="mx-auto mb-2 opacity-50" />
            <p>Belum ada data engagement. Pasang webhook Resend untuk melacak open/click/bounce.</p>
          </div>
        )}
      </div>

      {/* Top Recipients */}
      {logsStats.topRecipients.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Penerima Terbanyak</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {logsStats.topRecipients.map((r, i) => (
              <div key={r.email} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-gray-400 w-5 flex-shrink-0">{i + 1}.</span>
                  <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{r.email}</span>
                </div>
                <span className="text-xs font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full flex-shrink-0 ml-2">
                  {r.count} email
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
