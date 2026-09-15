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
