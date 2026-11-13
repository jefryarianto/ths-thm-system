import 'package:dio/dio.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/api/api_client.dart';
import '../../core/constants/app_constants.dart';
import '../../core/services/api_cache.dart';
import '../../data/models/due.dart';

part 'dues_event.dart';
part 'dues_state.dart';

class DuesBloc extends Bloc<DuesEvent, DuesState> {
  DuesBloc() : super(DuesInitial()) {
    on<DuesLoadRequested>(_onDuesLoadRequested);
    on<DuesUploadProofRequested>(_onDuesUploadProofRequested);
    on<DuesLogoutRequested>(_onDuesLogoutRequested);
  }

  final ApiClient _apiClient = ApiClient();

  /// Ambil daftar iuran terbaru dari `GET /dues/members/me`, segarkan cache,
  /// dan kembalikan daftar hasil parse. Dipakai baik saat load awal maupun
  /// setelah unggah bukti berhasil. Melempar `DioException` bila gagal.
  Future<List<Due>> _fetchDues() async {
    final response = await _apiClient.dio.get(AppConstants.duesMe);
    final dynamic raw = response.data['data'];
    final List<dynamic> data = raw is List ? raw : [];
    await ApiCache.instance.set(CacheKeys.dues, data);
    return data.map((json) => Due.fromJson(json)).toList();
  }

  /// Ambil status lock untuk periode saat ini
  Future<LockStatus?> _fetchLockStatus() async {
    try {
      final response = await _apiClient.dio.get(AppConstants.duesLockStatus);
      final data = response.data['data'];
      if (data == null) return null;
      
      return LockStatus(
        isLocked: data['isLocked'] == true,
        lockedCount: data['lockedCount'] ?? 0,
        graceDaysRemaining: data['graceDaysRemaining'] ?? 0,
        gracePeriodType: data['gracePeriodType'] ?? 'standard',
        lockedBy: data['lockedBy']?.toString(),
        lockedAt: data['lockedAt']?.toString(),
        lockReason: data['lockReason']?.toString(),
        expiresAt: data['expiresAt']?.toString(),
        memberIds: (data['memberIds'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
        periode: data['periode'] ?? '',
      );
    } catch (_) {
      return null;
    }
  }

  Future<void> _onDuesLoadRequested(
    DuesLoadRequested event,
    Emitter<DuesState> emit,
  ) async {
    final token = await _apiClient.getAccessToken();
    if (token == null || token.isEmpty) {
      emit(DuesInitial());
      return;
    }

    emit(DuesLoading());
    CachedPayload<List<dynamic>>? cached;
    try {
      // Tampilkan cache segera agar UI tidak kosong saat jaringan lambat.
      cached = await ApiCache.instance.get<List<dynamic>>(CacheKeys.dues);
      if (cached != null) {
        final cachedDues =
            cached.data.map((json) => Due.fromJson(json)).toList();
        // Fetch lock status for cached data
        final lockStatus = await _fetchLockStatus();
        emit(DuesLoaded(
          dues: cachedDues, 
          isStale: cached.isStale,
          lockStatus: lockStatus,
        ));
      }
    } catch (_) {
      // Cache rusak → abaikan, lanjut ke jaringan.
    }

    try {
      final dues = await _fetchDues();
      final lockStatus = await _fetchLockStatus();
      emit(DuesLoaded(dues: dues, lockStatus: lockStatus));
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        emit(DuesInitial());
      } else if (cached != null) {
        final cachedDues =
            cached.data.map((json) => Due.fromJson(json)).toList();
        emit(DuesLoaded(
          dues: cachedDues,
          isStale: true,
          errorMessage: _messageFromError(e),
        ));
      } else {
        emit(DuesError(message: _messageFromError(e)));
      }
    } catch (e) {
      emit(DuesError(message: e.toString()));
    }
  }

  /// Unggah bukti pembayaran (multipart/form-data, field `bukti`) ke
  /// `POST /payments/:id/upload-proof`. Hanya untuk iuran milik sendiri
  /// (server memvalidasi via scope `self`). Setelah sukses, daftar iuran
  /// di-reload dan state menjadi `DuesProofUploadSuccess`.
  Future<void> _onDuesUploadProofRequested(
    DuesUploadProofRequested event,
    Emitter<DuesState> emit,
  ) async {
    final token = await _apiClient.getAccessToken();
    if (token == null || token.isEmpty) {
      emit(DuesInitial());
      return;
    }

    // Check lock status before allowing upload
    final currentState = state;
    if (currentState is DuesLoaded && currentState.lockStatus?.isLocked == true) {
      // Check if the specific iuran is locked
      final iuran = currentState.dues.firstWhere(
        (d) => d.id == event.iuranId,
        orElse: () => Due(id: '', periode: '', jumlah: 0, status: '', createdAt: '', isLocked: false),
      );
      
      if (iuran.isLocked) {
        emit(DuesError(message: 'Tidak dapat upload bukti untuk periode terkunci. Hubungi admin.'));
        return;
      }
    }

    // Pertahankan daftar saat ini agar kartu tidak hilang saat loading.
    final currentDues =
        state is DuesLoaded ? (state as DuesLoaded).dues : <Due>[];
    emit(DuesProofUploading(dues: currentDues, iuranId: event.iuranId));

    try {
      final fileName = event.filePath.split(RegExp(r'[\/]')).last;
      final formData = FormData.fromMap({
        'bukti': await MultipartFile.fromFile(
          event.filePath,
          filename: fileName,
        ),
        if (event.catatan != null && event.catatan!.isNotEmpty)
          'catatan': event.catatan,
      });

      await _apiClient.dio.post(
        AppConstants.duesUploadProof(event.iuranId),
        data: formData,
        options: Options(headers: {'Content-Type': 'multipart/form-data'}),
      );

      final dues = await _fetchDues();
      final lockStatus = await _fetchLockStatus();
      emit(DuesProofUploadSuccess(
        dues: dues,
        message: 'Bukti pembayaran terkirim, menunggu verifikasi admin.',
      ));
      
      // Re-emit loaded state with lock status
      emit(DuesLoaded(dues: dues, lockStatus: lockStatus));
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        emit(DuesInitial());
      } else {
        emit(DuesError(message: _messageFromError(e)));
      }
    } catch (e) {
      emit(DuesError(message: e.toString()));
    }
  }

  Future<void> _onDuesLogoutRequested(
    DuesLogoutRequested event,
    Emitter<DuesState> emit,
  ) async {
    emit(DuesInitial());
  }

  String _messageFromError(DioException error) =>
      _apiClient.messageFromError(error);
}
