import 'package:dio/dio.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/api/api_client.dart';
import '../../data/models/notification_item.dart';

part 'notification_event.dart';
part 'notification_state.dart';

class NotificationBloc extends Bloc<NotificationEvent, NotificationState> {
  NotificationBloc() : super(NotificationInitial()) {
    on<NotificationLoadRequested>(_onLoad);
    on<NotificationMarkRead>(_onMarkRead);
    on<NotificationMarkAllRead>(_onMarkAllRead);
    on<NotificationDelete>(_onDelete);
    on<NotificationLogoutRequested>(_onLogout);
  }

  final ApiClient _apiClient = ApiClient();

  Future<void> _onLoad(
    NotificationLoadRequested event,
    Emitter<NotificationState> emit,
  ) async {
    final token = await _apiClient.getAccessToken();
    if (token == null || token.isEmpty) {
      emit(NotificationInitial());
      return;
    }
    emit(NotificationLoading());
    try {
      final response = await _apiClient.dio.get(
        '/notifications',
        queryParameters: {'limit': 50},
      );
      final dynamic raw = response.data['data'];
      final List<dynamic> list =
          raw is List ? raw : (raw?['data'] as List? ?? []);
      final items = list
          .map((e) => NotificationItem.fromJson(e as Map<String, dynamic>))
          .toList();
      emit(NotificationLoaded(notifications: items));
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        emit(NotificationInitial());
      } else {
        emit(NotificationError(message: _message(e)));
      }
    } catch (e) {
      emit(NotificationError(message: e.toString()));
    }
  }

  Future<void> _onMarkRead(
    NotificationMarkRead event,
    Emitter<NotificationState> emit,
  ) async {
    final state = this.state;
    if (state is NotificationLoaded) {
      // optimistic update
      final updated = state.notifications.map((n) {
        if (n.id == event.id && !n.isRead) {
          return NotificationItem(
            id: n.id,
            judul: n.judul,
            isi: n.isi,
            tipe: n.tipe,
            isRead: true,
            createdAt: n.createdAt,
            data: n.data,
          );
        }
        return n;
      }).toList();
      emit(NotificationLoaded(notifications: updated));
    }
    try {
      await _apiClient.dio.patch('/notifications/${event.id}/read');
    } catch (_) {
      // ignore — server-side handler tetap melacak status aslinya
    }
  }

  Future<void> _onMarkAllRead(
    NotificationMarkAllRead event,
    Emitter<NotificationState> emit,
  ) async {
    final state = this.state;
    if (state is NotificationLoaded) {
      final updated = state.notifications
          .map((n) => NotificationItem(
                id: n.id,
                judul: n.judul,
                isi: n.isi,
                tipe: n.tipe,
                isRead: true,
                createdAt: n.createdAt,
                data: n.data,
              ))
          .toList();
      emit(NotificationLoaded(notifications: updated));
    }
    try {
      await _apiClient.dio.patch('/notifications/read-all');
    } catch (_) {}
  }

  Future<void> _onDelete(
    NotificationDelete event,
    Emitter<NotificationState> emit,
  ) async {
    final state = this.state;
    if (state is NotificationLoaded) {
      final updated =
          state.notifications.where((n) => n.id != event.id).toList();
      emit(NotificationLoaded(notifications: updated));
    }
    try {
      await _apiClient.dio.delete('/notifications/${event.id}');
    } catch (_) {}
  }

  Future<void> _onLogout(
    NotificationLogoutRequested event,
    Emitter<NotificationState> emit,
  ) async {
    emit(NotificationInitial());
  }

  String _message(DioException e) {
    final data = e.response?.data;
    if (data is Map && data['message'] != null) {
      return data['message'].toString();
    }
    return e.message ?? e.toString();
  }
}
