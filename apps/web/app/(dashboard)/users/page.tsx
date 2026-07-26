'use client';

import apiClient from '@/lib/api-client';
import { usePaginatedList, buildEmptyMessage } from '@/lib/hooks/use-api';
import { useFilters } from '@/lib/hooks/use-filters';
import { useDebounce } from '@/lib/hooks/use-debounce';
import type { User } from '@/types';
import { useState } from 'react';
import { Plus, Users, UserCheck, UserX, ArrowUpDown } from 'lucide-react';
import { PermissionGuard } from '@/components/auth/permission-guard';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import DataTable from '@/components/ui/data-table';
import SummaryBar from '@/components/ui/summary-bar';
import SearchBar from '@/components/ui/search-bar';
import FilterSelect from '@/components/ui/filter-select';
import ConfirmModal from '@/components/ui/confirm-modal';
import { useToast } from '@/components/ui/toast';
import { ROLE_OPTIONS, ROLE_BADGES, ROLE_LABELS } from '@/components/users/constants';
import UserActions from '@/components/users/UserActions';
import CreateUserModal from '@/components/users/CreateUserModal';
import EditUserModal from '@/components/users/EditUserModal';


export default function UsersPage() {
  const { toast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ── Role change picker state ──
  const [roleChangeTarget, setRoleChangeTarget] = useState<{
    user: User;
    newRole: string;
  } | null>(null);
  const [roleChangeLoading, setRoleChangeLoading] = useState(false);
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

  const handleToggleActive = async (id: string, current: boolean) => {
    setActionLoading(id);
    try {
      await apiClient.patch(`/users/${id}`, { isActive: !current });
      toast('success', current ? 'User dinonaktifkan' : 'User diaktifkan');
      refetch();
    } catch {
      toast('error', 'Gagal mengubah status user');
    }
    setActionLoading(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget.id);
    try {
      await apiClient.delete(`/users/${deleteTarget.id}`);
      toast('success', 'User berhasil dinonaktifkan');
      setDeleteTarget(null);
      refetch();
    } catch {
      toast('error', 'Gagal menghapus user');
    }
    setActionLoading(null);
  };

  // ── Handle role change ──
  const handleRoleChange = async () => {
    if (!roleChangeTarget) return;
    setRoleChangeLoading(true);
    const { user, newRole } = roleChangeTarget;
    const oldRole = user.role;
    try {
      await apiClient.patch(`/users/${user.id}`, { role: newRole });
      toast('success', `Role ${user.namaLengkap} berubah: ${ROLE_LABELS[oldRole] || oldRole} → ${ROLE_LABELS[newRole] || newRole}`);
      setRoleChangeTarget(null);
      refetch();
    } catch {
      toast('error', 'Gagal mengubah role user');
    }
    setRoleChangeLoading(false);
  };

  // ── Columns ──
  const columns = [
    { key: 'namaLengkap', label: 'Nama' },
    { key: 'email', label: 'Email', hidden: 'hidden sm:table-cell' },
    {
      key: 'role',
      label: 'Role',
      render: (user: User) => (
        <div className="relative group" onClick={(e) => e.stopPropagation()}>
          <select
            value={user.role}
            onChange={(e) => {
              const newRole = e.target.value;
              if (newRole !== user.role) {
                setRoleChangeTarget({ user, newRole });
              }
            }}
            className={`appearance-none cursor-pointer px-2 py-0.5 pr-6 rounded-full text-xs font-medium border-2 border-transparent hover:border-blue-300 dark:hover:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all ${
              ROLE_BADGES[user.role] || 'bg-gray-100 text-gray-600'
            }`}
          >
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <ArrowUpDown
            size={10}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </div>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (user: User) =>
        user.isActive !== false ? (
          <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <UserCheck size={13} /> Aktif
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
            <UserX size={13} /> Nonaktif
          </span>
        ),
    },
    {
      key: 'createdAt',
      label: 'Dibuat',
      hidden: 'hidden md:table-cell',
      render: (user: User) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {new Date(user.createdAt).toLocaleDateString('id-ID')}
        </span>
      ),
    },
  ];

  return (
    <PermissionGuard module="users" action="view">
    <PageContainer>
      <PageHeader title="Manajemen User" onRefresh={refetch}>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
        >
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
        columns={columns}
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
        actions={(user: User) => (
          <UserActions
            user={user}
            actionLoading={actionLoading}
            onEdit={(id) => setEditUserId(id)}
            onToggleActive={handleToggleActive}
            onDelete={(_id) => setDeleteTarget(user)}
          />
        )}
      />

      <CreateUserModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={refetch}
      />

      <EditUserModal
        open={!!editUserId}
        onClose={() => setEditUserId(null)}
        onSuccess={refetch}
        userId={editUserId}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title="Nonaktifkan User"
        message={`Apakah Anda yakin ingin menonaktifkan user "${deleteTarget?.namaLengkap}"?`}
        confirmLabel="Ya, Nonaktifkan"
        cancelLabel="Batal"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* ── Role Change Confirmation Modal ── */}
      <ConfirmModal
        open={!!roleChangeTarget}
        title="Ubah Role User"
        message={
          roleChangeTarget
            ? `Ubah role "${roleChangeTarget.user.namaLengkap}" dari "${ROLE_LABELS[roleChangeTarget.user.role] || roleChangeTarget.user.role}" menjadi "${ROLE_LABELS[roleChangeTarget.newRole] || roleChangeTarget.newRole}"?\n\nPerubahan ini akan tercatat di audit log.`
            : ''
        }
        confirmLabel={roleChangeLoading ? 'Menyimpan...' : 'Ya, Ubah'}
        cancelLabel="Batal"
        variant="warning"
        onConfirm={handleRoleChange}
        onCancel={() => setRoleChangeTarget(null)}
      />
    </PageContainer>
    </PermissionGuard>
  );
}
