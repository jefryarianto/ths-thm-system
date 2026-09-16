part of 'gamification_bloc.dart';

abstract class GamificationState extends Equatable {
  const GamificationState();

  @override
  List<Object> get props => [];
}

class GamificationInitial extends GamificationState {}

class GamificationLoading extends GamificationState {}

/// State tunggal untuk semua tab gamification — profil, riwayat, dan
/// leaderboard disatukan sehingga request asinkron (profil vs leaderboard)
/// tidak saling menimpa (penyebab spinner tab Leaderboard tersangkut).
class GamificationLoaded extends GamificationState {
  /// `null` = profil belum selesai dimuat → tab Profil menampilkan spinner.
  final GamificationProfile? profile;
  final List<PointEvent> events;
  final List<PointHistory> pointsHistory;

  /// `null` = leaderboard belum selesai dimuat → tab Leaderboard menampilkan spinner.
  final List<LeaderboardEntry>? leaderboard;

  const GamificationLoaded({
    this.profile,
    this.events = const [],
    this.pointsHistory = const [],
    this.leaderboard,
  });

  GamificationLoaded copyWith({
    GamificationProfile? profile,
    List<PointEvent>? events,
    List<PointHistory>? pointsHistory,
    List<LeaderboardEntry>? leaderboard,
    bool clearLeaderboard = false,
  }) {
    return GamificationLoaded(
      profile: profile ?? this.profile,
      events: events ?? this.events,
      pointsHistory: pointsHistory ?? this.pointsHistory,
      leaderboard: clearLeaderboard ? null : leaderboard ?? this.leaderboard,
    );
  }

  @override
  List<Object> get props => [
        if (profile != null) profile as Object,
        events,
        pointsHistory,
        leaderboard ?? const [],
      ];
}

class GamificationEventsLoaded extends GamificationState {
  final List<PointEvent> events;

  const GamificationEventsLoaded({required this.events});

  @override
  List<Object> get props => [events];
}

class GamificationRewardsLoaded extends GamificationState {
  final List<GamificationReward> rewards;

  const GamificationRewardsLoaded({required this.rewards});

  @override
  List<Object> get props => [rewards];
}

class GamificationError extends GamificationState {
  final String message;

  const GamificationError({required this.message});

  @override
  List<Object> get props => [message];
}
