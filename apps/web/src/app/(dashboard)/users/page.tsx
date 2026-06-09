'use client';

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import type { User, PaginatedResponse } from '@/types';
import {
  Plus, MoreVertical, UserCheck, UserX, RefreshCw, Users,
} from 'lucide-react';
import Pagination from '@/components/ui/pagination';
import TableSkeleton from '@/components/ui/table-skeleton';
import EmptyState from '@/components/ui/empty-state';
import SummaryBar from '@/components/ui/summary-bar';
import SearchBar from '@/components/ui/search-bar';

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
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 10 };
      if (search) params.search = search;
      if (filterRole) params.role = filterRole;
      if (filterActive === 'active') params.isActive = true;
      else if (filterActive === 'inactive') params.isActive = false;
      const { data } = await apiClient.get<PaginatedResponse<User>>('/users', { params });
      setUsers(data.data);
      setMeta(data.meta);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, search, filterRole, filterActive]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= meta.totalPages) setPage(p);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Manajemen User</h1>
        <div className="flex gap-2">
          <button
            onClick={() => fetchUsers()}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors">
            <Plus size={14} /> Tambah User
          </button>
        </div>
      </div>

      <SummaryBar icon={Users} label="Total User" total={meta.total} />

      <SearchBar
        search={search}
        onSearchChange={v => { setSearch(v); setPage(1); }}
        onReset={() => { setSearch(''); setFilterRole(''); setFilterActive(''); setPage(1); }}
        placeholder="Cari nama, email..."
      >
        <select
          value={filterRole}
          onChange={e => { setFilterRole(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {ROLE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={filterActive}
          onChange={e => { setFilterActive(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
      </SearchBar>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">Nama</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap hidden sm:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap hidden md:table-cell">Dibuat</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={5} columns={6} />
              ) : users.length === 0 ? (
                <EmptyState
                  icon={Users}
                  message={search || filterRole || filterActive ? 'Tidak ada user yang cocok dengan filter' : 'Belum ada user'}
                  action={(search || filterRole || filterActive) ? { label: 'Reset filter', onClick: () => { setSearch(''); setFilterRole(''); setFilterActive(''); setPage(1); } } : undefined}
                  colSpan={6}
                />
              ) : (
                users.map((user) => (
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
