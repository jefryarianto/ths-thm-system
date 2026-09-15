part of 'gamification_bloc.dart';

abstract class GamificationEvent extends Equatable {
  const GamificationEvent();

  @override
  List<Object> get props => [];
}

class GamificationLoadRequested extends GamificationEvent {
  final String anggotaId;

  const GamificationLoadRequested({required this.anggotaId});

  @override
  List<Object> get props => [anggotaId];
}

class GamificationRefreshRequested extends GamificationEvent {
  final String anggotaId;

  const GamificationRefreshRequested({required this.anggotaId});

  @override
  List<Object> get props => [anggotaId];
}

class GamificationLeaderboardLoadRequested extends GamificationEvent {
  final String? search;

  const GamificationLeaderboardLoadRequested({this.search});

  @override
  List<Object> get props => [search ?? ''];
}

class GamificationEventsLoadRequested extends GamificationEvent {
  final int limit;

  const GamificationEventsLoadRequested({this.limit = 20});

  @override
  List<Object> get props => [limit];
}

class GamificationRewardsLoadRequested extends GamificationEvent {
  const GamificationRewardsLoadRequested();
}

class GamificationLogoutRequested extends GamificationEvent {
  const GamificationLogoutRequested();
}
