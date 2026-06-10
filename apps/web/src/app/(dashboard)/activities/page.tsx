'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { usePaginatedList } from '@/lib/hooks/use-api';
import { useDebounce } from '@/lib/hooks/use-debounce';
import {
  Plus, Calendar,
  Eye, MapPin,
} from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import DataTable from '@/components/ui/data-table';
import SummaryBar from '@/components/ui/summary-bar';
import SearchBar from '@/components/ui/search-bar';
import FilterSelect from '@/components/ui/filter-select';

interface ActivityRow {
  id: string;
  nama: string;
  tipe: string;
  tanggalMulai: string;
  tanggalSelesai?: string;
  lokasi?: string;
  status: string;
  pesertaCount?: number;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  published: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',
  closed: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400',
  cancelled: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400',
};

const STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TIPE_OPTIONS = [
  { value: '', label: 'Semua Tipe' },
  { value: 'latihan', label: 'Latihan' },
  { value: 'pendadaran', label: 'Pendadaran' },
  { value: 'sosialisasi', label: 'Sosialisasi' },
  { value: 'rapat', label: 'Rapat' },
  { value: 'lainnya', label: 'Lainnya' },
];

export default function ActivitiesPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTipe, setFilterTipe] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const { data, meta, loading, refetch } = usePaginatedList<ActivityRow>(
    () => {
      const params: Record<string, unknown> = { page, limit: 10 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filterStatus) params.status = filterStatus;
      if (filterTipe) params.tipe = filterTipe;
      return apiClient.get('/activities', { params }).then(r => r.data);
    },
    [page, debouncedSearch, filterStatus, filterTipe]
  );

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= meta.totalPages) setPage(p);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Manajemen Kegiatan">
        <button className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors">
          <Plus size={14} /> Tambah
        </button>
      </PageHeader>

      <SummaryBar icon={Calendar} label="Total Kegiatan" total={meta.total} onRefresh={refetch} />

      <SearchBar
        search={search}
        onSearchChange={setSearch}
        onReset={() => { setSearch(''); setFilterStatus(''); setFilterTipe(''); setPage(1); }}
        placeholder="Cari kegiatan..."
        debounceMs={300}
        onDebouncedSearch={() => setPage(1)}
      >
        <FilterSelect
          value={filterTipe}
          onChange={v => { setFilterTipe(v); setPage(1); }}
          options={TIPE_OPTIONS}
          placeholder="Semua Tipe"
        />
        <FilterSelect
          value={filterStatus}
          onChange={v => { setFilterStatus(v); setPage(1); }}
          options={STATUS_OPTIONS}
          placeholder="Semua Status"
        />
      </SearchBar>

      <DataTable
        columns={[
          { label: 'Nama Kegiatan' },
          { label: 'Tipe', hidden: 'hidden sm:table-cell' },
          { label: 'Tanggal', hidden: 'hidden md:table-cell' },
          { label: 'Lokasi', hidden: 'hidden lg:table-cell' },
          { label: 'Peserta', align: 'center', hidden: 'hidden xl:table-cell' },
          { label: 'Status' },
          { label: 'Aksi', align: 'right' },
        ]}
        data={data}
        loading={loading}
        empty={{
          icon: Calendar,
          message: search || filterStatus || filterTipe ? 'Tidak ada kegiatan yang cocok dengan filter' : 'Belum ada kegiatan',
          action: (search || filterStatus || filterTipe) ? { label: 'Reset filter', onClick: () => { setSearch(''); setFilterStatus(''); setFilterTipe(''); setPage(1); } } : undefined,
        }}
        page={page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={handlePageChange}
        colSpan={7}
        renderRow={(row: ActivityRow) => (
          <tr key={row.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
            <td className="px-4 py-3">
              <span className="font-medium text-gray-900 dark:text-white">{row.nama}</span>
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
              <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400">
                {row.tipe}
              </span>
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell whitespace-nowrap">
              {new Date(row.tanggalMulai).toLocaleDateString('id-ID')}
              {row.tanggalSelesai && ` - ${new Date(row.tanggalSelesai).toLocaleDateString('id-ID')}`}
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden lg:table-cell">
              <div className="flex items-center gap-1">
                <MapPin size={12} className="text-gray-400" />
                {row.lokasi || '-'}
              </div>
            </td>
            <td className="px-4 py-3 text-center hidden xl:table-cell">
              <span className="text-gray-600 dark:text-gray-400">{row.pesertaCount ?? '-'}</span>
            </td>
            <td className="px-4 py-3">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[row.status] || ''}`}>
                {row.status}
              </span>
            </td>
            <td className="px-4 py-3 text-right">
              <button
                onClick={() => router.push(`/activities/${row.id}`)}
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
