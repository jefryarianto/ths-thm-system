/// Model Kegiatan (agenda resmi organisasi) - memetakan JSON dari endpoint
/// `GET /activities` (scope member/anggota, lihat ActivitiesController.
///
/// DIPAKAI: bagian "Agenda" beranda - kartu horizontal dengan kotak tanggal
/// emas di atas (urutan tanggal mulai, hanya yang status `diterbitkan`).
class Kegiatan {
  final String id;
  final String nama;
  final String tipe;
  final String lokasi;
  final DateTime tanggalMulai;
  final DateTime? tanggalSelesai;
  final String status;

  const Kegiatan({
    required this.id,
    required this.nama,
    required this.tipe,
    required this.lokasi,
    required this.tanggalMulai,
    this.tanggalSelesai,
    this.status = 'draft',
  });

  factory Kegiatan.fromJson(Map<String, dynamic> json) => Kegiatan(
        id: json['id']?.toString() ?? '',
        nama: json['nama']?.toString() ?? '',
        tipe: json['tipe']?.toString() ?? '',
        lokasi: json['lokasi']?.toString() ?? '',
        tanggalMulai: DateTime.tryParse(json['tanggalMulai']?.toString() ?? '') ??
            DateTime.now(),
        tanggalSelesai: json['tanggalSelesai'] != null
            ? DateTime.tryParse(json['tanggalSelesai'].toString())
            : null,
        status: json['status']?.toString() ?? '',
      );

  /// Nama bulan, mis. 'SEP' - dipakai kotak tanggal emas di agenda.
  String get bulanSingkat {
    const bulan = [
      'JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN',
      'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES',
    ];
    return bulan[tanggalMulai.month - 1];
  }

  /// Tanggal angka (tanpa nol depan) untuk kotak tanggal emas.
  String get tanggalAngka => tanggalMulai.day.toString();

  /// Deskripsi pendek lokasi + tanggal untuk subtitle kartu agenda.
  String get ringkas =>
      '${lokasi.isNotEmpty ? lokasi : 'Lokasi disusulkan'} • '
      '$tanggalAngka $bulanSingkat'.trim();
}

/// Status kegiatan yang pantas tampil di agenda beranda (enum API:
/// `draft | published | closed | cancelled`).
bool kegiatanTampil(String status) => status == 'published';
