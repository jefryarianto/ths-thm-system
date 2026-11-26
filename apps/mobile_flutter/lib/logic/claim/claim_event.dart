part of 'claim_bloc.dart';

abstract class ClaimEvent extends Equatable {
  const ClaimEvent();
  @override
  List<Object?> get props => <Object?>[];
}

class ClaimLoadRequested extends ClaimEvent {
  final String? status;
  final String? tipe;
  const ClaimLoadRequested({this.status, this.tipe});
  @override
  List<Object?> get props => [status, tipe];
}

class ClaimCreateRequested extends ClaimEvent {
  final String tipe;
  final String? anggotaId;
  final String? catatan;
  // Data diri pelapor (klaim keanggotaan)
  final String? namaLengkap;
  final String? jenisKelamin;
  final String? tempatLahir;
  final String? tanggalLahir;
  final String? tempatDadar;
  final String? tahunDadar;
  final String? alamat;
  final String? noHp;
  final String? email;
  final String? rantingId;
  final String modeBukti;
  final String? ceritaHistori;
  final List<String> buktiFilePaths;
  const ClaimCreateRequested({
    required this.tipe,
    this.anggotaId,
    this.catatan,
    this.namaLengkap,
    this.jenisKelamin,
    this.tempatLahir,
    this.tanggalLahir,
    this.tempatDadar,
    this.tahunDadar,
    this.alamat,
    this.noHp,
    this.email,
    this.rantingId,
    this.modeBukti = 'unggah',
    this.ceritaHistori,
    this.buktiFilePaths = const [],
  });
  @override
  List<Object?> get props => [
        tipe,
        anggotaId,
        namaLengkap,
        modeBukti,
        ceritaHistori,
        buktiFilePaths,
      ];
}

class ClaimApproveRequested extends ClaimEvent {
  final String id;
  const ClaimApproveRequested(this.id);
  @override
  List<Object?> get props => [id];
}

class ClaimRejectRequested extends ClaimEvent {
  final String id;
  final String? reason;
  const ClaimRejectRequested(this.id, {this.reason});
  @override
  List<Object?> get props => [id, reason];
}

class ClaimProcessRequested extends ClaimEvent {
  final String id;
  const ClaimProcessRequested(this.id);
  @override
  List<Object?> get props => [id];
}
