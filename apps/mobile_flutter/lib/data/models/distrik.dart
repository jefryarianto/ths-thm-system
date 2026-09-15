/// Model ringan untuk dropdown distrik dari endpoint publik.
///
/// Dipakai di form publik (pendaftaran calon anggota / klaim akun) sebagai
/// level teratas hierarki Distrik → Wilayah → Ranting.
class Distrik {
  final String id;
  final String nama;

  const Distrik({required this.id, required this.nama});

  factory Distrik.fromJson(Map<String, dynamic> json) {
    return Distrik(
      id: (json['id'] ?? '').toString(),
      nama: (json['nama'] ?? '').toString(),
    );
  }

  @override
  String toString() => nama;
}