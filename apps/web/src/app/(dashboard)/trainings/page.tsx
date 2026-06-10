'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { usePaginatedList } from '@/lib/hooks/use-api';
import { useDebounce } from '@/lib/hooks/use-debounce';
import {
  Plus, Calendar,
  Eye, MapPin, User, BookOpen,
} from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import DataTable from '@/components/ui/data-table';
import SummaryBar from '@/components/ui/summary-bar';
import SearchBar from '@/components/ui/search-bar';
import FilterSelect from '@/components/ui/filter-select';

interface TrainingRow {
  id: string;
  hariTanggal: string;
  ranting?: { nama: string };
  jenisMateri?: string;
  lokasi?: string;
  pelatih?: { namaLengkap: string };
  materi?: string;
}

const MATERI_OPTIONS = [
  { value: '', label: 'Semua Materi' },
  { value: 'teknik_dasar', label: 'Teknik Dasar' },
  { value: 'kata', label: 'Kata' },
  { value: 'kumite', label: 'Kumite' },
  { value: 'fisik', label: 'Fisik' },
  { value: 'teori', label: 'Teori' },
  { value: 'lainnya', label: 'Lainnya' },
];

export default function TrainingsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterMateri, setFilterMateri] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const { data, meta, loading, refetch } = usePaginatedList<TrainingRow>(
    () => {
      const params: Record<string, unknown> = { page, limit: 10 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filterMateri) params.jenisMateri = filterMateri;
      return apiClient.get('/trainings', { params }).then(r => r.data);
    },
    [page, debouncedSearch, filterMateri]
  );

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= meta.totalPages) setPage(p);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Manajemen Latihan" onRefresh={refetch}>
        <button className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors">
          <Plus size={14} /> Jadwal Latihan
        </button>
      </PageHeader>

      <SummaryBar icon={Calendar} label="Total Latihan" total={meta.total} />

      <SearchBar
        search={search}
        onSearchChange={setSearch}
        onReset={() => { setSearch(''); setFilterMateri(''); setPage(1); }}
        placeholder="Cari latihan..."
        debounceMs={300}
        onDebouncedSearch={() => setPage(1)}
      >
        <FilterSelect
          value={filterMateri}
          onChange={v => { setFilterMateri(v); setPage(1); }}
          options={MATERI_OPTIONS}
          placeholder="Semua Materi"
        />
      </SearchBar>

      <DataTable
        columns={[
          { label: 'Tanggal' },
          { label: 'Ranting', hidden: 'hidden sm:table-cell' },
          { label: 'Materi' },
          { label: 'Lokasi', hidden: 'hidden md:table-cell' },
          { label: 'Pelatih', hidden: 'hidden lg:table-cell' },
          { label: 'Aksi', align: 'right' },
        ]}
        data={data}
        loading={loading}
        empty={{
          icon: Calendar,
          message: search || filterMateri ? 'Tidak ada latihan yang cocok dengan filter' : 'Belum ada jadwal latihan',
          action: (search || filterMateri) ? { label: 'Reset filter', onClick: () => { setSearch(''); setFilterMateri(''); setPage(1); } } : undefined,
        }}
        page={page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={handlePageChange}
        colSpan={6}
        renderRow={(row: TrainingRow) => (
          <tr key={row.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
            <td className="px-4 py-3 whitespace-nowrap">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-gray-400" />
                <span className="font-medium text-gray-900 dark:text-white">
                  {new Date(row.hariTanggal).toLocaleDateString('id-ID')}
                </span>
              </div>
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
              <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400">
                {row.ranting?.nama || '-'}
              </span>
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1.5">
                <BookOpen size={14} className="text-gray-400" />
                <span className="text-gray-900 dark:text-white">{row.jenisMateri || row.materi || '-'}</span>
              </div>
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">
              <div className="flex items-center gap-1">
                <MapPin size={12} className="text-gray-400" />
                {row.lokasi || '-'}
              </div>
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden lg:table-cell">
              <div className="flex items-center gap-1.5">
                <User size={12} className="text-gray-400" />
                {row.pelatih?.namaLengkap || '-'}
              </div>
            </td>
            <td className="px-4 py-3 text-right">
              <button
                onClick={() => router.push(`/trainings/${row.id}`)}
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
