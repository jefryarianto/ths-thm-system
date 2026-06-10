'use client';

import { useState } from 'react';
import { Send, RefreshCw, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import apiClient from '@/lib/api-client';

export default function EmailTestTab() {
  const [testEmail, setTestEmail] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

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

  return (
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
  );
}
