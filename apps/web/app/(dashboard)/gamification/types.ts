export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  threshold: number;
  category: string;
}

export interface LeaderboardEntry {
  rank: number;
  anggotaId: string;
  namaLengkap?: string;
  points: number;
  badges: number;
  streaks: { latihan: number; iuran: number };
}

export interface GamificationStats {
  totalMembers: number;
  totalEvents: number;
  totalPointsAwarded: number;
  badgesAwarded: number;
}

export interface PointEvent {
  id: string;
  anggotaId: string;
  namaLengkap?: string;
  type: string;
  points: number;
  description: string;
  timestamp: string;
}
