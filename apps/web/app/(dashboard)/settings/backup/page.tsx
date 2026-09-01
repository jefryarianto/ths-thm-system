'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import {
  Database,
  Download,
  Trash2,
  RefreshCw,
  Plus,
  Clock,
  HardDrive,
  AlertTriangle,
  CheckCircle,
  Shield,
  TrendingUp,
} from 'lucide-react';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-modal';

interface BackupFile {
  name: string;
  sizeBytes: number;
  createdAt: string;
}

interface DiskInfo {
  free: string;
  total: string;
  used: string;
  usagePercent: number;
}

function formatSize(bytes: number): string {
  if (bytes > 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes > 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatAge(dateStr: string): string {
  const ageMs = Date.now() - new Date(dateStr).getTime();
  const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
  const ageDays = Math.floor(ageHours / 24);
  if (ageDays > 0) return `${ageDays}d ${ageHours % 24}h ago`;
  if (ageHours > 0) return `${ageHours}h ago`;
  return `${Math.floor(ageMs / (1000 * 60))}m ago`;
}

export default function BackupPage() {
  const toast = useToast();
  const { confirm, confirmModal } = useConfirm();
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [diskInfo, setDiskInfo] = useState<DiskInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const [backupsRes, healthRes] = await Promise.all([
        apiClient.get('/admin/db-backup'),
        apiClient.get('/health'),
      ]);
      setBackups(backupsRes.data?.data || backupsRes.data || []);
      setDiskInfo(healthRes.data?.data?.disk || null);
    } catch {
      // ignore
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleTriggerBackup = async () => {
    setTriggering(true);
    try {
      await apiClient.post('/admin/db-backup');
      toast('success', 'Backup berhasil dibuat');
      fetchBackups();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast('error', err?.response?.data?.message || 'Gagal membuat backup');
    }
    setTriggering(false);
  };

  const handleDownload = async (fileName: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${window.location.origin}/api/admin/db-backup/download/${fileName}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast('success', `${fileName} berhasil diunduh`);
    } catch {
      toast('error', 'Gagal mengunduh backup');
    }
  };

  const handleDelete = async (backup: BackupFile) => {
    const confirmed = await confirm({
      title: 'Hapus Backup',
      message: `Hapus backup "${backup.name}"? Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: 'Hapus',
      cancelLabel: 'Batal',
    });

    if (!confirmed) return;

    setDeletingId(backup.name);
    try {
      await apiClient.delete(`/admin/db-backup/${backup.name}?confirm=true`);
      toast('success', 'Backup berhasil dihapus');
      fetchBackups();
    } catch {
      toast('error', 'Gagal menghapus backup');
    }
    setDeletingId(null);
  };

  const totalSize = backups.reduce((sum, b) => sum + b.sizeBytes, 0);
  const latestBackup = backups[0];

  return (
    <PageContainer>
      <PageHeader title="Database Backup" onRefresh={fetchBackups}>
        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/30">
              <Database size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{backups.length}</p>
              <p className="text-xs text-gray-500">Total Backups</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-900/30">
              <HardDrive size={20} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatSize(totalSize)}</p>
              <p className="text-xs text-gray-500">Total Size</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${
              latestBackup
                ? new Date(latestBackup.createdAt).getTime() > Date.now() - 48 * 60 * 60 * 1000
                  ? 'bg-green-50 dark:bg-green-900/30'
                  : 'bg-yellow-50 dark:bg-yellow-900/30'
                : 'bg-red-50 dark:bg-red-900/30'
            }`}>
              {latestBackup ? (
                <Clock size={20} className={
                  new Date(latestBackup.createdAt).getTime() > Date.now() - 48 * 60 * 60 * 1000
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-yellow-600 dark:text-yellow-400'
                } />
              ) : (
                <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
              )}
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {latestBackup ? formatAge(latestBackup.createdAt) : 'None'}
              </p>
              <p className="text-xs text-gray-500">Last Backup</p>
            </div>
          </div>
        </div>
      </div>

      {/* Disk Usage Alert */}
      {diskInfo && diskInfo.usagePercent >= 80 && (
        <div className={`rounded-xl border p-5 mb-6 ${
          diskInfo.usagePercent >= 90
            ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
            : 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'
        }`}>
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className={
              diskInfo.usagePercent >= 90 ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
            } />
            <div>
              <p className={`text-sm font-semibold ${
                diskInfo.usagePercent >= 90 ? 'text-red-700 dark:text-red-400' : 'text-yellow-700 dark:text-yellow-400'
              }`}>
                {diskInfo.usagePercent >= 90 ? '🔴 Disk Space Critical' : '🟡 Disk Space Warning'}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                Disk usage at {diskInfo.usagePercent}% ({diskInfo.used} used / {diskInfo.total} total — {diskInfo.free} free)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Disk Usage Bar */}
      {diskInfo && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <HardDrive size={16} className="text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Disk Usage</h3>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-4 mb-2">
            <div
              className={`h-4 rounded-full transition-all duration-500 ${
                diskInfo.usagePercent >= 90 ? 'bg-red-500' :
                diskInfo.usagePercent >= 80 ? 'bg-yellow-500' :
                diskInfo.usagePercent >= 60 ? 'bg-blue-500' : 'bg-green-500'
              }`}
              style={{ width: `${diskInfo.usagePercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{diskInfo.used} used</span>
            <span>{diskInfo.free} free</span>
            <span>{diskInfo.usagePercent}% of {diskInfo.total}</span>
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={18} className="text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Backup Otomatis</p>
              <p className="text-xs text-gray-500">Cron: Daily 03:00 · Retensi: 7 hari terakhir</p>
            </div>
          </div>
          <button
            onClick={handleTriggerBackup}
            disabled={triggering}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
          >
            {triggering ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            {triggering ? 'Membuat Backup...' : 'Backup Sekarang'}
          </button>
        </div>
      </div>

      {/* Backup List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database size={18} className="text-gray-500" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Daftar Backup</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw size={20} className="animate-spin text-gray-400" />
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Database size={40} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">Belum ada backup</p>
            <p className="text-xs mt-1">Klik &quot;Backup Sekarang&quot; untuk membuat backup pertama</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">File</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Size</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Age</th>
                  <th className="text-center py-2 px-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((backup, idx) => {
                  const ageMs = Date.now() - new Date(backup.createdAt).getTime();
                  const isFresh = ageMs < 48 * 60 * 60 * 1000;
                  return (
                    <tr
                      key={backup.name}
                      className={`border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 ${
                        idx === 0 ? 'bg-green-50/50 dark:bg-green-900/10' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          {idx === 0 && <CheckCircle size={14} className="text-green-500 shrink-0" />}
                          <code className="text-xs font-mono text-gray-700 dark:text-gray-300">{backup.name}</code>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs text-gray-600 dark:text-gray-400">
                        {formatSize(backup.sizeBytes)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs text-gray-600 dark:text-gray-400">
                        {new Date(backup.createdAt).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs text-gray-600 dark:text-gray-400">
                        {formatAge(backup.createdAt)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          isFresh
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                        }`}>
                          {isFresh ? '✅ Fresh' : '⚠️ Old'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleDownload(backup.name)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                            title="Download"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(backup)}
                            disabled={deletingId === backup.name}
                            className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingId === backup.name ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {confirmModal}
    </PageContainer>
  );
}
