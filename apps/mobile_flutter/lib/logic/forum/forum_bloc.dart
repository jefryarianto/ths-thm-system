import 'dart:async';

import 'package:dio/dio.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/api/api_client.dart';
import '../../core/services/api_cache.dart';
import '../../core/services/realtime_service.dart';
import '../../data/models/forum.dart';

part 'forum_event.dart';
part 'forum_state.dart';

class ForumBloc extends Bloc<ForumEvent, ForumState> {
  ForumBloc() : super(const ForumInitial()) {
    on<ForumCategoriesLoadRequested>(_onCategories);
    on<ForumThreadsLoadRequested>(_onThreads);
    on<ForumThreadLoadRequested>(_onThread);
    on<ForumCreateThreadRequested>(_onCreateThread);
    on<ForumCreatePostRequested>(_onCreatePost);
    on<ForumThreadReactRequested>(_onThreadReact);
    on<ForumPostReactRequested>(_onPostReact);
    on<ForumLogoutRequested>(_onLogout);
    on<ForumRealtimeEvent>(_onRealtime);
    _initRealtime();
  }

  final ApiClient _apiClient = ApiClient();

  /// Subscribe event realtime forum (thread & post baru/ubah/hapus).
  /// Handler dipanggil di thread event loop bloc (melalui `add`) sehingga
  /// update state tetap serial. Transform harus murni (tanpa I/O async).
  void _initRealtime() {
    final realtime = RealtimeService.instance;
    realtime.connect();

    realtime.on('forum:threadCreated', (data) {
      if (isClosed) return;
      add(ForumRealtimeEvent((current) {
        if (current is! ForumThreadsLoaded) return current;
        final thread = ForumThread.fromJson(
            (data is Map<String, dynamic> ? data : <String, dynamic>{})['thread'] ?? data);
        if (thread.id.isEmpty ||
            current.categoryId != thread.categoryId ||
            current.search.trim().isNotEmpty) {
          return current;
        }
        final exists = current.threads.any((t) => t.id == thread.id);
        if (exists) return current;
        return ForumThreadsLoaded(
          threads: [thread, ...current.threads],
          categoryId: current.categoryId,
          search: current.search,
        );
      }));
    });

    realtime.on('forum:postCreated', (data) {
      if (isClosed) return;
      add(ForumRealtimeEvent((current) {
        if (current is! ForumThreadLoaded || data is! Map<String, dynamic>) {
          return current;
        }
        final threadId = data['threadId']?.toString() ?? '';
        if (threadId != current.thread.id) return current;
        final postRaw = data['post'];
        if (postRaw is! Map<String, dynamic>) return current;
        final post = ForumPost.fromJson(postRaw);
        final exists = current.posts.any((p) => p.id == post.id);
        if (exists) return current;
        return ForumThreadLoaded(
          thread: current.thread,
          posts: [...current.posts, post],
        );
      }));
    });

    realtime.on('forum:threadUpdated', (data) {
      if (isClosed) return;
      add(ForumRealtimeEvent((current) {
        final threadRaw =
            (data is Map<String, dynamic> ? data : <String, dynamic>{})['thread'] ?? data;
        if (threadRaw is! Map<String, dynamic>) return current;
        final thread = ForumThread.fromJson(threadRaw);
        if (thread.id.isEmpty) return current;
        if (current is ForumThreadsLoaded) {
          return ForumThreadsLoaded(
            threads: current.threads
                .map((t) => t.id == thread.id ? thread : t)
                .toList(),
            categoryId: current.categoryId,
            search: current.search,
          );
        } else if (current is ForumThreadLoaded &&
            current.thread.id == thread.id) {
          return ForumThreadLoaded(thread: thread, posts: current.posts);
        }
        return current;
      }));
    });

    realtime.on('forum:postUpdated', (data) {
      if (isClosed) return;
      add(ForumRealtimeEvent((current) {
        if (current is! ForumThreadLoaded || data is! Map<String, dynamic>) {
          return current;
        }
        final threadId = data['threadId']?.toString() ?? '';
        if (threadId != current.thread.id) return current;
        final postRaw = data['post'];
        if (postRaw is! Map<String, dynamic>) return current;
        final post = ForumPost.fromJson(postRaw);
        return ForumThreadLoaded(
          thread: current.thread,
          posts: current.posts.map((p) => p.id == post.id ? post : p).toList(),
        );
      }));
    });

    realtime.on('forum:threadDeleted', (data) {
      if (isClosed) return;
      add(ForumRealtimeEvent((current) {
        if (current is! ForumThreadsLoaded) return current;
        final id =
            (data is Map<String, dynamic> ? data : <String, dynamic>{})['id']?.toString() ?? '';
        if (id.isEmpty) return current;
        return ForumThreadsLoaded(
          threads: current.threads.where((t) => t.id != id).toList(),
          categoryId: current.categoryId,
          search: current.search,
        );
      }));
    });

    realtime.on('forum:postDeleted', (data) {
      if (isClosed) return;
      add(ForumRealtimeEvent((current) {
        if (current is! ForumThreadLoaded || data is! Map<String, dynamic>) {
          return current;
        }
        final postId = data['postId']?.toString() ?? '';
        if (postId.isEmpty) return current;
        return ForumThreadLoaded(
          thread: current.thread,
          posts: current.posts.where((p) => p.id != postId).toList(),
        );
      }));
    });

    realtime.on('forum:reactionUpdated', (data) {
      if (isClosed || data is! Map<String, dynamic>) return;
      add(ForumRealtimeEvent((current) {
        if (current is! ForumThreadLoaded) return current;
        final reactions = _asIntMap(data['reactions']);
        final targetType = data['targetType']?.toString() ?? '';
        if (targetType == 'thread' &&
            data['threadId']?.toString() == current.thread.id) {
          return ForumThreadLoaded(
            thread: current.thread.copyWith(reactions: reactions),
            posts: current.posts,
          );
        }
        if (targetType == 'post') {
          final postId = data['postId']?.toString() ?? '';
          if (postId.isEmpty) return current;
          return ForumThreadLoaded(
            thread: current.thread,
            posts: [
              for (final p in current.posts)
                p.id == postId ? p.copyWith(reactions: reactions) : p,
            ],
          );
        }
        return current;
      }));
    });
  }

  Future<void> _onCategories(
    ForumCategoriesLoadRequested event,
    Emitter<ForumState> emit,
  ) async {
    final cachedThreads = state.cachedThreads;
    // Sajikan cache kategori segera bila ada.
    CachedPayload<List<dynamic>>? cached;
    try {
      cached = await ApiCache.instance.get<List<dynamic>>(
        CacheKeys.forumCategories,
      );
      if (cached != null) {
        final list = cached.data
            .whereType<Map<String, dynamic>>()
            .map(ForumCategory.fromJson)
            .toList();
        emit(ForumCategoriesLoaded(
          categories: list,
          isStale: cached.isStale,
          cachedThreads: cachedThreads,
        ));
      } else {
        emit(ForumLoading(cachedThreads: cachedThreads));
      }
    } catch (_) {
      emit(ForumLoading(cachedThreads: cachedThreads));
    }

    try {
      final res = await _apiClient.dio.get('/forum/categories');
      final rawList = (res.data['data'] as List?)
          ?.whereType<Map<String, dynamic>>()
          .toList(growable: false);
      final list = _parseList(res.data, ForumCategory.fromJson);
      await ApiCache.instance.set(CacheKeys.forumCategories, rawList ?? list);
      emit(ForumCategoriesLoaded(
        categories: list,
        cachedThreads: state.cachedThreads,
      ));
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        emit(const ForumInitial());
      } else if (cached != null) {
        final list = cached.data
            .whereType<Map<String, dynamic>>()
            .map(ForumCategory.fromJson)
            .toList();
        emit(ForumCategoriesLoaded(
          categories: list,
          isStale: true,
          errorMessage: _message(e),
          cachedThreads: state.cachedThreads,
        ));
      } else {
        emit(ForumError(message: _message(e), cachedThreads: state.cachedThreads));
      }
    } catch (e) {
      emit(ForumError(message: e.toString(), cachedThreads: state.cachedThreads));
    }
  }
  Future<void> _onThreads(
    ForumThreadsLoadRequested event,
    Emitter<ForumState> emit,
  ) async {
    final cachedCategories = state.cachedCategories;
    final cacheKey =
        '${CacheKeys.forumThreads}:${event.categoryId}:${event.search.trim()}';
    // Sajikan cache thread segera bila ada.
    CachedPayload<List<dynamic>>? cached;
    try {
      cached = await ApiCache.instance.get<List<dynamic>>(cacheKey);
      if (cached != null) {
        final list = cached.data
            .whereType<Map<String, dynamic>>()
            .map(ForumThread.fromJson)
            .toList();
        emit(ForumThreadsLoaded(
          threads: list,
          categoryId: event.categoryId,
          search: event.search,
          isStale: cached.isStale,
          cachedCategories: cachedCategories,
        ));
      } else {
        emit(ForumLoading(cachedCategories: cachedCategories));
      }
    } catch (_) {
      emit(ForumLoading(cachedCategories: cachedCategories));
    }

    try {
      final res = await _apiClient.dio.get(
        '/forum/categories/${event.categoryId}/threads',
        queryParameters: event.search.trim().isNotEmpty
            ? {'search': event.search.trim()}
            : null,
      );
      final rawList = (res.data['data'] as List?)
          ?.whereType<Map<String, dynamic>>()
          .toList(growable: false);
      final list = _parseList(res.data, ForumThread.fromJson);
      await ApiCache.instance.set(cacheKey, rawList ?? list);
      emit(ForumThreadsLoaded(
        threads: list,
        categoryId: event.categoryId,
        search: event.search,
        cachedCategories: cachedCategories,
      ));
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 ||
          e.response?.statusCode == 403) {
        emit(const ForumInitial());
      } else if (cached != null) {
        // Segarkan gagal tetapi cache tersedia — tetap tampilkan data lama.
        final list = cached.data
            .whereType<Map<String, dynamic>>()
            .map(ForumThread.fromJson)
            .toList();
        emit(ForumThreadsLoaded(
          threads: list,
          categoryId: event.categoryId,
          search: event.search,
          isStale: true,
          errorMessage: _message(e),
          cachedCategories: cachedCategories,
        ));
      } else {
        emit(ForumError(message: _message(e), cachedCategories: cachedCategories));
      }
    } catch (e) {
      if (cached != null) {
        final list = cached.data
            .whereType<Map<String, dynamic>>()
            .map(ForumThread.fromJson)
            .toList();
        emit(ForumThreadsLoaded(
          threads: list,
          categoryId: event.categoryId,
          search: event.search,
          isStale: true,
          errorMessage: e.toString(),
          cachedCategories: cachedCategories,
        ));
      } else {
        emit(ForumError(message: e.toString(), cachedCategories: cachedCategories));
      }
    }
  }

  Future<void> _onThread(
    ForumThreadLoadRequested event,
    Emitter<ForumState> emit,
  ) async {
    final cachedCategories = state.cachedCategories;
    final cachedThreads = state.cachedThreads;
    final cacheKey = '${CacheKeys.forumThread}:${event.id}';
    // Sajikan cache thread segera bila ada.
    CachedPayload<Map<String, dynamic>>? cached;
    try {
      cached = await ApiCache.instance.get<Map<String, dynamic>>(cacheKey);
      if (cached != null) {
        final thread = ForumThread.fromJson(cached.data);
        final postsRaw = cached.data['posts'];
        final posts = postsRaw is List
            ? postsRaw
                .whereType<Map<String, dynamic>>()
                .map(ForumPost.fromJson)
                .toList()
            : const <ForumPost>[];
        emit(ForumThreadLoaded(
          thread: thread,
          posts: posts,
          isStale: cached.isStale,
          cachedCategories: cachedCategories,
          cachedThreads: cachedThreads,
        ));
      } else {
        emit(ForumLoading(
          cachedCategories: cachedCategories,
          cachedThreads: cachedThreads,
        ));
      }
    } catch (_) {
      emit(ForumLoading(
        cachedCategories: cachedCategories,
        cachedThreads: cachedThreads,
      ));
    }

    try {
      final res = await _apiClient.dio.get('/forum/threads/${event.id}');
      final data = _unwrap(res.data);
      final rawData = data is Map<String, dynamic> ? data : <String, dynamic>{};
      final thread = ForumThread.fromJson(rawData);
      final postsRaw = rawData['posts'];
      final posts = postsRaw is List
          ? postsRaw
              .whereType<Map<String, dynamic>>()
              .map(ForumPost.fromJson)
              .toList()
          : const <ForumPost>[];
      await ApiCache.instance.set(cacheKey, rawData);
      emit(ForumThreadLoaded(
        thread: thread,
        posts: posts,
        cachedCategories: cachedCategories,
        cachedThreads: cachedThreads,
      ));
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        emit(const ForumInitial());
      } else if (cached != null) {
        // Segarkan gagal tetapi cache tersedia — tetap tampilkan data lama.
        final thread = ForumThread.fromJson(cached.data);
        final postsRaw = cached.data['posts'];
        final posts = postsRaw is List
            ? postsRaw
                .whereType<Map<String, dynamic>>()
                .map(ForumPost.fromJson)
                .toList()
            : const <ForumPost>[];
        emit(ForumThreadLoaded(
          thread: thread,
          posts: posts,
          isStale: true,
          cachedCategories: cachedCategories,
          cachedThreads: cachedThreads,
        ));
      } else {
        emit(ForumError(
          message: _message(e),
          cachedCategories: cachedCategories,
          cachedThreads: cachedThreads,
        ));
      }
    } catch (e) {
      if (cached != null) {
        final thread = ForumThread.fromJson(cached.data);
        final postsRaw = cached.data['posts'];
        final posts = postsRaw is List
            ? postsRaw
                .whereType<Map<String, dynamic>>()
                .map(ForumPost.fromJson)
                .toList()
            : const <ForumPost>[];
        emit(ForumThreadLoaded(
          thread: thread,
          posts: posts,
          isStale: true,
          cachedCategories: cachedCategories,
          cachedThreads: cachedThreads,
        ));
      } else {
        emit(ForumError(
          message: e.toString(),
          cachedCategories: cachedCategories,
          cachedThreads: cachedThreads,
        ));
      }
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
      // Unggah lampiran gambar dulu (multipart — override Content-Type JSON).
      final urls = <String>[];
      for (final path in event.imagePaths) {
        final form = FormData.fromMap({
          'image': await MultipartFile.fromFile(path),
        });
        final up = await _apiClient.dio.post(
          '/forum/upload-image',
          data: form,
          options: Options(headers: {'Content-Type': 'multipart/form-data'}),
        );
        final data = _unwrap(up.data);
        if (data is Map<String, dynamic> && data['url'] != null) {
          urls.add(data['url'].toString());
        }
      }
      await _apiClient.dio.post(
        '/forum/threads/${event.threadId}/posts',
        data: {
          'konten': event.konten,
          if (urls.isNotEmpty) 'images': urls,
        },
      );
    } on DioException catch (e) {
      emit(ForumError(message: _message(e)));
    } catch (e) {
      emit(ForumError(message: e.toString()));
    }
  }

  Future<void> _onThreadReact(
    ForumThreadReactRequested event,
    Emitter<ForumState> emit,
  ) async {
    try {
      final res = await _apiClient.dio.post(
        '/forum/threads/${event.threadId}/react',
        data: {'emoji': event.emoji},
      );
      final current = state;
      final data = _unwrap(res.data);
      if (current is ForumThreadLoaded &&
          current.thread.id == event.threadId &&
          data is Map<String, dynamic>) {
        final emoji = data['currentUserEmoji']?.toString();
        final prev = current.thread;
        final updatedThread = prev.copyWith(
          reactions: _asIntMap(data['reactions']),
          currentUserEmoji: emoji,
          clearEmoji: emoji == null,
        );
        emit(ForumThreadLoaded(
          thread: updatedThread,
          posts: current.posts,
          cachedCategories: current.cachedCategories,
          cachedThreads: current.cachedThreads,
        ));
      }
    } on DioException catch (e) {
      final current = state;
      final errState = ForumError(
        message: _message(e),
        cachedCategories: current.cachedCategories,
        cachedThreads: current.cachedThreads,
      );
      emit(errState);
    } catch (e) {
      final current = state;
      emit(ForumError(
        message: e.toString(),
        cachedCategories: current.cachedCategories,
        cachedThreads: current.cachedThreads,
      ));
    }
  }

  Future<void> _onPostReact(
    ForumPostReactRequested event,
    Emitter<ForumState> emit,
  ) async {
    try {
      final res = await _apiClient.dio.post(
        '/forum/posts/${event.postId}/react',
        data: {'emoji': event.emoji},
      );
      final current = state;
      final data = _unwrap(res.data);
      if (current is ForumThreadLoaded &&
          data is Map<String, dynamic>) {
        final emoji = data['currentUserEmoji']?.toString();
        emit(ForumThreadLoaded(
          thread: current.thread,
          posts: [
            for (final p in current.posts)
              p.id == event.postId
                  ? p.copyWith(
                      reactions: _asIntMap(data['reactions']),
                      currentUserEmoji: emoji,
                      clearEmoji: emoji == null,
                    )
                  : p,
          ],
          cachedCategories: current.cachedCategories,
          cachedThreads: current.cachedThreads,
        ));
      }
    } on DioException catch (e) {
      final cur = state;
      emit(ForumError(
        message: _message(e),
        cachedCategories: cur.cachedCategories,
        cachedThreads: cur.cachedThreads,
      ));
    } catch (e) {
      final cur = state;
      emit(ForumError(
        message: e.toString(),
        cachedCategories: cur.cachedCategories,
        cachedThreads: cur.cachedThreads,
      ));
    }
  }

  Future<void> _onRealtime(
    ForumRealtimeEvent event,
    Emitter<ForumState> emit,
  ) async {
    emit(event.transform(state));
  }

  Future<void> _onLogout(
    ForumLogoutRequested event,
    Emitter<ForumState> emit,
  ) async {
    RealtimeService.instance.disconnect();
    emit(const ForumInitial());
  }

  // ── Helpers ────────────────────────────────────────────────

  static dynamic _unwrap(dynamic data) {
    if (data is Map && data['data'] != null) return data['data'];
    return data;
  }

  static Map<String, int> _asIntMap(dynamic raw) {
    if (raw is Map) {
      return raw.map((k, v) => MapEntry(k.toString(), (v as num?)?.toInt() ?? 0));
    }
    return const {};
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
