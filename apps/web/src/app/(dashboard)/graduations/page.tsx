'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import {
  Plus, GraduationCap,
  Eye, MapPin, Users, Calendar,
} from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import DataTable from '@/components/ui/data-table';
import SummaryBar from '@/components/ui/summary-bar';
import SearchBar from '@/components/ui/search-bar';
import FilterSelect from '@/components/ui/filter-select';

interface GraduationRow {
  id: string;
  nama: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  lokasi: string;
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

export default function GraduationsPage() {
  const router = useRouter();
  const [data, setData] = useState<GraduationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 10 };
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      const { data: res } = await apiClient.get('/graduations', { params });
      setData(res.data || []);
      setMeta(res.meta || { total: 0, totalPages: 0 });
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= meta.totalPages) setPage(p);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Manajemen Pendadaran" onRefresh={fetchData}>
        <button className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors">
          <Plus size={14} /> Jadwal Pendadaran
        </button>
      </PageHeader>

      <SummaryBar icon={GraduationCap} label="Total Pendadaran" total={meta.total} />

      <SearchBar
        search={search}
        onSearchChange={v => { setSearch(v); setPage(1); }}
        onReset={() => { setSearch(''); setFilterStatus(''); setPage(1); }}
        placeholder="Cari pendadaran..."
      >
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
          { label: 'Tanggal', hidden: 'hidden sm:table-cell' },
          { label: 'Lokasi', hidden: 'hidden md:table-cell' },
          { label: 'Peserta', align: 'center', hidden: 'hidden lg:table-cell' },
          { label: 'Status' },
          { label: 'Aksi', align: 'right' },
        ]}
        data={data}
        loading={loading}
        empty={{
          icon: GraduationCap,
          message: search || filterStatus ? 'Tidak ada pendadaran yang cocok dengan filter' : 'Belum ada jadwal pendadaran',
          action: (search || filterStatus) ? { label: 'Reset filter', onClick: () => { setSearch(''); setFilterStatus(''); setPage(1); } } : undefined,
        }}
        page={page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={handlePageChange}
        colSpan={6}
        renderRow={(row: GraduationRow) => (
          <tr key={row.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
            <td className="px-4 py-3">
              <span className="font-medium text-gray-900 dark:text-white">{row.nama}</span>
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell whitespace-nowrap">
              <div className="flex items-center gap-1">
                <Calendar size={12} className="text-gray-400" />
                {new Date(row.tanggalMulai).toLocaleDateString('id-ID')}
                {row.tanggalSelesai && ` - ${new Date(row.tanggalSelesai).toLocaleDateString('id-ID')}`}
              </div>
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">
              <div className="flex items-center gap-1">
                <MapPin size={12} className="text-gray-400" />
                {row.lokasi || '-'}
              </div>
            </td>
            <td className="px-4 py-3 text-center hidden lg:table-cell">
              <div className="flex items-center justify-center gap-1">
                <Users size={12} className="text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">{row.pesertaCount ?? '-'}</span>
              </div>
            </td>
            <td className="px-4 py-3">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[row.status] || ''}`}>
                {row.status}
              </span>
            </td>
            <td className="px-4 py-3 text-right">
              <button
                onClick={() => router.push(`/graduations/${row.id}`)}
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
