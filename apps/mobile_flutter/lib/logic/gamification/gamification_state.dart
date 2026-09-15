part of 'gamification_bloc.dart';

abstract class GamificationState extends Equatable {
  const GamificationState();

  @override
  List<Object> get props => [];
}

class GamificationInitial extends GamificationState {}

class GamificationLoading extends GamificationState {}

class GamificationLoaded extends GamificationState {
  final GamificationProfile profile;
  final List<PointEvent> events;
  final List<PointHistory> pointsHistory;

  const GamificationLoaded({
    required this.profile,
    required this.events,
    required this.pointsHistory,
  });

  @override
  List<Object> get props => [profile, events, pointsHistory];
}

class GamificationLeaderboardLoaded extends GamificationState {
  final List<LeaderboardEntry> entries;

  const GamificationLeaderboardLoaded({required this.entries});

  @override
  List<Object> get props => [entries];
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
