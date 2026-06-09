'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import {
  Plus, RefreshCw, Calendar,
  Eye, MapPin, User, BookOpen,
} from 'lucide-react';
import Pagination from '@/components/ui/pagination';
import TableSkeleton from '@/components/ui/table-skeleton';
import EmptyState from '@/components/ui/empty-state';
import SummaryBar from '@/components/ui/summary-bar';
import SearchBar from '@/components/ui/search-bar';

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
  const [data, setData] = useState<TrainingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [filterMateri, setFilterMateri] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 10 };
      if (search) params.search = search;
      if (filterMateri) params.jenisMateri = filterMateri;
      const { data: res } = await apiClient.get('/trainings', { params });
      setData(res.data || []);
      setMeta(res.meta || { total: 0, totalPages: 0 });
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterMateri]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= meta.totalPages) setPage(p);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Manajemen Latihan</h1>
        <div className="flex gap-2">
          <button
            onClick={() => fetchData()}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors">
            <Plus size={14} /> Jadwal Latihan
          </button>
        </div>
      </div>

      <SummaryBar icon={Calendar} label="Total Latihan" total={meta.total} />

      <SearchBar
        search={search}
        onSearchChange={v => { setSearch(v); setPage(1); }}
        onReset={() => { setSearch(''); setFilterMateri(''); setPage(1); }}
        placeholder="Cari latihan..."
      >
        <select
          value={filterMateri}
          onChange={e => { setFilterMateri(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {MATERI_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </SearchBar>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">Tanggal</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap hidden sm:table-cell">Ranting</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">Materi</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap hidden md:table-cell">Lokasi</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap hidden lg:table-cell">Pelatih</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={5} columns={6} />
              ) : data.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  message={search || filterMateri ? 'Tidak ada latihan yang cocok dengan filter' : 'Belum ada jadwal latihan'}
                  action={(search || filterMateri) ? { label: 'Reset filter', onClick: () => { setSearch(''); setFilterMateri(''); setPage(1); } } : undefined}
                  colSpan={6}
                />
              ) : (
                data.map((row) => (
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
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} totalPages={meta.totalPages} total={meta.total} onPageChange={handlePageChange} />
      </div>
    </div>
  );
}
