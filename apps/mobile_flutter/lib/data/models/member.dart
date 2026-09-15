import '../../core/api/api_client.dart';

/// Model anggota yang memetakan langsung ke JSON dari `GET /members/me`.
///
/// Field sesuai skema Prisma `Anggota` + relasi `ranting.wilayah.distrik`.
/// Getter kompatibel (`fotoUrl`, `nomorTelepon`, `status`, `kabupaten`,
/// `provinsi`) disediakan agar screen lama tidak perlu dirombak sekaligus.
class Member {
  final String id;
  final String email;
  final String nomorAnggota;
  final String namaLengkap;
  final String jenisKelamin;
  final String tingkat;
  final String statusKeanggotaan;
  final String statusValidasi;
  final String statusData;
  final String tempatLahir;
  final String tanggalLahir;
  final String tempatDadar;
  final String tahunDadar;
  final String alamat;
  final String noHp;
  final String fotoPath;
  final String rantingId;
  // Nested relation names
  final String namaRanting;
  final String namaWilayah;
  final String namaDistrik;

  const Member({
    required this.id,
    required this.email,
    required this.nomorAnggota,
    required this.namaLengkap,
    required this.jenisKelamin,
    required this.tingkat,
    required this.statusKeanggotaan,
    required this.statusValidasi,
    required this.statusData,
    required this.tempatLahir,
    required this.tanggalLahir,
    required this.tempatDadar,
    required this.tahunDadar,
    required this.alamat,
    required this.noHp,
    required this.fotoPath,
    required this.rantingId,
    required this.namaRanting,
    required this.namaWilayah,
    required this.namaDistrik,
  });

  // ── Backward-compatible getters (used by Profile / KTA screens) ──────

  /// URL absolut foto profil. Jika `fotoPath` hanya filename, prefix
  /// `/api/uploads/` otomatis ditambahkan.
  String get fotoUrl {
    final p = fotoPath.trim();
    if (p.isEmpty) return '';
    if (p.startsWith('http://') || p.startsWith('https://')) return p;
    final path = p.startsWith('/') ? p : '/api/uploads/$p';
    return ApiClient.resolveAbsolute(path);
  }

  String get nomorTelepon => noHp;
  String get status => statusKeanggotaan;
  String get kabupaten => namaWilayah;
  String get provinsi => namaDistrik;
  String get desa => '';
  String get kecamatan => '';
  String get kodePos => '';
  String get gelarDepan => '';
  String get gelarBelakang => '';
  String get role => '';

  // ── Factory ─────────────────────────────────────────────────────────

  factory Member.fromJson(Map<String, dynamic> json) {
    // Nested: ranting → wilayah → distrik
    final ranting = json['ranting'];
    final wilayah = ranting is Map<String, dynamic> ? ranting['wilayah'] : null;
    final distrik = wilayah is Map<String, dynamic> ? wilayah['distrik'] : null;

    return Member(
      id: _str(json, 'id'),
      email: _str(json, 'email'),
      nomorAnggota: _str(json, 'nomorAnggota'),
      namaLengkap: _str(json, 'namaLengkap'),
      jenisKelamin: _str(json, 'jenisKelamin'),
      tingkat: _str(json, 'tingkat'),
      statusKeanggotaan: _str(json, 'statusKeanggotaan'),
      statusValidasi: _str(json, 'statusValidasi'),
      statusData: _str(json, 'statusData'),
      tempatLahir: _str(json, 'tempatLahir'),
      tanggalLahir: _str(json, 'tanggalLahir'),
      tempatDadar: _str(json, 'tempatDadar'),
      tahunDadar: _str(json, 'tahunDadar'),
      alamat: _str(json, 'alamat'),
      noHp: _str(json, 'noHp'),
      fotoPath: _str(json, 'fotoPath'),
      rantingId: _str(json, 'rantingId'),
      namaRanting: _str(ranting, 'nama'),
      namaWilayah: _str(wilayah, 'nama'),
      namaDistrik: _str(distrik, 'nama'),
    );
  }

  /// Ekstrak nilai String dari JSON dengan aman (null → '').
  static String _str(Map<String, dynamic> json, String key) {
    final v = json[key];
    return v?.toString() ?? '';
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'nomorAnggota': nomorAnggota,
      'namaLengkap': namaLengkap,
      'jenisKelamin': jenisKelamin,
      'tingkat': tingkat,
      'statusKeanggotaan': statusKeanggotaan,
      'statusValidasi': statusValidasi,
      'statusData': statusData,
      'tempatLahir': tempatLahir,
      'tanggalLahir': tanggalLahir,
      'tempatDadar': tempatDadar,
      'tahunDadar': tahunDadar,
      'alamat': alamat,
      'noHp': noHp,
      'fotoPath': fotoPath,
      'rantingId': rantingId,
      'namaRanting': namaRanting,
      'namaWilayah': namaWilayah,
      'namaDistrik': namaDistrik,
    };
  }
}
