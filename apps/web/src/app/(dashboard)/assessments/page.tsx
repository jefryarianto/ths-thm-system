'use client';

import { useState } from 'react';
import apiClient from '@/lib/api-client';
import { usePaginatedList, buildEmptyMessage } from '@/lib/hooks/use-api';
import { useDebounce } from '@/lib/hooks/use-debounce';
import {
  Plus, ClipboardList,
  Eye, CheckCircle, XCircle,
} from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import DataTable from '@/components/ui/data-table';
import SummaryBar from '@/components/ui/summary-bar';
import SearchBar from '@/components/ui/search-bar';

interface AssessmentRow {
  id: string;
  kodeAspek: string;
  namaAspek: string;
  bobot: number;
  isActive: boolean;
}

export default function AssessmentsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const { data, meta, loading, refetch } = usePaginatedList<AssessmentRow>(
    () => {
      const params: Record<string, unknown> = { page, limit: 10 };
      if (debouncedSearch) params.search = debouncedSearch;
      return apiClient.get('/assessments/aspects', { params }).then(r => r.data);
    },
    [page, debouncedSearch]
  );

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= meta.totalPages) setPage(p);
  };

  return (
    <PageContainer>
      <PageHeader title="Aspek & Item Penilaian" onRefresh={refetch}>
        <button className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors">
          <Plus size={14} /> Tambah
        </button>
      </PageHeader>

      <SummaryBar icon={ClipboardList} label="Total Aspek" total={meta.total} />

      <SearchBar
        search={search}
        onSearchChange={setSearch}
        onReset={() => { setSearch(''); setPage(1); }}
        placeholder="Cari aspek penilaian..."
        debounceMs={300}
        onDebouncedSearch={() => setPage(1)}
      />

      <DataTable
        columns={[
          { label: 'Kode' },
          { label: 'Aspek' },
          { label: 'Bobot', align: 'right', hidden: 'hidden sm:table-cell' },
          { label: 'Aktif', align: 'center' },
          { label: 'Aksi', align: 'right', hidden: 'hidden md:table-cell' },
        ]}
        data={data}
        loading={loading}
        empty={{
          icon: ClipboardList,
          ...buildEmptyMessage('aspek penilaian', !!search, () => { setSearch(''); setPage(1); }),
        }}
        page={page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={handlePageChange}
        colSpan={5}
        renderRow={(row: AssessmentRow) => (
          <tr key={row.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
            <td className="px-4 py-3">
              <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{row.kodeAspek}</span>
            </td>
            <td className="px-4 py-3">
              <span className="font-medium text-gray-900 dark:text-white">{row.namaAspek}</span>
            </td>
            <td className="px-4 py-3 text-right hidden sm:table-cell">
              <span className="text-gray-600 dark:text-gray-400">{Number(row.bobot) * 100}%</span>
            </td>
            <td className="px-4 py-3 text-center">
              {row.isActive
                ? <CheckCircle size={16} className="text-green-500 mx-auto" />
                : <XCircle size={16} className="text-red-500 mx-auto" />
              }
            </td>
            <td className="px-4 py-3 text-right hidden md:table-cell">
              <button
                className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                title="Detail"
              >
                <Eye size={15} />
              </button>
            </td>
          </tr>
        )}
      />
    </PageContainer>
  );
}
