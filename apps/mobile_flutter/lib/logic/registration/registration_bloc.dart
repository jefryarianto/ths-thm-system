/// BLoC modul Registrasi Pendaftaran Calon Anggota.
///
/// Menangani: daftar pendaftaran (list admin), buat pendaftaran baru (publik),
/// approve/reject (admin). Data diambil langsung via `ApiClient`.
library;

import 'package:dio/dio.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/api/api_client.dart';
import '../../core/constants/app_constants.dart';
import '../../data/models/registration.dart';

part 'registration_event.dart';
part 'registration_state.dart';

class RegistrationBloc extends Bloc<RegistrationEvent, RegistrationState> {
  RegistrationBloc() : super(const RegistrationInitial()) {
    on<RegistrationLoadRequested>(_onLoadRequested);
    on<RegistrationCreateRequested>(_onCreateRequested);
    on<RegistrationApproveRequested>(_onApproveRequested);
    on<RegistrationRejectRequested>(_onRejectRequested);
  }

  final ApiClient _api = ApiClient();

  // ── Load (admin list) ─────────────────────────────────────
  Future<void> _onLoadRequested(
    RegistrationLoadRequested event,
    Emitter<RegistrationState> emit,
  ) async {
    final token = await _api.getAccessToken();
    if (token == null || token.isEmpty) {
      emit(const RegistrationInitial());
      return;
    }
    emit(const RegistrationLoading());
    try {
      final params = <String, dynamic>{};
      if (event.status != null && event.status!.isNotEmpty) {
        params['status'] = event.status;
      }
      final response = await _api.dio.get(
        AppConstants.registrations,
        queryParameters: params,
      );
      final dynamic raw = response.data['data'];
      final List<dynamic> list = raw is List ? raw : [];
      final registrations = list
          .whereType<Map<String, dynamic>>()
          .map(Registration.fromJson)
          .toList();
      emit(RegistrationLoaded(registrations: registrations));
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        emit(const RegistrationInitial());
      } else {
        emit(RegistrationError(message: _msg(e)));
      }
    } catch (e) {
      emit(RegistrationError(message: e.toString()));
    }
  }

  // ── Create (public form) ──────────────────────────────────
  Future<void> _onCreateRequested(
    RegistrationCreateRequested event,
    Emitter<RegistrationState> emit,
  ) async {
    emit(const RegistrationSubmitting());
    try {
      final body = <String, dynamic>{
        'namaLengkap': event.namaLengkap,
        'jenisKelamin': event.jenisKelamin,
        'rantingId': event.rantingId,
      };
      if (event.tempatLahir != null) body['tempatLahir'] = event.tempatLahir;
      if (event.tanggalLahir != null) body['tanggalLahir'] = event.tanggalLahir;
      if (event.alamat != null) body['alamat'] = event.alamat;
      if (event.noHp != null) body['noHp'] = event.noHp;
      if (event.email != null) body['email'] = event.email;
      if (event.sumberInfo != null) body['sumberInfo'] = event.sumberInfo;

      await _api.dio.post(AppConstants.registrations, data: body);
      emit(const RegistrationCreateSuccess());
    } on DioException catch (e) {
      emit(RegistrationError(message: _api.messageFromError(e)));
    } catch (e) {
      emit(RegistrationError(message: e.toString()));
    }
  }

  // ── Approve (admin) ───────────────────────────────────────
  Future<void> _onApproveRequested(
    RegistrationApproveRequested event,
    Emitter<RegistrationState> emit,
  ) async {
    emit(const RegistrationActionInProgress());
    try {
      await _api.dio.post(AppConstants.registrationApprove(event.id));
      add(const RegistrationLoadRequested());
    } on DioException catch (e) {
      emit(RegistrationError(message: _api.messageFromError(e)));
    } catch (e) {
      emit(RegistrationError(message: e.toString()));
    }
  }

  // ── Reject (admin) ────────────────────────────────────────
  Future<void> _onRejectRequested(
    RegistrationRejectRequested event,
    Emitter<RegistrationState> emit,
  ) async {
    emit(const RegistrationActionInProgress());
    try {
      await _api.dio.post(
        AppConstants.registrationReject(event.id),
        data: {'reason': event.reason},
      );
      add(const RegistrationLoadRequested());
    } on DioException catch (e) {
      emit(RegistrationError(message: _api.messageFromError(e)));
    } catch (e) {
      emit(RegistrationError(message: e.toString()));
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
