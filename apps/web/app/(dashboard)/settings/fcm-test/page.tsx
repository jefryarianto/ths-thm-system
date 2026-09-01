'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { Send, Smartphone, CheckCircle, XCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import { useToast } from '@/components/ui/toast';

interface FcmToken {
  id: string;
  token: string;
  platform: string;
  isActive: boolean;
  createdAt: string;
  user: {
    id: string;
    namaLengkap: string;
    email: string | null;
  };
}

interface FcmTokensResponse {
  total: number;
  active: number;
  inactive: number;
  tokens: FcmToken[];
}

interface TestPushResult {
  totalTokens: number;
  successCount: number;
  failureCount: number;
  errors: string[];
}

export default function FcmTestPage() {
  const toast = useToast();
  const [tokens, setTokens] = useState<FcmTokensResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<TestPushResult | null>(null);
  const [form, setForm] = useState({
    title: '🔔 Test Notification',
    body: 'Ini adalah notifikasi test dari admin THS-THM',
    userId: '',
  });

  const fetchTokens = async () => {
    setLoading(true);
    try {
      const { data: res } = await apiClient.get('/notifications/fcm-tokens');
      setTokens(res.data || res);
    } catch {
      // ignore
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const handleSendTest = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast('error', 'Title dan body wajib diisi');
      return;
    }

    setSending(true);
    setLastResult(null);
    try {
      const { data: res } = await apiClient.post('/notifications/test-push', {
        title: form.title,
        body: form.body,
        userId: form.userId || undefined,
      });
      const result = res.data || res;
      setLastResult(result);

      if (result.failureCount === 0 && result.successCount > 0) {
        toast('success', `✅ Push notification terkirim ke ${result.successCount} device!`);
      } else if (result.successCount > 0) {
        toast('info', `⚠️ ${result.successCount} berhasil, ${result.failureCount} gagal`);
      } else {
        toast('error', `❌ Gagal mengirim ke semua ${result.totalTokens} device`);
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast('error', err?.response?.data?.message || 'Gagal mengirim test push');
    }
    setSending(false);
  };

  return (
    <PageContainer>
      <PageHeader title="FCM Push Notification Test" onRefresh={fetchTokens}>
        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
      </PageHeader>

      {/* FCM Status Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/30">
            <Wifi size={20} className="text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">FCM Status</h3>
            <p className="text-xs text-gray-500">Firebase Cloud Messaging via Expo Push Token</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{tokens?.total || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Total Devices</p>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{tokens?.active || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Active</p>
          </div>
          <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{tokens?.inactive || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Inactive</p>
          </div>
        </div>
      </div>

      {/* Test Push Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Send size={18} className="text-blue-500" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Kirim Test Push</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Judul notifikasi"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Body
            </label>
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Isi notifikasi"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Target (opsional)
            </label>
            <select
              value={form.userId}
              onChange={(e) => setForm({ ...form, userId: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Semua device ({tokens?.active || 0} active)</option>
              {tokens?.tokens
                .filter((t) => t.isActive)
                .map((t) => (
                  <option key={t.id} value={t.user.id}>
                    {t.user.namaLengkap} ({t.platform})
                  </option>
                ))}
            </select>
          </div>

          <button
            onClick={handleSendTest}
            disabled={sending || !tokens?.active}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition"
          >
            {sending ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            {sending ? 'Mengirim...' : 'Kirim Test Push'}
          </button>
        </div>

        {/* Result */}
        {lastResult && (
          <div className={`mt-4 p-4 rounded-lg border ${
            lastResult.failureCount === 0 && lastResult.successCount > 0
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : lastResult.successCount > 0
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {lastResult.failureCount === 0 && lastResult.successCount > 0 ? (
                <CheckCircle size={18} className="text-green-600" />
              ) : (
                <XCircle size={18} className="text-red-600" />
              )}
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Hasil Pengiriman
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Total:</span>{' '}
                <span className="font-semibold">{lastResult.totalTokens}</span>
              </div>
              <div>
                <span className="text-gray-500">Sukses:</span>{' '}
                <span className="font-semibold text-green-600">{lastResult.successCount}</span>
              </div>
              <div>
                <span className="text-gray-500">Gagal:</span>{' '}
                <span className="font-semibold text-red-600">{lastResult.failureCount}</span>
              </div>
            </div>
            {lastResult.errors.length > 0 && (
              <div className="mt-2 text-xs text-red-600 dark:text-red-400 space-y-1">
                {lastResult.errors.slice(0, 5).map((err, i) => (
                  <div key={i}>• {err}</div>
                ))}
                {lastResult.errors.length > 5 && (
                  <div>• ...{lastResult.errors.length - 5} more errors</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Device Tokens List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Smartphone size={18} className="text-purple-500" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Registered Devices</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw size={20} className="animate-spin text-gray-400" />
          </div>
        ) : tokens?.tokens.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <WifiOff size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">Belum ada device yang terdaftar</p>
            <p className="text-xs mt-1">Daftarkan device melalui mobile app</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Platform</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Token</th>
                  <th className="text-center py-2 px-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Registered</th>
                </tr>
              </thead>
              <tbody>
                {tokens?.tokens.map((t) => (
                  <tr key={t.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{t.user.namaLengkap}</div>
                      {t.user.email && (
                        <div className="text-xs text-gray-500">{t.user.email}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                        {t.platform}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <code className="text-xs text-gray-500 font-mono">{t.token}</code>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {t.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                          <CheckCircle size={10} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                          <XCircle size={10} /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right text-xs text-gray-500">
                      {new Date(t.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
