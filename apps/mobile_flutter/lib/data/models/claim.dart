/// Model klaim akun anggota lama.
///
/// Dipakai untuk daftar (GET /claims) di admin dan
/// response setelah submit (POST /claims).
class Claim {
  final String id;
  final String tipe;
  final String status;
  final String? catatan;
  final String? anggotaId;
  final String? namaLengkap;
  final String? jenisKelamin;
  final String? tempatLahir;
  final String? tanggalLahir;
  final String? alamat;
  final String? noHp;
  final String? email;
  final String? rantingId;
  final List<dynamic>? buktiDokumen;
  final String createdAt;
  final RantingClaimInfo? ranting;
  final AnggotaClaimInfo? anggota;

  const Claim({
    required this.id,
    required this.tipe,
    required this.status,
    this.catatan,
    this.anggotaId,
    this.namaLengkap,
    this.jenisKelamin,
    this.tempatLahir,
    this.tanggalLahir,
    this.alamat,
    this.noHp,
    this.email,
    this.rantingId,
    this.buktiDokumen,
    required this.createdAt,
    this.ranting,
    this.anggota,
  });

  factory Claim.fromJson(Map<String, dynamic> json) {
    return Claim(
      id: _str(json['id']),
      tipe: _str(json['tipe']),
      status: _str(json['status']),
      catatan: json['catatan']?.toString(),
      anggotaId: json['anggotaId']?.toString(),
      namaLengkap: json['namaLengkap']?.toString(),
      jenisKelamin: json['jenisKelamin']?.toString(),
      tempatLahir: json['tempatLahir']?.toString(),
      tanggalLahir: json['tanggalLahir']?.toString(),
      alamat: json['alamat']?.toString(),
      noHp: json['noHp']?.toString(),
      email: json['email']?.toString(),
      rantingId: json['rantingId']?.toString(),
      buktiDokumen: json['buktiDokumen'] as List<dynamic>?,
      createdAt: json['createdAt']?.toString() ?? '',
      ranting: json['ranting'] != null
          ? RantingClaimInfo.fromJson(json['ranting'] as Map<String, dynamic>)
          : null,
      anggota: json['anggota'] != null
          ? AnggotaClaimInfo.fromJson(json['anggota'] as Map<String, dynamic>)
          : null,
    );
  }

  static String _str(dynamic v) => v?.toString() ?? '';

  /// Label status yang user-friendly.
  String get statusLabel {
    switch (status) {
      case 'pending':
        return 'Menunggu';
      case 'diproses':
        return 'Diproses';
      case 'disetujui':
        return 'Disetujui';
      case 'ditolak':
        return 'Ditolak';
      default:
        return status;
    }
  }

  /// Label tipe klaim.
  String get tipeLabel => tipe == 'keanggotaan' ? 'Keanggotaan' : 'Dokumen';
}

class RantingClaimInfo {
  final String id;
  final String nama;
  const RantingClaimInfo({required this.id, required this.nama});
  factory RantingClaimInfo.fromJson(Map<String, dynamic> json) =>
      RantingClaimInfo(id: _str(json['id']), nama: _str(json['nama']));
  static String _str(dynamic v) => v?.toString() ?? '';
}

class AnggotaClaimInfo {
  final String id;
  final String? nomorAnggota;
  final String? namaLengkap;
  const AnggotaClaimInfo({
    required this.id,
    this.nomorAnggota,
    this.namaLengkap,
  });
  factory AnggotaClaimInfo.fromJson(Map<String, dynamic> json) =>
      AnggotaClaimInfo(
        id: _str(json['id']),
        nomorAnggota: json['nomorAnggota']?.toString(),
        namaLengkap: json['namaLengkap']?.toString(),
      );
  static String _str(dynamic v) => v?.toString() ?? '';
}
