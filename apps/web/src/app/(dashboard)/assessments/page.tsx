'use client';

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import {
  Plus, ClipboardList,
  Eye, CheckCircle, XCircle,
} from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
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
  const [data, setData] = useState<AssessmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 10 };
      if (search) params.search = search;
      const { data: res } = await apiClient.get('/assessments/aspects', { params });
      setData(res.data || []);
      setMeta(res.meta || { total: 0, totalPages: 0 });
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= meta.totalPages) setPage(p);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Aspek & Item Penilaian" onRefresh={fetchData}>
        <button className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors">
          <Plus size={14} /> Tambah
        </button>
      </PageHeader>

      <SummaryBar icon={ClipboardList} label="Total Aspek" total={meta.total} />

      <SearchBar
        search={search}
        onSearchChange={v => { setSearch(v); setPage(1); }}
        onReset={() => { setSearch(''); setPage(1); }}
        placeholder="Cari aspek penilaian..."
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
          message: search ? 'Tidak ada aspek yang cocok dengan filter' : 'Belum ada aspek penilaian',
          action: search ? { label: 'Reset filter', onClick: () => { setSearch(''); setPage(1); } } : undefined,
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
    </div>
  );
}
