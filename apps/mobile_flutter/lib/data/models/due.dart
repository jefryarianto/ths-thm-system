class Due {
  final String id;
  final String periode;
  final double jumlah;
  final String status;
  final String? tanggalBayar;
  final String? tanggalJatuhTempo;
  final String createdAt;

  Due({
    required this.id,
    required this.periode,
    required this.jumlah,
    required this.status,
    this.tanggalBayar,
    this.tanggalJatuhTempo,
    required this.createdAt,
  });

  factory Due.fromJson(Map<String, dynamic> json) {
    return Due(
      id: _str(json['id']),
      periode: _str(json['periode']),
      jumlah: _num(json['jumlah']),
      status: _str(json['status']),
      tanggalBayar: json['tanggalBayar']?.toString(),
      tanggalJatuhTempo: json['tanggalJatuhTempo']?.toString(),
      createdAt: _str(json['createdAt']),
    );
  }

  /// Ekstrak String dengan aman (null → '').
  static String _str(dynamic v) => v?.toString() ?? '';

  /// Parsea nilai monetari — backend Prisma `Decimal` bisa terkirim sebagai
  /// `num` (dari JSON) maupun `String` (dari serializer); nullable → 0.
  static double _num(dynamic v) {
    if (v == null) return 0;
    if (v is num) return v.toDouble();
    return double.tryParse(v.toString().replaceAll(',', '.')) ?? 0;
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'periode': periode,
      'jumlah': jumlah,
      'status': status,
      'tanggalBayar': tanggalBayar,
      'tanggalJatuhTempo': tanggalJatuhTempo,
      'createdAt': createdAt,
    };
  }
}
