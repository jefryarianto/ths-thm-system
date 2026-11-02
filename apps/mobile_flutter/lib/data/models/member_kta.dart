import '../../core/utils/formatters.dart';
import 'card_data.dart';
import 'member.dart';

/// Model data KTA — port dari tipe `MemberKta` pada referensi NextJS.
/// Semua tanggal berupa teks tampilan, bukan `DateTime` (contoh: "6 JULI 1983").
class MemberKta {
  final String nomorAnggota;
  final String namaLengkap;
  final String jenisKelamin; // 'L' | 'P'
  final String ranting;
  final String fotoUrl;
  final String qrImageUrl; // data URL hasil `GET /members/:id/digital-card`
  final String tingkat;
  final String tempatLahir;
  final String tanggalLahir;
  final String pekerjaan;
  final String status;
  final String pelantikanTanggal;
  final String pelantikanTahun;
  final String alamat;
  final String tanggalTerbit;
  final String tanggalBerlakuSampai;
  final String namaKoordinator;
  final String tandaTanganUrl;

  const MemberKta({
    required this.nomorAnggota,
    required this.namaLengkap,
    required this.jenisKelamin,
    required this.ranting,
    required this.fotoUrl,
    required this.qrImageUrl,
    required this.tingkat,
    required this.tempatLahir,
    required this.tanggalLahir,
    required this.pekerjaan,
    required this.status,
    required this.pelantikanTanggal,
    required this.pelantikanTahun,
    required this.alamat,
    required this.tanggalTerbit,
    required this.tanggalBerlakuSampai,
    required this.namaKoordinator,
    required this.tandaTanganUrl,
  });

  /// Bentuk `MemberKta` dari `Member` + `CardData` yang sudah dimuat.
  /// Field yang tidak tersedia pada skema API dibiarkan kosong — layout
  /// otomatis menampilkan placeholder sesuai spesifikasi referensi.
  factory MemberKta.from(Member member, CardData? cardData) {
    final tanggalLahir = member.tanggalLahir.trim().isEmpty
        ? ''
        : Formatters.dateLong(member.tanggalLahir).toUpperCase();
    return MemberKta(
      nomorAnggota: member.nomorAnggota,
      namaLengkap: member.namaLengkap,
      jenisKelamin: member.jenisKelamin,
      ranting: member.namaRanting,
      fotoUrl: member.fotoUrl,
      qrImageUrl: cardData?.qrCode ?? '',
      tingkat: member.tingkat,
      tempatLahir: member.tempatLahir,
      tanggalLahir: tanggalLahir,
      pekerjaan: '',
      status: member.statusKeanggotaan,
      pelantikanTanggal: '',
      pelantikanTahun: '',
      alamat: member.alamat,
      tanggalTerbit: '',
      tanggalBerlakuSampai: '',
      namaKoordinator: cardData?.signerName ?? '',
      tandaTanganUrl: cardData?.signatureImage ?? '',
    );
  }
}
