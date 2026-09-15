/// Model pendaftaran calon anggota baru.
///
/// Dipakai untuk daftar (GET /registrations) di admin dan
/// response setelah submit (POST /registrations).
class Registration {
  final String id;
  final String namaLengkap;
  final String jenisKelamin;
  final String? tempatLahir;
  final String? tanggalLahir;
  final String? alamat;
  final String? noHp;
  final String? email;
  final String? sumberInfo;
  final String? rantingId;
  final String status;
  final String? catatan;
  final String createdAt;
  final RantingInfo? ranting;

  const Registration({
    required this.id,
    required this.namaLengkap,
    required this.jenisKelamin,
    this.tempatLahir,
    this.tanggalLahir,
    this.alamat,
    this.noHp,
    this.email,
    this.sumberInfo,
    this.rantingId,
    required this.status,
    this.catatan,
    required this.createdAt,
    this.ranting,
  });

  factory Registration.fromJson(Map<String, dynamic> json) {
    return Registration(
      id: _str(json['id']),
      namaLengkap: _str(json['namaLengkap']),
      jenisKelamin: _str(json['jenisKelamin']),
      tempatLahir: json['tempatLahir']?.toString(),
      tanggalLahir: json['tanggalLahir']?.toString(),
      alamat: json['alamat']?.toString(),
      noHp: json['noHp']?.toString(),
      email: json['email']?.toString(),
      sumberInfo: json['sumberInfo']?.toString(),
      rantingId: json['rantingId']?.toString(),
      status: _str(json['status']),
      catatan: json['catatan']?.toString(),
      createdAt: json['createdAt']?.toString() ?? '',
      ranting: json['ranting'] != null
          ? RantingInfo.fromJson(json['ranting'] as Map<String, dynamic>)
          : null,
    );
  }

  static String _str(dynamic v) => v?.toString() ?? '';
}

class RantingInfo {
  final String id;
  final String nama;
  const RantingInfo({required this.id, required this.nama});
  factory RantingInfo.fromJson(Map<String, dynamic> json) =>
      RantingInfo(id: _str(json['id']), nama: _str(json['nama']));
  static String _str(dynamic v) => v?.toString() ?? '';
}
