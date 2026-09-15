import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../core/constants/app_constants.dart';
import '../../data/models/graduation.dart';
import 'assessment_event.dart';
import 'assessment_state.dart';

/// F2 - BLoC pengelolaan kriteria penilaian pendadaran
/// (aspek [AssessmentAspect] & item [AssessmentItem]).
class AssessmentBloc
    extends Bloc<AssessmentEvent, AssessmentState> {
  final http.Client _client;
  String? _aktifKegiatanId;
  String? _aktifAspekId;
  AssessmentBloc({http.Client? client})
      : _client = client ?? http.Client(),
        super(const AssessmentInitial()) {
    on<AssessmentAspectsRequested>(_onAspectsRequested);
    on<AssessmentAspectCreateRequested>(_onAspectCreate);
    on<AssessmentAspectUpdateRequested>(_onAspectUpdate);
    on<AssessmentAspectDeleteRequested>(_onAspectDelete);
    on<AssessmentItemsRequested>(_onItemsRequested);
    on<AssessmentItemCreateRequested>(_onItemCreate);
    on<AssessmentItemUpdateRequested>(_onItemUpdate);
    on<AssessmentItemDeleteRequested>(_onItemDelete);
    on<AssessmentParticipantsRequested>(_onParticipantsRequested);
    on<AssessmentScoresRequested>(_onScoresRequested);
    on<AssessmentScoreSubmitRequested>(_onScoreSubmit);
  }

  Future<void> _onAspectsRequested(
      AssessmentAspectsRequested event, Emitter<AssessmentState> emit) async {
    emit(const AssessmentLoading());
    _aktifKegiatanId = event.kegiatanId;
    try {
      final uri = Uri.parse(AppConstants.assessmentsAspects).replace(
          queryParameters: {"kegiatanId": event.kegiatanId});
      final res = await _client.get(uri);
      if (res.statusCode != 200) {
        emit(AssessmentError("Gagal memuat aspek: ${res.statusCode}"));
        return;
      }
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final raw = data["data"] as List<dynamic>? ?? const <dynamic>[];
      final aspects = raw
          .map((e) => AssessmentAspect.fromJson(e as Map<String, dynamic>))
          .toList();
      emit(AssessmentLoaded(aspects: aspects));
    } catch (_) {
      emit(const AssessmentError("Terjadi kesalahan koneksi"));
    }
  }

  Future<void> _onAspectCreate(
      AssessmentAspectCreateRequested event, Emitter<AssessmentState> emit) async {
    try {
      final res = await _client.post(
        Uri.parse(AppConstants.assessmentsAspects),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({
          "kegiatanId": event.kegiatanId,
          "kodeAspek": event.kodeAspek,
          "namaAspek": event.namaAspek,
          "deskripsi": event.deskripsi,
          "bobot": event.bobot,
        }),
      );
      if (res.statusCode != 201) {
        emit(AssessmentError("Gagal simpan aspek: ${res.statusCode}"));
        return;
      }
      emit(const AssessmentAspectSaved("Aspek berhasil disimpan"));
      _onAspectsRequested(
          AssessmentAspectsRequested(event.kegiatanId), emit);
    } catch (_) {
      emit(const AssessmentError("Terjadi kesalahan koneksi"));
    }
  }

  Future<void> _onAspectUpdate(
      AssessmentAspectUpdateRequested event, Emitter<AssessmentState> emit) async {
    try {
      final res = await _client.patch(
        Uri.parse(AppConstants.assessmentAspectById(event.aspekId)),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({
          "namaAspek": event.namaAspek,
          "deskripsi": event.deskripsi,
          "bobot": event.bobot,
        }),
      );
      if (res.statusCode != 200) {
        emit(AssessmentError("Gagal perbarui aspek: ${res.statusCode}"));
        return;
      }
      emit(const AssessmentAspectSaved("Aspek berhasil diperbarui"));
      if (_aktifKegiatanId != null) {
        _onAspectsRequested(
            AssessmentAspectsRequested(_aktifKegiatanId!), emit);
      }
    } catch (_) {
      emit(const AssessmentError("Terjadi kesalahan koneksi"));
    }
  }

  Future<void> _onAspectDelete(
      AssessmentAspectDeleteRequested event, Emitter<AssessmentState> emit) async {
    try {
      final res = await _client.delete(
          Uri.parse(AppConstants.assessmentAspectById(event.aspekId)));
      if (res.statusCode != 200) {
        emit(AssessmentError("Gagal hapus aspek: ${res.statusCode}"));
        return;
      }
      emit(const AssessmentAspectSaved("Aspek berhasil dihapus"));
      if (_aktifKegiatanId != null) {
        _onAspectsRequested(
            AssessmentAspectsRequested(_aktifKegiatanId!), emit);
      }
    } catch (_) {
      emit(const AssessmentError("Terjadi kesalahan koneksi"));
    }
  }

  Future<void> _onItemsRequested(
      AssessmentItemsRequested event, Emitter<AssessmentState> emit) async {
    try {
      _aktifAspekId = event.aspekId;
      final uri = Uri.parse(AppConstants.assessmentsItems).replace(
          queryParameters: {"aspekId": event.aspekId});
      final res = await _client.get(uri);
      if (res.statusCode != 200) {
        emit(AssessmentError("Gagal memuat item: ${res.statusCode}"));
        return;
      }
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final raw = data["data"] as List<dynamic>? ?? const <dynamic>[];
      final items = raw
          .map((e) => AssessmentItem.fromJson(e as Map<String, dynamic>))
          .toList();
      emit(AssessmentLoaded(items: items));
    } catch (_) {
      emit(const AssessmentError("Terjadi kesalahan koneksi"));
    }
  }

  Future<void> _onItemCreate(
      AssessmentItemCreateRequested event, Emitter<AssessmentState> emit) async {
    try {
      final res = await _client.post(
        Uri.parse(AppConstants.assessmentsItems),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({
          "aspekId": event.aspekId,
          "kodeItem": event.kodeItem,
          "namaItem": event.namaItem,
          "skorMaksimal": event.skorMaksimal,
          "bobot": event.bobot,
          "urutan": event.urutan,
        }),
      );
      if (res.statusCode != 201) {
        emit(AssessmentError("Gagal simpan item: ${res.statusCode}"));
        return;
      }
      emit(const AssessmentItemSaved("Item berhasil disimpan"));
      _onItemsRequested(AssessmentItemsRequested(_aktifAspekId!), emit);
    } catch (_) {
      emit(const AssessmentError("Terjadi kesalahan koneksi"));
    }
  }

  Future<void> _onItemUpdate(
      AssessmentItemUpdateRequested event, Emitter<AssessmentState> emit) async {
    try {
      final res = await _client.patch(
        Uri.parse(AppConstants.assessmentItemById(event.itemId)),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({
          "namaItem": event.namaItem,
          "skorMaksimal": event.skorMaksimal,
          "bobot": event.bobot,
        }),
      );
      if (res.statusCode != 200) {
        emit(AssessmentError("Gagal perbarui item: ${res.statusCode}"));
        return;
      }
      emit(const AssessmentItemSaved("Item berhasil diperbarui"));
      _onItemsRequested(AssessmentItemsRequested(_aktifAspekId!), emit);
    } catch (_) {
      emit(const AssessmentError("Terjadi kesalahan koneksi"));
    }
  }

  Future<void> _onItemDelete(
      AssessmentItemDeleteRequested event, Emitter<AssessmentState> emit) async {
    try {
      final res = await _client.delete(
          Uri.parse(AppConstants.assessmentItemById(event.itemId)));
      if (res.statusCode != 200) {
        emit(AssessmentError("Gagal hapus item: ${res.statusCode}"));
        return;
      }
      emit(const AssessmentItemSaved("Item berhasil dihapus"));
      _onItemsRequested(AssessmentItemsRequested(_aktifAspekId!), emit);
    } catch (_) {
      emit(const AssessmentError("Terjadi kesalahan koneksi"));
    }
  }

  /// F3 - Muat daftar peserta (calon anggota) pendadaran utk diinput nilai.
  Future<void> _onParticipantsRequested(
      AssessmentParticipantsRequested event, Emitter<AssessmentState> emit) async {
    try {
      final res = await _client.get(
          Uri.parse(AppConstants.graduationParticipants(event.kegiatanId)));
      if (res.statusCode != 200) {
        emit(AssessmentError("Gagal memuat peserta: ${res.statusCode}"));
        return;
      }
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final raw = data["data"] as List<dynamic>? ?? const <dynamic>[];
      final participants = raw
          .map((e) => GraduationParticipant.fromJson(e as Map<String, dynamic>))
          .toList();
      emit(AssessmentParticipantsLoaded(participants));
    } catch (_) {
      emit(const AssessmentError("Terjadi kesalahan koneksi"));
    }
  }

  /// F3 - Muat nilai yg sudah tersimpan utk satu calon (cegah duplikat,
  /// tampilkan status "sudah dinilai").
  Future<void> _onScoresRequested(
      AssessmentScoresRequested event, Emitter<AssessmentState> emit) async {
    try {
      final uri = Uri.parse(AppConstants.assessmentsScores).replace(
        queryParameters: <String, String>{
          'kegiatanId': event.kegiatanId,
          'calonAnggotaId': event.calonAnggotaId,
        },
      );
      final res = await _client.get(uri);
      if (res.statusCode != 200) {
        emit(AssessmentError("Gagal memuat nilai: ${res.statusCode}"));
        return;
      }
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final raw = data["data"] as List<dynamic>? ?? const <dynamic>[];
      final scoresByItem = <String, AssessmentScore>{};
      for (final e in raw) {
        if (e is! Map<String, dynamic>) continue;
        final score = AssessmentScore.fromJson(e);
        if (score.calonAnggotaId != event.calonAnggotaId) continue;
        scoresByItem[score.itemPenilaianId] = score;
      }
      emit(AssessmentScoresLoaded(scoresByItem));
    } catch (_) {
      emit(const AssessmentError("Terjadi kesalahan koneksi"));
    }
  }

  /// F3 - Simpan satu nilai utk satu item milik seorang peserta.
  Future<void> _onScoreSubmit(
      AssessmentScoreSubmitRequested event, Emitter<AssessmentState> emit) async {
    try {
      final res = await _client.post(
        Uri.parse(AppConstants.assessmentsScores),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({
          "kegiatanId": event.kegiatanId,
          "calonAnggotaId": event.calonAnggotaId,
          "itemPenilaianId": event.itemPenilaianId,
          "pengujiUserId": event.pengujiUserId,
          "skor": event.skor,
          if (event.catatan != null) "komentar": event.catatan,
        }),
      );
      if (res.statusCode != 201) {
        emit(AssessmentError("Gagal simpan nilai: ${res.statusCode}"));
        return;
      }
      emit(const AssessmentScoreSaved("Nilai berhasil disimpan"));
      _onScoresRequested(
          AssessmentScoresRequested(event.kegiatanId, event.calonAnggotaId), emit);
    } catch (_) {
      emit(const AssessmentError("Terjadi kesalahan koneksi"));
    }
  }
}
