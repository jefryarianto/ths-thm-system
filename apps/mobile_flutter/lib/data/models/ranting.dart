/// Model ringan untuk dropdown ranting dari endpoint publik.
///
/// Dipakai di form pendaftaran calon anggota dan form klaim akun.
class Ranting {
  final String id;
  final String nama;
  final String? kodeRanting;
  final String? wilayahId;

  const Ranting({
    required this.id,
    required this.nama,
    this.kodeRanting,
    this.wilayahId,
  });

  factory Ranting.fromJson(Map<String, dynamic> json) {
    return Ranting(
      id: (json['id'] ?? '').toString(),
      nama: (json['nama'] ?? '').toString(),
      kodeRanting: json['kodeRanting']?.toString(),
      wilayahId: json['wilayahId']?.toString(),
    );
  }

  @override
  String toString() => nama;
}
