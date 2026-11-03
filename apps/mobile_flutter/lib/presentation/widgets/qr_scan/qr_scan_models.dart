// QR Scan models - extracted from qr_scan_screen.dart

enum ScanMode { verify, checkin, lookup }

/// Sub-mode pencarian anggota: via scan QR atau input manual (nama/nomor).
enum LookupSearchType { qrCode, manual }

class KegiatanItem {
  final String id;
  final String nama;
  final String? lokasi;
  final String tanggalMulai;
  final String type; // activity | training | graduation

  const KegiatanItem({
    required this.id,
    required this.nama,
    this.lokasi,
    required this.tanggalMulai,
    required this.type,
  });

  factory KegiatanItem.fromJson(String type, Map<String, dynamic> json) {
    return KegiatanItem(
      id: json['id'].toString(),
      nama: json['nama'].toString(),
      lokasi: json['lokasi']?.toString(),
      tanggalMulai: json['tanggalMulai']?.toString() ?? '',
      type: type,
    );
  }
}

class ScanHistoryItem {
  final String id;
  final String type; // document_verify | check_in | member_lookup
  final String result;
  final String detail;
  final String timestamp;

  const ScanHistoryItem({
    required this.id,
    required this.type,
    required this.result,
    required this.detail,
    required this.timestamp,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type,
        'result': result,
        'detail': detail,
        'timestamp': timestamp,
      };

  factory ScanHistoryItem.fromJson(Map<String, dynamic> json) =>
      ScanHistoryItem(
        id: json['id']?.toString() ??
            DateTime.now().millisecondsSinceEpoch.toString(),
        type: json['type']?.toString() ?? '',
        result: json['result']?.toString() ?? '',
        detail: json['detail']?.toString() ?? '',
        timestamp: json['timestamp']?.toString() ?? '',
      );
}

class ScanResultData {
  final bool success;
  final String message;
  final String detail;

  const ScanResultData({
    required this.success,
    required this.message,
    required this.detail,
  });
}