part of 'pendadaran_bloc.dart';

/// Base state modul Pendadaran.
abstract class PendadaranState extends Equatable {
  /// Daftar pendadaran yang sudah dimuat (kosong jika belum / error).
  final List<Graduation> graduations;

  /// Pesan kesalahan (diisi ketika `PendadaranError`).
  final String? message;

  const PendadaranState({this.graduations = const [], this.message});

  @override
  List<Object?> get props => [graduations, message];
}

/// Kondisi awal: belum login / token habis / setelah logout.
class PendadaranInitial extends PendadaranState {
  const PendadaranInitial();

  @override
  List<Object?> get props => const [];
}

/// Sedang memuat daftar pendadaran.
class PendadaranLoading extends PendadaranState {
  const PendadaranLoading();

  @override
  List<Object?> get props => const [];
}

/// Sedang mengirim pembuatan pendadaran baru.
class PendadaranSubmitting extends PendadaranState {
  const PendadaranSubmitting();

  @override
  List<Object?> get props => const [];
}

/// Daftar pendadaran berhasil dimuat.
class PendadaranLoaded extends PendadaranState {
  final bool justCreated;

  const PendadaranLoaded({
    required super.graduations,
    this.justCreated = false,
  });

  @override
  List<Object?> get props => [graduations, justCreated];
}

/// Terjadi kesalahan jaringan / server.
class PendadaranError extends PendadaranState {
  const PendadaranError({required String message}) : super(message: message);

  /// Pesan selalu terisi (konstanta non-null dari konstruktor).
  @override
  String get message => super.message ?? '';

  @override
  List<Object?> get props => [message];
}
