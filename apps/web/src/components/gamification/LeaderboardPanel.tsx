'use client';

import { useRouter } from 'next/navigation';
import { Search, X, Medal, Zap, Flame, Star, ArrowRight } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  anggotaId: string;
  namaLengkap?: string;
  points: number;
  badges: number;
  streaks: { latihan: number; iuran: number };
}

const RANK_ICONS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

interface LeaderboardPanelProps {
  entries: LeaderboardEntry[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  hasMore: boolean;
  onLoadMore: () => void;
}

export default function LeaderboardPanel({
  entries,
  searchQuery,
  onSearchChange,
  hasMore,
  onLoadMore,
}: LeaderboardPanelProps) {
  const router = useRouter();

  return (
    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Medal size={20} className="text-yellow-500" />
          <h3 className="text-base font-semibold text-gray-900">Leaderboard</h3>
        </div>
        <span className="text-xs text-gray-400">Klik nama untuk detail</span>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Cari anggota..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {entries.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">
                    Rank
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">
                    Anggota
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">
                    Poin
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">
                    Badge
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">
                    Latihan
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">
                    Iuran
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((entry) => (
                  <tr
                    key={entry.anggotaId}
                    className={`hover:bg-blue-50 transition cursor-pointer ${entry.rank <= 3 ? 'bg-yellow-50/30' : ''}`}
                    onClick={() => router.push(`/gamification/${entry.anggotaId}`)}
                  >
                    <td className="px-3 py-3">
                      <span className="text-lg">{RANK_ICONS[entry.rank] || entry.rank}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                        {entry.namaLengkap || entry.anggotaId}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                        <Zap size={12} />
                        {entry.points.toLocaleString('id-ID')}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-sm text-gray-600">{entry.badges}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="inline-flex items-center gap-1 text-sm text-blue-600">
                        <Flame size={12} />
                        {entry.streaks.latihan}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="inline-flex items-center gap-1 text-sm text-green-600">
                        <Star size={12} />
                        {entry.streaks.iuran}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasMore && (
            <div className="text-center mt-4">
              <button
                onClick={onLoadMore}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <ArrowRight size={14} />
                Muat Lainnya
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
          Belum ada data leaderboard
        </div>
      )}
    </div>
  );
}
