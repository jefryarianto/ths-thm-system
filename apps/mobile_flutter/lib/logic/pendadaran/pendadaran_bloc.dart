/// BLoC modul Pendadaran (wisuda/graduations) — level **admin**.
///
/// Menangani: daftar pendadaran (list, scope server-side), buat pendadaran
/// baru (admin distrik & kegiatan), detail, kelola aspek/item kriteria,
/// undangan & absensi, pengajuan/persetujuan penguji, serta hasil/validasi.
/// Data diambil langsung via `Dio` dari `AppConstants` (pola sama seperti
/// `DuesBloc`/`DocumentBloc`). Logout ke `PendadaranInitial`.
///
/// Semua request ditangani dengan retry refresh-token otomatis oleh
/// `ApiClient` interceptor; 401/403 → `PendadaranInitial` (lempar ke login).
library;

import 'package:dio/dio.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/api/api_client.dart';
import '../../core/constants/app_constants.dart';
import '../../data/models/graduation.dart';

part 'pendadaran_event.dart';
part 'pendadaran_state.dart';

class PendadaranBloc extends Bloc<PendadaranEvent, PendadaranState> {
  PendadaranBloc() : super(PendadaranInitial()) {
    on<PendadaranLoadRequested>(_onLoadRequested);
    on<PendadaranCreateRequested>(_onCreateRequested);
    on<PendadaranLogoutRequested>(_onLogoutRequested);
  }

  final ApiClient _apiClient = ApiClient();

  Future<void> _onLoadRequested(
    PendadaranLoadRequested event,
    Emitter<PendadaranState> emit,
  ) async {
    final token = await _apiClient.getAccessToken();
    if (token == null || token.isEmpty) {
      emit(PendadaranInitial());
      return;
    }

    emit(PendadaranLoading());
    try {
      final response = await _apiClient.dio.get(AppConstants.graduations);
      final dynamic raw = response.data['data'];
      final List<dynamic> list = raw is List ? raw : [];
      final graduations = list
          .whereType<Map<String, dynamic>>()
          .map(Graduation.fromJson)
          .toList();
      emit(PendadaranLoaded(graduations: graduations));
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        emit(PendadaranInitial());
      } else {
        emit(PendadaranError(message: _messageFromError(e)));
      }
    } catch (e) {
      emit(PendadaranError(message: e.toString()));
    }
  }

  Future<void> _onCreateRequested(
    PendadaranCreateRequested event,
    Emitter<PendadaranState> emit,
  ) async {
    final token = await _apiClient.getAccessToken();
    if (token == null || token.isEmpty) {
      emit(PendadaranInitial());
      return;
    }
    emit(PendadaranSubmitting());
    try {
      final body = <String, dynamic>{
        'nama': event.nama,
        if (event.lokasi != null && event.lokasi!.isNotEmpty)
          'lokasi': event.lokasi,
        'tanggalMulai': event.tanggalMulai,
        if (event.tanggalSelesai != null && event.tanggalSelesai!.isNotEmpty)
          'tanggalSelesai': event.tanggalSelesai,
        if (event.adminKegiatanId != null &&
            event.adminKegiatanId!.isNotEmpty)
          'adminKegiatanId': event.adminKegiatanId,
      };
      final response =
          await _apiClient.dio.post(AppConstants.graduations, data: body);
      final rawData = response.data['data'];
      final graduations = rawData is Map<String, dynamic>
          ? [Graduation.fromJson(rawData)]
          : <Graduation>[];
      emit(PendadaranLoaded(graduations: graduations, justCreated: true));
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        emit(PendadaranInitial());
      } else {
        emit(PendadaranError(message: _messageFromError(e)));
      }
    } catch (e) {
      emit(PendadaranError(message: e.toString()));
    }
  }

  Future<void> _onLogoutRequested(
    PendadaranLogoutRequested event,
    Emitter<PendadaranState> emit,
  ) async {
    emit(PendadaranInitial());
  }

  String _messageFromError(DioException error) {
    final data = error.response?.data;
    if (data is Map && data['message'] != null) {
      return data['message'].toString();
    }
    return error.message ?? error.toString();
  }
}
