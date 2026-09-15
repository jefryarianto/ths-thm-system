/// Model ringan untuk dropdown wilayah dari endpoint publik.
///
/// Dipakai di form publik (pendaftaran calon anggota / klaim akun) sebagai
/// level tengah hierarki Distrik → Wilayah → Ranting.
class Wilayah {
  final String id;
  final String nama;
  final String? distrikId;

  const Wilayah({required this.id, required this.nama, this.distrikId});

  factory Wilayah.fromJson(Map<String, dynamic> json) {
    return Wilayah(
      id: (json['id'] ?? '').toString(),
      nama: (json['nama'] ?? '').toString(),
      distrikId: json['distrikId']?.toString(),
    );
  }

  @override
  String toString() => nama;
}