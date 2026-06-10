'use client';

import { useState } from 'react';
import {
  Ban, Mail, FileText, Trash2, RefreshCw, RotateCcw, ShieldAlert,
  CheckCircle2, AlertCircle, Info, ChevronLeft, ChevronRight,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import { useMailSuppressions } from '@/lib/hooks/use-mail';
import { type SuppressionEntry, formatDateShort } from './shared';

export default function EmailSuppressedTab() {
  const [page, setPage] = useState(1);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newReason, setNewReason] = useState('manual');
  const [adding, setAdding] = useState(false);
  const [addResult, setAddResult] = useState<{ success: boolean; message: string } | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  const { data: suppressionsResponse, loading, refetch } = useMailSuppressions(page);
  const suppressions = suppressionsResponse?.data ?? [];
  const meta = suppressionsResponse?.meta;
  const totalPages = meta?.totalPages ?? 0;
  const total = meta?.total ?? 0;

  const handleRemove = async (id: string) => {
    if (!confirm('Hapus alamat email ini dari daftar supresi?')) return;
    setRemovingId(id);
    try {
      await apiClient.delete(`/mail/suppressions/${id}`);
      refetch();
    } catch { /* ignore */ }
    setRemovingId(null);
  };

  const handleAdd = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) return;
    setAdding(true);
    setAddResult(null);
    try {
      const { data } = await apiClient.post('/mail/suppressions', { email: newEmail.trim(), reason: newReason });
      if (data.success) {
        setShowAddModal(false);
        setNewEmail('');
        setNewReason('manual');
        setPage(1);
        refetch();
      } else {
        setAddResult({ success: false, message: data.message || 'Gagal menambahkan supresi' });
      }
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setAddResult({ success: false, message: apiErr || 'Gagal terhubung ke server' });
    }
    setAdding(false);
  };

  const handleClear = async () => {
    if (!confirm('Bersihkan semua alamat email dari daftar supresi? Email akan tetap dikirim ke alamat-alamat ini.')) return;
    try {
      await apiClient.post('/mail/suppressions/clear', {});
      refetch();
    } catch { /* ignore */ }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const { data } = await apiClient.get('/mail/suppressions', { params: { limit: 10000 } });
      const rows: SuppressionEntry[] = data.data || [];
      const header = 'Email,Alasan,Event Asal,Waktu\n';
      const csvRows = rows.map(r => {
        const esc = (v: unknown) => {
          const s = String(v ?? '');
          return (s.includes(',') || s.includes('"') || s.includes('\n'))
            ? `"${s.replace(/"/g, '""')}"` : s;
        };
        return [esc(r.email), esc(r.reason), esc(r.event?.event || 'manual'), esc(r.createdAt)].join(',');
      }).join('\n');
      const blob = new Blob([header + csvRows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `email-suppressions-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
    setExportLoading(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Ban size={18} className="text-red-500" />
            Daftar Supresi Email
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Alamat email yang ditekan pengirimannya — otomatis atau manual
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setAddResult(null); setShowAddModal(true); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 transition"
          >
            <Mail size={12} /> Tambah
          </button>
          {total > 0 && (
            <button
              onClick={handleExport}
              disabled={exportLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition disabled:opacity-40"
            >
              <FileText size={12} /> {exportLoading ? '...' : 'CSV'}
            </button>
          )}
          <button
            onClick={handleClear}
            disabled={suppressions?.length === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900 transition disabled:opacity-40"
          >
            <Trash2 size={12} /> Bersihkan Semua
          </button>
          <button onClick={() => refetch()} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-8 text-center text-sm text-gray-400">
          <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
          Memuat daftar supresi...
        </div>
      ) : !suppressions || suppressions.length === 0 ? (
        <div className="p-8 text-center">
          <ShieldAlert size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Belum ada alamat email yang disupresi</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Alamat email akan otomatis masuk daftar ini saat terjadi bounce atau complaint
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Email</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Alasan</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">Event</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Waktu</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {suppressions.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-red-50/30 dark:hover:bg-red-950/20 transition">
                    <td className="px-5 py-3">
                      <span className="text-gray-900 dark:text-white font-medium text-xs">{s.email}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.reason === 'bounced' ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400'
                          : 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400'
                      }`}>
                        {s.reason === 'bounced' ? '❌ Bounce' : s.reason === 'complained' ? '⚠️ Complaint' : s.reason}
                      </span>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      {s.event ? (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {s.event.event} <span className="text-gray-300 dark:text-gray-600">&middot;</span> {formatDateShort(s.event.timestamp)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Manual</span>
                      )}
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{formatDateShort(s.createdAt)}</span>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => handleRemove(s.id)}
                        disabled={removingId === s.id}
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-900 hover:text-red-600 dark:hover:text-red-400 transition disabled:opacity-50"
                        title="Hapus dari supresi"
                      >
                        {removingId === s.id ? <RefreshCw size={10} className="animate-spin" /> : <RotateCcw size={10} />}
                        Pulihkan
                      </button>
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

      {/* Info */}
      <div className="px-5 py-4 bg-yellow-50 dark:bg-yellow-950/50 border-t border-yellow-200 dark:border-yellow-800 flex items-start gap-2">
        <Info size={14} className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-yellow-700 dark:text-yellow-400">
          Alamat email otomatis masuk daftar supresi saat terjadi <strong>bounce</strong> atau <strong>complaint</strong>.
          Klik <strong>Pulihkan</strong> untuk mengizinkan pengiriman kembali.
        </p>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAddModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Tambah Supresi Manual</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Tambahkan alamat email ke daftar supresi secara manual.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Alamat Email</label>
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="contoh@email.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Alasan</label>
                <select value={newReason} onChange={(e) => setNewReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                  <option value="manual">Manual</option>
                  <option value="bounced">Bounce</option>
                  <option value="complained">Complaint (Spam)</option>
                </select>
              </div>
              {addResult && (
                <div className={`px-3 py-2 rounded-lg text-xs flex items-start gap-1.5 ${addResult.success
                  ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400'
                  : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400'}`}>
                  {addResult.success ? <CheckCircle2 size={12} className="flex-shrink-0 mt-0.5" /> : <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />}
                  <span>{addResult.message}</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button onClick={() => { setShowAddModal(false); setNewEmail(''); setNewReason('manual'); }}
                className="px-4 py-2 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                Batal
              </button>
              <button onClick={handleAdd} disabled={adding || !newEmail.trim() || !newEmail.includes('@')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-50">
                {adding ? <RefreshCw size={12} className="animate-spin" /> : <Ban size={12} />}
                {adding ? 'Menambahkan...' : 'Supresi Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
