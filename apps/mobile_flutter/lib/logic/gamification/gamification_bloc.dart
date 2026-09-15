import 'dart:async';

import 'package:dio/dio.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/api/api_client.dart';
import '../../data/models/gamification.dart';

part 'gamification_event.dart';
part 'gamification_state.dart';

class GamificationBloc extends Bloc<GamificationEvent, GamificationState> {
  GamificationBloc() : super(GamificationInitial()) {
    on<GamificationLoadRequested>(_onLoad);
    on<GamificationRefreshRequested>(_onRefresh);
    on<GamificationLeaderboardLoadRequested>(_onLeaderboard);
    on<GamificationEventsLoadRequested>(_onEvents);
    on<GamificationRewardsLoadRequested>(_onRewards);
    on<GamificationLogoutRequested>(_onLogout);
  }

  final ApiClient _apiClient = ApiClient();

  Future<void> _onLoad(
    GamificationLoadRequested event,
    Emitter<GamificationState> emit,
  ) async {
    emit(GamificationLoading());
    try {
      final profileRes = await _apiClient.dio.get(
        '/gamification/profile/${event.anggotaId}',
      );
      final eventsRes = await _apiClient.dio.get(
        '/gamification/profile/${event.anggotaId}/events',
        queryParameters: {'limit': 20},
      );
      final historyRes = await _apiClient.dio.get(
        '/gamification/profile/${event.anggotaId}/points-history',
      );
      final profile = GamificationProfile.fromJson(
        _unwrap(profileRes.data),
      );
      final events = _parseList(eventsRes.data, PointEvent.fromJson);
      final history = _parseList(historyRes.data, PointHistory.fromJson);
      emit(GamificationLoaded(
        profile: profile,
        events: events,
        pointsHistory: history,
      ));
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        emit(GamificationInitial());
      } else {
        emit(GamificationError(message: _message(e)));
      }
    } catch (e) {
      emit(GamificationError(message: e.toString()));
    }
  }

  Future<void> _onRefresh(
    GamificationRefreshRequested event,
    Emitter<GamificationState> emit,
  ) async {
    add(GamificationLoadRequested(anggotaId: event.anggotaId));
  }

  Future<void> _onLeaderboard(
    GamificationLeaderboardLoadRequested event,
    Emitter<GamificationState> emit,
  ) async {
    try {
      final res = await _apiClient.dio.get(
        '/gamification/leaderboard',
        queryParameters: {
          'limit': 10,
          if (event.search != null && event.search!.isNotEmpty)
            'search': event.search,
        },
      );
      final list = _parseList(res.data, LeaderboardEntry.fromJson);
      emit(GamificationLeaderboardLoaded(entries: list));
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        emit(GamificationInitial());
      } else {
        emit(GamificationError(message: _message(e)));
      }
    } catch (e) {
      emit(GamificationError(message: e.toString()));
    }
  }

  Future<void> _onEvents(
    GamificationEventsLoadRequested event,
    Emitter<GamificationState> emit,
  ) async {
    try {
      final res = await _apiClient.dio.get(
        '/gamification/events',
        queryParameters: {'limit': event.limit},
      );
      final list = _parseList(res.data, PointEvent.fromJson);
      emit(GamificationEventsLoaded(events: list));
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        emit(GamificationInitial());
      } else {
        emit(GamificationError(message: _message(e)));
      }
    } catch (e) {
      emit(GamificationError(message: e.toString()));
    }
  }

  Future<void> _onRewards(
    GamificationRewardsLoadRequested event,
    Emitter<GamificationState> emit,
  ) async {
    try {
      final res = await _apiClient.dio.get('/gamification/rewards');
      final list = _parseList(res.data, GamificationReward.fromJson);
      emit(GamificationRewardsLoaded(rewards: list));
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        emit(GamificationInitial());
      } else {
        emit(GamificationError(message: _message(e)));
      }
    } catch (e) {
      emit(GamificationError(message: e.toString()));
    }
  }

  Future<void> _onLogout(
    GamificationLogoutRequested event,
    Emitter<GamificationState> emit,
  ) async {
    emit(GamificationInitial());
  }

  // ── Helpers ────────────────────────────────────────────────

  static dynamic _unwrap(dynamic data) {
    if (data is Map && data['data'] != null) return data['data'];
    return data;
  }

  static List<T> _parseList<T>(
    dynamic data,
    T Function(Map<String, dynamic>) fromJson,
  ) {
    final raw = _unwrap(data);
    if (raw is List) {
      return raw.whereType<Map<String, dynamic>>().map(fromJson).toList();
    }
    return const [];
  }

  String _message(DioException e) {
    final data = e.response?.data;
    if (data is Map && data['message'] != null) {
      return data['message'].toString();
    }
    return e.message ?? e.toString();
  }
}
