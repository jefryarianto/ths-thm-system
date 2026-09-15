class Document {
  final String id;
  final String nomorDokumen;
  final String tipe;
  final String? anggotaNamaLengkap;
  final String status;
  final String? filePath;
  final String? qrCode;
  final String? verificationUrl;
  final String createdAt;
  final String? updatedAt;

  Document({
    required this.id,
    required this.nomorDokumen,
    required this.tipe,
    this.anggotaNamaLengkap,
    required this.status,
    this.filePath,
    this.qrCode,
    this.verificationUrl,
    required this.createdAt,
    this.updatedAt,
  });

  factory Document.fromJson(Map<String, dynamic> json) {
    return Document(
      id: json['id'] as String,
      nomorDokumen: json['nomorDokumen'] as String,
      tipe: json['tipe'] as String,
      anggotaNamaLengkap: json['anggota'] != null
          ? (json['anggota'] as Map<String, dynamic>)['namaLengkap'] as String?
          : null,
      status: json['status'] as String,
      filePath: json['filePath'],
      qrCode: json['qrCode'],
      verificationUrl: json['verificationUrl'],
      createdAt: json['createdAt'] as String,
      updatedAt: json['updatedAt'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'nomorDokumen': nomorDokumen,
      'tipe': tipe,
      'status': status,
      'filePath': filePath,
      'qrCode': qrCode,
      'verificationUrl': verificationUrl,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }
}
