/// Model Berita - memetakan JSON dari endpoint publik:
/// - `GET /public/beranda` (list berita terbaru, take 3)
/// - `GET /public/berita/:slug` (detail)
/// - `GET /content/berita` (semua berita, admin)
///
/// Field mengikuti kolom Prisma `Berita` (tabel `berita`).
class Berita {
  final String id;
  final String judul;
  final String ringkasan;
  final String konten;
  final String? gambar;
  final DateTime tanggal;
  final String slug;
  final bool isVisible;

  const Berita({
    required this.id,
    required this.judul,
    required this.ringkasan,
    required this.konten,
    this.gambar,
    required this.tanggal,
    required this.slug,
    this.isVisible = true,
  });

  factory Berita.fromJson(Map<String, dynamic> json) => Berita(
        id: json['id']?.toString() ?? '',
        judul: json['judul']?.toString() ?? '',
        ringkasan: json['ringkasan']?.toString() ?? '',
        konten: json['konten']?.toString() ?? '',
        gambar: json['gambar']?.toString(),
        tanggal: DateTime.tryParse(json['tanggal']?.toString() ?? '') ??
            DateTime.now(),
        slug: json['slug']?.toString() ?? '',
        isVisible: json['is_visible'] == true || json['isVisible'] == true,
      );
}
