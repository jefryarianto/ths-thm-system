/// Model Gamification — memetakan langsung ke JSON dari endpoints
/// `GET /gamification/*` (profile, badges, leaderboard, events, history).
class GamificationLevel {
  final String name;
  final String icon;
  final String color;

  const GamificationLevel({
    required this.name,
    required this.icon,
    required this.color,
  });

  factory GamificationLevel.fromJson(Map<String, dynamic> json) =>
      GamificationLevel(
        name: json['name']?.toString() ?? '',
        icon: json['icon']?.toString() ?? '⭐',
        color: json['color']?.toString() ?? '#16A34A',
      );
}

class GamificationStreaks {
  final int latihan;
  final int iuran;

  const GamificationStreaks({required this.latihan, required this.iuran});

  factory GamificationStreaks.fromJson(dynamic json) {
    if (json is Map<String, dynamic>) {
      return GamificationStreaks(
        latihan: (json['latihan'] as num?)?.toInt() ?? 0,
        iuran: (json['iuran'] as num?)?.toInt() ?? 0,
      );
    }
    return const GamificationStreaks(latihan: 0, iuran: 0);
  }
}

class GamificationBadge {
  final String id;
  final String name;
  final String description;
  final String icon;
  final int threshold;
  final String category;
  final String earnedAt;

  const GamificationBadge({
    required this.id,
    required this.name,
    required this.description,
    required this.icon,
    required this.threshold,
    required this.category,
    this.earnedAt = '',
  });

  factory GamificationBadge.fromJson(Map<String, dynamic> json) =>
      GamificationBadge(
        id: json['id']?.toString() ?? '',
        name: json['name']?.toString() ?? '',
        description: json['description']?.toString() ?? '',
        icon: json['icon']?.toString() ?? '🏅',
        threshold: (json['threshold'] as num?)?.toInt() ?? 0,
        category: json['category']?.toString() ?? '',
        earnedAt: json['earnedAt']?.toString() ?? '',
      );
}

class GamificationProfile {
  final String anggotaId;
  final String namaLengkap;
  final int points;
  final GamificationLevel level;
  final List<GamificationBadge> badges;
  final GamificationStreaks streaks;
  final String lastActivity;

  const GamificationProfile({
    required this.anggotaId,
    required this.namaLengkap,
    required this.points,
    required this.level,
    required this.badges,
    required this.streaks,
    required this.lastActivity,
  });

  factory GamificationProfile.fromJson(Map<String, dynamic> json) {
    final rawLevel = json['level'];
    final rawBadges = json['badges'];
    return GamificationProfile(
      anggotaId: json['anggotaId']?.toString() ?? '',
      namaLengkap: json['namaLengkap']?.toString() ?? '',
      points: (json['points'] as num?)?.toInt() ?? 0,
      level: rawLevel is Map<String, dynamic>
          ? GamificationLevel.fromJson(rawLevel)
          : const GamificationLevel(name: '', icon: '⭐', color: '#16A34A'),
      badges: rawBadges is List
          ? rawBadges
              .whereType<Map<String, dynamic>>()
              .map(GamificationBadge.fromJson)
              .toList()
          : const [],
      streaks: GamificationStreaks.fromJson(json['streaks']),
      lastActivity: json['lastActivity']?.toString() ?? '',
    );
  }
}

class LeaderboardEntry {
  final int rank;
  final String anggotaId;
  final String namaLengkap;
  final int points;
  final int badges;
  final GamificationStreaks streaks;

  const LeaderboardEntry({
    required this.rank,
    required this.anggotaId,
    required this.namaLengkap,
    required this.points,
    required this.badges,
    required this.streaks,
  });

  factory LeaderboardEntry.fromJson(Map<String, dynamic> json) =>
      LeaderboardEntry(
        rank: (json['rank'] as num?)?.toInt() ?? 0,
        anggotaId: json['anggotaId']?.toString() ?? '',
        namaLengkap: json['namaLengkap']?.toString() ?? 'Anggota',
        points: (json['points'] as num?)?.toInt() ?? 0,
        badges: (json['badges'] as num?)?.toInt() ?? 0,
        streaks: GamificationStreaks.fromJson(json['streaks']),
      );
}

class PointEvent {
  final String id;
  final String anggotaId;
  final String namaLengkap;
  final String type;
  final int points;
  final String description;
  final String timestamp;

  const PointEvent({
    required this.id,
    required this.anggotaId,
    required this.namaLengkap,
    required this.type,
    required this.points,
    required this.description,
    required this.timestamp,
  });

  factory PointEvent.fromJson(Map<String, dynamic> json) => PointEvent(
        id: json['id']?.toString() ?? '',
        anggotaId: json['anggotaId']?.toString() ?? '',
        namaLengkap: json['namaLengkap']?.toString() ?? '',
        type: json['type']?.toString() ?? '',
        points: (json['points'] as num?)?.toInt() ?? 0,
        description: json['description']?.toString() ?? '',
        timestamp: json['timestamp']?.toString() ?? '',
      );
}

class PointHistory {
  final String month;
  final int cumulative;

  const PointHistory({required this.month, required this.cumulative});

  factory PointHistory.fromJson(Map<String, dynamic> json) => PointHistory(
        month: json['month']?.toString() ?? '',
        cumulative: (json['cumulative'] as num?)?.toInt() ?? 0,
      );
}

class GamificationReward {
  final String id;
  final String name;
  final String description;
  final String icon;
  final int pointCost;
  final int stock;
  final bool isActive;

  const GamificationReward({
    required this.id,
    required this.name,
    required this.description,
    required this.icon,
    required this.pointCost,
    required this.stock,
    required this.isActive,
  });

  factory GamificationReward.fromJson(Map<String, dynamic> json) =>
      GamificationReward(
        id: json['id']?.toString() ?? '',
        name: json['name']?.toString() ?? '',
        description: json['description']?.toString() ?? '',
        icon: json['icon']?.toString() ?? '🎁',
        pointCost: (json['pointCost'] as num?)?.toInt() ?? 0,
        stock: (json['stock'] as num?)?.toInt() ?? 0,
        isActive: json['isActive'] as bool? ?? true,
      );
}
