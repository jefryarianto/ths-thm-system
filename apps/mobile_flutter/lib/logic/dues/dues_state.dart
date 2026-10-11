part of 'dues_bloc.dart';

abstract class DuesState extends Equatable {
  const DuesState();

  @override
  List<Object> get props => [];
}

class DuesInitial extends DuesState {}

class DuesLoading extends DuesState {}

class DuesLoaded extends DuesState {
  final List<Due> dues;

  /// true bila data berasal dari cache offline (bukan server).
  final bool isStale;

  /// Pesan error non-blocking bila segarkan gagal tetapi cache tersedia.
  final String? errorMessage;

  const DuesLoaded({
    required this.dues,
    this.isStale = false,
    this.errorMessage,
  });

  @override
  List<Object> get props => [dues, isStale, errorMessage ?? ''];
}

class DuesError extends DuesState {
  final String message;

  const DuesError({required this.message});

  @override
  List<Object> get props => [message];
}

/// Sedang mengunggah bukti pembayaran untuk satu iuran. Mempertahankan
/// daftar `dues` + `iuranId` yang sedang diproses agar UI bisa menandai
/// kartu mana yang menunggu (mis. tombol jadi loading).
class DuesProofUploading extends DuesState {
  final List<Due> dues;
  final String iuranId;

  const DuesProofUploading({required this.dues, required this.iuranId});

  @override
  List<Object> get props => [dues, iuranId];
}

/// Bukti pembayaran berhasil diunggah — status iuran menjadi
/// `menunggu_verifikasi`. Mempertahankan `dues` terbaru (sudah di-reload
/// bloc) + pesan untuk ditampilkan ke anggota.
class DuesProofUploadSuccess extends DuesState {
  final List<Due> dues;
  final String message;

  const DuesProofUploadSuccess({required this.dues, required this.message});

  @override
  List<Object> get props => [dues, message];
}
