'use client';

import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import PageContainer from '@/components/ui/page-container';
import { PermissionGuard } from '@/components/auth/permission-guard';
import {
  Bell,
  Plus,
  Edit3,
  Trash2,
  Power,
  PowerOff,
  Send,
  Mail,
  AlertTriangle,
  Cpu,
  MemoryStick,
  Database,
  Wifi,
  Clock,
  Activity,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────

interface MonitoringAlert {
  id: string;
  name: string;
  metric: string;
  operator: string;
  threshold: number;
  duration: number;
  channels: string[];
  telegramBotToken?: string | null;
  telegramChatId?: string | null;
  emailRecipients?: string | null;
  cooldown: number;
  isActive: boolean;
  lastTriggeredAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AlertFormData {
  name: string;
  metric: string;
  operator: string;
  threshold: number;
  duration: number;
  channels: string[];
  telegramBotToken: string;
  telegramChatId: string;
  emailRecipients: string;
  cooldown: number;
  isActive: boolean;
}

const EMPTY_FORM: AlertFormData = {
  name: '',
  metric: 'memory_percent',
  operator: 'gt',
  threshold: 90,
  duration: 0,
  channels: ['telegram'],
  telegramBotToken: '',
  telegramChatId: '',
  emailRecipients: '',
  cooldown: 300,
  isActive: true,
};

const METRICS: { value: string; label: string; icon: typeof Bell }[] = [
  { value: 'cpu_percent', label: 'CPU Usage', icon: Cpu },
  { value: 'memory_percent', label: 'Memory Usage', icon: MemoryStick },
  { value: 'db_down', label: 'Database Down', icon: Database },
  { value: 'queue_down', label: 'Queue Down', icon: Wifi },
  { value: 'api_down', label: 'API Down', icon: Cpu },
  { value: 'queue_latency_ms', label: 'Queue Latency', icon: Clock },
  { value: 'queue_failed_jobs', label: 'Failed Queue Jobs', icon: AlertTriangle },
];

const OPERATORS = [
  { value: 'gt', label: '> (lebih dari)' },
  { value: 'gte', label: '>= (lebih dari sama dengan)' },
  { value: 'lt', label: '< (kurang dari)' },
  { value: 'lte', label: '<= (kurang dari sama dengan)' },
];

const CHANNEL_OPTIONS = [
  { value: 'telegram', label: 'Telegram', icon: Send },
  { value: 'email', label: 'Email', icon: Mail },
];

// ── Alert Card ──────────────────────────────────────────────

function MetricBadge({ metric }: { metric: string }) {
  const m = METRICS.find((m) => m.value === metric);
  if (!m) return <span className="text-xs text-gray-500">{metric}</span>;
  const Icon = m.icon;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
      <Icon size={12} />
      {m.label}
    </span>
  );
}

function ChannelBadge({ channel }: { channel: string }) {
  const ch = CHANNEL_OPTIONS.find((c) => c.value === channel);
  if (!ch) return null;
  const Icon = ch.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
      channel === 'telegram'
        ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
        : 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
    }`}>
      <Icon size={10} />
      {ch.label}
    </span>
  );
}

// ── Modal ───────────────────────────────────────────────────

function AlertFormModal({
  open,
  data,
  onSave,
  onClose,
}: {
  open: boolean;
  data: AlertFormData;
  onSave: (data: AlertFormData) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<AlertFormData>(data);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(data);
  }, [open, data]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  const toggleChannel = (ch: string) => {
    setForm((f) => ({
      ...f,
      channels: f.channels.includes(ch)
        ? f.channels.filter((c) => c !== ch)
        : [...f.channels, ch],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell size={18} className="text-blue-600" />
            {data.name ? 'Edit Alert' : 'Tambah Alert'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Alert</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
              placeholder="Misal: Memory > 90%"
              required
            />
          </div>

          {/* Metric */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Metric</label>
            <select
              value={form.metric}
              onChange={(e) => setForm((f) => ({ ...f, metric: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
            >
              {METRICS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Operator + Threshold */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Operator</label>
              <select
                value={form.operator}
                onChange={(e) => setForm((f) => ({ ...f, operator: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
              >
                {OPERATORS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Threshold</label>
              <input
                type="number"
                value={form.threshold}
                onChange={(e) => setForm((f) => ({ ...f, threshold: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                step="any"
                required
              />
            </div>
          </div>

          {/* Duration (seconds) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Durasi (detik) — kondisi harus bertahan selama ini sebelum alert
            </label>
            <input
              type="number"
              value={form.duration}
              onChange={(e) => setForm((f) => ({ ...f, duration: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
              min={0}
            />
          </div>

          {/* Cooldown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cooldown (detik) — minimal jeda antar notifikasi
            </label>
            <input
              type="number"
              value={form.cooldown}
              onChange={(e) => setForm((f) => ({ ...f, cooldown: parseInt(e.target.value) || 300 }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
              min={60}
            />
          </div>

          {/* Channels */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Channel Notifikasi</label>
            <div className="flex gap-3">
              {CHANNEL_OPTIONS.map((ch) => {
                const Icon = ch.icon;
                const active = form.channels.includes(ch.value);
                return (
                  <button
                    key={ch.value}
                    type="button"
                    onClick={() => toggleChannel(ch.value)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm transition ${
                      active
                        ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-400'
                        : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    <Icon size={14} />
                    {ch.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Telegram Config */}
          {form.channels.includes('telegram') && (
            <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Konfigurasi Telegram</p>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Bot Token</label>
                <input
                  type="password"
                  value={form.telegramBotToken}
                  onChange={(e) => setForm((f) => ({ ...f, telegramBotToken: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="123456:ABC-DEF1234..."
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Chat ID</label>
                <input
                  type="text"
                  value={form.telegramChatId}
                  onChange={(e) => setForm((f) => ({ ...f, telegramChatId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="-1001234567890"
                />
              </div>
            </div>
          )}

          {/* Email Config */}
          {form.channels.includes('email') && (
            <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Konfigurasi Email</p>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Email Penerima (pisahkan dengan koma)</label>
                <input
                  type="text"
                  value={form.emailRecipients}
                  onChange={(e) => setForm((f) => ({ ...f, emailRecipients: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="admin@example.com, operator@example.com"
                />
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || !form.name}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-2"
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────

export default function MonitoringAlertsPage() {
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<MonitoringAlert | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/monitoring/alerts');
      setAlerts(data?.data || data || []);
    } catch {
      // silently degrade
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleSave = async (form: AlertFormData) => {
    setSaving(true);
    try {
      if (editingAlert) {
        await apiClient.patch(`/monitoring/alerts/${editingAlert.id}`, form);
      } else {
        await apiClient.post('/monitoring/alerts', form);
      }
      setModalOpen(false);
      setEditingAlert(null);
      await fetchAlerts();
    } catch {
      // handled by apiClient
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus alert ini?')) return;
    await apiClient.delete(`/monitoring/alerts/${id}`);
    await fetchAlerts();
  };

  const handleToggle = async (id: string) => {
    await apiClient.post(`/monitoring/alerts/${id}/toggle`);
    await fetchAlerts();
  };

  const openEdit = (alert: MonitoringAlert) => {
    setEditingAlert(alert);
    setModalOpen(true);
  };

  const openCreate = () => {
    setEditingAlert(null);
    setModalOpen(true);
  };

  const formData: AlertFormData = editingAlert
    ? {
        name: editingAlert.name,
        metric: editingAlert.metric,
        operator: editingAlert.operator,
        threshold: editingAlert.threshold,
        duration: editingAlert.duration,
        channels: editingAlert.channels,
        telegramBotToken: editingAlert.telegramBotToken || '',
        telegramChatId: editingAlert.telegramChatId || '',
        emailRecipients: editingAlert.emailRecipients || '',
        cooldown: editingAlert.cooldown,
        isActive: editingAlert.isActive,
      }
    : EMPTY_FORM;

  return (
    <PermissionGuard module="monitoring" action="view">
      <PageContainer>
      <Breadcrumbs />
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Bell size={24} className="text-blue-600" />
              Alert Thresholds
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Konfigurasi threshold alert dan channel notifikasi (Telegram/Email)
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={16} />
            Tambah Alert
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 animate-pulse">
                <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center">
            <Bell size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Belum ada alert threshold</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Klik "Tambah Alert" untuk membuat aturan monitoring pertama
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`bg-white dark:bg-gray-800 rounded-xl border p-5 transition ${
                  alert.isActive
                    ? 'border-gray-200 dark:border-gray-700'
                    : 'border-gray-200 dark:border-gray-700 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{alert.name}</h3>
                      <MetricBadge metric={alert.metric} />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Threshold: <span className="font-mono font-medium text-gray-700 dark:text-gray-300">
                        {alert.operator === 'gt' ? '>' : alert.operator === 'gte' ? '>=' : alert.operator === 'lt' ? '<' : '<='}
                      </span>{' '}
                      <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{alert.threshold}</span>
                      {alert.duration > 0 && (
                        <> · Durasi: <span className="font-mono">{alert.duration}s</span></>
                      )}
                      · Cooldown: <span className="font-mono">{alert.cooldown}s</span>
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {alert.channels.map((ch) => (
                        <ChannelBadge key={ch} channel={ch} />
                      ))}
                      {alert.lastTriggeredAt && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">
                          Terakhir triggered: {new Date(alert.lastTriggeredAt).toLocaleString('id-ID')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4 shrink-0">
                    <button
                      onClick={() => handleToggle(alert.id)}
                      className={`p-2 rounded-lg transition ${
                        alert.isActive
                          ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-950'
                          : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title={alert.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                    >
                      {alert.isActive ? <Power size={16} /> : <PowerOff size={16} />}
                    </button>
                    <button
                      onClick={() => openEdit(alert)}
                      className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition"
                      title="Edit"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(alert.id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition"
                      title="Hapus"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Card */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-xl border border-blue-200 dark:border-blue-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
            <Activity size={16} className="text-blue-600" />
            Cara Kerja Alert Threshold
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <p className="font-medium text-gray-700 dark:text-gray-300">📊 Evaluasi Otomatis</p>
              <ul className="list-disc list-inside text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <li>Setiap 5 detik, sistem mengecek semua alert aktif</li>
                <li>Membandingkan nilai metric vs threshold</li>
                <li>Jika kondisi terpenuhi & cooldown sudah lewat → kirim notifikasi</li>
              </ul>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-gray-700 dark:text-gray-300">🔔 Channel Notifikasi</p>
              <ul className="list-disc list-inside text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <li><strong>Telegram</strong>: Kirim pesan ke chat/group via Bot API</li>
                <li><strong>Email</strong>: Kirim via Resend/SMTP ke daftar email</li>
                <li>Bisa kombinasikan kedua channel sekaligus</li>
              </ul>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <p className="font-medium text-gray-700 dark:text-gray-300">🛡️ Best Practices</p>
              <ul className="list-disc list-inside text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <li>Gunakan cooldown minimal 5 menit (300 detik) untuk menghindari spam notifikasi</li>
                <li>Set durasi &gt; 0 untuk transient issues (misal: DB reconnect dalam 5 detik)</li>
                <li>Nonaktifkan alert sementara saat maintenance untuk menghindari false alarm</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <AlertFormModal
        open={modalOpen}
        data={formData}
        onSave={handleSave}
        onClose={() => { setModalOpen(false); setEditingAlert(null); }}
      />
    </PageContainer>
    </PermissionGuard>
  );
}
