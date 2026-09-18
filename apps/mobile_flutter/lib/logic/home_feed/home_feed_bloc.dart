import 'dart:async';

import 'package:dio/dio.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/api/api_client.dart';
import '../../core/constants/app_constants.dart';
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
    emit(const HomeFeedLoading());
    try {
      final results = await Future.wait<Object?>([
        _fetchBerita(),
        _fetchKegiatan(),
      ]);
      final berita = (results[0] as List<Berita>?) ?? [];
      final kegiatan = (results[1] as List<Kegiatan>?) ?? [];
      emit(HomeFeedLoaded(berita: berita, kegiatan: kegiatan));
    } catch (e) {
      emit(HomeFeedError(_messageFromError(e)));
    }
  }

  Future<List<Berita>> _fetchBerita() async {
    try {
      // Global TransformInterceptor membungkus tiap respon: { success, data, ... }.
      final res = await _apiClient.dio.get<Map<String, dynamic>>(
        AppConstants.publicBerita,
      );
      final raw = res.data?['data'];
      if (raw is! List) return [];
      return raw
          .map((e) => Berita.fromJson((e as Map).cast<String, dynamic>()))
          .toList();
    } on DioException {
      return [];
    }
  }

  Future<List<Kegiatan>> _fetchKegiatan() async {
    try {
      // Global TransformInterceptor: { success, data: [...], meta } (lihat
      // baseFindAll) - ambil isi `data`.
      final res = await _apiClient.dio.get<Map<String, dynamic>>(
        AppConstants.activities,
      );
      final raw = res.data?['data'];
      if (raw is! List) return [];
      return raw
          .map((e) => Kegiatan.fromJson((e as Map).cast<String, dynamic>()))
          .toList();
    } on DioException {
      return [];
    }
  }

  String _messageFromError(Object e) =>
      _apiClient.messageFromError(e, fallback: 'Gagal memuat konten beranda');
}
