'use client';

import { useState } from 'react';
import {
  Mail, Send, FileText, History, BarChart3, Ban,
  CheckCircle2, XCircle, Server, AlertCircle, Info,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import { useApi } from '@/lib/hooks/use-api';
import { type MailStatus } from './shared';
import EmailTestTab from './email-test-tab';
import EmailTemplatesTab from './email-templates-tab';
import EmailLogsTab from './email-logs-tab';
import EmailReportTab from './email-report-tab';
import EmailSuppressedTab from './email-suppressed-tab';
import { EMAIL_TEMPLATES } from './shared';

type TabId = 'test' | 'templates' | 'logs' | 'report' | 'suppressed';

const TABS: Array<{ id: TabId; label: string; icon: typeof Send }> = [
  { id: 'test', label: 'Test Email', icon: Send },
  { id: 'templates', label: `Template (${EMAIL_TEMPLATES.reduce((c, g) => c + g.items.length, 0)})`, icon: FileText },
  { id: 'logs', label: 'Riwayat', icon: History },
  { id: 'report', label: 'Laporan', icon: BarChart3 },
  { id: 'suppressed', label: 'Supresi', icon: Ban },
];

export default function EmailSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('test');

  const { data: mailStatus, loading: statusLoading } = useApi<MailStatus>(
    () => apiClient.get('/mail/status').then(r => r.data.data),
    [],
    true,
  );

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
              {mailStatus.mode === 'development'
                ? <Server size={18} className="text-yellow-600 dark:text-yellow-400" />
                : <CheckCircle2 size={18} className="text-blue-600 dark:text-blue-400" />}
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
              {mailStatus.resend.configured ? <CheckCircle2 size={18} className="text-green-600 dark:text-green-400" /> : <XCircle size={18} className="text-gray-400" />}
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Resend API</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{mailStatus.resend.configured ? 'Terkonfigurasi' : 'Belum dikonfigurasi'}</p>
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
              {mailStatus.smtp.configured ? <CheckCircle2 size={18} className="text-green-600 dark:text-green-400" /> : <XCircle size={18} className="text-gray-400" />}
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">SMTP Fallback</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{mailStatus.smtp.configured ? 'Terkonfigurasi' : 'Belum dikonfigurasi'}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {mailStatus.smtp.configured ? `${mailStatus.smtp.host}:${mailStatus.smtp.port}` : 'Butuh SMTP_USER + SMTP_PASS'}
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
      <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <tab.icon size={16} className="inline mr-1.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'test' && <EmailTestTab />}
      {activeTab === 'templates' && <EmailTemplatesTab />}
      {activeTab === 'logs' && <EmailLogsTab />}
      {activeTab === 'report' && <EmailReportTab />}
      {activeTab === 'suppressed' && <EmailSuppressedTab />}

      {/* Footer Info — shown for non-logs tabs */}
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
