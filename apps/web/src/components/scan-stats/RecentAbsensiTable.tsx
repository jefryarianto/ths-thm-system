'use client';

import SearchBar from '@/components/ui/search-bar';
import FilterSelect from '@/components/ui/filter-select';

interface AbsensiRow {
  namaAnggota: string;
  nomorAnggota: string;
  kegiatan: string;
  hadir: boolean;
  catatan?: string;
  tanggal: string;
}

interface RecentAbsensiTableProps {
  data: AbsensiRow[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  onReset: () => void;
}

export default function RecentAbsensiTable({
  data,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onReset,
}: RecentAbsensiTableProps) {
  const filteredAbsensi = data.filter((a) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !a.namaAnggota?.toLowerCase().includes(q) &&
        !a.nomorAnggota?.toLowerCase().includes(q) &&
        !a.kegiatan?.toLowerCase().includes(q)
      )
        return false;
    }
    if (statusFilter === 'hadir' && !a.hadir) return false;
    if (statusFilter === 'absen' && a.hadir) return false;
    return true;
  });

  const totalCount = data.length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Absensi Terbaru</h2>
          <span className="text-xs text-gray-400">
            {filteredAbsensi.length} dari {totalCount}
          </span>
        </div>
        <div className="mt-3">
          <SearchBar
            search={searchQuery}
            onSearchChange={onSearchChange}
            onReset={onReset}
            placeholder="Cari anggota, kegiatan..."
          >
            <FilterSelect
              value={statusFilter}
              onChange={onStatusFilterChange}
              options={[
                { value: 'hadir', label: 'Hadir' },
                { value: 'absen', label: 'Absen' },
              ]}
              placeholder="Semua Status"
            />
          </SearchBar>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Anggota
              </th>
              <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Kegiatan
              </th>
              <th className="text-center px-5 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Status
              </th>
              <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">
                Catatan
              </th>
              <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden sm:table-cell">
                Tanggal
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredAbsensi.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center py-8 text-sm text-gray-400 dark:text-gray-500"
                >
                  {searchQuery || statusFilter
                    ? 'Tidak ada absensi yang cocok dengan filter'
                    : 'Belum ada data'}
                </td>
              </tr>
            ) : (
              filteredAbsensi.map((a, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {a.namaAnggota}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{a.nomorAnggota}</p>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {a.kegiatan}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        a.hadir
                          ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400'
                          : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400'
                      }`}
                    >
                      {a.hadir ? 'Hadir' : 'Absen'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate hidden md:table-cell">
                    {a.catatan || '-'}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                    {new Date(a.tanggal).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
