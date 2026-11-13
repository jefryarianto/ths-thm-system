import '../../core/api/api_client.dart';

class Due {
  final String id;
  final String periode;
  final double jumlah;
  final String status;
  final String? tanggalBayar;
  final String? tanggalJatuhTempo;
  final String? buktiBayarPath;
  final String createdAt;
  
  // NEW: Lock fields
  final bool isLocked;
  final String? lockedAt;
  final String? lockedBy;
  final String? lockReason;
  final String? lockExpiresAt;

  Due({
    required this.id,
    required this.periode,
    required this.jumlah,
    required this.status,
    this.tanggalBayar,
    this.tanggalJatuhTempo,
    this.buktiBayarPath,
    required this.createdAt,
    this.isLocked = false,
    this.lockedAt,
    this.lockedBy,
    this.lockReason,
    this.lockExpiresAt,
  });

  /// URL absolut gambar bukti pembayaran (endpoint upload menyimpan path
  /// relatif seperti `/api/uploads/proofs/...`).
  String get buktiUrl {
    final p = buktiBayarPath?.trim() ?? '';
    if (p.isEmpty) return '';
    if (p.startsWith('http://') || p.startsWith('https://')) return p;
    final path = p.startsWith('/') ? p : '/api/uploads/$p';
    return ApiClient.resolveAbsolute(path);
  }

  bool get isPaid => 
      status.toLowerCase().contains('lunas') || 
      status.toLowerCase() == 'paid';

  String get statusLabel {
    final s = status.toLowerCase();
    if (s.contains('lunas') || s == 'paid') return 'Lunas';
    if (s.contains('menunggu') || s.contains('pending')) return 'Menunggu';
    if (s.contains('belum')) return 'Belum Bayar';
    return status;
  }

  // NEW: Lock helper methods
  bool get canUploadProof => !isLocked && status.toLowerCase() == 'belum_dibayar';
  bool get canBatchPay => !isLocked && status.toLowerCase() == 'belum_dibayar';
  
  Duration? get gracePeriodRemaining {
    if (lockExpiresAt == null) return null;
    try {
      final expires = DateTime.parse(lockExpiresAt!);
      final remaining = expires.difference(DateTime.now());
      return remaining.isNegative ? Duration.zero : remaining;
    } catch (_) {
      return null;
    }
  }

  factory Due.fromJson(Map<String, dynamic> json) {
    return Due(
      id: _str(json['id']),
      periode: _str(json['periode']),
      jumlah: _num(json['jumlah']),
      status: _str(json['status']),
      tanggalBayar: json['tanggalBayar']?.toString(),
      tanggalJatuhTempo: json['tanggalJatuhTempo']?.toString(),
      buktiBayarPath: json['buktiBayarPath']?.toString(),
      createdAt: _str(json['createdAt']),
      isLocked: json['isLocked'] == true,
      lockedAt: json['lockedAt']?.toString(),
      lockedBy: json['lockedBy']?.toString(),
      lockReason: json['lockReason']?.toString(),
      lockExpiresAt: json['lockExpiresAt']?.toString(),
    );
  }

  /// Ekstrak String dengan aman (null → '').
  static String _str(dynamic v) => v?.toString() ?? '';

  /// Ekstrak num dengan aman (null → 0.0).
  static double _num(dynamic v) {
    if (v == null) return 0.0;
    if (v is num) return v.toDouble();
    return double.tryParse(v.toString()) ?? 0.0;
  }
}
