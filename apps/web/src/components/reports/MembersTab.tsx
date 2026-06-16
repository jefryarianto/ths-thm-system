'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { STATUS_LABELS } from './constants';

interface MemberRow {
  id: string;
  namaLengkap: string;
  nomorAnggota: string;
  statusKeanggotaan: string;
  ranting?: { nama: string };
  createdAt: string;
}

interface MembersTabProps {
  members: MemberRow[];
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  page: number;
  totalPages: number;
  total: number;
  onPrevPage: () => void;
  onNextPage: () => void;
}

export default function MembersTab({
  members,
  loading,
  search,
  onSearchChange,
  page,
  totalPages,
  total,
  onPrevPage,
  onNextPage,
}: MembersTabProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      {/* Search */}
      <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cari anggota..."
          className="w-full max-w-xs px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                Nama
              </th>
              <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                No. Anggota
              </th>
              <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                Status
              </th>
              <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                Ranting
              </th>
              <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">
                Terdaftar
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">
                  Memuat...
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">
                  Tidak ada data anggota
                </td>
              </tr>
            ) : (
              members.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition"
                >
                  <td className="px-5 py-3">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {m.namaLengkap}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-400">{m.nomorAnggota}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        m.statusKeanggotaan === 'aktif'
                          ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400'
                          : m.statusKeanggotaan === 'nonaktif'
                            ? 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {STATUS_LABELS[m.statusKeanggotaan] || m.statusKeanggotaan}
                    </span>
                  </td>
                  <td className="px-5 py-3 hidden sm:table-cell text-gray-500">
                    {m.ranting?.nama || '-'}
                  </td>
                  <td className="px-5 py-3 hidden md:table-cell text-gray-500 text-xs">
                    {new Date(m.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-700">
          <span className="text-xs text-gray-500">
            Halaman {page} dari {totalPages} ({total} total)
          </span>
          <div className="flex gap-1">
            <button
              onClick={onPrevPage}
              disabled={page <= 1}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 transition"
            >
              <ChevronLeft size={16} className="text-gray-600" />
            </button>
            <button
              onClick={onNextPage}
              disabled={page >= totalPages}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 transition"
            >
              <ChevronRight size={16} className="text-gray-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
