import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/api/api_client.dart';
import '../../data/models/card_data.dart';
import '../../data/models/member.dart';

part 'member_event.dart';
part 'member_state.dart';

class MemberBloc extends Bloc<MemberEvent, MemberState> {
  MemberBloc() : super(MemberInitial()) {
    on<MemberLoadRequested>(_onMemberLoadRequested);
    on<MemberCardImageRequested>(_onMemberCardImageRequested);
    on<MemberCardDataRequested>(_onMemberCardDataRequested);
    on<MemberUpdateRequested>(_onMemberUpdateRequested);
    on<MemberPhotoUploadRequested>(_onMemberPhotoUploadRequested);
    on<MemberLogoutRequested>(_onMemberLogoutRequested);
  }

  final ApiClient _apiClient = ApiClient();

  Future<void> _onMemberLoadRequested(
    MemberLoadRequested event,
    Emitter<MemberState> emit,
  ) async {
    // Don't fetch without an access token; the AuthBloc decides authentication.
    final token = await _apiClient.getAccessToken();
    if (token == null || token.isEmpty) {
      emit(MemberInitial());
      return;
    }

    emit(MemberLoading());
    try {
      final response = await _apiClient.dio.get('/members/me');
      final data = response.data['data'];
      if (data is! Map<String, dynamic>) {
        emit(const MemberError(message: 'Data anggota tidak ditemukan'));
        return;
      }
      final member = Member.fromJson(data);
      emit(MemberLoaded(member: member));
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        emit(MemberInitial());
      } else {
        emit(MemberError(message: _messageFromError(e)));
      }
    } catch (e) {
      emit(MemberError(message: e.toString()));
    }
  }

  /// Ambil PNG kartu anggota yang di-generate API (desain identik dengan
  /// aplikasi Expo). Header `Authorization` disisipkan otomatis oleh
  /// interceptor ApiClient.
  ///
  /// Guard: lewati bila bytes sudah ada atau sedang di-fetch. `failed`
  /// sengaja TIDAK masuk guard — event ini juga dipakai tombol "Coba Lagi"
  /// (auto-trigger listener Beranda hanya menambah event saat `!failed`,
  /// sehingga tidak terjadi loop auto-retry).
  Future<void> _onMemberCardImageRequested(
    MemberCardImageRequested event,
    Emitter<MemberState> emit,
  ) async {
    final token = await _apiClient.getAccessToken();
    if (token == null || token.isEmpty) {
      emit(MemberInitial());
      return;
    }

    final current = state;
    if (current is! MemberLoaded ||
        current.cardImage != null ||
        current.cardImageFetching) {
      return;
    }
    emit(current.copyWith(cardImageFetching: true));
    try {
      final response = await _apiClient.dio.get<List<int>>(
        '/members/${event.userId}/digital-card/image',
        options: Options(responseType: ResponseType.bytes),
      );
      final bytes = Uint8List.fromList(response.data ?? <int>[]);
      if (bytes.isEmpty) {
        throw StateError('Kartu anggota kosong');
      }
      final refreshed = state;
      if (refreshed is MemberLoaded) {
        emit(refreshed.copyWith(
          cardImage: bytes,
          cardImageFetching: false,
          cardImageFailed: false,
        ));
      }
    } catch (_) {
      final refreshed = state;
      if (refreshed is MemberLoaded) {
        emit(refreshed.copyWith(
            cardImageFetching: false, cardImageFailed: true));
      }
    }
  }

  /// Ambil data kartu digital (penandatangan, stempel, ttd, visual tingkatan)
  /// dari `GET /members/:id/digital-card`. Guard: lewati bila cardData sudah
  /// ada atau state bukan MemberLoaded.
  Future<void> _onMemberCardDataRequested(
    MemberCardDataRequested event,
    Emitter<MemberState> emit,
  ) async {
    final token = await _apiClient.getAccessToken();
    if (token == null || token.isEmpty) return;

    final current = state;
    if (current is! MemberLoaded || current.cardData != null) return;

    try {
      final response =
          await _apiClient.dio.get('/members/${current.member.id}/digital-card');
      final data = response.data;
      if (data is Map<String, dynamic> && data['data'] is Map<String, dynamic>) {
        final cardData = CardData.fromJson(
            data['data'] as Map<String, dynamic>);
        emit(current.copyWith(cardData: cardData));
      }
    } catch (_) {
      // Gagal memuat data kartu — kartu tetap tampil dengan fallback
    }
  }

  /// Simpan profil via `PATCH /auth/me`, lalu reload `/members/me` agar data
  /// yang tampil tersinkron dengan DB. `tanggalLahir` hanya dikirim bila
  /// terisi (string kosong akan membuat `new Date('')` invalid di API).
  Future<void> _onMemberUpdateRequested(
    MemberUpdateRequested event,
    Emitter<MemberState> emit,
  ) async {
    final token = await _apiClient.getAccessToken();
    if (token == null || token.isEmpty) {
      emit(MemberInitial());
      return;
    }

    emit(MemberUpdating());
    try {
      await _apiClient.dio.patch('/auth/me', data: {
        'namaLengkap': event.namaLengkap,
        'noHp': event.noHp,
        'alamat': event.alamat,
        'tempatLahir': event.tempatLahir,
        if (event.tanggalLahir.isNotEmpty) 'tanggalLahir': event.tanggalLahir,
      });

      final meRes = await _apiClient.dio.get('/members/me');
      final dynamic meData = meRes.data['data'];
      if (meData is! Map<String, dynamic>) {
        emit(const MemberError(message: 'Data anggota tidak ditemukan'));
        return;
      }
      emit(MemberUpdateSuccess(member: Member.fromJson(meData)));
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        emit(MemberInitial());
      } else {
        emit(MemberError(message: _messageFromError(e)));
      }
    } catch (e) {
      emit(MemberError(message: e.toString()));
    }
  }


  /// Upload foto profil via POST /auth/me/photo (multipart/form-data).
  /// Setelah sukses, /members/me di-reload agar fotoPath + .bg.png
  /// terbaru terbaca oleh widget kartu & profil.
  Future<void> _onMemberPhotoUploadRequested(
    MemberPhotoUploadRequested event,
    Emitter<MemberState> emit,
  ) async {
    final token = await _apiClient.getAccessToken();
    if (token == null || token.isEmpty) {
      emit(MemberInitial());
      return;
    }

    final current = state;
    if (current is MemberLoaded) {
      emit(MemberPhotoUploading(member: current.member));
    }

    try {
      final formData = FormData.fromMap({
        'photo': await MultipartFile.fromFile(
          event.filePath,
          filename: 'profile-photo.jpg',
        ),
      });

      await _apiClient.dio.post(
        '/auth/me/photo',
        data: formData,
        options: Options(headers: {'Content-Type': 'multipart/form-data'}),
      );

      // Reload member data setelah upload berhasil.
      final meRes = await _apiClient.dio.get('/members/me');
      final dynamic meData = meRes.data['data'];
      if (meData is! Map<String, dynamic>) {
        emit(const MemberError(message: 'Data anggota tidak ditemukan'));
        return;
      }
      emit(MemberPhotoUploadSuccess(member: Member.fromJson(meData)));
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        emit(MemberInitial());
      } else {
        emit(MemberError(message: _messageFromError(e)));
      }
    } catch (e) {
      emit(MemberError(message: e.toString()));
    }
  }
  Future<void> _onMemberLogoutRequested(
    MemberLogoutRequested event,
    Emitter<MemberState> emit,
  ) async {
    emit(MemberInitial());
  }

  String _messageFromError(DioException error) =>
      _apiClient.messageFromError(error);
}
