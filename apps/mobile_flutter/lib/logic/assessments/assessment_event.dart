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

/// F2 - Tambah item penilaian baru pada aspek.
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
