'use client';

import apiClient from '@/lib/api-client';
import { usePaginatedList, buildEmptyMessage } from '@/lib/hooks/use-api';
import { useFilters } from '@/lib/hooks/use-filters';
import { useDebounce } from '@/lib/hooks/use-debounce';
import type { User } from '@/types';
import { Plus, MoreVertical, UserCheck, UserX, Users } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import DataTable from '@/components/ui/data-table';
import SummaryBar from '@/components/ui/summary-bar';
import SearchBar from '@/components/ui/search-bar';
import FilterSelect from '@/components/ui/filter-select';
import { ROLE_OPTIONS, ROLE_BADGES, ROLE_LABELS } from '@/components/users/constants';

export default function UsersPage() {
  const {
    page,
    setPage,
    search,
    setSearch,
    filters,
    setFilter,
    hasActiveFilters,
    getApiParams,
    resetFilters,
  } = useFilters({
    filters: [
      { key: 'role', defaultValue: '' },
      { key: 'active', defaultValue: '' },
    ],
  });
  const debouncedSearch = useDebounce(search, 300);

  const {
    data: users,
    meta,
    loading,
    refetch,
  } = usePaginatedList<User>(() => {
    const params = getApiParams({ limit: 10 });
    if (debouncedSearch) params.search = debouncedSearch;
    else delete params.search;
    if (filters.role) params.role = filters.role;
    if (filters.active === 'active') params.isActive = true;
    else if (filters.active === 'inactive') params.isActive = false;
    return apiClient.get('/users', { params }).then((r) => r.data);
  }, [page, debouncedSearch, filters.role, filters.active]);

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
        onReset={resetFilters}
        placeholder="Cari nama, email..."
        debounceMs={300}
      >
        <FilterSelect
          value={filters.role}
          onChange={(v) => setFilter('role', v)}
          options={ROLE_OPTIONS}
          placeholder="Semua Role"
        />
        <FilterSelect
          value={filters.active}
          onChange={(v) => setFilter('active', v)}
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
          ...buildEmptyMessage('user', hasActiveFilters, resetFilters),
        }}
        page={page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={handlePageChange}
        colSpan={6}
        renderRow={(user: User) => (
          <tr
            key={user.id}
            className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
          >
            <td className="px-4 py-3">
              <span className="font-medium text-gray-900 dark:text-white">{user.namaLengkap}</span>
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
              {user.email}
            </td>
            <td className="px-4 py-3">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGES[user.role] || ''}`}
              >
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
              <button
                className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                title="Aksi"
              >
                <MoreVertical size={16} />
              </button>
            </td>
          </tr>
        )}
      />
    </PageContainer>
  );
}
