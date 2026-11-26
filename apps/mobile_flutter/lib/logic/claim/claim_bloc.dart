/// BLoC modul Klaim Akun Anggota.
///
/// Menangani: daftar klaim (list admin), buat klaim baru (publik),
/// approve/reject/process (admin). Data diambil langsung via `ApiClient`.
library;

import 'package:dio/dio.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/api/api_client.dart';
import '../../core/constants/app_constants.dart';
import '../../data/models/claim.dart';

part 'claim_event.dart';
part 'claim_state.dart';
part 'claim_payload.dart';

class ClaimBloc extends Bloc<ClaimEvent, ClaimState> {
  ClaimBloc() : super(const ClaimInitial()) {
    on<ClaimLoadRequested>(_onLoadRequested);
    on<ClaimCreateRequested>(_onCreateRequested);
    on<ClaimApproveRequested>(_onApproveRequested);
    on<ClaimRejectRequested>(_onRejectRequested);
    on<ClaimProcessRequested>(_onProcessRequested);
  }

  final ApiClient _api = ApiClient();

  // ── Load (admin list) ─────────────────────────────────────
  Future<void> _onLoadRequested(
    ClaimLoadRequested event,
    Emitter<ClaimState> emit,
  ) async {
    final token = await _api.getAccessToken();
    if (token == null || token.isEmpty) {
      emit(const ClaimInitial());
      return;
    }
    emit(const ClaimLoading());
    try {
      final params = <String, dynamic>{};
      if (event.status != null && event.status!.isNotEmpty) {
        params['status'] = event.status;
      }
      if (event.tipe != null && event.tipe!.isNotEmpty) {
        params['tipe'] = event.tipe;
      }
      final response = await _api.dio.get(
        AppConstants.claims,
        queryParameters: params,
      );
      final dynamic raw = response.data['data'];
      final List<dynamic> list = raw is List ? raw : [];
      final claims =
          list.whereType<Map<String, dynamic>>().map(Claim.fromJson).toList();
      emit(ClaimLoaded(claims: claims));
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        emit(const ClaimInitial());
      } else {
        emit(ClaimError(message: _msg(e)));
      }
    } catch (e) {
      emit(ClaimError(message: e.toString()));
    }
  }

  // ── Create (public form) ──────────────────────────────────
  Future<void> _onCreateRequested(
    ClaimCreateRequested event,
    Emitter<ClaimState> emit,
  ) async {
    emit(const ClaimSubmitting());
    try {
      if (event.modeBukti == 'unggah') {
        final formData = await buildClaimFormData(event);
        await _api.dio.post(
          AppConstants.claims,
          data: formData,
          options: Options(headers: {'Content-Type': 'multipart/form-data'}),
        );
      } else {
        await _api.dio.post(
          AppConstants.claims,
          data: buildClaimFields(event),
        );
      }
      emit(const ClaimCreateSuccess());
    } on DioException catch (e) {
      emit(ClaimError(message: _api.messageFromError(e)));
    } catch (e) {
      emit(ClaimError(message: e.toString()));
    }
  }

  // ── Approve (admin) ───────────────────────────────────────
  Future<void> _onApproveRequested(
    ClaimApproveRequested event,
    Emitter<ClaimState> emit,
  ) async {
    emit(const ClaimActionInProgress());
    try {
      await _api.dio.post(AppConstants.claimApprove(event.id));
      add(const ClaimLoadRequested());
    } on DioException catch (e) {
      emit(ClaimError(message: _api.messageFromError(e)));
    } catch (e) {
      emit(ClaimError(message: e.toString()));
    }
  }

  // ── Reject (admin) ────────────────────────────────────────
  Future<void> _onRejectRequested(
    ClaimRejectRequested event,
    Emitter<ClaimState> emit,
  ) async {
    emit(const ClaimActionInProgress());
    try {
      await _api.dio.post(
        AppConstants.claimReject(event.id),
        data: {'reason': event.reason},
      );
      add(const ClaimLoadRequested());
    } on DioException catch (e) {
      emit(ClaimError(message: _api.messageFromError(e)));
    } catch (e) {
      emit(ClaimError(message: e.toString()));
    }
  }

  // ── Process (admin) ───────────────────────────────────────
  Future<void> _onProcessRequested(
    ClaimProcessRequested event,
    Emitter<ClaimState> emit,
  ) async {
    emit(const ClaimActionInProgress());
    try {
      await _api.dio.post(AppConstants.claimProcess(event.id));
      add(const ClaimLoadRequested());
    } on DioException catch (e) {
      emit(ClaimError(message: _api.messageFromError(e)));
    } catch (e) {
      emit(ClaimError(message: e.toString()));
    }
  }

  String _msg(DioException e) {
    final data = e.response?.data;
    if (data is Map && data['message'] != null) {
      return data['message'].toString();
    }
    return e.message ?? e.toString();
  }
}
