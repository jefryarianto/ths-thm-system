'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { Settings, Save, AlertCircle, RefreshCw } from 'lucide-react';

export default function GamificationSettingsPage() {
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/gamification/admin/config');
      setConfig(res.data.data || {});
    } catch (err) {
      console.error('Failed to fetch gamification config:', err);
      setError('Gagal memuat konfigurasi');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await apiClient.put('/gamification/admin/config', config);
      setSuccess('Konfigurasi berhasil disimpan');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to save config:', err);
      setError('Gagal menyimpan konfigurasi');
    } finally {
      setSaving(false);
    }
  };

  const detectType = (value: unknown): { type: 'string' | 'number' | 'boolean' | 'json'; parsed: unknown } => {
    if (value === null || value === undefined) return { type: 'string', parsed: '' };
    const str = String(value);
    // Try number
    if (/^-?\d+(\.\d+)?$/.test(str) && !isNaN(Number(str))) return { type: 'number', parsed: Number(str) };
    // Try boolean
    if (str === 'true') return { type: 'boolean', parsed: true };
    if (str === 'false') return { type: 'boolean', parsed: false };
    // Try JSON object/array
    if ((str.startsWith('{') && str.endsWith('}')) || (str.startsWith('[') && str.endsWith(']'))) {
      try { return { type: 'json', parsed: JSON.parse(str) }; } catch { /* fall through */ }
    }
    return { type: 'string', parsed: str };
  };

  const handleChange = (key: string, rawValue: string, detectedType: 'string' | 'number' | 'boolean' | 'json') => {
    let parsed: unknown = rawValue;
    if (detectedType === 'number') parsed = rawValue === '' ? '' : Number(rawValue);
    else if (detectedType === 'boolean') parsed = rawValue === 'true';
    else if (detectedType === 'json') { try { parsed = JSON.parse(rawValue); } catch { parsed = rawValue; } }
    setConfig((prev) => ({ ...prev, [key]: parsed }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <p className="text-sm text-gray-500">Memuat konfigurasi...</p>
        </div>
      </div>
    );
  }

  const configKeys = Object.keys(config);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-50">
            <Settings size={22} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pengaturan Gamifikasi</h1>
            <p className="text-sm text-gray-500 mt-0.5">Konfigurasi poin, level, dan badge</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchConfig}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition shadow-sm"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <Save size={14} />
            )}
            Simpan
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
          <Save size={16} />
          {success}
        </div>
      )}

      {/* Config Form */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="mb-4">
          <p className="text-sm text-gray-500">
            Kelola pengaturan gamifikasi. Nilai-nilai ini akan digunakan oleh sistem untuk menghitung poin, level, dan badge.
          </p>
        </div>

        {configKeys.length > 0 ? (
          <div className="space-y-4">
            {configKeys.map((key) => {
              const detected = detectType(config[key]);
              const strValue = String(config[key] ?? '');
              return (
                <div key={key} className="flex items-start gap-4 p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition bg-gray-50/30">
                  <div className="flex-1 min-w-0">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 capitalize">
                      {key.replace(/_/g, ' ')}
                    </label>
                    {detected.type === 'boolean' ? (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleChange(key, config[key] === true ? 'false' : 'true', 'boolean')}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            config[key] === true ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              config[key] === true ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <span className={`text-sm font-medium ${config[key] === true ? 'text-green-600' : 'text-gray-400'}`}>
                          {config[key] === true ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>
                    ) : detected.type === 'json' ? (
                      <textarea
                        value={strValue}
                        onChange={(e) => handleChange(key, e.target.value, 'json')}
                        rows={4}
                        className="w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={`JSON value untuk ${key}`}
                      />
                    ) : (
                      <input
                        type={detected.type === 'number' ? 'number' : 'text'}
                        value={strValue}
                        onChange={(e) => handleChange(key, e.target.value, detected.type)}
                        step={strValue.includes('.') ? '0.01' : '1'}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={`Nilai untuk ${key}`}
                      />
                    )}
                  </div>
                  <div className="flex-shrink-0 mt-6">
                    <span className="inline-block px-2 py-1 text-[10px] font-mono text-gray-400 bg-gray-100 rounded">
                      {detected.type}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Settings size={40} className="mb-3 opacity-50" />
            <p className="text-sm font-medium">Belum ada pengaturan</p>
            <p className="text-xs mt-1">Pengaturan gamifikasi akan muncul di sini setelah ditambahkan melalui API atau database.</p>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-5">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Tentang Pengaturan Gamifikasi</h3>
        <ul className="text-xs text-blue-700 space-y-1.5 list-disc list-inside">
          <li>Setiap perubahan akan langsung diterapkan pada sistem gamifikasi</li>
          <li>Gunakan format yang sesuai dengan tipe data (angka, teks, atau JSON)</li>
          <li>Pengaturan disimpan di database dan dapat diubah kapan saja</li>
          <li>Beberapa pengaturan mungkin memerlukan refresh halaman untuk efek penuh</li>
        </ul>
      </div>
    </div>
  );
}
