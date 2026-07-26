'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { usePaginatedList, buildEmptyMessage } from '@/lib/hooks/use-api';
import { useFilters } from '@/lib/hooks/use-filters';
import { Plus, Trash2, UserCheck, Users, AlertTriangle, ExternalLink } from 'lucide-react';
import ExportMenu from '@/components/ui/export-menu';
import { CanCreate, CanDelete, CanExport } from '@/components/auth/can';
import { PermissionGuard } from '@/components/auth/permission-guard';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import DataTable from '@/components/ui/data-table';
import SummaryBar from '@/components/ui/summary-bar';
import SearchBar from '@/components/ui/search-bar';
import Modal from '@/components/ui/modal';


interface Examiner {
  id: string;
  email: string;
  namaLengkap: string;
  createdAt: string;
}

export default function ExaminersPage() {
  const router = useRouter();
  const { page, setPage, search, setSearch, hasActiveFilters, getApiParams, resetFilters } =
    useFilters();

  const {
    data: examiners,
    meta,
    loading,
    refetch,
  } = usePaginatedList<Examiner>(
    useCallback(() => {
      const params = getApiParams({ limit: 10 });
      if (search) params.search = search;
      return apiClient.get('/examiners', { params }).then((r) => r.data);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, search]),
    [page, search],
  );

  const [deleteTarget, setDeleteTarget] = useState<Examiner | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await apiClient.delete(`/examiners/${deleteTarget.id}`);
      setDeleteTarget(null);
      refetch();
    } catch {
      alert('Gagal menghapus penguji');
    }
    setDeleteLoading(false);
  };

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= meta.totalPages) setPage(p);
  };

  return (
    <PermissionGuard module="examiners" action="view">
    <PageContainer>
      <PageHeader title="Manajemen Penguji" onRefresh={refetch}>
        <CanExport module="examiners">
          <ExportMenu
            data={examiners.map((ex: Examiner) => ({
              Nama: ex.namaLengkap,
              Email: ex.email,
              Terdaftar: new Date(ex.createdAt).toLocaleDateString('id-ID'),
            }))}
            headers={['Nama', 'Email', 'Terdaftar']}
            filename="penguji-export"
          />
        </CanExport>
        <CanCreate module="examiners">
          <button
            onClick={() => router.push('/examiners/new')}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} /> Tambah Penguji
          </button>
        </CanCreate>
      </PageHeader>

      <SummaryBar icon={Users} label="Total Penguji" total={meta.total} />

      <SearchBar
        search={search}
        onSearchChange={setSearch}
        onReset={resetFilters}
        placeholder="Cari penguji..."
      />

      <DataTable
        columns={[
          { label: 'Nama' },
          { label: 'Email', hidden: 'hidden sm:table-cell' },
          { label: 'Terdaftar', hidden: 'hidden md:table-cell' },
          { label: 'Aksi', align: 'right' },
        ]}
        data={examiners}
        loading={loading}
        empty={{
          icon: Users,
          ...buildEmptyMessage('penguji', hasActiveFilters, resetFilters),
        }}
        page={page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={handlePageChange}
        colSpan={4}
        renderRow={(ex) => (
          <tr
            key={ex.id}
            className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
          >
            <td className="px-4 py-3">
              <button
                onClick={() => router.push(`/examiners/${ex.id}`)}
                className="inline-flex items-center gap-2 font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                <UserCheck size={16} className="text-green-500" />
                {ex.namaLengkap}
              </button>
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
              {ex.email}
            </td>
            <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden md:table-cell">
              {new Date(ex.createdAt).toLocaleDateString('id-ID')}
            </td>
            <td className="px-4 py-3 text-right">
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => router.push(`/examiners/${ex.id}`)}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-md transition-colors"
                  title="Lihat Detail"
                >
                  <ExternalLink size={14} />
                </button>
                <CanDelete module="examiners">
                  <button
                    onClick={() => setDeleteTarget(ex)}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-md transition-colors"
                    title="Hapus penguji"
                  >
                    <Trash2 size={15} />
                  </button>
                </CanDelete>
              </div>
            </td>
          </tr>
        )}
      />

      {/* Delete Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Hapus Penguji"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
            <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">
              Hapus penguji <strong>{deleteTarget?.namaLengkap}</strong>?
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Batal
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition"
            >
              {deleteLoading ? 'Menghapus...' : 'Ya, Hapus'}
            </button>
          </div>
        </div>
      </Modal>
    </PageContainer>
    </PermissionGuard>
  );
}
