'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import {
  Mail, Send, CheckCircle2, XCircle, AlertCircle, Info,
  RefreshCw, FileText, Server, History, ChevronLeft, ChevronRight,
} from 'lucide-react';

// ─── Email Template Directory ───

const EMAIL_TEMPLATES = [
  {
    category: '👥 Keanggotaan',
    items: [
      { name: 'welcomeMemberEmail', params: '(nama, email, password)', trigger: 'Anggota baru dibuat (manual/CSV)', label: 'Welcome Anggota' },
      { name: 'approvedMemberEmail', params: '(nama, email, password, nomorAnggota)', trigger: 'Calon anggota disetujui jadi anggota', label: 'Calon Disetujui' },
      { name: 'candidateRejectedEmail', params: '(nama, alasan)', trigger: 'Calon anggota ditolak', label: 'Calon Ditolak' },
      { name: 'registrationApprovedEmail', params: '(nama, email, password)', trigger: 'Pendaftaran disetujui', label: 'Registrasi Disetujui' },
      { name: 'registrationRejectedEmail', params: '(nama, alasan)', trigger: 'Pendaftaran ditolak', label: 'Registrasi Ditolak' },
    ],
  },
  {
    category: '📅 Kegiatan & Latihan',
    items: [
      { name: 'activityInvitationEmail', params: '(nama, kegiatanNama, tanggal, lokasi)', trigger: 'Peserta ditambahkan ke kegiatan', label: 'Undangan Kegiatan' },
      { name: 'trainingNotificationEmail', params: '(nama, materi, tanggal, waktu)', trigger: 'Jadwal latihan baru dibuat', label: 'Notif Latihan' },
      { name: 'attendanceConfirmationEmail', params: '(nama, materi, tanggal, statusHadir)', trigger: 'Absensi latihan dicatat', label: 'Konfirmasi Absensi' },
    ],
  },
  {
    category: '💰 Iuran & Pembayaran',
    items: [
      { name: 'paymentConfirmationEmail', params: '(nama, jumlah, bulan, tahun, status)', trigger: 'Iuran dibuat/status diupdate lunas', label: 'Konfirmasi Iuran' },
    ],
  },
  {
    category: '📄 Dokumen & Klaim',
    items: [
      { name: 'documentReadyEmail', params: '(nama, judulDokumen)', trigger: 'Dokumen selesai digenerate', label: 'Dokumen Siap' },
      { name: 'claimStatusEmail', params: '(nama, status, alasan?)', trigger: 'Status klaim berubah (approve/reject/process)', label: 'Status Klaim' },
    ],
  },
  {
    category: '🎓 Pendadaran',
    items: [
      { name: 'graduationRegisteredEmail', params: '(nama, namaPendadaran, tanggal)', trigger: 'Peserta daftar pendadaran', label: 'Daftar Pendadaran' },
      { name: 'graduationResultEmail', params: '(nama, lulus, skor?)', trigger: 'Hasil pendadaran (lulus/gagal)', label: 'Hasil Pendadaran' },
    ],
  },
  {
    category: '🧑‍🏫 Penguji & Admin',
    items: [
      { name: 'examinerWelcomeEmail', params: '(nama, email, password)', trigger: 'Penguji baru dibuat', label: 'Welcome Penguji' },
      { name: 'examinerAssignmentEmail', params: '(nama, kegiatanNama, tanggal, peran)', trigger: 'Penguji ditugaskan ke kegiatan', label: 'Penugasan Penguji' },
      { name: 'userWelcomeEmail', params: '(nama, email, role, password)', trigger: 'Admin baru dibuat', label: 'Welcome Admin' },
    ],
  },
  {
    category: '📨 Surat & Dokumen Organisasi',
    items: [
      { name: 'dispositionNotificationEmail', params: '(namaPenerima, pengirim, perihalSurat, isiDisposisi)', trigger: 'Disposisi surat masuk', label: 'Disposisi Surat' },
      { name: 'orgDocumentNotificationEmail', params: '(nama, judulDokumen, kategori)', trigger: 'Dokumen organisasi baru diupload', label: 'Upload Dokumen' },
    ],
  },
  {
    category: '🔐 Keamanan & Gamifikasi',
    items: [
      { name: 'resetPasswordEmail', params: '(nama, resetLink)', trigger: 'User minta reset password', label: 'Reset Password' },
      { name: 'generalNotificationEmail', params: '(nama, judul, isi)', trigger: 'Notifikasi manual dikirim via admin', label: 'Notifikasi Umum' },
      { name: 'badgeEarnedEmail', params: '(nama, badgeName, badgeIcon, description)', trigger: 'Anggota mendapat badge baru', label: 'Badge Baru' },
      { name: 'levelUpEmail', params: '(nama, oldLevel, newLevel, points)', trigger: 'Anggota naik level', label: 'Level Up' },
    ],
  },
];

// ─── Types ───

interface MailStatus {
  mode: string;
  resend: { configured: boolean; hasApiKey: boolean; hasDomain: boolean };
  smtp: { configured: boolean; host: string | null; port: number | null; hasCredentials: boolean };
}

interface EmailLogEntry {
  id: string;
  to: string;
  subject: string;
  status: string;
  provider: string | null;
  error: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface LogStats {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  successRate: number;
  dailyStats: Array<{ date: string; sent: number; failed: number; skipped: number }>;
  topRecipients: Array<{ email: string; count: number }>;
}

// ─── Helpers ───

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    sent: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400',
    failed: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400',
    skipped: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400',
  };
  const labels: Record<string, string> = { sent: 'Terkirim', failed: 'Gagal', skipped: 'Skip' };
  const icons: Record<string, string> = { sent: '✅', failed: '❌', skipped: '⏭️' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {icons[status] || ''} {labels[status] || status}
    </span>
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}j`;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

// ─── Page Component ───

export default function EmailSettingsPage() {
  const [activeTab, setActiveTab] = useState<'test' | 'templates' | 'logs'>('test');
  const [testEmail, setTestEmail] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [mailStatus, setMailStatus] = useState<MailStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // Logs state
  const [logs, setLogs] = useState<EmailLogEntry[]>([]);
  const [logsMeta, setLogsMeta] = useState({ total: 0, totalPages: 0, page: 1, limit: 20 });
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsFilter, setLogsFilter] = useState('');
  const [logsStats, setLogsStats] = useState<LogStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { data } = await apiClient.get('/mail/status');
        setMailStatus(data.data);
      } catch {
        setMailStatus(null);
      }
      setStatusLoading(false);
    };
    fetchStatus();
  }, []);

  const fetchLogs = async (page: number, status?: string) => {
    setLogsLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 20 };
      if (status) params.status = status;
      const { data } = await apiClient.get('/mail/logs', { params });
      setLogs(data.data || []);
      setLogsMeta(data.meta || { total: 0, totalPages: 0, page, limit: 20 });
    } catch { /* ignore */ }
    setLogsLoading(false);
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const { data } = await apiClient.get('/mail/logs/stats');
      setLogsStats(data.data);
    } catch { /* ignore */ }
    setStatsLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs(1, logsFilter);
      fetchStats();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTestEmail = async () => {
    if (!testEmail.trim()) return;
    setTestLoading(true);
    setTestResult(null);
    try {
      const { data } = await apiClient.post('/mail/test', { email: testEmail.trim() });
      setTestResult({
        success: data.success,
        message: data.success
          ? `✅ Email test berhasil dikirim ke ${testEmail.trim()}`
          : `❌ ${data.message || 'Gagal mengirim email test'}`,
      });
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setTestResult({ success: false, message: `❌ ${apiErr || 'Gagal terhubung ke server'}` });
    }
    setTestLoading(false);
  };

  const handleFilterChange = (status: string) => {
    setLogsFilter(status);
    fetchLogs(1, status);
  };

  // ─── Render ───

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Mail size={24} className="text-blue-600" />
            Email Administration
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Kelola pengiriman email, test koneksi, riwayat log, dan daftar template
          </p>
        </div>
      </div>

      {/* Config Status Cards */}
      {statusLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                <div className="flex-1">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-1" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : mailStatus ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${mailStatus.mode === 'development' ? 'bg-yellow-50 dark:bg-yellow-950' : 'bg-blue-50 dark:bg-blue-950'}`}>
              {mailStatus.mode === 'development' ? (
                <Server size={18} className="text-yellow-600 dark:text-yellow-400" />
              ) : (
                <CheckCircle2 size={18} className="text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Mode</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white capitalize">
                {mailStatus.mode === 'development' ? 'Development (log only)' : 'Production'}
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${mailStatus.resend.configured ? 'bg-green-50 dark:bg-green-950' : 'bg-gray-100 dark:bg-gray-700'}`}>
              {mailStatus.resend.configured ? (
                <CheckCircle2 size={18} className="text-green-600 dark:text-green-400" />
              ) : (
                <XCircle size={18} className="text-gray-400" />
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Resend API</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {mailStatus.resend.configured ? 'Terkonfigurasi' : 'Belum dikonfigurasi'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {mailStatus.resend.hasApiKey && mailStatus.resend.hasDomain
                  ? '✅ API Key + Domain siap'
                  : mailStatus.resend.hasApiKey
                  ? '⚠️ Domain belum diatur'
                  : 'Butuh RESEND_API_KEY + RESEND_DOMAIN'}
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${mailStatus.smtp.configured ? 'bg-green-50 dark:bg-green-950' : 'bg-gray-100 dark:bg-gray-700'}`}>
              {mailStatus.smtp.configured ? (
                <CheckCircle2 size={18} className="text-green-600 dark:text-green-400" />
              ) : (
                <XCircle size={18} className="text-gray-400" />
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">SMTP Fallback</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {mailStatus.smtp.configured ? 'Terkonfigurasi' : 'Belum dikonfigurasi'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {mailStatus.smtp.configured
                  ? `${mailStatus.smtp.host}:${mailStatus.smtp.port}`
                  : 'Butuh SMTP_USER + SMTP_PASS'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 text-sm text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
          <AlertCircle size={16} />
          Gagal memuat status konfigurasi email dari server.
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('test')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
            activeTab === 'test'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Send size={16} className="inline mr-1.5" />
          Test Email
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
            activeTab === 'templates'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <FileText size={16} className="inline mr-1.5" />
          Template ({EMAIL_TEMPLATES.reduce((c, g) => c + g.items.length, 0)})
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
            activeTab === 'logs'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <History size={16} className="inline mr-1.5" />
          Riwayat Email
        </button>
      </div>

      {/* ── Tab: Test Email ── */}
      {activeTab === 'test' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Test Pengiriman Email</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Kirim email test untuk memverifikasi konfigurasi email berfungsi dengan baik.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Masukkan alamat email tujuan"
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleTestEmail}
              disabled={testLoading || !testEmail.trim()}
              className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              {testLoading ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
              {testLoading ? 'Mengirim...' : 'Kirim Test'}
            </button>
          </div>
          {testResult && (
            <div className={`mt-4 px-4 py-3 rounded-lg text-sm flex items-start gap-2 ${
              testResult.success
                ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
            }`}>
              {testResult.success ? <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" /> : <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />}
              <span>{testResult.message}</span>
            </div>
          )}
          <div className="mt-6 flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <Info size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-400">
              Di mode <strong>development</strong>, email hanya di-log ke console dan dicatat sebagai <strong>skipped</strong>.
              Di mode <strong>production</strong>, email dikirim via <strong>Resend</strong> (primer) dengan fallback ke <strong>SMTP</strong>.
              Setiap pengiriman dicatat di tabel <code className="px-1 bg-blue-100 dark:bg-blue-900 rounded">email_logs</code>.
            </p>
          </div>
        </div>
      )}

      {/* ── Tab: Templates Directory ── */}
      {activeTab === 'templates' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Direktori Template Email</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Semua {EMAIL_TEMPLATES.reduce((c, g) => c + g.items.length, 0)} template email yang terintegrasi di sistem THS-THM.
          </p>
          {EMAIL_TEMPLATES.map((group) => (
            <div key={group.category} className="mb-6 last:mb-0">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 border-b border-gray-100 dark:border-gray-700 pb-2">
                {group.category}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.items.map((tpl) => (
                  <div key={tpl.name} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition cursor-default">
                    <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 flex-shrink-0">
                      <FileText size={14} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{tpl.label}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate">{tpl.name}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Trigger: {tpl.trigger}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">{tpl.params}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab: Email Logs ── */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Stats Cards */}
          {statsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[1,2,3,4,5].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 animate-pulse h-20" />
              ))}
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
            {/* Filter + Header */}
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Filter status:</span>
                {['', 'sent', 'failed', 'skipped'].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleFilterChange(s)}
                    className={`text-xs px-2.5 py-1 rounded-full transition ${
                      logsFilter === s
                        ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 font-medium'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {s ? (s === 'sent' ? '✅ Terkirim' : s === 'failed' ? '❌ Gagal' : '⏭️ Skip') : 'Semua'}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <RefreshCw
                  size={14}
                  className="cursor-pointer hover:text-blue-600 transition"
                  onClick={() => { fetchLogs(1, logsFilter); fetchStats(); }}
                />
                {logsMeta.total > 0 && <span>{logsMeta.total} total</span>}
              </div>
            </div>

            {/* Table */}
            {logsLoading ? (
              <div className="p-8 text-center text-sm text-gray-400">
                <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
                Memuat riwayat...
              </div>
            ) : logs.length === 0 ? (
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
                        <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                        <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Tujuan</th>
                        <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Subjek</th>
                        <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">Provider</th>
                        <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Waktu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition">
                          <td className="px-5 py-3">{statusBadge(log.status)}</td>
                          <td className="px-5 py-3">
                            <span className="text-gray-900 dark:text-white font-medium text-xs">{log.to}</span>
                          </td>
                          <td className="px-5 py-3">
                            <div>
                              <span className="text-gray-800 dark:text-gray-200 text-xs">{log.subject}</span>
                              {log.error && (
                                <p className="text-xs text-red-500 dark:text-red-400 mt-0.5 truncate max-w-[200px]" title={log.error}>
                                  {log.error}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3 hidden sm:table-cell">
                            {log.provider ? (
                              <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">{log.provider}</span>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-5 py-3 hidden md:table-cell">
                            <span className="text-xs text-gray-500 dark:text-gray-400" title={formatDate(log.createdAt)}>
                              {formatDateShort(log.createdAt)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {logsMeta.totalPages > 1 && (
                  <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Halaman {logsMeta.page} dari {logsMeta.totalPages}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => fetchLogs(logsMeta.page - 1, logsFilter)}
                        disabled={logsMeta.page <= 1}
                        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition"
                      >
                        <ChevronLeft size={16} className="text-gray-600 dark:text-gray-400" />
                      </button>
                      <button
                        onClick={() => fetchLogs(logsMeta.page + 1, logsFilter)}
                        disabled={logsMeta.page >= logsMeta.totalPages}
                        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition"
                      >
                        <ChevronRight size={16} className="text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Top Recipients */}
          {logsStats && logsStats.topRecipients.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Penerima Terbanyak</h3>
              <div className="space-y-2">
                {logsStats.topRecipients.map((r, i) => (
                  <div key={r.email} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-5">{i + 1}.</span>
                      <span className="text-xs text-gray-700 dark:text-gray-300">{r.email}</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                      {r.count} email
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer Info */}
      {activeTab !== 'logs' && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
            <Info size={16} className="text-blue-600 dark:text-blue-400" />
            Cara Kerja Email di THS-THM
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p className="font-medium text-gray-700 dark:text-gray-300">📤 Alur Pengiriman</p>
              <ol className="list-decimal list-inside text-gray-600 dark:text-gray-400 text-xs space-y-1">
                <li>Event terjadi di service (create, approve, etc.)</li>
                <li>Service panggil method email internal (fire-and-forget)</li>
                <li>MailService kirim via Resend API (primer)</li>
                <li>Fallback ke SMTP/Nodemailer jika Resend gagal</li>
                <li>Hasil dicatat di email_logs + log console</li>
              </ol>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-gray-700 dark:text-gray-300">🛡️ Error Handling</p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 text-xs space-y-1">
                <li>Semua pengiriman email adalah fire-and-forget</li>
                <li>Error di-log via Logger + tabel email_logs</li>
                <li>Internal try/catch di setiap method email</li>
                <li>Tidak ada queue — langsung kirim via HTTP/fetch</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
