import 'package:equatable/equatable.dart';

abstract class AssessmentEvent extends Equatable {
  const AssessmentEvent();
  @override
  List<Object?> get props => <Object?>[];
}

/// F2 - Muat daftar aspek penilaian milik suatu kegiatan.
class AssessmentAspectsRequested extends AssessmentEvent {
  final String kegiatanId;
  const AssessmentAspectsRequested(this.kegiatanId);
  @override
  List<Object?> get props => <Object?>[kegiatanId];
}

/// F2 - Tambah aspek penilaian baru.
class AssessmentAspectCreateRequested extends AssessmentEvent {
  final String kegiatanId;
  final String kodeAspek;
  final String namaAspek;
  final String? deskripsi;
  final double bobot;
  const AssessmentAspectCreateRequested({
    required this.kegiatanId,
    required this.kodeAspek,
    required this.namaAspek,
    this.deskripsi,
    required this.bobot,
  });
  @override
  List<Object?> get props => <Object?>[kegiatanId, kodeAspek, namaAspek, deskripsi, bobot];
}

/// F2 - Perbarui aspek penilaian.
class AssessmentAspectUpdateRequested extends AssessmentEvent {
  final String aspekId;
  final String namaAspek;
  final String? deskripsi;
  final double bobot;
  const AssessmentAspectUpdateRequested({
    required this.aspekId,
    required this.namaAspek,
    this.deskripsi,
    required this.bobot,
  });
  @override
  List<Object?> get props => <Object?>[aspekId, namaAspek, deskripsi, bobot];
}

/// F2 - Hapus aspek penilaian.
class AssessmentAspectDeleteRequested extends AssessmentEvent {
  final String aspekId;
  const AssessmentAspectDeleteRequested(this.aspekId);
  @override
  List<Object?> get props => <Object?>[aspekId];
}

/// F2 - Muat daftar item penilaian milik suatu aspek.
class AssessmentItemsRequested extends AssessmentEvent {
  final String aspekId;
  const AssessmentItemsRequested(this.aspekId);
  @override
  List<Object?> get props => <Object?>[aspekId];
}

/// F2 - Tambah item penilaian baru.
class AssessmentItemCreateRequested extends AssessmentEvent {
  final String aspekId;
  final String kodeItem;
  final String namaItem;
  final double skorMaksimal;
  final double bobot;
  final int? urutan;
  const AssessmentItemCreateRequested({
    required this.aspekId,
    required this.kodeItem,
    required this.namaItem,
    required this.skorMaksimal,
    required this.bobot,
    this.urutan,
  });
  @override
  List<Object?> get props => <Object?>[aspekId, kodeItem, namaItem, skorMaksimal, bobot, urutan];
}

/// F2 - Perbarui item penilaian.
class AssessmentItemUpdateRequested extends AssessmentEvent {
  final String aspekId;
  final String itemId;
  final String namaItem;
  final double skorMaksimal;
  final double bobot;
  const AssessmentItemUpdateRequested({
    required this.aspekId,
    required this.itemId,
    required this.namaItem,
    required this.skorMaksimal,
    required this.bobot,
  });
  @override
  List<Object?> get props => <Object?>[aspekId, itemId, namaItem, skorMaksimal, bobot];
}

/// F2 - Hapus item penilaian.
class AssessmentItemDeleteRequested extends AssessmentEvent {
  final String aspekId;
  final String itemId;
  const AssessmentItemDeleteRequested({required this.aspekId, required this.itemId});
  @override
  List<Object?> get props => <Object?>[aspekId, itemId];
}

/// F3 - Muat daftar peserta (calon anggota) suatu pendadaran utk diinput
/// nilainya oleh penguji.
class AssessmentParticipantsRequested extends AssessmentEvent {
  final String kegiatanId;
  const AssessmentParticipantsRequested(this.kegiatanId);
  @override
  List<Object?> get props => <Object?>[kegiatanId];
}

/// F3 - Muat nilai yg sudah disimpan utk satu calon (cek status "sudah
/// dinilai" & cegah duplikat). Kuncinya adalah itemPenilaianId.
class AssessmentScoresRequested extends AssessmentEvent {
  final String kegiatanId;
  final String calonAnggotaId;
  const AssessmentScoresRequested(this.kegiatanId, this.calonAnggotaId);
  @override
  List<Object?> get props => <Object?>[kegiatanId, calonAnggotaId];
}

/// F3 - Resolve sesi ujian praktek aktif milik pendadaran (aturan: semua
/// penguji x semua aspek memakai SATU ujian; pilih yg tidak dibatalkan).
class AssessmentUjianResolveRequested extends AssessmentEvent {
  final String kegiatanId;

  /// true = abaikan cache & resolve ulang dari server (dipakai saat refresh
  /// layar / retry). false = boleh memakai id ujian yang sudah di-cache.
  final bool force;

  const AssessmentUjianResolveRequested(this.kegiatanId, {this.force = false});

  @override
  List<Object?> get props => <Object?>[kegiatanId, force];
}

/// F3 - Submit SEMUA nilai satu peserta sekaligus (bulk) via endpoint ujian
/// praktek yg benar: POST /graduations/:id/ujian-praktek/:ujianId/score.
/// Payload: {scores: [{calonAnggotaId, items: [{itemPenilaianId, skor, komentar?}]}]}.
class AssessmentBulkScoreSubmitRequested extends AssessmentEvent {
  final String kegiatanId;
  final String ujianPraktekId;
  final String calonAnggotaId;
  final Map<String, double> skorByItem;
  final Map<String, String> catatanByItem;
  const AssessmentBulkScoreSubmitRequested({
    required this.kegiatanId,
    required this.ujianPraktekId,
    required this.calonAnggotaId,
    required this.skorByItem,
    this.catatanByItem = const {},
  });
  @override
  List<Object?> get props => <Object?>[
        kegiatanId,
        ujianPraktekId,
        calonAnggotaId,
        skorByItem,
        catatanByItem,
      ];
}

/// F3+ - Muat SEMUA data layar input nilai dalam satu request:
/// ujian praktek aktif + aspek/item + peserta + skor milik penguji.
/// force=true melewati cache id ujian (refresh layar / retry).
class AssessmentScoreCardRequested extends AssessmentEvent {
  final String kegiatanId;
  final bool force;
  const AssessmentScoreCardRequested(this.kegiatanId, {this.force = false});
  @override
  List<Object?> get props => <Object?>[kegiatanId, force];
}

/// F3 - Submit satu nilai utk satu item penilaian milik seorang calon.
/// (LEGACY: endpoint /assessments/scores tanpa sesi ujian. Dipertahankan
/// utk kompatibilitas, tapi layar input nilai memakai versi bulk di atas.)
class AssessmentScoreSubmitRequested extends AssessmentEvent {
  final String kegiatanId;
  final String calonAnggotaId;
  final String itemPenilaianId;
  final String pengujiUserId;
  final double skor;
  final String? catatan;
  const AssessmentScoreSubmitRequested({
    required this.kegiatanId,
    required this.calonAnggotaId,
    required this.itemPenilaianId,
    required this.pengujiUserId,
    required this.skor,
    this.catatan,
  });
  @override
  List<Object?> get props => <Object?>[
        kegiatanId,
        calonAnggotaId,
        itemPenilaianId,
        pengujiUserId,
        skor,
        catatan,
      ];
}
