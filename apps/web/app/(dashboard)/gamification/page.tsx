'use client';

import { useOrgFilter } from '@/lib/hooks/use-org-filter';
import { useGamificationData } from '@/lib/hooks/use-gamification-data';
import { Trophy, AlertCircle, Share2, Download } from 'lucide-react';
import LeaderboardPanel from '@/components/gamification/LeaderboardPanel';
import StatCards from '@/components/gamification/StatCards';
import EventsFeed from '@/components/gamification/EventsFeed';
import BadgeDistributionChart from '@/components/gamification/BadgeDistributionChart';
import BadgeGrid from '@/components/gamification/BadgeGrid';
import OrgFilterBar from '@/components/gamification/OrgFilterBar';

export default function GamificationPage() {
  // Org hierarchy filter (Distrik → Wilayah → Ranting)
  const {
    distrikId: selectedDistrik,
    setDistrik: setSelectedDistrik,
    wilayahId: selectedWilayah,
    setWilayah: setSelectedWilayah,
    rantingId: selectedRanting,
    setRanting: setSelectedRanting,
    clearFilters: clearOrgFilter,
    isActive: filterActive,
    availableWilayahs,
    availableRantings,
    orgTree,
  } = useOrgFilter();

  const {
    badges,
    leaderboard,
    stats,
    events,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    page: _page,
    setPage,
    hasMore,
    fetchData,
  } = useGamificationData({
    selectedDistrik,
    selectedWilayah,
    selectedRanting,
  });

  const clearFilter = clearOrgFilter;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <p className="text-sm text-gray-500">Memuat data gamifikasi...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-600 font-medium">{error}</p>
          <p className="text-sm text-gray-500 mt-1">Periksa koneksi ke server API</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gamifikasi</h1>
          <p className="text-sm text-gray-500 mt-1">Poin, badge, dan leaderboard anggota</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Trophy size={16} className="text-yellow-500" />
          <span>Gamification System</span>
          <button
            onClick={async () => {
              const rankIcons: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
              const text = `🏆 THS-THM Leaderboard 🏆\n\n${leaderboard
                .slice(0, 5)
                .map(
                  (e) =>
                    `${rankIcons[e.rank] || `#${e.rank}`} ${e.namaLengkap || 'Member'} — ${e.points.toLocaleString('id-ID')} pts`,
                )
                .join(
                  '\n',
                )}\n\nLihat selengkapnya di: ${window.location.origin}/public/leaderboard`;
              if (navigator.share) {
                await navigator.share({ title: 'THS-THM Leaderboard', text });
              } else {
                await navigator.clipboard.writeText(text);
                alert('Leaderboard disalin ke clipboard!');
              }
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition"
            title="Bagikan leaderboard"
          >
            <Share2 size={12} />
            Bagikan
          </button>
          <button
            onClick={() => {
              const csv = [
                'Rank,Nama,Poin,Badge,Streak Latihan,Streak Iuran',
                ...leaderboard.map(
                  (e) =>
                    `${e.rank},"${e.namaLengkap || ''}",${e.points},${e.badges},${e.streaks.latihan},${e.streaks.iuran}`,
                ),
              ].join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `leaderboard-${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-green-50 hover:bg-green-100 rounded-md transition text-green-700"
            title="Export CSV leaderboard"
          >
            <Download size={12} />
            CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 rounded-md transition text-blue-700"
            title="Print leaderboard"
          >
            <Download size={12} />
            Print
          </button>
        </div>
      </div>

      <OrgFilterBar
        selectedDistrik={selectedDistrik}
        onDistrikChange={setSelectedDistrik}
        selectedWilayah={selectedWilayah}
        onWilayahChange={setSelectedWilayah}
        selectedRanting={selectedRanting}
        onRantingChange={setSelectedRanting}
        orgTree={orgTree}
        availableWilayahs={availableWilayahs}
        availableRantings={availableRantings}
        filterActive={filterActive}
        onClearFilters={clearFilter}
      />

      {/* Stat Cards */}
      {stats && <StatCards stats={stats} />}

      {/* Leaderboard + Badge Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <LeaderboardPanel
          entries={leaderboard}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          hasMore={hasMore}
          onLoadMore={() => {
            setPage((p) => p + 1);
            fetchData(true);
          }}
        />

        <BadgeDistributionChart badges={badges} />
      </div>

      {/* Recent Events + Badges Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <EventsFeed events={events} />
        <BadgeGrid badges={badges} />
      </div>
    </div>
  );
}
