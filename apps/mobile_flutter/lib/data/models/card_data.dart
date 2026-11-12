import '../../core/api/api_client.dart';

/// Model data kartu digital yang diambil dari `GET /members/:id/digital-card`.
/// Berisi penandatangan, gambar stempel/ttd, dan visual tingkatan dari server
/// berdasarkan distrik anggota.
class CardData {
  final List<CardSigner> signers;
  final String signerName;
  final String signerTitle;
  final String signatureImage;
  final String stampImage;
  final LevelVisualData? levelVisual;
  final String verificationUrl;
  final String nomorDokumen;
  final String status;
  final String qrCode;

  /// Foto anggota sebagai data URL base64 dari server. Aset `member-photo-*`
  /// di /api/uploads bersifat privat (butuh Bearer), sehingga `Image.network`
  /// tidak bisa memuatnya; data URL aman dibawa lewat JSON terautentikasi ini.
  final String fotoDataUrl;

  /// true bila KTA sudah pernah di-generate (server mengirim `generated`).
  /// Untuk kompatibilitas server lama, default true.
  final bool generated;

  /// Data anggota lengkap dari respons kartu (field data KTA baru).
  final String pekerjaan;
  final String tanggalTerbit;
  final String tanggalBerlakuSampai;
  final String pelantikanTahun;

  const CardData({
    required this.signers,
    required this.signerName,
    required this.signerTitle,
    required this.signatureImage,
    required this.stampImage,
    this.levelVisual,
    this.verificationUrl = '',
    this.nomorDokumen = '',
    this.status = '',
    this.qrCode = '',
    this.fotoDataUrl = '',
    this.generated = true,
    this.pekerjaan = '',
    this.tanggalTerbit = '',
    this.tanggalBerlakuSampai = '',
    this.pelantikanTahun = '',
  });

  factory CardData.fromJson(Map<String, dynamic> json) {
    final card = json['card'] is Map<String, dynamic>
        ? json['card'] as Map<String, dynamic>
        : <String, dynamic>{};
    final lv = json['levelVisual'] is Map<String, dynamic>
        ? json['levelVisual'] as Map<String, dynamic>
        : null;
    final member = json['member'] is Map<String, dynamic>
        ? json['member'] as Map<String, dynamic>
        : <String, dynamic>{};

    final rawSigners = card['signers'];
    final signers = rawSigners is List
        ? rawSigners
            .whereType<Map<String, dynamic>>()
            .map(CardSigner.fromJson)
            .toList()
        : <CardSigner>[];

    return CardData(
      signers: signers,
      signerName: _str(card, 'signerName'),
      signerTitle: _str(card, 'signerTitle'),
      signatureImage: _str(card, 'signatureImage'),
      stampImage: _str(card, 'stampImage'),
      levelVisual: lv != null ? LevelVisualData.fromJson(lv) : null,
      verificationUrl: _str(card, 'verificationUrl'),
      nomorDokumen: _str(card, 'nomorDokumen'),
      status: _str(card, 'status'),
      qrCode: _str(json, 'qrCode'),
      fotoDataUrl: _str(json, 'fotoDataUrl'),
      generated: json['generated'] as bool? ?? true,
      pekerjaan: _str(member, 'pekerjaan'),
      tanggalTerbit: _str(member, 'tanggalTerbit'),
      tanggalBerlakuSampai: _str(member, 'tanggalBerlakuSampai'),
      pelantikanTahun: _str(member, 'pelantikanTahun'),
    );
  }

  static String _str(Map<String, dynamic> json, String key) {
    final v = json[key];
    return v?.toString() ?? '';
  }

  /// URL absolut gambar stempel (cap). Kosong jika tidak ada gambar.
  String get stampUrl => _resolveUploadUrl(stampImage);

  /// URL absolut gambar tanda tangan. Kosong jika tidak ada gambar.
  String get signatureUrl => _resolveUploadUrl(signatureImage);

  static String _resolveUploadUrl(String imagePath) {
    final p = imagePath.trim();
    if (p.isEmpty) return '';
    if (p.startsWith('http://') || p.startsWith('https://')) return p;
    final path = p.startsWith('/') ? p : '/api/uploads/$p';
    return ApiClient.resolveAbsolute(path);
  }
}

class CardSigner {
  final String signerName;
  final String signerTitle;

  const CardSigner({required this.signerName, required this.signerTitle});

  factory CardSigner.fromJson(Map<String, dynamic> json) {
    return CardSigner(
      signerName: json['signerName']?.toString() ?? '',
      signerTitle: json['signerTitle']?.toString() ?? '',
    );
  }
}

class LevelVisualData {
  final int stripCount;
  final String color;
  final String label;

  const LevelVisualData({
    required this.stripCount,
    required this.color,
    required this.label,
  });

  factory LevelVisualData.fromJson(Map<String, dynamic> json) {
    return LevelVisualData(
      stripCount: json['stripCount'] as int? ?? 0,
      color: json['color']?.toString() ?? '#1D4ED8',
      label: json['label']?.toString() ?? '',
    );
  }
}
