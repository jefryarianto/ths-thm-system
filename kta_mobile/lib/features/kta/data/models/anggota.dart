enum Tingkatan { pratama, tamtama, muda, madya, utama }

enum JenisKelamin { L, P }

class Anggota {
  final String nama;
  final JenisKelamin? jenisKelamin;
  final String nomor;
  final String ranting;
  final String tempatDadar;
  final String tahunDadar;
  final String? berlakuSampai;
  final Tingkatan tingkatan;
  final String? fotoUrl;
  final String? qrImageUrl;
  final String? verifyUrl;
  final String tempatTanggalLahir;
  final String pekerjaan;
  final String status;
  final String? tanggalPelantikan;
  final String? tahunPelantikan;
  final String alamat;
  final String? tanggalTerbit;
  final String? koordinator;
  final String? tandaTanganUrl;

  const Anggota({
    required this.nama,
    this.jenisKelamin,
    required this.nomor,
    required this.ranting,
    required this.tempatDadar,
    required this.tahunDadar,
    this.berlakuSampai,
    required this.tingkatan,
    this.fotoUrl,
    this.qrImageUrl,
    this.verifyUrl,
    required this.tempatTanggalLahir,
    required this.pekerjaan,
    required this.status,
    this.tanggalPelantikan,
    this.tahunPelantikan,
    required this.alamat,
    this.tanggalTerbit,
    this.koordinator,
    this.tandaTanganUrl,
  });

  factory Anggota.fromJson(Map<String, dynamic> json) {
    return Anggota(
      nama: json['nama'] as String,
      jenisKelamin: json['jenisKelamin'] != null
          ? JenisKelamin.values.byName(json['jenisKelamin'] as String)
          : null,
      nomor: json['nomor'] as String,
      ranting: json['ranting'] as String,
      tempatDadar: json['tempatDadar'] as String,
      tahunDadar: json['tahunDadar'] as String,
      berlakuSampai: json['berlakuSampai'] as String?,
      tingkatan: Tingkatan.values.byName(json['tingkatan'] as String),
      fotoUrl: json['fotoUrl'] as String?,
      qrImageUrl: json['qrImageUrl'] as String?,
      verifyUrl: json['verifyUrl'] as String?,
      tempatTanggalLahir: json['tempatTanggalLahir'] as String,
      pekerjaan: json['pekerjaan'] as String,
      status: json['status'] as String,
      tanggalPelantikan: json['tanggalPelantikan'] as String?,
      tahunPelantikan: json['tahunPelantikan'] as String?,
      alamat: json['alamat'] as String,
      tanggalTerbit: json['tanggalTerbit'] as String?,
      koordinator: json['koordinator'] as String?,
      tandaTanganUrl: json['tandaTanganUrl'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'nama': nama,
    'jenisKelamin': jenisKelamin?.name,
    'nomor': nomor,
    'ranting': ranting,
    'tempatDadar': tempatDadar,
    'tahunDadar': tahunDadar,
    'berlakuSampai': berlakuSampai,
    'tingkatan': tingkatan.name,
    'fotoUrl': fotoUrl,
    'qrImageUrl': qrImageUrl,
    'verifyUrl': verifyUrl,
    'tempatTanggalLahir': tempatTanggalLahir,
    'pekerjaan': pekerjaan,
    'status': status,
    'tanggalPelantikan': tanggalPelantikan,
    'tahunPelantikan': tahunPelantikan,
    'alamat': alamat,
    'tanggalTerbit': tanggalTerbit,
    'koordinator': koordinator,
    'tandaTanganUrl': tandaTanganUrl,
  };

  Anggota copyWith({
    String? nama,
    JenisKelamin? jenisKelamin,
    String? nomor,
    String? ranting,
    String? tempatDadar,
    String? tahunDadar,
    String? berlakuSampai,
    Tingkatan? tingkatan,
    String? fotoUrl,
    String? qrImageUrl,
    String? verifyUrl,
    String? tempatTanggalLahir,
    String? pekerjaan,
    String? status,
    String? tanggalPelantikan,
    String? tahunPelantikan,
    String? alamat,
    String? tanggalTerbit,
    String? koordinator,
    String? tandaTanganUrl,
  }) {
    return Anggota(
      nama: nama ?? this.nama,
      jenisKelamin: jenisKelamin ?? this.jenisKelamin,
      nomor: nomor ?? this.nomor,
      ranting: ranting ?? this.ranting,
      tempatDadar: tempatDadar ?? this.tempatDadar,
      tahunDadar: tahunDadar ?? this.tahunDadar,
      berlakuSampai: berlakuSampai ?? this.berlakuSampai,
      tingkatan: tingkatan ?? this.tingkatan,
      fotoUrl: fotoUrl ?? this.fotoUrl,
      qrImageUrl: qrImageUrl ?? this.qrImageUrl,
      verifyUrl: verifyUrl ?? this.verifyUrl,
      tempatTanggalLahir: tempatTanggalLahir ?? this.tempatTanggalLahir,
      pekerjaan: pekerjaan ?? this.pekerjaan,
      status: status ?? this.status,
      tanggalPelantikan: tanggalPelantikan ?? this.tanggalPelantikan,
      tahunPelantikan: tahunPelantikan ?? this.tahunPelantikan,
      alamat: alamat ?? this.alamat,
      tanggalTerbit: tanggalTerbit ?? this.tanggalTerbit,
      koordinator: koordinator ?? this.koordinator,
      tandaTanganUrl: tandaTanganUrl ?? this.tandaTanganUrl,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Anggota &&
          runtimeType == other.runtimeType &&
          nama == other.nama &&
          jenisKelamin == other.jenisKelamin &&
          nomor == other.nomor &&
          ranting == other.ranting &&
          tempatDadar == other.tempatDadar &&
          tahunDadar == other.tahunDadar &&
          berlakuSampai == other.berlakuSampai &&
          tingkatan == other.tingkatan &&
          fotoUrl == other.fotoUrl &&
          qrImageUrl == other.qrImageUrl &&
          verifyUrl == other.verifyUrl &&
          tempatTanggalLahir == other.tempatTanggalLahir &&
          pekerjaan == other.pekerjaan &&
          status == other.status &&
          tanggalPelantikan == other.tanggalPelantikan &&
          tahunPelantikan == other.tahunPelantikan &&
          alamat == other.alamat &&
          tanggalTerbit == other.tanggalTerbit &&
          koordinator == other.koordinator &&
          tandaTanganUrl == other.tandaTanganUrl;

  @override
  int get hashCode => Object.hashAll([
    nama,
    jenisKelamin,
    nomor,
    ranting,
    tempatDadar,
    tahunDadar,
    berlakuSampai,
    tingkatan,
    fotoUrl,
    qrImageUrl,
    verifyUrl,
    tempatTanggalLahir,
    pekerjaan,
    status,
    tanggalPelantikan,
    tahunPelantikan,
    alamat,
    tanggalTerbit,
    koordinator,
    tandaTanganUrl,
  ]);
}
