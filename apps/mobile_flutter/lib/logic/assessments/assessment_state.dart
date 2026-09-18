import 'package:equatable/equatable.dart';
import '../../data/models/graduation.dart';

abstract class AssessmentState extends Equatable {
  const AssessmentState();

  @override
  List<Object?> get props => <Object?>[];
}

class AssessmentInitial extends AssessmentState {
  const AssessmentInitial();
}

class AssessmentLoading extends AssessmentState {
  const AssessmentLoading();
}

class AssessmentLoaded extends AssessmentState {
  final List<AssessmentAspect> aspects;
  final List<AssessmentItem> items;
  const AssessmentLoaded({this.aspects = const [], this.items = const []});

  @override
  List<Object?> get props => <Object?>[aspects, items];
}

class AssessmentAspectSaved extends AssessmentState {
  final String message;
  const AssessmentAspectSaved(this.message);
  @override
  List<Object?> get props => <Object?>[message];
}

class AssessmentItemSaved extends AssessmentState {
  final String message;
  const AssessmentItemSaved(this.message);
  @override
  List<Object?> get props => <Object?>[message];
}

class AssessmentError extends AssessmentState {
  final String message;
  const AssessmentError(this.message);
  @override
  List<Object?> get props => <Object?>[message];
}

/// F3 - Daftar peserta pendadaran (utk dipilih penguji).
class AssessmentParticipantsLoaded extends AssessmentState {
  final List<GraduationParticipant> participants;
  const AssessmentParticipantsLoaded(this.participants);
  @override
  List<Object?> get props => <Object?>[participants];
}

/// F3 - Nilai yg sudah diinput utk satu calon (deteksi duplikat / lihat
/// progres; key = itemPenilaianId).
class AssessmentScoresLoaded extends AssessmentState {
  final Map<String, AssessmentScore> scoresByItem;
  const AssessmentScoresLoaded(this.scoresByItem);
  @override
  List<Object?> get props => <Object?>[scoresByItem];
}

/// F3 - Nilai utk satu item berhasil disimpan.
class AssessmentScoreSaved extends AssessmentState {
  final String message;
  const AssessmentScoreSaved(this.message);
  @override
  List<Object?> get props => <Object?>[message];
}

/// F3 - Sesi ujian praktek aktif berhasil di-resolve (id ujian utk submit bulk).
class AssessmentUjianResolved extends AssessmentState {
  final String ujianPraktekId;
  const AssessmentUjianResolved(this.ujianPraktekId);
  @override
  List<Object?> get props => <Object?>[ujianPraktekId];
}

/// F3 - State gabungan layar input nilai: aspek (beserta item di dalamnya)
/// DAN daftar peserta tersedia bersamaan, supaya dropdown Aspek/Item tidak
/// kosong saat daftar peserta sudah tampil.
class AssessmentScoringReady extends AssessmentState {
  final List<AssessmentAspect> aspects;
  final List<GraduationParticipant> participants;
  const AssessmentScoringReady({
    this.aspects = const [],
    this.participants = const [],
  });
  @override
  List<Object?> get props => <Object?>[aspects, participants];
}

/// F3+ - Hasil endpoint agregat my-score-card: SEMUA kebutuhan layar input
/// nilai dalam satu state yang konsisten (tidak ada gabungan 3 fetch).
class AssessmentScoreCardReady extends AssessmentState {
  final String? ujianPraktekId;
  final String? ujianStatus;
  final List<AssessmentAspect> aspects;
  final List<GraduationParticipant> participants;

  /// Skor milik penguji pemanggil yang sudah tersimpan di server,
  /// key = itemPenilaianId → {skor, komentar}.
  final Map<String, ({double skor, String? komentar})> skorByItem;

  const AssessmentScoreCardReady({
    required this.ujianPraktekId,
    this.ujianStatus,
    this.aspects = const [],
    this.participants = const [],
    this.skorByItem = const {},
  });

  @override
  List<Object?> get props => <Object?>[
        ujianPraktekId,
        ujianStatus,
        aspects,
        participants,
        skorByItem,
      ];
}
