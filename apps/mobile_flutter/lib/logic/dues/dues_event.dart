part of 'dues_bloc.dart';

abstract class DuesEvent extends Equatable {
  const DuesEvent();

  @override
  List<Object> get props => [];
}

class DuesLoadRequested extends DuesEvent {
  const DuesLoadRequested();

  @override
  List<Object> get props => [];
}

class DuesLogoutRequested extends DuesEvent {
  const DuesLogoutRequested();

  @override
  List<Object> get props => [];
}

/// Unggah bukti pembayaran untuk satu iuran milik anggota sendiri via
/// `POST /payments/:id/upload-proof` (multipart/form-data, field `bukti`).
/// Setelah berhasil, daftar iuran di-reload agar `buktiBayarPath` dan status
/// `menunggu_verifikasi` terbaru terbaca.
class DuesUploadProofRequested extends DuesEvent {
  final String iuranId;
  final String filePath;
  final String? catatan;

  const DuesUploadProofRequested({
    required this.iuranId,
    required this.filePath,
    this.catatan,
  });

  @override
  List<Object> get props => [iuranId, filePath, catatan ?? ''];
}
