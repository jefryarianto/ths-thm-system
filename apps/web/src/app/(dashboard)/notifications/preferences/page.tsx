'use client';

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { Bell, Settings, ArrowLeft, Save, Check } from 'lucide-react';
import Link from 'next/link';

interface NotifType {
  key: string;
  label: string;
  description: string;
}

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [types, setTypes] = useState<NotifType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await apiClient.get('/notifications/preferences');
      setPrefs(res.data);
      setTypes(res.types);
    } catch {
      setError('Gagal memuat pengaturan notifikasi');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPreferences(); }, [fetchPreferences]);

  const handleToggle = (key: string) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleEnableAll = () => {
    const allOn: Record<string, boolean> = {};
    for (const t of types) allOn[t.key] = true;
    setPrefs(allOn);
    setSaved(false);
  };

  const handleDisableAll = () => {
    const allOff: Record<string, boolean> = {};
    for (const t of types) allOff[t.key] = false;
    setPrefs(allOff);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiClient.patch('/notifications/preferences', prefs);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Gagal menyimpan pengaturan');
    }
    setSaving(false);
  };

  const enabledCount = Object.values(prefs).filter(Boolean).length;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/notifications"
          className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-600"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings size={24} />
            Pengaturan Notifikasi
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Pilih jenis notifikasi yang ingin Anda terima
          </p>
        </div>
      </div>

      {/* Status bar */}
      {!loading && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50">
              <Bell size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {enabledCount} dari {types.length} aktif
              </p>
              <p className="text-xs text-gray-500">
                {enabledCount === types.length
                  ? 'Semua notifikasi aktif'
                  : enabledCount === 0
                  ? 'Semua notifikasi dinonaktifkan'
                  : 'Beberapa notifikasi dinonaktifkan'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDisableAll}
              disabled={enabledCount === 0}
              className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            >
              Matikan Semua
            </button>
            <button
              onClick={handleEnableAll}
              disabled={enabledCount === types.length}
              className="px-3 py-1.5 text-xs text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition disabled:opacity-50"
            >
              Aktifkan Semua
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-40 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-64" />
                </div>
                <div className="h-6 w-11 bg-gray-200 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preference toggles */}
      {!loading && (
        <div className="space-y-3">
          {types.map((type) => (
            <div
              key={type.key}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">{type.label}</h3>
                    <span className="text-xs text-gray-400 font-mono">({type.key})</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{type.description}</p>
                </div>
                <button
                  onClick={() => handleToggle(type.key)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    prefs[type.key] ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                  role="switch"
                  aria-checked={!!prefs[type.key]}
                  aria-label={`Toggle ${type.label}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      prefs[type.key] ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Save button */}
      {!loading && (
        <div className="flex items-center justify-end gap-3 pt-2">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium animate-pulse">
              <Check size={16} /> Tersimpan
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      )}
    </div>
  );
}
