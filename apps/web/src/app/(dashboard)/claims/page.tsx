'use client';

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import {
  Plus, FileText,
  CheckCircle, XCircle, Clock,
} from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import DataTable from '@/components/ui/data-table';
import SummaryBar from '@/components/ui/summary-bar';
import SearchBar from '@/components/ui/search-bar';
import FilterSelect from '@/components/ui/filter-select';

interface ClaimRow {
  id: string;
  tipe: string;
  status: string;
  anggota?: { namaLengkap: string };
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400',
  diproses: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',
  disetujui: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400',
  ditolak: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400',
};

const STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'diproses', label: 'Diproses' },
  { value: 'disetujui', label: 'Disetujui' },
  { value: 'ditolak', label: 'Ditolak' },
];

export default function ClaimsPage() {
  const [data, setData] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 10 };
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      const { data: res } = await apiClient.get('/claims', { params });
      setData(res.data || []);
      setMeta(res.meta || { total: 0, totalPages: 0 });
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async (id: string, action: string) => {
    setActionLoading(`${id}-${action}`);
    try {
      const body = action === 'reject' ? { reason: 'Ditolak oleh admin' } : {};
      await apiClient.post(`/claims/${id}/${action}`, body);
      await fetchData();
    } catch {
      alert(`Gagal ${action} klaim`);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= meta.totalPages) setPage(p);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Manajemen Klaim" onRefresh={fetchData}>
        <button className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors">
          <Plus size={14} /> Tambah
        </button>
      </PageHeader>

      <SummaryBar icon={FileText} label="Total Klaim" total={meta.total} />

      <SearchBar
        search={search}
        onSearchChange={v => { setSearch(v); setPage(1); }}
        onReset={() => { setSearch(''); setFilterStatus(''); setPage(1); }}
        placeholder="Cari klaim..."
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
          { label: 'Tipe' },
          { label: 'Anggota', hidden: 'hidden sm:table-cell' },
          { label: 'Status' },
          { label: 'Tanggal', hidden: 'hidden md:table-cell' },
          { label: 'Aksi', align: 'right' },
        ]}
        data={data}
        loading={loading}
        empty={{
          icon: FileText,
          message: search || filterStatus ? 'Tidak ada klaim yang cocok dengan filter' : 'Belum ada klaim',
          action: (search || filterStatus) ? { label: 'Reset filter', onClick: () => { setSearch(''); setFilterStatus(''); setPage(1); } } : undefined,
        }}
        page={page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={handlePageChange}
        colSpan={5}
        renderRow={(row: ClaimRow) => (
          <tr key={row.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
            <td className="px-4 py-3">
              <span className="font-medium text-gray-900 dark:text-white capitalize">{row.tipe}</span>
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
              {row.anggota?.namaLengkap || '-'}
            </td>
            <td className="px-4 py-3">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[row.status] || ''}`}>
                {row.status}
              </span>
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">
              {new Date(row.createdAt).toLocaleDateString('id-ID')}
            </td>
            <td className="px-4 py-3 text-right">
              <div className="flex items-center justify-end gap-1">
                {row.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleAction(row.id, 'process')}
                      disabled={actionLoading === `${row.id}-process`}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-md transition-colors"
                      title="Proses"
                    >
                      <Clock size={15} />
                    </button>
                    <button
                      onClick={() => handleAction(row.id, 'approve')}
                      disabled={actionLoading === `${row.id}-approve`}
                      className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-950 rounded-md transition-colors"
                      title="Setujui"
                    >
                      <CheckCircle size={15} />
                    </button>
                    <button
                      onClick={() => handleAction(row.id, 'reject')}
                      disabled={actionLoading === `${row.id}-reject`}
                      className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-md transition-colors"
                      title="Tolak"
                    >
                      <XCircle size={15} />
                    </button>
                  </>
                )}
                {row.status === 'diproses' && (
                  <>
                    <button
                      onClick={() => handleAction(row.id, 'approve')}
                      disabled={actionLoading === `${row.id}-approve`}
                      className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-950 rounded-md transition-colors"
                      title="Setujui"
                    >
                      <CheckCircle size={15} />
                    </button>
                    <button
                      onClick={() => handleAction(row.id, 'reject')}
                      disabled={actionLoading === `${row.id}-reject`}
                      className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-md transition-colors"
                      title="Tolak"
                    >
                      <XCircle size={15} />
                    </button>
                  </>
                )}
              </div>
            </td>
          </tr>
        )}
      />
    </div>
  );
}
