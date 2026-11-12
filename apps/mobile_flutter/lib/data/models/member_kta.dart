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
  final String tempatDadar;
  final String tahunDadar;
  final String pekerjaan;
  final String status;
  final String pelantikanTanggal;
  final String pelantikanTahun;
  final String alamat;
  final String tanggalTerbit;
  final String tanggalBerlakuSampai;
  /// Nilai mentah `tanggalBerlakuSampai` (ISO) untuk label "EXP: MM/YY".
  final String berlakuSampai;
  final String namaKoordinator;
  final String tandaTanganUrl;
  final String stampImageUrl;

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
    this.tempatDadar = '',
    this.tahunDadar = '',
    required this.pekerjaan,
    required this.status,
    required this.pelantikanTanggal,
    required this.pelantikanTahun,
    required this.alamat,
    required this.tanggalTerbit,
    required this.tanggalBerlakuSampai,
    this.berlakuSampai = '',
    required this.namaKoordinator,
    required this.tandaTanganUrl,
    required this.stampImageUrl,
  });

  /// Bentuk `MemberKta` dari `Member` + `CardData` yang sudah dimuat.
  /// Field yang tidak tersedia pada skema API dibiarkan kosong — layout
  /// otomatis menampilkan placeholder sesuai spesifikasi referensi.
  factory MemberKta.from(Member member, CardData? cardData) {
    final tanggalLahir = member.tanggalLahir.trim().isEmpty
        ? ''
        : Formatters.dateLong(member.tanggalLahir).toUpperCase();
    // Backend mengisi tanggalTerbit & berlaku saat KTA digenerate (3 tahun).
    // pelantikanTahun dari backend sudah fallback ke tahunDadar bila kosong.
    String dateDisplay(String iso) {
      final t = Formatters.dateLong(iso);
      return t == '-' ? '' : t.toUpperCase();
    }

    return MemberKta(
      nomorAnggota: member.nomorAnggota,
      namaLengkap: member.namaLengkap,
      jenisKelamin: member.jenisKelamin,
      ranting: member.namaRanting,
      fotoUrl: (cardData?.fotoDataUrl.isNotEmpty ?? false)
          ? cardData!.fotoDataUrl
          : member.fotoUrl,
      qrImageUrl: cardData?.qrCode ?? '',
      tingkat: member.tingkat,
      tempatLahir: member.tempatLahir,
      tanggalLahir: tanggalLahir,
      tempatDadar: member.tempatDadar,
      tahunDadar: member.tahunDadar,
      pekerjaan: cardData?.pekerjaan ?? '',
      status: member.statusKeanggotaan,
      pelantikanTanggal: '',
      pelantikanTahun: cardData?.pelantikanTahun ?? '',
      alamat: member.alamat,
      tanggalTerbit: cardData != null && cardData.generated
          ? dateDisplay(cardData.tanggalTerbit)
          : '',
      tanggalBerlakuSampai: cardData != null && cardData.generated
          ? dateDisplay(cardData.tanggalBerlakuSampai)
          : '',
      berlakuSampai: cardData?.tanggalBerlakuSampai ?? '',
      namaKoordinator: cardData?.signerName ?? '',
      tandaTanganUrl: cardData?.signatureImage ?? '',
      stampImageUrl: cardData?.stampImage ?? '',
    );
  }
}
