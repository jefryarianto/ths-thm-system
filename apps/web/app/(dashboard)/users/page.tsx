'use client';

import { useState } from 'react';
import apiClient from '@/lib/api-client';
import { usePaginatedList, buildEmptyMessage } from '@/lib/hooks/use-api';
import { useDebounce } from '@/lib/hooks/use-debounce';
import type { User } from '@/types';
import {
  Plus, MoreVertical, UserCheck, UserX, Users,
} from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import DataTable from '@/components/ui/data-table';
import SummaryBar from '@/components/ui/summary-bar';
import SearchBar from '@/components/ui/search-bar';
import FilterSelect from '@/components/ui/filter-select';

const ROLE_OPTIONS = [
  { value: '', label: 'Semua Role' },
  { value: 'superadmin', label: 'Superadmin' },
  { value: 'admin_distrik', label: 'Admin Distrik' },
  { value: 'admin_wilayah', label: 'Admin Wilayah' },
  { value: 'admin_ranting', label: 'Admin Ranting' },
  { value: 'admin_kegiatan', label: 'Admin Kegiatan' },
  { value: 'penguji', label: 'Penguji' },
  { value: 'anggota', label: 'Anggota' },
];

const ROLE_BADGES: Record<string, string> = {
  superadmin: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400',
  admin_distrik: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',
  admin_wilayah: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400',
  admin_ranting: 'bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-400',
  admin_kegiatan: 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400',
  penguji: 'bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-400',
  anggota: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
};

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Superadmin',
  admin_distrik: 'Admin Distrik',
  admin_wilayah: 'Admin Wilayah',
  admin_ranting: 'Admin Ranting',
  admin_kegiatan: 'Admin Kegiatan',
  penguji: 'Penguji',
  anggota: 'Anggota',
};

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const { data: users, meta, loading, refetch } = usePaginatedList<User>(
    () => {
      const params: Record<string, unknown> = { page, limit: 10 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filterRole) params.role = filterRole;
      if (filterActive === 'active') params.isActive = true;
      else if (filterActive === 'inactive') params.isActive = false;
      return apiClient.get('/users', { params }).then(r => r.data);
    },
    [page, debouncedSearch, filterRole, filterActive]
  );

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= meta.totalPages) setPage(p);
  };

  return (
    <PageContainer>
      <PageHeader title="Manajemen User" onRefresh={refetch}>
        <button className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors">
          <Plus size={14} /> Tambah User
        </button>
      </PageHeader>

      <SummaryBar icon={Users} label="Total User" total={meta.total} />

      <SearchBar
        search={search}
        onSearchChange={setSearch}
        onReset={() => { setSearch(''); setFilterRole(''); setFilterActive(''); setPage(1); }}
        placeholder="Cari nama, email..."
        debounceMs={300}
        onDebouncedSearch={() => setPage(1)}
      >
        <FilterSelect
          value={filterRole}
          onChange={v => { setFilterRole(v); setPage(1); }}
          options={ROLE_OPTIONS}
          placeholder="Semua Role"
        />
        <FilterSelect
          value={filterActive}
          onChange={v => { setFilterActive(v); setPage(1); }}
          options={[
            { value: 'active', label: 'Aktif' },
            { value: 'inactive', label: 'Nonaktif' },
          ]}
          placeholder="Semua Status"
        />
      </SearchBar>

      <DataTable
        columns={[
          { label: 'Nama' },
          { label: 'Email', hidden: 'hidden sm:table-cell' },
          { label: 'Role' },
          { label: 'Status' },
          { label: 'Dibuat', hidden: 'hidden md:table-cell' },
          { label: 'Aksi', align: 'right' },
        ]}
        data={users}
        loading={loading}
        empty={{
          icon: Users,
          ...buildEmptyMessage('user', !!(search || filterRole || filterActive), () => { setSearch(''); setFilterRole(''); setFilterActive(''); setPage(1); }),
        }}
        page={page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={handlePageChange}
        colSpan={6}
        renderRow={(user: User) => (
          <tr key={user.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
            <td className="px-4 py-3">
              <span className="font-medium text-gray-900 dark:text-white">{user.namaLengkap}</span>
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">{user.email}</td>
            <td className="px-4 py-3">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGES[user.role] || ''}`}>
                {ROLE_LABELS[user.role] || user.role}
              </span>
            </td>
            <td className="px-4 py-3">
              {user.isActive !== false ? (
                <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <UserCheck size={13} /> Aktif
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                  <UserX size={13} /> Nonaktif
                </span>
              )}
            </td>
            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">
              {new Date(user.createdAt).toLocaleDateString('id-ID')}
            </td>
            <td className="px-4 py-3 text-right">
              <button className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" title="Aksi">
                <MoreVertical size={16} />
              </button>
            </td>
          </tr>
        )}
      />
    </PageContainer>
  );
}
