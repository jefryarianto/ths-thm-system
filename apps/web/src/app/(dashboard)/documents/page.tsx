'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { usePaginatedList, buildEmptyMessage } from '@/lib/hooks/use-api';
import { useDebounce } from '@/lib/hooks/use-debounce';
import {
  Plus, FileText,
  Download, Eye, Trash2,
} from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import DataTable from '@/components/ui/data-table';
import SummaryBar from '@/components/ui/summary-bar';
import SearchBar from '@/components/ui/search-bar';
import FilterSelect from '@/components/ui/filter-select';

interface DocumentRow {
  id: string;
  nomorDokumen: string;
  tipe: string;
  anggota?: { namaLengkap: string };
  status: string;
  createdAt: string;
}

const TIPE_OPTIONS = [
  { value: '', label: 'Semua Tipe' },
  { value: 'sertifikat', label: 'Sertifikat' },
  { value: 'piagam', label: 'Piagam' },
  { value: 'kartu_anggota', label: 'Kartu Anggota' },
  { value: 'surat_keterangan', label: 'Surat Keterangan' },
  { value: 'lainnya', label: 'Lainnya' },
];

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  published: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400',
  archived: 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400',
};

export default function DocumentsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterTipe, setFilterTipe] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const { data, meta, loading, refetch } = usePaginatedList<DocumentRow>(
    () => {
      const params: Record<string, unknown> = { page, limit: 10 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filterTipe) params.tipe = filterTipe;
      return apiClient.get('/documents', { params }).then(r => r.data);
    },
    [page, debouncedSearch, filterTipe]
  );

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= meta.totalPages) setPage(p);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus dokumen ini?')) return;
    try {
      await apiClient.delete(`/documents/${id}`);
      await refetch();
    } catch {
      alert('Gagal menghapus dokumen');
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Generate Dokumen" onRefresh={refetch}>
        <button className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 transition-colors">
          <Download size={14} /> Generate
        </button>
        <button className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors">
          <Plus size={14} /> Tambah
        </button>
      </PageHeader>

      <SummaryBar icon={FileText} label="Total Dokumen" total={meta.total} />

      <SearchBar
        search={search}
        onSearchChange={setSearch}
        onReset={() => { setSearch(''); setFilterTipe(''); setPage(1); }}
        placeholder="Cari dokumen (no. dokumen, tipe)..."
        debounceMs={300}
        onDebouncedSearch={() => setPage(1)}
      >
        <FilterSelect
          value={filterTipe}
          onChange={v => { setFilterTipe(v); setPage(1); }}
          options={TIPE_OPTIONS}
          placeholder="Semua Tipe"
        />
      </SearchBar>

      <DataTable
        columns={[
          { label: 'No. Dokumen' },
          { label: 'Tipe', hidden: 'hidden sm:table-cell' },
          { label: 'Anggota', hidden: 'hidden md:table-cell' },
          { label: 'Status' },
          { label: 'Tanggal', hidden: 'hidden lg:table-cell' },
          { label: 'Aksi', align: 'right' },
        ]}
        data={data}
        loading={loading}
        empty={{
          icon: FileText,
          ...buildEmptyMessage('dokumen', !!(search || filterTipe), () => { setSearch(''); setFilterTipe(''); setPage(1); }),
        }}
        page={page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={handlePageChange}
        colSpan={6}
        renderRow={(row: DocumentRow) => (
          <tr key={row.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
            <td className="px-4 py-3">
              <span className="font-mono text-sm text-gray-900 dark:text-white">{row.nomorDokumen}</span>
            </td>
            <td className="px-4 py-3 hidden sm:table-cell">
              <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 capitalize">
                {row.tipe}
              </span>
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">
              {row.anggota?.namaLengkap || '-'}
            </td>
            <td className="px-4 py-3">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[row.status] || ''}`}>
                {row.status}
              </span>
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden lg:table-cell">
              {new Date(row.createdAt).toLocaleDateString('id-ID')}
            </td>
            <td className="px-4 py-3 text-right">
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => router.push(`/documents/${row.id}`)}
                  className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  title="Detail"
                >
                  <Eye size={15} />
                </button>
                <button
                  onClick={() => handleDelete(row.id)}
                  className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-md transition-colors"
                  title="Hapus"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </td>
          </tr>
        )}
      />
    </div>
  );
}
