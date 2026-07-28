'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import {

  ArrowLeft, Download, Calendar, User,
  RefreshCw, AlertCircle, Trash2, Tag, FileText,
} from 'lucide-react';
import ConfirmModal from '@/components/ui/confirm-modal';
import { useToast } from '@/components/ui/toast';

interface OrgDocumentDetail {
  id: string;
  judul: string;
  deskripsi: string | null;
  fileUrl: string | null;
  kategoriId: string | null;
  kategori?: { id: string; nama: string } | null;
  uploader?: { id: string; namaLengkap: string } | null;
  createdAt: string;
  updatedAt: string;
}

function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-36" />
      <div className="bg-white dark:bg-gray-800 rounded-2xl border p-6">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-4" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48" />
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function OrgDocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const toast = useToast();

  const [doc, setDoc] = useState<OrgDocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchDoc = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: res } = await apiClient.get(`/org-documents/${id}`);
      setDoc(res.data);
      setError(null);
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } })?.response?.status === 404) setError('Dokumen tidak ditemukan');
      else setError('Gagal memuat data dokumen');
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchDoc(); }, [fetchDoc]);

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/org-documents/${id}`);
      toast('success', 'Dokumen berhasil dihapus');
      router.push('/org-documents');
    } catch {
      toast('error', 'Gagal menghapus dokumen');
    }
  };

  const handleDownload = () => {
    if (doc?.fileUrl) {
      window.open(doc.fileUrl, '_blank');
    } else {
      toast('error', 'File dokumen tidak tersedia untuk didownload');
    }
  };

  if (loading) return <DetailSkeleton />;

  if (error || !doc) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center max-w-md">
          <AlertCircle size={40} className="mx-auto text-red-400 mb-3" />
          <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
            {error === 'Dokumen tidak ditemukan' ? 'Tidak Ditemukan' : 'Gagal Memuat'}
          </h2>
          <p className="text-sm text-gray-500 mb-4">{error || 'Dokumen tidak ditemukan'}</p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/org-documents" className="px-4 py-2 border rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              ← Kembali
            </Link>
            <button onClick={fetchDoc} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition">
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
      <PermissionGuard module="org-documents" action="view">
        <Breadcrumbs suffix={{ href: '#', label: doc?.judul || 'Detail' }} />
        <div className="space-y-6">
              {/* Back */}
              <Link href="/org-documents" className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition group">
                <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                Kembali ke Dokumen Organisasi
              </Link>
        
              {/* Header */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="h-16 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 relative">
                  <button onClick={fetchDoc} className="absolute top-3 right-3 p-2 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm transition text-white" title="Refresh">
                    <RefreshCw size={14} />
                  </button>
                </div>
                <div className="px-6 pb-6 -mt-6">
                  <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-gray-800">
                      <FileText size={20} className="text-indigo-600" />
                    </div>
                    <div className="flex-1 mt-2 sm:mt-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{doc.judul}</h1>
                        {doc.kategori && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400">
                            {doc.kategori.nama}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {doc.deskripsi || 'Tidak ada deskripsi'}
                      </p>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-4 sm:mt-0">
                      <button
                        onClick={handleDownload}
                        className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition"
                      >
                        <Download size={14} /> Download
                      </button>
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="flex items-center gap-1.5 px-3 py-2 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg text-xs font-medium hover:bg-red-50 dark:hover:bg-red-950 transition"
                      >
                        <Trash2 size={14} /> Hapus
                      </button>
                    </div>
                  </div>
                </div>
              </div>
        
              {/* Info Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950">
                    <Tag size={18} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Kategori</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{doc.kategori?.nama || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950">
                    <Calendar size={18} className="text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Dibuat</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(doc.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950">
                    <User size={18} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Diupload oleh</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{doc.uploader?.namaLengkap || '-'}</p>
                  </div>
                </div>
              </div>
        
              {/* Description */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                  <FileText size={18} className="text-indigo-500" /> Deskripsi
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {doc.deskripsi || 'Tidak ada deskripsi'}
                </p>
              </div>
        
              {/* Delete Modal */}
              <ConfirmModal
                open={showDeleteModal}
                title="Hapus Dokumen"
                message={`Apakah Anda yakin ingin menghapus "${doc.judul}"?`}
                confirmLabel="Ya, Hapus"
                cancelLabel="Batal"
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteModal(false)}
              />
            </div>
      </PermissionGuard>
    );
}
