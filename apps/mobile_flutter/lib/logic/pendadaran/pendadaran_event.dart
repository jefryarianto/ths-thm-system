part of 'pendadaran_bloc.dart';

/// Event modul Pendadaran (wisuda/graduations).
abstract class PendadaranEvent extends Equatable {
  const PendadaranEvent();

  @override
  List<Object?> get props => [];
}

/// Event untuk memuat daftar pendadaran (list akhir + scope server).
class PendadaranLoadRequested extends PendadaranEvent {
  const PendadaranLoadRequested();

  @override
  List<Object> get props => const [];
}

/// Event untuk membuat pendadaran baru (admin distrik & kegiatan).
class PendadaranCreateRequested extends PendadaranEvent {
  final String nama;
  final String? lokasi;
  final String tanggalMulai;
  final String? tanggalSelesai;
  final String? adminKegiatanId;

  const PendadaranCreateRequested({
    required this.nama,
    this.lokasi,
    required this.tanggalMulai,
    this.tanggalSelesai,
    this.adminKegiatanId,
  });

  @override
  List<Object?> get props => [
        nama,
        lokasi,
        tanggalMulai,
        tanggalSelesai,
        adminKegiatanId,
      ];
}

/// Event untuk kembali ke kondisi awal (login habis / logout).
class PendadaranLogoutRequested extends PendadaranEvent {
  const PendadaranLogoutRequested();

  @override
  List<Object> get props => const [];
}
