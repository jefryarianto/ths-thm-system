'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { usePaginatedList } from '@/lib/hooks/use-api';
import { useDebounce } from '@/lib/hooks/use-debounce';
import {
  Plus, CheckCircle, XCircle, Users,
  Download, Eye, FileText,
} from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import DataTable from '@/components/ui/data-table';
import SummaryBar from '@/components/ui/summary-bar';
import SearchBar from '@/components/ui/search-bar';
import FilterSelect from '@/components/ui/filter-select';

interface RegistrationRow {
  id: string;
  namaLengkap: string;
  jenisKelamin: string;
  noHp?: string;
  email?: string;
  sumberInfo?: string;
  status: string;
  createdAt?: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400',
  verified: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',
  approved: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400',
  rejected: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  verified: 'Terverifikasi',
  approved: 'Disetujui',
  rejected: 'Ditolak',
};

const STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'verified', label: 'Terverifikasi' },
  { value: 'approved', label: 'Disetujui' },
  { value: 'rejected', label: 'Ditolak' },
];

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export default function RegistrationsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  const { data, meta, loading, refetch } = usePaginatedList<RegistrationRow>(
    () => {
      const params: Record<string, unknown> = { page, limit: 10 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filterStatus) params.status = filterStatus;
      return apiClient.get('/registrations', { params }).then(r => r.data);
    },
    [page, debouncedSearch, filterStatus]
  );

  const handleAction = async (id: string, action: string) => {
    setActionLoading(`${id}-${action}`);
    try {
      await apiClient.post(`/registrations/${id}/${action}`, { reason: action === 'reject' ? 'Ditolak oleh admin' : undefined });
      await refetch();
    } catch {
      alert(`Gagal ${action} pendaftaran`);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= meta.totalPages) setPage(p);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Pendaftaran Baru">
        <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
          <Download size={14} /> Export
        </button>
        <button className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors">
          <Plus size={14} /> Tambah
        </button>
      </PageHeader>

      <SummaryBar icon={Users} label="Total Pendaftar" total={meta.total} onRefresh={refetch} />

      <SearchBar
        search={search}
        onSearchChange={setSearch}
        onReset={() => { setSearch(''); setFilterStatus(''); setPage(1); }}
        placeholder="Cari nama, email, no. HP..."
        debounceMs={300}
        onDebouncedSearch={() => setPage(1)}
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
          { label: 'Nama' },
          { label: 'JK', hidden: 'hidden sm:table-cell' },
          { label: 'Kontak', hidden: 'hidden md:table-cell' },
          { label: 'Sumber Info', hidden: 'hidden lg:table-cell' },
          { label: 'Status' },
          { label: 'Tanggal', hidden: 'hidden xl:table-cell' },
          { label: 'Aksi', align: 'right' },
        ]}
        data={data}
        loading={loading}
        empty={{
          icon: Users,
          message: search || filterStatus ? 'Tidak ada pendaftar yang cocok dengan filter' : 'Belum ada pendaftaran',
          action: (search || filterStatus) ? { label: 'Reset filter', onClick: () => { setSearch(''); setFilterStatus(''); setPage(1); } } : undefined,
        }}
        page={page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={handlePageChange}
        colSpan={7}
        renderRow={(row: RegistrationRow) => (
          <tr key={row.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
            <td className="px-4 py-3">
              <span className="font-medium text-gray-900 dark:text-white">{row.namaLengkap}</span>
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
              {row.jenisKelamin || '-'}
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">
              {row.noHp || row.email || '-'}
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden lg:table-cell">
              {row.sumberInfo || '-'}
            </td>
            <td className="px-4 py-3">
              <StatusBadge status={row.status} />
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden xl:table-cell">
              {row.createdAt ? new Date(row.createdAt).toLocaleDateString('id-ID') : '-'}
            </td>
            <td className="px-4 py-3 text-right">
              <div className="flex items-center justify-end gap-1">
                {row.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleAction(row.id, 'verify')}
                      disabled={actionLoading === `${row.id}-verify`}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-md transition-colors"
                      title="Verifikasi"
                    >
                      <FileText size={15} />
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
                <button
                  onClick={() => router.push(`/registrations/${row.id}`)}
                  className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  title="Detail"
                >
                  <Eye size={15} />
                </button>
              </div>
            </td>
          </tr>
        )}
      />
    </div>
  );
}
