'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import {
  Mail, Send, CheckCircle2, XCircle, AlertCircle, Info,
  RefreshCw, FileText, Server, History, ChevronLeft, ChevronRight, BarChart3,
  Ban, Trash2, ShieldAlert, RotateCcw,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';

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

// ─── Module Filter ───

const MODULES = [
  { value: '', label: 'Semua Modul' },
  { value: 'members', label: 'Anggota' },
  { value: 'candidates', label: 'Calon' },
  { value: 'registrations', label: 'Registrasi' },
  { value: 'examiners', label: 'Penguji' },
  { value: 'users', label: 'User' },
  { value: 'activities', label: 'Kegiatan' },
  { value: 'claims', label: 'Klaim' },
  { value: 'auth', label: 'Auth' },
  { value: 'trainings', label: 'Latihan' },
  { value: 'dues', label: 'Iuran' },
  { value: 'letters', label: 'Surat' },
  { value: 'graduations', label: 'Pendadaran' },
  { value: 'documents', label: 'Dokumen' },
  { value: 'gamification', label: 'Gamifikasi' },
  { value: 'org-documents', label: 'Dok. Organisasi' },
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

function EngagementCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
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
  const [activeTab, setActiveTab] = useState<'test' | 'templates' | 'logs' | 'report' | 'suppressed'>('test');
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
  const [logsModuleFilter, setLogsModuleFilter] = useState('');
  const [logsStats, setLogsStats] = useState<LogStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [usedModules, setUsedModules] = useState<Array<{ module: string; label: string; count: number }>>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);
  const [retryResult, setRetryResult] = useState<{ retried: number; succeeded: number; failed: number } | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [engagement, setEngagement] = useState<{
    totalSent: number;
    totalEvents: number;
    events: Record<string, number>;
    rates: Record<string, number>;
    dailyTrend?: Array<{ date: string; sent: number; opened: number; clicked: number; bounced: number; openRate: number; clickRate: number; bounceRate: number }>;
  } | null>(null);
  const [engagementLoading, setEngagementLoading] = useState(false);

  // Suppressions state
  const [suppressions, setSuppressions] = useState<Array<{
    id: string;
    email: string;
    reason: string;
    event: { event: string; timestamp: string } | null;
    createdAt: string;
  }>>([]);
  const [suppressionMeta, setSuppressionMeta] = useState({ total: 0, totalPages: 0, page: 1, limit: 20 });
  const [suppressionsLoading, setSuppressionsLoading] = useState(false);
  const [suppressionRemoving, setSuppressionRemoving] = useState<string | null>(null);
  const [showAddSuppression, setShowAddSuppression] = useState(false);
  const [newSuppressionEmail, setNewSuppressionEmail] = useState('');
  const [newSuppressionReason, setNewSuppressionReason] = useState('manual');
  const [addingSuppression, setAddingSuppression] = useState(false);
  const [addSuppressionResult, setAddSuppressionResult] = useState<{ success: boolean; message: string } | null>(null);

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
    fetchModules();
  }, []);

  const fetchEngagement = async () => {
    setEngagementLoading(true);
    try {
      const { data } = await apiClient.get('/mail/logs/engagement');
      setEngagement(data.data);
    } catch { /* ignore */ }
    setEngagementLoading(false);
  };

  const fetchLogs = async (page: number, status?: string, module?: string) => {
    setLogsLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 20 };
      if (status) params.status = status;
      if (module) params.module = module;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const { data } = await apiClient.get('/mail/logs', { params });
      setLogs(data.data || []);
      setLogsMeta(data.meta || { total: 0, totalPages: 0, page, limit: 20 });
    } catch { /* ignore */ }
    setLogsLoading(false);
  };

  const fetchStats = async (module?: string) => {
    setStatsLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (module) params.module = module;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const { data } = await apiClient.get('/mail/logs/stats', { params });
      setLogsStats(data.data);
    } catch { /* ignore */ }
    setStatsLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'logs' || activeTab === 'report') {
      if (activeTab === 'logs') fetchLogs(1, logsFilter, logsModuleFilter);
      fetchStats(logsModuleFilter);
    }
    if (activeTab === 'report') fetchEngagement();
    if (activeTab === 'suppressed') fetchSuppressions();
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
    fetchLogs(1, status, logsModuleFilter);
  };

  const fetchModules = async () => {
    setModulesLoading(true);
    try {
      const { data } = await apiClient.get('/mail/modules');
      setUsedModules(data.data || []);
    } catch { /* ignore */ }
    setModulesLoading(false);
  };

  const fetchSuppressions = async (page = 1) => {
    setSuppressionsLoading(true);
    try {
      const { data } = await apiClient.get('/mail/suppressions', { params: { page, limit: 20 } });
      setSuppressions(data.data || []);
      setSuppressionMeta(data.meta || { total: 0, totalPages: 0, page, limit: 20 });
    } catch { /* ignore */ }
    setSuppressionsLoading(false);
  };

  const handleRemoveSuppression = async (id: string) => {
    if (!confirm('Hapus alamat email ini dari daftar supresi?')) return;
    setSuppressionRemoving(id);
    try {
      await apiClient.delete(`/mail/suppressions/${id}`);
      fetchSuppressions(suppressionMeta.page);
    } catch { /* ignore */ }
    setSuppressionRemoving(null);
  };

  const handleAddSuppression = async () => {
    if (!newSuppressionEmail.trim() || !newSuppressionEmail.includes('@')) return;
    setAddingSuppression(true);
    setAddSuppressionResult(null);
    try {
      const { data } = await apiClient.post('/mail/suppressions', {
        email: newSuppressionEmail.trim(),
        reason: newSuppressionReason,
      });
      if (data.success) {
        setShowAddSuppression(false);
        setNewSuppressionEmail('');
        setNewSuppressionReason('manual');
        fetchSuppressions(1);
      } else {
        setAddSuppressionResult({ success: false, message: data.message || 'Gagal menambahkan supresi' });
      }
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setAddSuppressionResult({ success: false, message: apiErr || 'Gagal terhubung ke server' });
    }
    setAddingSuppression(false);
  };

  const handleClearSuppressions = async () => {
    if (!confirm('Bersihkan semua alamat email dari daftar supresi? Email akan tetap dikirim ke alamat-alamat ini.')) return;
    try {
      await apiClient.post('/mail/suppressions/clear', {});
      fetchSuppressions(1);
    } catch { /* ignore */ }
  };

  const handleRetry = async () => {
    if (!confirm('Kirim ulang semua email yang gagal?')) return;
    setRetryLoading(true);
    setRetryResult(null);
    try {
      const { data } = await apiClient.post('/mail/retry');
      // Refresh logs and stats after retry
      fetchLogs(1, logsFilter, logsModuleFilter);
      fetchStats(logsModuleFilter);
      setRetryResult(data.data);
    } catch { /* ignore */ }
    setRetryLoading(false);
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
    const failedIds = logs.filter((l) => l.status === 'failed').map((l) => l.id);
    setSelectedIds((prev) => {
      // If all failed are already selected, deselect all; otherwise select all failed
      const allSelected = failedIds.every((id) => prev.has(id));
      if (allSelected) return new Set();
      return new Set(failedIds);
    });
  };

  const handleBulkRetry = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Kirim ulang ${selectedIds.size} email yang gagal?`)) return;
    setRetryLoading(true);
    setRetryResult(null);
    try {
      const { data } = await apiClient.post('/mail/retry', { ids: Array.from(selectedIds) });
      setSelectedIds(new Set());
      fetchLogs(1, logsFilter, logsModuleFilter);
      fetchStats(logsModuleFilter);
      setRetryResult(data.data);
    } catch { /* ignore */ }
    setRetryLoading(false);
  };

  const handleRetrySingle = async (id: string) => {
    setRetryLoading(true);
    setRetryResult(null);
    try {
      const { data } = await apiClient.post('/mail/retry', { ids: [id] });
      fetchLogs(logsMeta.page, logsFilter, logsModuleFilter);
      fetchStats(logsModuleFilter);
      setRetryResult(data.data);
    } catch { /* ignore */ }      setRetryLoading(false);
    };

    // Clear selection when logs page/filter changes
    useEffect(() => {
      setSelectedIds(new Set());
    }, [logs, logsFilter, logsModuleFilter]);

    const handleExportCsv = async () => {
    setExportLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (logsFilter) params.status = logsFilter;
      if (logsModuleFilter) params.module = logsModuleFilter;
      const { data } = await apiClient.get('/mail/logs/export', { params });
      const rows = data.data || [];

      // Generate CSV
      const header = 'ID,Tujuan,Subjek,Status,Provider,Error,Modul,Waktu\n';
      const csvRows = rows.map((r: Record<string, unknown>) => {
        const escape = (v: unknown) => {
          const s = String(v ?? '');
          return s.includes(',') || s.includes('"') || s.includes('\n')
            ? `"${s.replace(/"/g, '""')}"`
            : s;
        };
        return [
          escape(r.id),
          escape(r.to),
          escape(r.subject),
          escape(r.status),
          escape(r.provider),
          escape(r.error),
          escape(r.module),
          escape(r.createdAt),
        ].join(',');
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

  const handleModuleFilterChange = (module: string) => {
    setLogsModuleFilter(module);
    fetchLogs(1, logsFilter, module);
    fetchStats(module);
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
          Riwayat
        </button>
        <button
          onClick={() => setActiveTab('report')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
            activeTab === 'report'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <BarChart3 size={16} className="inline mr-1.5" />
          Laporan
        </button>
        <button
          onClick={() => setActiveTab('suppressed')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
            activeTab === 'suppressed'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Ban size={16} className="inline mr-1.5" />
          Supresi
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

      {/* ── Tab: Report ── */}
      {activeTab === 'report' && (
        <div className="space-y-6">
          {statsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1,2,3].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse h-80" />
              ))}
            </div>
          ) : logsStats ? (
            <>
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
                  <div className="mb-4">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">Tren Pengiriman 7 Hari</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Jumlah email terkirim, gagal, dan skip per hari</p>
                  </div>
                  {logsStats.dailyStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={logsStats.dailyStats} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                          tickLine={false}
                          axisLine={{ stroke: '#e5e7eb' }}
                          tickFormatter={(val) => {
                            const d = new Date(val + 'T00:00:00');
                            return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
                          }}
                        />
                        <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip
                          formatter={(value: number, name: string) => {
                            const labels: Record<string, string> = { sent: 'Terkirim', failed: 'Gagal', skipped: 'Skip' };
                            return [value, labels[name] || name];
                          }}
                          labelFormatter={(label) => {
                            const d = new Date(label + 'T00:00:00');
                            return d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                          }}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="sent" name="sent" fill="#22c55e" stackId="a" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="failed" name="failed" fill="#ef4444" stackId="a" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="skipped" name="skipped" fill="#eab308" stackId="a" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500 text-sm">
                      Belum ada data pengiriman 7 hari terakhir
                    </div>
                  )}
                  {/* Legend */}
                  <div className="flex items-center justify-center gap-6 mt-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-green-500" /> Terkirim</span>
                    <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-red-500" /> Gagal</span>
                    <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-yellow-500" /> Skip</span>
                  </div>
                </div>

                {/* Pie Chart - Status Distribution */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                  <div className="mb-4">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">Distribusi Status</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Perbandingan keseluruhan</p>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Terkirim', value: logsStats.sent, color: '#22c55e' },
                          { name: 'Gagal', value: logsStats.failed, color: '#ef4444' },
                          { name: 'Skip', value: logsStats.skipped, color: '#eab308' },
                        ].filter(d => d.value > 0)}
                        cx="50%"
                        cy="45%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {[
                          { name: 'Terkirim', value: logsStats.sent, color: '#22c55e' },
                          { name: 'Gagal', value: logsStats.failed, color: '#ef4444' },
                          { name: 'Skip', value: logsStats.skipped, color: '#eab308' },
                        ].filter(d => d.value > 0).map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} stroke="white" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string) => [value.toLocaleString('id-ID'), name]}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={30}
                        iconType="circle"
                        iconSize={8}
                        formatter={(value) => <span className="text-xs text-gray-600 dark:text-gray-400">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2">
                    {logsStats.total > 0
                      ? `${logsStats.sent} dari ${logsStats.total} berhasil (${logsStats.successRate}%)`
                      : 'Belum ada data'
                    }
                  </div>
                </div>
              </div>

              {/* Module Comparison Bar Chart */}
              {usedModules.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                  <div className="mb-4">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">Perbandingan per Modul</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Jumlah pengiriman email per modul (total keseluruhan)</p>
                  </div>
                  <ResponsiveContainer width="100%" height={Math.max(200, usedModules.length * 36)}>
                    <BarChart
                      data={[...usedModules]
                        .map((m) => ({
                          name: MODULES.find(sm => sm.value === m.module)?.label || m.module,
                          count: m.count,
                        }))
                        .sort((a, b) => b.count - a.count)}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={false}
                        width={75}
                      />
                      <Tooltip
                        formatter={(value: number) => [value.toLocaleString('id-ID'), 'Email']}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Engagement Stats */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Engagement Email</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Statistik interaksi dari webhook Resend — open, click, bounce rate
                  </p>
                </div>
                {engagementLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[1,2,3,4,5].map((i) => (
                      <div key={i} className="bg-gray-100 dark:bg-gray-700 rounded-lg h-20 animate-pulse" />
                    ))}
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
                    {/* Daily Trend Line Chart */}
                    {engagement.dailyTrend && engagement.dailyTrend.some(d => d.sent > 0) && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Tren 7 Hari (Open, Click, Bounce Rate)</p>
                        <ResponsiveContainer width="100%" height={160}>
                          <LineChart data={engagement.dailyTrend} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 10, fill: '#6b7280' }}
                              tickLine={false}
                              axisLine={{ stroke: '#e5e7eb' }}
                              tickFormatter={(val) => {
                                const d = new Date(val + 'T00:00:00');
                                return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
                              }}
                            />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} />
                            <Tooltip
                              formatter={(value: number, name: string) => {
                                const labels: Record<string, string> = { openRate: 'Open', clickRate: 'Click', bounceRate: 'Bounce' };
                                return [`${value}%`, labels[name] || name];
                              }}
                              labelFormatter={(label) => {
                                const d = new Date(label + 'T00:00:00');
                                return d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                              }}
                              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
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
                      </div>
                    )}

                    {/* Mini bar chart */}
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart
                        data={[
                          { name: 'Delivered', value: engagement.rates.delivered, fill: '#22c55e' },
                          { name: 'Open', value: engagement.rates.opened, fill: '#6366f1' },
                          { name: 'Click', value: engagement.rates.clicked, fill: '#a855f7' },
                          { name: 'Bounce', value: engagement.rates.bounced, fill: '#ef4444' },
                          { name: 'Complain', value: engagement.rates.complained, fill: '#f59e0b' },
                        ].filter(d => d.value > 0)}
                        margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} />
                        <Tooltip
                          formatter={(value: number) => [`${value}%`, 'Rate']}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {[
                            { name: 'Delivered', value: engagement.rates.delivered, fill: '#22c55e' },
                            { name: 'Open', value: engagement.rates.opened, fill: '#6366f1' },
                            { name: 'Click', value: engagement.rates.clicked, fill: '#a855f7' },
                            { name: 'Bounce', value: engagement.rates.bounced, fill: '#ef4444' },
                            { name: 'Complain', value: engagement.rates.complained, fill: '#f59e0b' },
                          ].filter(d => d.value > 0).map((entry, idx) => (
                            <Cell key={idx} fill={entry.fill} />
                          ))}
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
            </>
          ) : (
            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 text-sm text-yellow-700 dark:text-yellow-400 text-center">
              <BarChart3 size={32} className="mx-auto mb-2 opacity-50" />
              <p>Belum ada data laporan. Kirim email terlebih dahulu.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Suppressed Emails ── */}
      {activeTab === 'suppressed' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Ban size={18} className="text-red-500" />
                Daftar Supresi Email
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Alamat email yang ditekan pengirimannya — otomatis (bounce/complaint) atau manual
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setAddSuppressionResult(null);
                  setShowAddSuppression(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 transition"
              >
                <Mail size={12} />
                Tambah
              </button>
              <button
                onClick={handleClearSuppressions}
                disabled={suppressions.length === 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900 transition disabled:opacity-40"
              >
                <Trash2 size={12} />
                Bersihkan Semua
              </button>
              <button
                onClick={() => fetchSuppressions(suppressionMeta.page)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Table */}
          {suppressionsLoading ? (
            <div className="p-8 text-center text-sm text-gray-400">
              <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
              Memuat daftar supresi...
            </div>
          ) : suppressions.length === 0 ? (
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
                            s.reason === 'bounced'
                              ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400'
                              : 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400'
                          }`}>
                            {s.reason === 'bounced' ? '❌ Bounce' : s.reason === 'complained' ? '⚠️ Complaint' : s.reason}
                          </span>
                        </td>
                        <td className="px-5 py-3 hidden sm:table-cell">
                          {s.event ? (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {s.event.event}
                              <span className="text-gray-300 dark:text-gray-600"> &middot; </span>
                              {formatDateShort(s.event.timestamp)}
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
                            onClick={() => handleRemoveSuppression(s.id)}
                            disabled={suppressionRemoving === s.id}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-900 hover:text-red-600 dark:hover:text-red-400 transition disabled:opacity-50"
                            title="Hapus dari supresi"
                          >
                            {suppressionRemoving === s.id ? (
                              <RefreshCw size={10} className="animate-spin" />
                            ) : (
                              <RotateCcw size={10} />
                            )}
                            Pulihkan
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {suppressionMeta.totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Halaman {suppressionMeta.page} dari {suppressionMeta.totalPages}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => fetchSuppressions(suppressionMeta.page - 1)}
                      disabled={suppressionMeta.page <= 1}
                      className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition"
                    >
                      <ChevronLeft size={16} className="text-gray-600 dark:text-gray-400" />
                    </button>
                    <button
                      onClick={() => fetchSuppressions(suppressionMeta.page + 1)}
                      disabled={suppressionMeta.page >= suppressionMeta.totalPages}
                      className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition"
                    >
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
              Alamat email otomatis masuk daftar supresi saat terjadi <strong>bounce</strong> (email tidak terkirim) atau <strong>complaint</strong> (dilaporkan spam).
              Email ke alamat di daftar ini akan dicatat sebagai <strong>skipped</strong> dan tidak dikirim.
              Klik <strong>Pulihkan</strong> untuk mengizinkan pengiriman kembali.
            </p>
          </div>
        </div>
      )}

      {/* ── Modal: Tambah Supresi Manual ── */}
      {showAddSuppression && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAddSuppression(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Tambah Supresi Manual</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Tambahkan alamat email ke daftar supresi secara manual. Email ke alamat ini akan ditekan pengirimannya.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Alamat Email</label>
                <input
                  type="email"
                  value={newSuppressionEmail}
                  onChange={(e) => setNewSuppressionEmail(e.target.value)}
                  placeholder="contoh@email.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Alasan</label>
                <select
                  value={newSuppressionReason}
                  onChange={(e) => setNewSuppressionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="manual">Manual</option>
                  <option value="bounced">Bounce</option>
                  <option value="complained">Complaint (Spam)</option>
                </select>
              </div>
              {addSuppressionResult && (
                <div className={`px-3 py-2 rounded-lg text-xs flex items-start gap-1.5 ${
                  addSuppressionResult.success
                    ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400'
                    : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400'
                }`}>
                  {addSuppressionResult.success ? <CheckCircle2 size={12} className="flex-shrink-0 mt-0.5" /> : <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />}
                  <span>{addSuppressionResult.message}</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => {
                  setShowAddSuppression(false);
                  setNewSuppressionEmail('');
                  setNewSuppressionReason('manual');
                }}
                className="px-4 py-2 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                Batal
              </button>
              <button
                onClick={handleAddSuppression}
                disabled={addingSuppression || !newSuppressionEmail.trim() || !newSuppressionEmail.includes('@')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-50"
              >
                {addingSuppression ? (
                  <RefreshCw size={12} className="animate-spin" />
                ) : (
                  <Ban size={12} />
                )}
                {addingSuppression ? 'Menambahkan...' : 'Supresi Email'}
              </button>
            </div>
          </div>
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
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Status:</span>
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
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 font-medium">Tanggal:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 w-32"
                />
                <span className="text-xs text-gray-400">–</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 w-32"
                />
                <button
                  onClick={() => { fetchLogs(1, logsFilter, logsModuleFilter); fetchStats(logsModuleFilter); }}
                  className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900 transition font-medium"
                >
                  Terapkan
                </button>
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 font-medium">Modul:</span>
                <select
                  value={logsModuleFilter}
                  onChange={(e) => handleModuleFilterChange(e.target.value)}
                  className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Semua Modul</option>
                  {usedModules.length > 0 ? usedModules.map((m) => {
                    const label = MODULES.find(sm => sm.value === m.module)?.label || m.module;
                    return (
                      <option key={m.module} value={m.module}>
                        {label} ({m.count})
                      </option>
                    );
                  }) : modulesLoading ? (
                    <option disabled>Memuat...</option>
                  ) : MODULES.filter(m => m.value).map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <RefreshCw
                  size={14}
                  className="cursor-pointer hover:text-blue-600 transition"
                  onClick={() => { fetchLogs(1, logsFilter, logsModuleFilter); fetchStats(logsModuleFilter); }}
                />
                {logsMeta.total > 0 && (
                  <button
                    onClick={handleExportCsv}
                    disabled={exportLoading}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition disabled:opacity-50 text-xs font-medium"
                  >
                    <FileText size={12} />
                    {exportLoading ? 'Menyiapkan...' : 'CSV'}
                  </button>
                )}
                {logsStats && logsStats.failed > 0 && (
                  <button
                    onClick={handleRetry}
                    disabled={retryLoading}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 transition disabled:opacity-50 text-xs font-medium"
                  >
                    {retryLoading ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <AlertCircle size={12} />
                    )}
                    {retryLoading ? 'Mengirim ulang...' : `Retry ${logsStats.failed} Gagal`}
                  </button>
                )}
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
                        <th className="px-3 py-3 w-10">
                          <input
                            type="checkbox"
                            checked={logs.filter(l => l.status === 'failed').length > 0 && logs.filter(l => l.status === 'failed').every(l => selectedIds.has(l.id))}
                            onChange={toggleSelectAll}
                            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
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
                      {logs.map((log) => (
                        <tr
                          key={log.id}
                          className={`border-b border-gray-100 dark:border-gray-800 transition ${
                            selectedIds.has(log.id)
                              ? 'bg-blue-50 dark:bg-blue-950/40'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'
                          }`}
                        >
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(log.id)}
                              onChange={() => toggleSelect(log.id)}
                              disabled={log.status !== 'failed'}
                              className={`rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 ${
                                log.status === 'failed' ? 'cursor-pointer' : 'opacity-30 cursor-not-allowed'
                              }`}
                            />
                          </td>
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
                            {(() => {
                              const moduleVal = log.metadata?.module;
                              if (!moduleVal) return <span className="text-xs text-gray-400">-</span>;
                              const label = MODULES.find(m => m.value === moduleVal)?.label || String(moduleVal);
                              return (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-medium">
                                  {label}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-5 py-3 hidden md:table-cell">
                            {log.provider ? (
                              <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">{log.provider}</span>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-5 py-3 hidden lg:table-cell">
                            <span className="text-xs text-gray-500 dark:text-gray-400" title={formatDate(log.createdAt)}>
                              {formatDateShort(log.createdAt)}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            {log.status === 'failed' ? (
                              <button
                                onClick={() => handleRetrySingle(log.id)}
                                disabled={retryLoading}
                                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 transition disabled:opacity-50"
                                title="Retry email ini"
                              >
                                {retryLoading ? <RefreshCw size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                                Retry
                              </button>
                            ) : (
                              <span className="text-xs text-gray-300 dark:text-gray-600">–</span>
                            )}
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

          {/* Bulk Retry Action Bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between px-5 py-3 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl">
              <span className="text-sm text-blue-700 dark:text-blue-300">
                <strong>{selectedIds.size}</strong> email gagal dipilih
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  Batal
                </button>
                <button
                  onClick={handleBulkRetry}
                  disabled={retryLoading}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
                >
                  {retryLoading ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  {retryLoading ? 'Mengirim...' : `Retry ${selectedIds.size} Email`}
                </button>
              </div>
            </div>
          )}

          {/* Retry Result Banner */}
          {retryResult && (
            <div className={`px-4 py-3 rounded-xl text-sm flex items-center gap-2 ${
              retryResult.failed === 0
                ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                : 'bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400'
            }`}>
              {retryResult.failed === 0 ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>
                <strong>Retry selesai:</strong> {retryResult.retried} dicoba, {retryResult.succeeded} berhasil, {retryResult.failed} gagal
              </span>
              <button
                onClick={() => setRetryResult(null)}
                className="ml-auto text-xs hover:underline"
              >
                Tutup
              </button>
            </div>
          )}

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
