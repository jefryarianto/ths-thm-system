import 'dart:async';

import 'package:dio/dio.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/api/api_client.dart';
import '../../core/constants/app_constants.dart';
import '../../core/services/api_cache.dart';
import '../../data/models/berita.dart';
import '../../data/models/kegiatan.dart';

part 'home_feed_event.dart';
part 'home_feed_state.dart';

/// Menghidangkan dua section beranda dari data NYATA backend:
/// 1. **Agenda**  -  `GET /activities`  (kegiatan yg status diterbitkan)
/// 2. **Berita**  -  `GET /public/berita` (feed berita terbaru)
///
/// Kedua request dijalankan paralel; jika salah satu gagal, yang lain tetap
/// ditampilkan (bagian tdk menggagalkan seluruh halaman).
class HomeFeedBloc extends Bloc<HomeFeedEvent, HomeFeedState> {
  HomeFeedBloc() : super(const HomeFeedInitial()) {
    on<HomeFeedLoadRequested>(_onLoad);
  }

  final ApiClient _apiClient = ApiClient();

  Future<void> _onLoad(
    HomeFeedLoadRequested event,
    Emitter<HomeFeedState> emit,
  ) async {
    // Sajikan cache feed segera bila ada (beranda adalah layar pertama,
    // sehingga cache sangat membantu saat server lambat / offline).
    CachedPayload<Map<String, dynamic>>? cached;
    try {
      cached = await ApiCache.instance.get<Map<String, dynamic>>(
        CacheKeys.homeFeed,
      );
      if (cached != null) {
        emit(HomeFeedLoaded(
          berita: _parseBeritaList(cached.data['berita']),
          kegiatan: _parseKegiatanList(cached.data['kegiatan']),
          isStale: cached.isStale,
        ));
      } else {
        emit(const HomeFeedLoading());
      }
    } catch (_) {
      emit(const HomeFeedLoading());
    }

    try {
      final results = await Future.wait<Object?>([
        _fetchBeritaRaw(),
        _fetchKegiatanRaw(),
      ]);
      final beritaRaw = (results[0] as List<dynamic>?) ?? <dynamic>[];
      final kegiatanRaw = (results[1] as List<dynamic>?) ?? <dynamic>[];
      final berita = _parseBeritaList(beritaRaw);
      final kegiatan = _parseKegiatanList(kegiatanRaw);
      await ApiCache.instance.set(CacheKeys.homeFeed, {
        'berita': beritaRaw,
        'kegiatan': kegiatanRaw,
      });
      emit(HomeFeedLoaded(berita: berita, kegiatan: kegiatan));
    } catch (e) {
      if (cached != null) {
        emit(HomeFeedLoaded(
          berita: _parseBeritaList(cached.data['berita']),
          kegiatan: _parseKegiatanList(cached.data['kegiatan']),
          isStale: true,
          errorMessage: _messageFromError(e),
        ));
      } else {
        emit(HomeFeedError(_messageFromError(e)));
      }
    }
  }

  List<Berita> _parseBeritaList(dynamic raw) {
    if (raw is! List) return [];
    return raw
        .whereType<Map<String, dynamic>>()
        .map(Berita.fromJson)
        .toList();
  }

  List<Kegiatan> _parseKegiatanList(dynamic raw) {
    if (raw is! List) return [];
    return raw
        .whereType<Map<String, dynamic>>()
        .map(Kegiatan.fromJson)
        .toList();
  }

  Future<List<dynamic>> _fetchBeritaRaw() async {
    try {
      // Global TransformInterceptor membungkus tiap respon: { success, data, ... }.
      final res = await _apiClient.dio.get<Map<String, dynamic>>(
        AppConstants.publicBerita,
      );
      final raw = res.data?['data'];
      return raw is List ? raw : <dynamic>[];
    } on DioException {
      return <dynamic>[];
    }
  }

  Future<List<dynamic>> _fetchKegiatanRaw() async {
    try {
      // Global TransformInterceptor: { success, data: [...], meta } (lihat
      // baseFindAll) - ambil isi `data`.
      final res = await _apiClient.dio.get<Map<String, dynamic>>(
        AppConstants.activities,
      );
      final raw = res.data?['data'];
      return raw is List ? raw : <dynamic>[];
    } on DioException {
      return <dynamic>[];
    }
  }

  String _messageFromError(Object e) =>
      _apiClient.messageFromError(e, fallback: 'Gagal memuat konten beranda');
}
