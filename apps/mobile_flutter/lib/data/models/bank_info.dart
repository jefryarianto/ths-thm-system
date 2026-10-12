/// Informasi rekening bank aktif yang ditampilkan sebagai target pembayaran
/// iuran (sumber: `GET /payments/bank-info`).
class BankInfo {
  final String bankName;
  final String accountNumber;
  final String accountName;
  final String? qrisImageUrl;

  const BankInfo({
    required this.bankName,
    required this.accountNumber,
    this.accountName = '',
    this.qrisImageUrl,
  });

  factory BankInfo.fromJson(Map<String, dynamic> json) => BankInfo(
        bankName: _str(json['bankName']),
        accountNumber: _str(json['accountNumber']),
        accountName: _str(json['accountName']),
        qrisImageUrl: json['qrisImageUrl']?.toString(),
      );

  Map<String, dynamic> toJson() => {
        'bankName': bankName,
        'accountNumber': accountNumber,
        'accountName': accountName,
        'qrisImageUrl': qrisImageUrl,
      };

  /// Teks utama: bank & nomor rekening (untuk daftar kecil / panel).
  String get displayText => '$bankName • $accountNumber';

  /// Keterangan tambahan (opsional): atas nama.
  String get subtitleText => accountName.isNotEmpty ? 'Ats. $accountName' : '';

  static String _str(dynamic value) => value?.toString() ?? '';
}
