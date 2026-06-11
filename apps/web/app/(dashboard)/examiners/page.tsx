'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { usePaginatedList, buildEmptyMessage } from '@/lib/hooks/use-api';
import {
  Plus, MoreVertical, UserCheck, Users,
} from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import DataTable from '@/components/ui/data-table';
import SummaryBar from '@/components/ui/summary-bar';
import SearchBar from '@/components/ui/search-bar';

interface Examiner {
  id: string;
  email: string;
  namaLengkap: string;
  createdAt: string;
}

export default function ExaminersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: examiners, meta, loading, refetch } = usePaginatedList<Examiner>(
    useCallback(
      () => {
        const params: Record<string, unknown> = { page, limit: 10 };
        if (search) params.search = search;
        return apiClient.get('/examiners', { params }).then(r => r.data);
      },
      [page, search]
    ),
    [page, search]
  );

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= meta.totalPages) setPage(p);
  };

  return (
    <PageContainer>
      <PageHeader title="Manajemen Penguji" onRefresh={refetch}>
        <button className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors">
          <Plus size={14} /> Tambah Penguji
        </button>
      </PageHeader>

      <SummaryBar icon={Users} label="Total Penguji" total={meta.total} />

      <SearchBar
        search={search}
        onSearchChange={v => { setSearch(v); setPage(1); }}
        onReset={() => { setSearch(''); setPage(1); }}
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
          ...buildEmptyMessage('penguji', !!search, () => { setSearch(''); setPage(1); }),
        }}
        page={page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={handlePageChange}
        colSpan={4}
        renderRow={(ex) => (
          <tr key={ex.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
            <td className="px-4 py-3">
              <span className="inline-flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                <UserCheck size={16} className="text-green-500" />
                {ex.namaLengkap}
              </span>
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">{ex.email}</td>
            <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden md:table-cell">
              {new Date(ex.createdAt).toLocaleDateString('id-ID')}
            </td>
            <td className="px-4 py-3 text-right">
              <button className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
                <MoreVertical size={16} />
              </button>
            </td>
          </tr>
        )}
      />
    </PageContainer>
  );
}
