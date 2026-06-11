'use client';

import { useEffect, useState } from 'react';
import apiClient, { unwrap } from '@/lib/api-client';
import { Trophy, Zap, Flame, Star, Award } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  namaLengkap?: string;
  points: number;
  badges: number;
  streaks: { latihan: number; iuran: number };
}

const RANK_ICONS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function PublicLeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/gamification/public/leaderboard?limit=50')
      .then(res => setLeaderboard(unwrap<LeaderboardEntry[]>(res) || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy size={32} className="text-yellow-500" />
            <h1 className="text-3xl font-bold text-gray-900">Leaderboard</h1>
          </div>
          <p className="text-gray-500">Peringkat anggota THS-THM berdasarkan poin</p>
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : leaderboard.length > 0 ? (
            <div>
              {/* Top 3 Podium */}
              {leaderboard.slice(0, 3).length > 0 && (
                <div className="flex items-end justify-center gap-4 px-6 pt-8 pb-6 bg-gradient-to-b from-yellow-50 to-white border-b border-gray-100">
                  {leaderboard[1] && (
                    <div className="text-center">
                      <div className="text-4xl mb-1">🥈</div>
                      <p className="text-sm font-semibold text-gray-900 max-w-[100px] truncate">
                        {leaderboard[1].namaLengkap || 'Member'}
                      </p>
                      <p className="text-xs text-yellow-600 font-bold">{leaderboard[1].points.toLocaleString('id-ID')} pts</p>
                      <div className="w-16 h-16 bg-gray-200 rounded-t-lg mt-2 mx-auto" style={{ height: 60 }} />
                    </div>
                  )}
                  {leaderboard[0] && (
                    <div className="text-center">
                      <div className="text-5xl mb-1">🥇</div>
                      <p className="text-sm font-bold text-gray-900 max-w-[100px] truncate">
                        {leaderboard[0].namaLengkap || 'Member'}
                      </p>
                      <p className="text-sm text-yellow-600 font-bold">{leaderboard[0].points.toLocaleString('id-ID')} pts</p>
                      <div className="w-20 h-20 bg-yellow-100 rounded-t-lg mt-2 mx-auto" style={{ height: 80 }} />
                    </div>
                  )}
                  {leaderboard[2] && (
                    <div className="text-center">
                      <div className="text-4xl mb-1">🥉</div>
                      <p className="text-sm font-semibold text-gray-900 max-w-[100px] truncate">
                        {leaderboard[2].namaLengkap || 'Member'}
                      </p>
                      <p className="text-xs text-yellow-600 font-bold">{leaderboard[2].points.toLocaleString('id-ID')} pts</p>
                      <div className="w-16 h-16 bg-orange-100 rounded-t-lg mt-2 mx-auto" style={{ height: 40 }} />
                    </div>
                  )}
                </div>
              )}

              {/* Full List */}
              <div className="divide-y divide-gray-100">
                {leaderboard.map((entry) => (
                  <div
                    key={`${entry.rank}`}
                    className={`flex items-center px-6 py-4 hover:bg-gray-50 transition ${
                      entry.rank <= 3 ? 'bg-yellow-50/50' : ''
                    }`}
                  >
                    <div className="w-10 text-center">
                      <span className="text-lg">{RANK_ICONS[entry.rank] || `#${entry.rank}`}</span>
                    </div>
                    <div className="flex-1 ml-3">
                      <p className="text-sm font-medium text-gray-900">{entry.namaLengkap || 'Anonymous'}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs text-blue-600">
                          <Flame size={10} /> {entry.streaks.latihan}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <Star size={10} /> {entry.streaks.iuran}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-purple-600">
                          <Award size={10} /> {entry.badges}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 rounded-full">
                      <Zap size={14} className="text-yellow-600" />
                      <span className="text-sm font-bold text-yellow-800">
                        {entry.points.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Trophy size={48} className="mx-auto mb-3 opacity-30" />
              <p>Belum ada data leaderboard</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-400">
            THS-THM System — Poin dihitung dari latihan, iuran, dan prestasi
          </p>
        </div>
      </div>
    </div>
  );
}
