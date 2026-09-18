import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../core/api/api_client.dart';
import '../../core/constants/app_constants.dart';
import '../../data/models/graduation.dart';
import 'assessment_event.dart';
import 'assessment_state.dart';

/// F2 - BLoC pengelolaan kriteria penilaian pendadaran
/// (aspek [AssessmentAspect] & item [AssessmentItem]).
///
/// Semua request memakai [ApiClient.dio] sehingga header
/// `Authorization: Bearer <accessToken>` disisipkan otomatis oleh interceptor
/// (termasuk auto-refresh token). JANGAN memakai `http.Client` polos di sini
/// — request tanpa token selalu dibalas 401 oleh backend.
class AssessmentBloc extends Bloc<AssessmentEvent, AssessmentState> {
  final ApiClient _apiClient;
  String? _aktifKegiatanId;

  /// Cache supaya aspek & peserta bisa hidup berdampingan dalam satu state
  /// ([AssessmentScoringReady]) alih-alih saling menimpa.
  List<AssessmentAspect> _cachedAspects = const [];
  String? _cachedAspectsForKegiatan;
  List<GraduationParticipant> _cachedParticipants = const [];
  String? _cachedParticipantsForKegiatan;

  AssessmentBloc({ApiClient? apiClient})
      : _apiClient = apiClient ?? ApiClient(),
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
    on<AssessmentUjianResolveRequested>(_onUjianResolve);
    on<AssessmentBulkScoreSubmitRequested>(_onBulkScoreSubmit);
    on<AssessmentScoreCardRequested>(_onScoreCardRequested);
  }

  /// Cache id ujian praktek aktif per kegiatan — resolve ulang memakai
  /// [AssessmentUjianResolveRequested.force] (refresh layar / retry).
  final Map<String, String> _ujianCache = {};

  List<dynamic> _listOf(dynamic data) {
    if (data is List) return data;
    if (data is Map<String, dynamic>) {
      final inner = data['data'];
      if (inner is List) return inner;
    }
    return const <dynamic>[];
  }

  String _messageFromError(DioException e, String fallback) =>
      _apiClient.messageFromError(e, fallback: fallback);

  bool _emitScoringIfReady(
    String kegiatanId,
    Emitter<AssessmentState> emit, {
    List<AssessmentAspect>? aspects,
    List<GraduationParticipant>? participants,
  }) {
    final a = aspects ??
        (_cachedAspectsForKegiatan == kegiatanId ? _cachedAspects : null);
    final p = participants ??
        (_cachedParticipantsForKegiatan == kegiatanId
            ? _cachedParticipants
            : null);
    if (a != null && p != null) {
      emit(AssessmentScoringReady(aspects: a, participants: p));
      return true;
    }
    return false;
  }

  Future<void> _onAspectsRequested(
      AssessmentAspectsRequested event, Emitter<AssessmentState> emit) async {
    emit(const AssessmentLoading());
    _aktifKegiatanId = event.kegiatanId;
    try {
      // limit besar: backend paginate default 10 - layar scoring butuh SEMUA aspek.
      final res = await _apiClient.dio.get(
        AppConstants.assessmentsAspects,
        queryParameters: {'kegiatanId': event.kegiatanId, 'limit': '100'},
      );
      final aspects = _listOf(res.data)
          .whereType<Map<String, dynamic>>()
          .map(AssessmentAspect.fromJson)
          .toList();
      _cachedAspects = aspects;
      _cachedAspectsForKegiatan = event.kegiatanId;
      if (!_emitScoringIfReady(event.kegiatanId, emit, aspects: aspects)) {
        emit(AssessmentLoaded(aspects: aspects));
      }
    } on DioException catch (e) {
      emit(AssessmentError(_messageFromError(e, 'Gagal memuat aspek')));
    } catch (_) {
      emit(const AssessmentError('Terjadi kesalahan koneksi'));
    }
  }

  Future<void> _onAspectCreate(
      AssessmentAspectCreateRequested event, Emitter<AssessmentState> emit) async {
    try {
      await _apiClient.dio.post(
        AppConstants.assessmentsAspects,
        data: {
          "kegiatanId": event.kegiatanId,
          "kodeAspek": event.kodeAspek,
          "namaAspek": event.namaAspek,
          "deskripsi": event.deskripsi,
          "bobot": event.bobot,
        },
      );
      emit(const AssessmentAspectSaved("Aspek berhasil disimpan"));
      _cachedAspectsForKegiatan = null;
      await _onAspectsRequested(
          AssessmentAspectsRequested(event.kegiatanId), emit);
    } on DioException catch (e) {
      emit(AssessmentError(_messageFromError(e, 'Gagal simpan aspek')));
    } catch (_) {
      emit(const AssessmentError("Terjadi kesalahan koneksi"));
    }
  }

  Future<void> _onAspectUpdate(
      AssessmentAspectUpdateRequested event, Emitter<AssessmentState> emit) async {
    try {
      await _apiClient.dio.patch(
        AppConstants.assessmentAspectById(event.aspekId),
        data: {
          "namaAspek": event.namaAspek,
          "deskripsi": event.deskripsi,
          "bobot": event.bobot,
        },
      );
      emit(const AssessmentAspectSaved("Aspek berhasil diperbarui"));
      if (_aktifKegiatanId != null) {
        _cachedAspectsForKegiatan = null;
        await _onAspectsRequested(
            AssessmentAspectsRequested(_aktifKegiatanId!), emit);
      }
    } on DioException catch (e) {
      emit(AssessmentError(_messageFromError(e, 'Gagal perbarui aspek')));
    } catch (_) {
      emit(const AssessmentError("Terjadi kesalahan koneksi"));
    }
  }

  Future<void> _onAspectDelete(
      AssessmentAspectDeleteRequested event, Emitter<AssessmentState> emit) async {
    try {
      await _apiClient.dio.delete(
          AppConstants.assessmentAspectById(event.aspekId));
      emit(const AssessmentAspectSaved("Aspek berhasil dihapus"));
      if (_aktifKegiatanId != null) {
        _cachedAspectsForKegiatan = null;
        await _onAspectsRequested(
            AssessmentAspectsRequested(_aktifKegiatanId!), emit);
      }
    } on DioException catch (e) {
      emit(AssessmentError(_messageFromError(e, 'Gagal hapus aspek')));
    } catch (_) {
      emit(const AssessmentError("Terjadi kesalahan koneksi"));
    }
  }

  /// F2 - Muat item penilaian milik suatu aspek.
  Future<void> _onItemsRequested(
      AssessmentItemsRequested event, Emitter<AssessmentState> emit) async {
    emit(const AssessmentLoading());
    try {
      final res = await _apiClient.dio.get(
        AppConstants.assessmentsItems,
        queryParameters: {'aspekId': event.aspekId, 'limit': '100'},
      );
      final items = _listOf(res.data)
          .whereType<Map<String, dynamic>>()
          .map(AssessmentItem.fromJson)
          .toList();
      emit(AssessmentLoaded(items: items));
    } on DioException catch (e) {
      emit(AssessmentError(_messageFromError(e, 'Gagal memuat item')));
    } catch (_) {
      emit(const AssessmentError("Terjadi kesalahan koneksi"));
    }
  }

  Future<void> _onItemCreate(
      AssessmentItemCreateRequested event, Emitter<AssessmentState> emit) async {
    try {
      await _apiClient.dio.post(
        AppConstants.assessmentsItems,
        data: {
          "aspekId": event.aspekId,
          "kodeItem": event.kodeItem,
          "namaItem": event.namaItem,
          "skorMaksimal": event.skorMaksimal,
          "bobot": event.bobot,
          if (event.urutan != null) "urutan": event.urutan,
        },
      );
      emit(const AssessmentItemSaved("Item berhasil disimpan"));
      _cachedAspectsForKegiatan = null;
      await _onItemsRequested(
          AssessmentItemsRequested(event.aspekId), emit);
    } on DioException catch (e) {
      emit(AssessmentError(_messageFromError(e, 'Gagal simpan item')));
    } catch (_) {
      emit(const AssessmentError("Terjadi kesalahan koneksi"));
    }
  }

  Future<void> _onItemUpdate(
      AssessmentItemUpdateRequested event, Emitter<AssessmentState> emit) async {
    try {
      await _apiClient.dio.patch(
        AppConstants.assessmentItemById(event.itemId),
        data: {
          "namaItem": event.namaItem,
          "skorMaksimal": event.skorMaksimal,
          "bobot": event.bobot,
        },
      );
      emit(const AssessmentItemSaved("Item berhasil diperbarui"));
      _cachedAspectsForKegiatan = null;
      await _onItemsRequested(
          AssessmentItemsRequested(event.aspekId), emit);
    } on DioException catch (e) {
      emit(AssessmentError(_messageFromError(e, 'Gagal perbarui item')));
    } catch (_) {
      emit(const AssessmentError("Terjadi kesalahan koneksi"));
    }
  }

  Future<void> _onItemDelete(
      AssessmentItemDeleteRequested event, Emitter<AssessmentState> emit) async {
    try {
      await _apiClient.dio.delete(
          AppConstants.assessmentItemById(event.itemId));
      emit(const AssessmentItemSaved("Item berhasil dihapus"));
      _cachedAspectsForKegiatan = null;
      await _onItemsRequested(
          AssessmentItemsRequested(event.aspekId), emit);
    } on DioException catch (e) {
      emit(AssessmentError(_messageFromError(e, 'Gagal hapus item')));
    } catch (_) {
      emit(const AssessmentError("Terjadi kesalahan koneksi"));
    }
  }

  /// F3 - Muat daftar peserta (calon anggota) pendadaran utk diinput nilai.
  Future<void> _onParticipantsRequested(
      AssessmentParticipantsRequested event, Emitter<AssessmentState> emit) async {
    emit(const AssessmentLoading());
    try {
      final res = await _apiClient.dio.get(
          AppConstants.graduationParticipants(event.kegiatanId));
      final participants = _listOf(res.data)
          .whereType<Map<String, dynamic>>()
          .map(GraduationParticipant.fromJson)
          .toList();
      _cachedParticipants = participants;
      _cachedParticipantsForKegiatan = event.kegiatanId;
      if (!_emitScoringIfReady(event.kegiatanId, emit,
          participants: participants)) {
        emit(AssessmentParticipantsLoaded(participants));
      }
    } on DioException catch (e) {
      emit(AssessmentError(_messageFromError(e, 'Gagal memuat peserta')));
    } catch (_) {
      emit(const AssessmentError("Terjadi kesalahan koneksi"));
    }
  }

  /// F3 - Muat nilai yg sudah tersimpan utk satu calon (cegah duplikat,
  /// tampilkan status "sudah dinilai").
  Future<void> _onScoresRequested(
      AssessmentScoresRequested event, Emitter<AssessmentState> emit) async {
    try {
      final res = await _apiClient.dio.get(
        AppConstants.assessmentsScores,
        queryParameters: <String, String>{
          'kegiatanId': event.kegiatanId,
          'calonAnggotaId': event.calonAnggotaId,
        },
      );
      final scoresByItem = <String, AssessmentScore>{};
      for (final e in _listOf(res.data)) {
        if (e is! Map<String, dynamic>) continue;
        final score = AssessmentScore.fromJson(e);
        if (score.calonAnggotaId != event.calonAnggotaId) continue;
        scoresByItem[score.itemPenilaianId] = score;
      }
      emit(AssessmentScoresLoaded(scoresByItem));
    } on DioException catch (e) {
      emit(AssessmentError(_messageFromError(e, 'Gagal memuat nilai')));
    } catch (_) {
      emit(const AssessmentError("Terjadi kesalahan koneksi"));
    }
  }

  /// F3 - Simpan satu nilai utk satu item milik seorang peserta.
  Future<void> _onScoreSubmit(
      AssessmentScoreSubmitRequested event, Emitter<AssessmentState> emit) async {
    try {
      await _apiClient.dio.post(
        AppConstants.assessmentsScores,
        data: {
          "kegiatanId": event.kegiatanId,
          "calonAnggotaId": event.calonAnggotaId,
          "itemPenilaianId": event.itemPenilaianId,
          "pengujiUserId": event.pengujiUserId,
          "skor": event.skor,
          if (event.catatan != null) "komentar": event.catatan,
        },
      );
      emit(const AssessmentScoreSaved("Nilai berhasil disimpan"));
    } on DioException catch (e) {
      emit(AssessmentError(_messageFromError(e, 'Gagal simpan nilai')));
    } catch (_) {
      emit(const AssessmentError("Terjadi kesalahan koneksi"));
    }
  }

  /// F3+ - Muat SEMUA data layar input nilai via endpoint agregat
  /// my-score-card: ujian aktif + aspek/item + peserta + skor penguji.
  /// Satu request menggantikan (aspek + peserta + resolve ujian).
  Future<void> _onScoreCardRequested(
      AssessmentScoreCardRequested event, Emitter<AssessmentState> emit) async {
    emit(const AssessmentLoading());
    try {
      final res = await _apiClient.dio.get(
        AppConstants.graduationMyScoreCard(event.kegiatanId),
      );
      final data = res.data;
      if (data is! Map<String, dynamic>) {
        emit(const AssessmentError('Respons my-score-card tidak valid'));
        return;
      }

      final ujian = data['ujianAktif'];
      final ujianId =
          ujian is Map<String, dynamic> ? _strOrNull(ujian['id']) : null;
      final ujianStatus =
          ujian is Map<String, dynamic> ? _strOrNull(ujian['status']) : null;

      final aspects = _listOf(data['aspects'])
          .whereType<Map<String, dynamic>>()
          .map(AssessmentAspect.fromJson)
          .toList();
      final participants = _listOf(data['participants'])
          .whereType<Map<String, dynamic>>()
          .map(GraduationParticipant.fromJson)
          .toList();

      final rawScores = data['myScores'];
      final skorByItem = <String, ({double skor, String? komentar})>{};
      if (rawScores is Map<String, dynamic>) {
        rawScores.forEach((itemId, v) {
          if (v is Map<String, dynamic>) {
            skorByItem[itemId] = (
              skor: (v['skor'] as num?)?.toDouble() ?? 0,
              komentar: v['komentar']?.toString(),
            );
          }
        });
      }

      // Isi cache id ujian agar jalur lama (resolve) tetap sinkron.
      if (ujianId != null && ujianId.isNotEmpty) {
        _ujianCache[event.kegiatanId] = ujianId;
      }

      emit(AssessmentScoreCardReady(
        ujianPraktekId: ujianId,
        ujianStatus: ujianStatus,
        aspects: aspects,
        participants: participants,
        skorByItem: skorByItem,
      ));
    } on DioException catch (e) {
      emit(AssessmentError(_messageFromError(e, 'Gagal memuat data penilaian')));
    } catch (_) {
      emit(const AssessmentError('Terjadi kesalahan koneksi'));
    }
  }

  String? _strOrNull(dynamic v) {
    final s = v?.toString();
    return (s == null || s.isEmpty) ? null : s;
  }

  /// F3 - Resolve id ujian praktek aktif utk satu pendadaran.
  /// GET /graduations/:id/ujian-praktek lalu pilih yg tidak dibatalkan.
  /// force=true melewati cache — sesi bisa dibatalkan/dibuat ulang admin,
  /// id lama membuat submit selalu gagal.
  Future<void> _onUjianResolve(
      AssessmentUjianResolveRequested event, Emitter<AssessmentState> emit) async {
    if (!event.force) {
      final cached = _ujianCache[event.kegiatanId];
      if (cached != null) {
        emit(AssessmentUjianResolved(cached));
        return;
      }
    }
    try {
      final res = await _apiClient.dio.get(
        AppConstants.graduationUjianPraktek(event.kegiatanId),
      );
      String? ujianId;
      for (final e in _listOf(res.data)) {
        if (e is! Map<String, dynamic>) continue;
        if (e['status']?.toString() == 'dibatalkan') continue;
        final id = e['id']?.toString();
        if (id != null && id.isNotEmpty) {
          ujianId = id;
          break;
        }
      }
      // Tanpa fallback ke ujian berstatus dibatalkan — submit ke sesi
      // dibatalkan pasti ditolak backend ("sudah selesai atau dibatalkan").
      if (ujianId == null) {
        // Sengaja tidak di-cache: resolve berikutnya harus bertanya ke
        // server lagi (admin bisa membuat sesi kapan saja).
        emit(const AssessmentError(
            'Belum ada sesi ujian praktek aktif. Hubungi admin kegiatan.'));
        return;
      }
      _ujianCache[event.kegiatanId] = ujianId;
      emit(AssessmentUjianResolved(ujianId));
    } on DioException catch (e) {
      emit(AssessmentError(_messageFromError(e, 'Gagal memuat sesi ujian')));
    } catch (_) {
      emit(const AssessmentError("Terjadi kesalahan koneksi"));
    }
  }

  /// F3 - Submit bulk SEMUA item satu peserta via endpoint ujian praktek.
  /// pengujiUserId diambil dari token (req.user) oleh backend.
  Future<void> _onBulkScoreSubmit(
      AssessmentBulkScoreSubmitRequested event, Emitter<AssessmentState> emit) async {
    try {
      final items = event.skorByItem.entries.map((e) => {
            'itemPenilaianId': e.key,
            'skor': e.value,
            if (event.catatanByItem[e.key] != null &&
                event.catatanByItem[e.key]!.isNotEmpty)
              'komentar': event.catatanByItem[e.key],
          });
      await _apiClient.dio.post(
        AppConstants.graduationUjianPraktekScore(
            event.kegiatanId, event.ujianPraktekId),
        data: {
          'scores': [
            {
              'calonAnggotaId': event.calonAnggotaId,
              'items': items.toList(),
            }
          ],
        },
      );
      emit(const AssessmentScoreSaved("Nilai berhasil disimpan"));
    } on DioException catch (e) {
      emit(AssessmentError(_messageFromError(e, 'Gagal simpan nilai')));
    } catch (_) {
      emit(const AssessmentError("Terjadi kesalahan koneksi"));
    }
  }
}
