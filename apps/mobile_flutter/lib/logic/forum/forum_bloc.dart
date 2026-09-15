import 'dart:async';

import 'package:dio/dio.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/api/api_client.dart';
import '../../data/models/forum.dart';

part 'forum_event.dart';
part 'forum_state.dart';

class ForumBloc extends Bloc<ForumEvent, ForumState> {
  ForumBloc() : super(ForumInitial()) {
    on<ForumCategoriesLoadRequested>(_onCategories);
    on<ForumThreadsLoadRequested>(_onThreads);
    on<ForumThreadLoadRequested>(_onThread);
    on<ForumCreateThreadRequested>(_onCreateThread);
    on<ForumCreatePostRequested>(_onCreatePost);
    on<ForumLogoutRequested>(_onLogout);
  }

  final ApiClient _apiClient = ApiClient();

  Future<void> _onCategories(
    ForumCategoriesLoadRequested event,
    Emitter<ForumState> emit,
  ) async {
    emit(ForumLoading());
    try {
      final res = await _apiClient.dio.get('/forum/categories');
      final list = _parseList(res.data, ForumCategory.fromJson);
      emit(ForumCategoriesLoaded(categories: list));
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        emit(ForumInitial());
      } else {
        emit(ForumError(message: _message(e)));
      }
    } catch (e) {
      emit(ForumError(message: e.toString()));
    }
  }

  Future<void> _onThreads(
    ForumThreadsLoadRequested event,
    Emitter<ForumState> emit,
  ) async {
    try {
      final res = await _apiClient.dio.get(
        '/forum/categories/${event.categoryId}/threads',
        queryParameters: event.search.trim().isNotEmpty
            ? {'search': event.search.trim()}
            : null,
      );
      final list = _parseList(res.data, ForumThread.fromJson);
      emit(ForumThreadsLoaded(
        threads: list,
        categoryId: event.categoryId,
        search: event.search,
      ));
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        emit(ForumInitial());
      } else {
        emit(ForumError(message: _message(e)));
      }
    } catch (e) {
      emit(ForumError(message: e.toString()));
    }
  }

  Future<void> _onThread(
    ForumThreadLoadRequested event,
    Emitter<ForumState> emit,
  ) async {
    emit(ForumLoading());
    try {
      final res = await _apiClient.dio.get('/forum/threads/${event.id}');
      final data = _unwrap(res.data);
      final thread = ForumThread.fromJson(
          data is Map<String, dynamic> ? data : <String, dynamic>{});
      final postsRaw = data is Map<String, dynamic> ? data['posts'] : null;
      final posts = postsRaw is List
          ? postsRaw
              .whereType<Map<String, dynamic>>()
              .map(ForumPost.fromJson)
              .toList()
          : const <ForumPost>[];
      emit(ForumThreadLoaded(thread: thread, posts: posts));
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        emit(ForumInitial());
      } else {
        emit(ForumError(message: _message(e)));
      }
    } catch (e) {
      emit(ForumError(message: e.toString()));
    }
  }

  Future<void> _onCreateThread(
    ForumCreateThreadRequested event,
    Emitter<ForumState> emit,
  ) async {
    try {
      await _apiClient.dio.post('/forum/threads', data: {
        'categoryId': event.categoryId,
        'judul': event.judul,
        'konten': event.konten,
      });
    } on DioException catch (e) {
      emit(ForumError(message: _message(e)));
    } catch (e) {
      emit(ForumError(message: e.toString()));
    }
  }

  Future<void> _onCreatePost(
    ForumCreatePostRequested event,
    Emitter<ForumState> emit,
  ) async {
    try {
      await _apiClient.dio.post(
        '/forum/threads/${event.threadId}/posts',
        data: {'konten': event.konten},
      );
    } on DioException catch (e) {
      emit(ForumError(message: _message(e)));
    } catch (e) {
      emit(ForumError(message: e.toString()));
    }
  }

  Future<void> _onLogout(
    ForumLogoutRequested event,
    Emitter<ForumState> emit,
  ) async {
    emit(ForumInitial());
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
