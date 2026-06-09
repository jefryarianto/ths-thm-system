'use client';

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { Bell, Settings, ArrowLeft, Save, Check, Mail, Smartphone } from 'lucide-react';
import Link from 'next/link';

interface NotifType {
  key: string;
  label: string;
  description: string;
}

interface ChannelPrefs {
  inApp: boolean;
  email: boolean;
}

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<Record<string, ChannelPrefs>>({});
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

  const handleToggleInApp = (key: string) => {
    setPrefs((prev) => ({
      ...prev,
      [key]: { ...prev[key], inApp: !prev[key]?.inApp },
    }));
    setSaved(false);
  };

  const handleToggleEmail = (key: string) => {
    setPrefs((prev) => ({
      ...prev,
      [key]: { ...prev[key], email: !prev[key]?.email },
    }));
    setSaved(false);
  };

  const handleEnableAll = () => {
    const allOn: Record<string, ChannelPrefs> = {};
    for (const t of types) allOn[t.key] = { inApp: true, email: true };
    setPrefs(allOn);
    setSaved(false);
  };

  const handleDisableAll = () => {
    const allOff: Record<string, ChannelPrefs> = {};
    for (const t of types) allOff[t.key] = { inApp: false, email: false };
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

  const inAppCount = Object.values(prefs).filter((p) => p?.inApp).length;
  const emailCount = Object.values(prefs).filter((p) => p?.email).length;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/notifications"
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-600 dark:text-gray-400"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings size={24} />
            Pengaturan Notifikasi
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Pilih channel notifikasi per jenis — {inAppCount}/{types.length} in-app, {emailCount}/{types.length} email
          </p>
        </div>
      </div>

      {/* Status bar */}
      {!loading && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950 flex-shrink-0">
              <Bell size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                <Smartphone size={14} className="inline mr-1" />
                {inAppCount}/{types.length} in-app &bull; <Mail size={14} className="inline mr-1" />
                {emailCount}/{types.length} email
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {inAppCount === 0 && emailCount === 0
                  ? 'Semua notifikasi nonaktif'
                  : inAppCount === types.length && emailCount === types.length
                  ? 'Semua notifikasi aktif (kedua channel)'
                  : 'Beberapa channel dinonaktifkan'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={handleDisableAll}
              disabled={inAppCount === 0 && emailCount === 0}
              className="flex-1 sm:flex-none px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
            >
              Matikan Semua
            </button>
            <button
              onClick={handleEnableAll}
              disabled={inAppCount === types.length && emailCount === types.length}
              className="flex-1 sm:flex-none px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 transition disabled:opacity-50"
            >
              Aktifkan Semua
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-2" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-64" />
                </div>
                <div className="h-6 w-11 bg-gray-200 dark:bg-gray-700 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preference toggles */}
      {!loading && (
        <div className="space-y-3">
          {types.map((type) => {
            const p = prefs[type.key] || { inApp: true, email: true };
            return (
              <div
                key={type.key}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 hover:shadow-md transition"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{type.label}</h3>
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">({type.key})</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{type.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 pl-1">
                  {/* In-App toggle */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <button
                      onClick={() => handleToggleInApp(type.key)}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                        p.inApp ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                      role="switch"
                      aria-checked={p.inApp}
                      aria-label={`Toggle in-app ${type.label}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          p.inApp ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                      <Smartphone size={12} />
                      In-App
                    </span>
                  </label>

                  {/* Email toggle */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <button
                      onClick={() => handleToggleEmail(type.key)}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 ${
                        p.email ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                      role="switch"
                      aria-checked={p.email}
                      aria-label={`Toggle email ${type.label}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          p.email ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                      <Mail size={12} />
                      Email
                    </span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Save button */}
      {!loading && (
        <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-3 pt-2">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 font-medium">
              <Check size={16} /> Tersimpan
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      )}
    </div>
  );
}
