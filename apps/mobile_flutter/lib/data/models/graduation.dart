/// Model pendadaran (graduations) — memetakan JSON dari `GET /graduations/*`.
///
/// Konvensi sama seperti model lain di folder ini: class manual + `fromJson`
/// defensif (helper `_str`/`_num`) karena backend Prisma bisa mengirim
/// `Decimal` sebagai String dan relasi yang `null`.
library;

class Graduation {
  final String id;
  final String nama;
  final String? lokasi;
  final String tanggalMulai;
  final String tanggalSelesai;
  final String status;
  final String tipe;
  final String? adminKegiatanId;
  final GraduationAdminKegiatan? adminKegiatan;
  final GraduationScope? distrik;
  final GraduationScope? wilayah;
  final GraduationScope? ranting;
  final int jumlahUndangan;
  final int jumlahHadir;
  final int jumlahPeserta;
  final String createdAt;

  Graduation({
    required this.id,
    required this.nama,
    this.lokasi,
    required this.tanggalMulai,
    required this.tanggalSelesai,
    required this.status,
    required this.tipe,
    this.adminKegiatanId,
    this.adminKegiatan,
    this.distrik,
    this.wilayah,
    this.ranting,
    this.jumlahUndangan = 0,
    this.jumlahHadir = 0,
    this.jumlahPeserta = 0,
    required this.createdAt,
  });

  factory Graduation.fromJson(Map<String, dynamic> json) {
    final count = json['_count'];
    return Graduation(
      id: _str(json['id']),
      nama: _str(json['nama']),
      lokasi: json['lokasi']?.toString(),
      tanggalMulai: _str(json['tanggalMulai']),
      tanggalSelesai: _str(json['tanggalSelesai']),
      status: _str(json['status']),
      tipe: _str(json['tipe']),
      adminKegiatanId: json['adminKegiatanId']?.toString(),
      adminKegiatan: json['adminKegiatan'] is Map<String, dynamic>
          ? GraduationAdminKegiatan.fromJson(json['adminKegiatan'])
          : null,
      distrik: json['distrik'] is Map<String, dynamic>
          ? GraduationScope.fromJson(json['distrik'])
          : null,
      wilayah: json['wilayah'] is Map<String, dynamic>
          ? GraduationScope.fromJson(json['wilayah'])
          : null,
      ranting: json['ranting'] is Map<String, dynamic>
          ? GraduationScope.fromJson(json['ranting'])
          : null,
      jumlahUndangan: (json['jumlahUndangan'] as num?)?.toInt() ??
          _countOf(count, 'undanganPendadaran'),
      jumlahHadir: (json['jumlahHadir'] as num?)?.toInt() ?? 0,
      jumlahPeserta: (json['jumlahPeserta'] as num?)?.toInt() ??
          _countOf(count, 'kegiatanPeserta'),
      createdAt: _str(json['createdAt']),
    );
  }

  static int _countOf(dynamic count, String key) {
    if (count is Map<String, dynamic>) {
      final v = count[key];
      if (v is num) return v.toInt();
    }
    return 0;
  }
}

class GraduationAdminKegiatan {
  final String id;
  final String namaLengkap;
  final String? email;

  const GraduationAdminKegiatan({
    required this.id,
    required this.namaLengkap,
    this.email,
  });

  factory GraduationAdminKegiatan.fromJson(Map<String, dynamic> json) {
    final user = json['user'];
    return GraduationAdminKegiatan(
      id: _str(json['id']),
      namaLengkap: _str(json['namaLengkap']),
      email: (user is Map<String, dynamic>
              ? user['email']?.toString()
              : json['email']?.toString()),
    );
  }
}

class GraduationScope {
  final String id;
  final String nama;

  const GraduationScope({required this.id, required this.nama});

  factory GraduationScope.fromJson(Map<String, dynamic> json) =>
      GraduationScope(id: _str(json['id']), nama: _str(json['nama']));
}

/// Aspek penilaian pendadaran (kriteria) — grup item.
class AssessmentAspect {
  final String id;
  final String kodeAspek;
  final String namaAspek;
  final String? deskripsi;
  final double bobot;
  final bool isActive;
  final List<AssessmentItem> items;

  const AssessmentAspect({
    required this.id,
    required this.kodeAspek,
    required this.namaAspek,
    this.deskripsi,
    required this.bobot,
    required this.isActive,
    this.items = const [],
  });

  factory AssessmentAspect.fromJson(Map<String, dynamic> json) {
    final rawItems = json['itemPenilaian'] is List
        ? (json['itemPenilaian'] as List).whereType<Map<String, dynamic>>()
        : const <Map<String, dynamic>>[];
    return AssessmentAspect(
      id: _str(json['id']),
      kodeAspek: _str(json['kodeAspek']),
      namaAspek: _str(json['namaAspek']),
      deskripsi: json['deskripsi']?.toString(),
      bobot: _num(json['bobot']),
      isActive: json['isActive'] as bool? ?? true,
      items: rawItems.map(AssessmentItem.fromJson).toList(),
    );
  }
}

class AssessmentItem {
  final String id;
  final String? aspekId;
  final String kodeItem;
  final String namaItem;
  final double skorMaksimal;
  final int urutan;
  final bool isActive;

  const AssessmentItem({
    required this.id,
    this.aspekId,
    required this.kodeItem,
    required this.namaItem,
    required this.skorMaksimal,
    required this.urutan,
    required this.isActive,
  });

  factory AssessmentItem.fromJson(Map<String, dynamic> json) => AssessmentItem(
        id: _str(json['id']),
        aspekId: json['aspekId']?.toString(),
        kodeItem: _str(json['kodeItem']),
        namaItem: _str(json['namaItem']),
        skorMaksimal: _num(json['skorMaksimal']),
        urutan: (json['urutan'] as num?)?.toInt() ?? 0,
        isActive: json['isActive'] as bool? ?? true,
      );
}

/// Undangan pendadaran H-7.
class GraduationInvitation {
  final String id;
  final String kegiatanId;
  final String anggotaId;
  final String status;
  final String? konfirmasiAt;
  final String? catatan;
  final GraduationParticipant anggota;

  const GraduationInvitation({
    required this.id,
    required this.kegiatanId,
    required this.anggotaId,
    required this.status,
    this.konfirmasiAt,
    this.catatan,
    required this.anggota,
  });

  factory GraduationInvitation.fromJson(Map<String, dynamic> json) {
    final rawAnggota = json['anggota'];
    return GraduationInvitation(
      id: _str(json['id']),
      kegiatanId: _str(json['kegiatanId']),
      anggotaId: _str(json['anggotaId']),
      status: _str(json['status']),
      konfirmasiAt: json['konfirmasiAt']?.toString(),
      catatan: json['catatan']?.toString(),
      anggota: rawAnggota is Map<String, dynamic>
          ? GraduationParticipant.fromJson(rawAnggota)
          : const GraduationParticipant(
              id: '', namaLengkap: 'Anggota', nomorAnggota: ''),
    );
  }
}

class GraduationParticipant {
  final String id;
  final String namaLengkap;
  final String nomorAnggota;
  final String? email;

  const GraduationParticipant({
    required this.id,
    required this.namaLengkap,
    required this.nomorAnggota,
    this.email,
  });

  factory GraduationParticipant.fromJson(Map<String, dynamic> json) =>
      GraduationParticipant(
        id: _str(json['id']),
        namaLengkap: _str(json['namaLengkap']),
        nomorAnggota: _str(json['nomorAnggota']),
        email: json['email']?.toString(),
      );
}

/// Penugasan penguji pada sebuah pendadaran.
class ExaminerAssignment {
  final String id;
  final String kegiatanId;
  final String pengujiUserId;
  final String peran;
  final String? catatan;
  final String status;
  final String? reviewCatatan;
  final String createdAt;
  final ExaminerUser pengujiUser;
  final String? approvedBy;

  const ExaminerAssignment({
    required this.id,
    required this.kegiatanId,
    required this.pengujiUserId,
    required this.peran,
    this.catatan,
    required this.status,
    this.reviewCatatan,
    required this.createdAt,
    required this.pengujiUser,
    this.approvedBy,
  });

  factory ExaminerAssignment.fromJson(Map<String, dynamic> json) {
    final rawUser = json['pengujiUser'];
    return ExaminerAssignment(
      id: _str(json['id']),
      kegiatanId: _str(json['kegiatanId']),
      pengujiUserId: _str(json['pengujiUserId']),
      peran: json['peran']?.toString() ?? 'penguji',
      catatan: json['catatan']?.toString(),
      status: _str(json['status']),
      reviewCatatan: json['reviewCatatan']?.toString(),
      createdAt: _str(json['createdAt']),
      approvedBy: json['approvedBy']?.toString(),
      pengujiUser: rawUser is Map<String, dynamic>
          ? ExaminerUser.fromJson(rawUser)
          : const ExaminerUser(id: '', namaLengkap: 'Penguji'),
    );
  }
}

class ExaminerUser {
  final String id;
  final String namaLengkap;
  final String? email;

  const ExaminerUser({required this.id, required this.namaLengkap, this.email});

  factory ExaminerUser.fromJson(Map<String, dynamic> json) => ExaminerUser(
        id: _str(json['id']),
        namaLengkap: _str(json['namaLengkap']),
        email: json['email']?.toString(),
      );
}

/// Kandidat penguji: manajemen penguji terdaftar / daftar hadir / peserta.
class ExaminerCandidate {
  final String id;
  final String namaLengkap;
  final String? email;
  final String? nomorAnggota;
  final String sumber;

  const ExaminerCandidate({
    required this.id,
    required this.namaLengkap,
    this.email,
    this.nomorAnggota,
    required this.sumber,
  });

  factory ExaminerCandidate.fromJson(Map<String, dynamic> json) =>
      ExaminerCandidate(
        id: _str(json['id']),
        namaLengkap: _str(json['namaLengkap']),
        email: json['email']?.toString(),
        nomorAnggota: json['nomorAnggota']?.toString(),
        sumber: _str(json['sumber']),
      );
}

class ExaminerCandidateBundle {
  final List<ExaminerCandidate> manajemenPenguji;
  final List<ExaminerCandidate> daftarHadir;
  final List<ExaminerCandidate> anggotaKegiatan;

  const ExaminerCandidateBundle({
    this.manajemenPenguji = const [],
    this.daftarHadir = const [],
    this.anggotaKegiatan = const [],
  });

  factory ExaminerCandidateBundle.fromJson(Map<String, dynamic> json) {
    List<ExaminerCandidate> lst(String key) {
      final raw = json[key];
      if (raw is List) {
        return raw.whereType<Map<String, dynamic>>().map(ExaminerCandidate.fromJson).toList();
      }
      return const [];
    }

    return ExaminerCandidateBundle(
      manajemenPenguji: lst('manajemenPenguji'),
      daftarHadir: lst('daftarHadir'),
      anggotaKegiatan: lst('anggotaKegiatan'),
    );
  }
}

/// Skor hasil penilaian calon anggota oleh penguji.
class AssessmentScore {
  final String id;
  final String calonAnggotaId;
  final String pengujiUserId;
  final String itemPenilaianId;
  final double skor;
  final String? catatan;
  final GraduationParticipant calonAnggota;
  final AssessmentItem itemPenilaian;
  final ExaminerUser penguji;

  const AssessmentScore({
    required this.id,
    required this.calonAnggotaId,
    required this.pengujiUserId,
    required this.itemPenilaianId,
    required this.skor,
    this.catatan,
    required this.calonAnggota,
    required this.itemPenilaian,
    required this.penguji,
  });

  factory AssessmentScore.fromJson(Map<String, dynamic> json) {
    final rawCalon = json['calonAnggota'];
    final rawItem = json['itemPenilaian'];
    final rawPenguji = json['penguji'];
    return AssessmentScore(
      id: _str(json['id']),
      calonAnggotaId: _str(json['calonAnggotaId']),
      pengujiUserId: _str(json['pengujiUserId']),
      itemPenilaianId: _str(json['itemPenilaianId']),
      skor: _num(json['skor']),
      catatan: json['catatan']?.toString(),
      calonAnggota: rawCalon is Map<String, dynamic>
          ? GraduationParticipant.fromJson(rawCalon)
          : const GraduationParticipant(
              id: '', namaLengkap: 'Calon', nomorAnggota: ''),
      itemPenilaian: rawItem is Map<String, dynamic>
          ? AssessmentItem.fromJson(rawItem)
          : const AssessmentItem(
              id: '', kodeItem: '', namaItem: 'Item', skorMaksimal: 0, urutan: 0, isActive: true),
      penguji: rawPenguji is Map<String, dynamic>
          ? ExaminerUser.fromJson(rawPenguji)
          : const ExaminerUser(id: '', namaLengkap: 'Penguji'),
    );
  }
}

/// Hasil evaluasi pendadaran untuk satu calon (rekap & status validasi).
class EvaluationResult {
  final String id;
  final String calonAnggotaId;
  final String? statusPengajuan;
  final double skorTotal;
  final String statusKeputusan;
  final String? reviewerOleh;
  final String? reviewerAt;
  final GraduationParticipant calonAnggota;
  const EvaluationResult({required this.id, required this.calonAnggotaId, this.statusPengajuan, required this.skorTotal, required this.statusKeputusan, this.reviewerOleh, this.reviewerAt, required this.calonAnggota});

  factory EvaluationResult.fromJson(Map<String, dynamic> json) {
    final rawCalon = json['calonAnggota'];
    return EvaluationResult(
      id: _str(json['id']),
      calonAnggotaId: _str(json['calonAnggotaId']),
      statusPengajuan: json['statusPengajuan']?.toString(),
      skorTotal: _num(json['skorTotal']),
      statusKeputusan: _str(json['statusKeputusan']),
      reviewerOleh: json['reviewerOleh']?.toString(),
      reviewerAt: json['reviewerAt']?.toString(),
      calonAnggota: rawCalon is Map<String, dynamic>
          ? GraduationParticipant.fromJson(rawCalon)
          : const GraduationParticipant(id: '', namaLengkap: 'Calon', nomorAnggota: ''),
    );
  }
}

/// Rangkuman progress pengisian nilai penguji (realtime).
class ScoreProgress {
  final int totalPenguji;
  final int pengujiSelesai;
  final int totalCalon;
  final int calonTernilaiLengkap;

  const ScoreProgress({
    required this.totalPenguji,
    required this.pengujiSelesai,
    required this.totalCalon,
    required this.calonTernilaiLengkap,
  });

  factory ScoreProgress.fromJson(Map<String, dynamic> json) => ScoreProgress(
        totalPenguji: (json['totalPenguji'] as num?)?.toInt() ?? 0,
        pengujiSelesai: (json['pengujiSelesai'] as num?)?.toInt() ?? 0,
        totalCalon: (json['totalCalon'] as num?)?.toInt() ?? 0,
        calonTernilaiLengkap: (json['calonTernilaiLengkap'] as num?)?.toInt() ?? 0,
      );
}

/// Helper konversi String/num yang aman.
String _str(dynamic v) => v?.toString() ?? '';

/// Parsing nilai numerik — Prisma Decimal bisa berupa String `"85.5"`,
/// num `85.5`, atau `null`. Null/gagal parse → 0.
double _num(dynamic v) {
  if (v == null) return 0;
  if (v is num) return v.toDouble();
  return double.tryParse(v.toString().replaceAll(',', '.')) ?? 0;
}
