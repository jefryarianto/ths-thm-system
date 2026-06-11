'use client';

import { useState, useEffect } from 'react';
import {
  Mail, RefreshCw, FileText, AlertCircle, CheckCircle2,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import { useMailLogs, useMailStats, useMailModules } from '@/lib/hooks/use-mail';
import {
  type EmailLogEntry, MODULES,
  statusBadge, formatDateShort, formatDate,
} from './shared';

export default function EmailLogsTab() {
  const [logsFilter, setLogsFilter] = useState('');
  const [logsModuleFilter, setLogsModuleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [retryLoading, setRetryLoading] = useState(false);
  const [retryResult, setRetryResult] = useState<{ retried: number; succeeded: number; failed: number } | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  const { data: logs, meta, loading: logsLoading, refetch: refetchLogs } = useMailLogs({
    page,
    status: logsFilter || undefined,
    module: logsModuleFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const { data: logsStats, loading: statsLoading, refetch: refetchStats } = useMailStats({
    module: logsModuleFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const { data: usedModules } = useMailModules();

  // Clear selection when logs change
  useEffect(() => { setSelectedIds(new Set()); }, [logs, logsFilter, logsModuleFilter]);

  const handleFilterChange = (status: string) => {
    setLogsFilter(status);
    setPage(1);
  };

  const handleModuleFilterChange = (module: string) => {
    setLogsModuleFilter(module);
    setPage(1);
  };

  const handleRetry = async () => {
    if (!confirm('Kirim ulang semua email yang gagal?')) return;
    setRetryLoading(true);
    setRetryResult(null);
    try {
      const { data } = await apiClient.post('/mail/retry');
      refetchLogs();
      refetchStats();
      setRetryResult(data.data);
    } catch { /* ignore */ }
    setRetryLoading(false);
  };

  const handleBulkRetry = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Kirim ulang ${selectedIds.size} email yang gagal?`)) return;
    setRetryLoading(true);
    setRetryResult(null);
    try {
      const { data } = await apiClient.post('/mail/retry', { ids: Array.from(selectedIds) });
      setSelectedIds(new Set());
      refetchLogs();
      refetchStats();
      setRetryResult(data.data);
    } catch { /* ignore */ }
    setRetryLoading(false);
  };

  const handleRetrySingle = async (id: string) => {
    setRetryLoading(true);
    setRetryResult(null);
    try {
      await apiClient.post('/mail/retry', { ids: [id] });
      refetchLogs();
      refetchStats();
    } catch { /* ignore */ }
    setRetryLoading(false);
  };

  const handleExportCsv = async () => {
    setExportLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (logsFilter) params.status = logsFilter;
      if (logsModuleFilter) params.module = logsModuleFilter;
      const { data } = await apiClient.get('/mail/logs/export', { params });
      const rows: EmailLogEntry[] = data.data || [];
      const header = 'ID,Tujuan,Subjek,Status,Provider,Error,Modul,Waktu\n';
      const csvRows = rows.map(r => {
        const esc = (v: unknown) => {
          const s = String(v ?? '');
          return (s.includes(',') || s.includes('"') || s.includes('\n'))
            ? `"${s.replace(/"/g, '""')}"` : s;
        };
        return [esc(r.id), esc(r.to), esc(r.subject), esc(r.status), esc(r.provider), esc(r.error), esc(r.metadata?.module), esc(r.createdAt)].join(',');
      }).join('\n');
      const blob = new Blob([header + csvRows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `email-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
    setExportLoading(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const failedIds = (logs || []).filter((l) => l.status === 'failed').map((l) => l.id);
    setSelectedIds((prev) => {
      const allSelected = failedIds.every((id) => prev.has(id));
      return allSelected ? new Set() : new Set(failedIds);
    });
  };

  const totalPages = meta?.totalPages || 0;

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 animate-pulse h-20" />)}
        </div>
      ) : logsStats ? (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{logsStats.total}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-green-200 dark:border-green-800 shadow-sm p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Terkirim</p>
            <p className="text-xl font-bold text-green-600">{logsStats.sent}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-800 shadow-sm p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Gagal</p>
            <p className="text-xl font-bold text-red-600">{logsStats.failed}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-yellow-200 dark:border-yellow-800 shadow-sm p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Skipped</p>
            <p className="text-xl font-bold text-yellow-600">{logsStats.skipped}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Success Rate</p>
            <p className={`text-xl font-bold ${logsStats.successRate >= 90 ? 'text-green-600' : logsStats.successRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
              {logsStats.successRate}%
            </p>
          </div>
        </div>
      ) : null}

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        {/* Filter Bar */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Status:</span>
            {['', 'sent', 'failed', 'skipped'].map((s) => (
              <button key={s} onClick={() => handleFilterChange(s)}
                className={`text-xs px-2.5 py-1 rounded-full transition ${logsFilter === s
                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 font-medium'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                {s ? (s === 'sent' ? '✅ Terkirim' : s === 'failed' ? '❌ Gagal' : '⏭️ Skip') : 'Semua'}
              </button>
            ))}
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 font-medium">Tanggal:</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 w-32" />
            <span className="text-xs text-gray-400">–</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 w-32" />
            <button onClick={() => { setPage(1); }}
              className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900 transition font-medium">
              Terapkan
            </button>
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 font-medium">Modul:</span>
            <select value={logsModuleFilter} onChange={(e) => handleModuleFilterChange(e.target.value)}
              className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500">
              <option value="">Semua Modul</option>
              {(usedModules && usedModules.length > 0) ? (usedModules).map((m) => {
                const label = MODULES.find(sm => sm.value === m.module)?.label || m.module;
                return <option key={m.module} value={m.module}>{label} ({m.count})</option>;
              }) : MODULES.filter(m => m.value).map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <RefreshCw size={14} className="cursor-pointer hover:text-blue-600 transition"
              onClick={() => { setPage(1); }} />
            {(logsStats?.total || 0) > 0 && (
              <button onClick={handleExportCsv} disabled={exportLoading}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition disabled:opacity-50 text-xs font-medium">
                <FileText size={12} /> {exportLoading ? 'Menyiapkan...' : 'CSV'}
              </button>
            )}
            {logsStats && logsStats.failed > 0 && (
              <button onClick={handleRetry} disabled={retryLoading}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 transition disabled:opacity-50 text-xs font-medium">
                {retryLoading ? <RefreshCw size={12} className="animate-spin" /> : <AlertCircle size={12} />}
                {retryLoading ? 'Mengirim ulang...' : `Retry ${logsStats.failed} Gagal`}
              </button>
            )}
            {(logsStats?.total || 0) > 0 && <span>{logsStats?.total} total</span>}
          </div>
        </div>

        {/* Table */}
        {logsLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
            Memuat riwayat...
          </div>
        ) : !logs || logs.length === 0 ? (
          <div className="p-8 text-center">
            <Mail size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada riwayat email</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Riwayat akan muncul setelah email dikirim</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="px-3 py-3 w-10">
                      <input type="checkbox"
                        checked={(logs || []).filter(l => l.status === 'failed').length > 0 && (logs || []).filter(l => l.status === 'failed').every(l => selectedIds.has(l.id))}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                    </th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Tujuan</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Subjek</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">Modul</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Provider</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">Waktu</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {(logs || []).map((log) => (
                    <tr key={log.id}
                      className={`border-b border-gray-100 dark:border-gray-800 transition ${selectedIds.has(log.id) ? 'bg-blue-50 dark:bg-blue-950/40' : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'}`}>
                      <td className="px-3 py-3">
                        <input type="checkbox" checked={selectedIds.has(log.id)} onChange={() => toggleSelect(log.id)}
                          disabled={log.status !== 'failed'}
                          className={`rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 ${log.status === 'failed' ? 'cursor-pointer' : 'opacity-30 cursor-not-allowed'}`} />
                      </td>
                      <td className="px-5 py-3">{statusBadge(log.status)}</td>
                      <td className="px-5 py-3"><span className="text-gray-900 dark:text-white font-medium text-xs">{log.to}</span></td>
                      <td className="px-5 py-3">
                        <div>
                          <span className="text-gray-800 dark:text-gray-200 text-xs">{log.subject}</span>
                          {log.error && <p className="text-xs text-red-500 dark:text-red-400 mt-0.5 truncate max-w-[200px]" title={log.error}>{log.error}</p>}
                        </div>
                      </td>
                      <td className="px-5 py-3 hidden sm:table-cell">
                        {(() => {
                          const moduleVal = log.metadata?.module;
                          if (!moduleVal) return <span className="text-xs text-gray-400">-</span>;
                          const label = MODULES.find(m => m.value === moduleVal)?.label || String(moduleVal);
                          return <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-medium">{label}</span>;
                        })()}
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        {log.provider ? <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">{log.provider}</span> : <span className="text-xs text-gray-400">-</span>}
                      </td>
                      <td className="px-5 py-3 hidden lg:table-cell">
                        <span className="text-xs text-gray-500 dark:text-gray-400" title={formatDate(log.createdAt)}>{formatDateShort(log.createdAt)}</span>
                      </td>
                      <td className="px-5 py-3">
                        {log.status === 'failed' ? (
                          <button onClick={() => handleRetrySingle(log.id)} disabled={retryLoading}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 transition disabled:opacity-50">
                            {retryLoading ? <RefreshCw size={10} className="animate-spin" /> : <RefreshCw size={10} />} Retry
                          </button>
                        ) : <span className="text-xs text-gray-300 dark:text-gray-600">–</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-700">
                <span className="text-xs text-gray-500 dark:text-gray-400">Halaman {page} dari {totalPages}</span>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition">
                    <ChevronLeft size={16} className="text-gray-600 dark:text-gray-400" />
                  </button>
                  <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition">
                    <ChevronRight size={16} className="text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bulk Retry Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-5 py-3 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl">
          <span className="text-sm text-blue-700 dark:text-blue-300"><strong>{selectedIds.size}</strong> email gagal dipilih</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedIds(new Set())}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition">Batal</button>
            <button onClick={handleBulkRetry} disabled={retryLoading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition disabled:opacity-50">
              {retryLoading ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {retryLoading ? 'Mengirim...' : `Retry ${selectedIds.size} Email`}
            </button>
          </div>
        </div>
      )}

      {/* Retry Result */}
      {retryResult && (
        <div className={`px-4 py-3 rounded-xl text-sm flex items-center gap-2 ${retryResult.failed === 0
          ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
          : 'bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400'}`}>
          {retryResult.failed === 0 ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span><strong>Retry selesai:</strong> {retryResult.retried} dicoba, {retryResult.succeeded} berhasil, {retryResult.failed} gagal</span>
          <button onClick={() => setRetryResult(null)} className="ml-auto text-xs hover:underline">Tutup</button>
        </div>
      )}

      {/* Top Recipients */}
      {logsStats && logsStats.topRecipients.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Penerima Terbanyak</h3>
          <div className="space-y-2">
            {logsStats.topRecipients.map((r: { email: string; count: number }, i: number) => (
              <div key={r.email} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-5">{i + 1}.</span>
                  <span className="text-xs text-gray-700 dark:text-gray-300">{r.email}</span>
                </div>
                <span className="text-xs font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{r.count} email</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
