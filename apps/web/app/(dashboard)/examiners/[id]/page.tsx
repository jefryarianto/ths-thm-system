'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import {

  ArrowLeft, User, Mail, Calendar, BookOpen,
  RefreshCw, AlertCircle, ClipboardList, Star, Clock,
} from 'lucide-react';
import { formatDate } from '@/components/members/constants';

interface ExaminerDetail {
  id: string;
  userId: string;
  peran: string;
  catatan: string | null;
  user: {
    id: string;
    namaLengkap: string;
    email: string;
    role: string;
  };
  assignments: Array<{
    id: string;
    kegiatanId: string;
    peran: string;
    catatan: string | null;
    kegiatan?: { id: string; nama: string; tipe: string };
  }>;
  createdAt: string;
  updatedAt: string;
}

export default function ExaminerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [examiner, setExaminer] = useState<ExaminerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'assignments'>('info');

  const fetchExaminer = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: res } = await apiClient.get(`/examiners/${id}`);
      setExaminer(res.data);
      setError(null);
    } catch {
      setError('Gagal memuat data penguji');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchExaminer(); }, [fetchExaminer]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-36" />
        <div className="bg-white dark:bg-gray-800 rounded-2xl border p-6 space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
        </div>
      </div>
    );
  }

  if (error || !examiner) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center max-w-md">
          <AlertCircle size={40} className="mx-auto text-red-400 mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Penguji Tidak Ditemukan</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <button onClick={() => router.push('/examiners')} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            ← Kembali ke Penguji
          </button>
        </div>
      </div>
    );
  }

  return (
      <PermissionGuard module="examiners" action="view">
        <Breadcrumbs suffix={{ href: '#', label: examiner?.user?.namaLengkap || 'Detail' }} />
        <div className="max-w-2xl mx-auto space-y-6">
              {/* Back */}
              <Link href="/examiners" className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition group">
                <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                Kembali ke Penguji
              </Link>
        
              {/* Header */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="h-16 bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600 relative">
                  <button onClick={fetchExaminer} className="absolute top-3 right-3 p-2 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm transition text-white" title="Refresh">
                    <RefreshCw size={14} />
                  </button>
                </div>
                <div className="px-6 pb-6 -mt-6">
                  <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                    <div className="w-14 h-14 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-gray-800">
                      <User size={22} className="text-purple-600" />
                    </div>
                    <div className="flex-1 mt-2 sm:mt-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{examiner.user.namaLengkap}</h1>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                          {examiner.peran.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{examiner.user.email}</p>
                    </div>
                  </div>
                </div>
              </div>
        
              {/* Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950">
                      <User size={18} className="text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Role</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white capitalize">{examiner.user.role.replace('_', ' ')}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
                      <ClipboardList size={18} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Penugasan</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{examiner.assignments.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950">
                      <Calendar size={18} className="text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Terdaftar</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{formatDate(examiner.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
        
              {/* Tabs */}
              <div className="border-b border-gray-200 dark:border-gray-700">
                <div className="flex gap-6">
                  <button
                    onClick={() => setActiveTab('info')}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                      activeTab === 'info'
                        ? 'border-purple-600 text-purple-600 dark:text-purple-400 dark:border-purple-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <User size={16} /> Informasi
                  </button>
                  <button
                    onClick={() => setActiveTab('assignments')}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                      activeTab === 'assignments'
                        ? 'border-purple-600 text-purple-600 dark:text-purple-400 dark:border-purple-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <ClipboardList size={16} /> Penugasan ({examiner.assignments.length})
                  </button>
                </div>
              </div>
        
              {/* Tab: Info */}
              {activeTab === 'info' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <User size={18} className="text-purple-500" />
                    Detail Penguji
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                      <User size={16} className="text-gray-400 dark:text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Nama Lengkap</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{examiner.user.namaLengkap}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                      <Mail size={16} className="text-gray-400 dark:text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Email</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{examiner.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                      <Star size={16} className="text-gray-400 dark:text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Peran</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{examiner.peran.replace('_', ' ')}</p>
                      </div>
                    </div>
                    {examiner.catatan && (
                      <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                        <BookOpen size={16} className="text-gray-400 dark:text-gray-500 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Catatan</p>
                          <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{examiner.catatan}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
        
              {/* Tab: Assignments */}
              {activeTab === 'assignments' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Daftar Penugasan</h3>
                  </div>
                  {examiner.assignments.length > 0 ? (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {examiner.assignments.map((a) => (
                        <div key={a.id} className="px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {a.kegiatan?.nama || 'Kegiatan'}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Peran: <span className="font-medium capitalize">{a.peran.replace('_', ' ')}</span>
                                {a.kegiatan?.tipe && <> · Tipe: {a.kegiatan.tipe}</>}
                              </p>
                            </div>
                            <Link
                              href={`/activities/${a.kegiatanId}`}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              Lihat
                            </Link>
                          </div>
                          {a.catatan && (
                            <p className="text-xs text-gray-400 mt-2">{a.catatan}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <ClipboardList size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada penugasan</p>
                    </div>
                  )}
                </div>
              )}
            </div>
      </PermissionGuard>
    );
}
