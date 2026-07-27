'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { Plus, Calendar, Edit3, Trash2, CheckCircle, XCircle, Eye, RefreshCw } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import SummaryBar from '@/components/ui/summary-bar';
import { useToast } from '@/components/ui/toast';


interface PeriodRow {
  id: string;
  nama: string;
  tglMulai: string;
  tglSelesai: string;
  isActive: boolean;
}

export default function PeriodsPage() {
  const toast = useToast();
  const [data, setData] = useState<PeriodRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await apiClient.get('/settings/periods');
      setData(res.data || []);
    } catch {
      // silent
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleActive = async (row: PeriodRow) => {
    try {
      await apiClient.patch(`/settings/periods/${row.id}`, { isActive: !row.isActive });
      fetchData();
    } catch {
      toast('error', 'Gagal mengubah status periode');
    }
  };

  const handleDelete = async (row: PeriodRow) => {
    if (!confirm(`Hapus periode "${row.nama}"?`)) return;
    try {
      await apiClient.delete(`/settings/periods/${row.id}`);
      fetchData();
    } catch {
      toast('error', 'Gagal menghapus periode');
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
      <PermissionGuard module="settings" action="view">
        <PageContainer>
              <PageHeader title="Periode Iuran" onRefresh={fetchData}>
                <Link
                  href="/settings"
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Kembali ke Settings
                </Link>
                <Link
                  href="/settings/periods/new"
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
                >
                  <Plus size={14} /> Tambah Periode
                </Link>
              </PageHeader>
        
              <SummaryBar icon={Calendar} label="Total Periode" total={data.length} />
        
              {/* Periods List */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                {loading ? (
                  <div className="p-12 text-center text-sm text-gray-400">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
                    Memuat data...
                  </div>
                ) : data.length === 0 ? (
                  <div className="p-12 text-center">
                    <Calendar size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada periode</p>
                    <Link
                      href="/settings/periods/new"
                      className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
                    >
                      <Plus size={14} /> Tambah Periode Pertama
                    </Link>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nama Periode</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mulai</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Selesai</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                      {data.map((row) => (
                        <tr
                          key={row.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <span className="font-medium text-gray-900 dark:text-white">{row.nama}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {formatDate(row.tglMulai)}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {formatDate(row.tglSelesai)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {row.isActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400">
                                <CheckCircle size={12} /> Aktif
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                                <XCircle size={12} /> Nonaktif
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right hidden md:table-cell">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => toggleActive(row)}
                                className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-md transition-colors"
                                title={row.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                              >
                                <Eye size={15} />
                              </button>
                              <Link
                                href={`/settings/periods/${row.id}/edit`}
                                className="p-1.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-md transition-colors inline-flex"
                                title="Edit"
                              >
                                <Edit3 size={14} />
                              </Link>
                              <button
                                onClick={() => handleDelete(row)}
                                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-md transition-colors"
                                title="Hapus"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </PageContainer>
      </PermissionGuard>
    );
}
