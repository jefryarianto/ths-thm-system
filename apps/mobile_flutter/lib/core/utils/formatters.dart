import '../api/api_client.dart';

/// Helper format tanggal, mata uang, dan parsing token QR.
class Formatters {
  Formatters._();

  /// Format angka rupiah: 1000000 => "Rp 1.000.000".
  static String rupiah(num value) {
    final s = value.round().toString();
    final buf = StringBuffer();
    for (var i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) buf.write('.');
      buf.write(s[i]);
    }
    return 'Rp $buf';
  }

  /// Format tanggal ISO ke "12 Maret 2026".
  static String dateLong(String? iso) {
    final d = DateTime.tryParse(iso ?? '');
    if (d == null) return '-';
    const months = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ];
    return '${d.day} ${months[d.month - 1]} ${d.year}';
  }

  /// Format ISO ke "12/03/2026".
  static String dateShort(String? iso) {
    final d = DateTime.tryParse(iso ?? '');
    if (d == null) return '-';
    String two(int n) => n.toString().padLeft(2, '0');
    return '${two(d.day)}/${two(d.month)}/${d.year}';
  }

  /// Format relatif ala "5 menit lalu", "3 jam lalu", "2 hari lalu".
  static String relative(String iso) {
    final d = DateTime.tryParse(iso);
    if (d == null) return '';
    final diff = DateTime.now().difference(d);
    if (diff.inMinutes < 1) return 'Baru saja';
    if (diff.inMinutes < 60) return '${diff.inMinutes} menit lalu';
    if (diff.inHours < 24) return '${diff.inHours} jam lalu';
    if (diff.inDays < 7) return '${diff.inDays} hari lalu';
    return dateLong(iso);
  }

  /// Ekstrak token verifikasi dari QR (URL penuh `.../documents/verify/<token>`)
  /// atau token mentah. Mengembalikan string kosong bila tidak ditemukan.
  static String extractQrToken(String qrData) {
    final trimmed = qrData.trim();
    if (trimmed.isEmpty) return '';
    final match = RegExp(r'verify/([^/?#]+)').firstMatch(trimmed);
    return match != null ? match.group(1)!.trim() : trimmed;
  }

  /// Format path foto absolut — sesuaikan base URL secara dinamis
  /// berdasarkan `AppConstants.baseUrl` (bukan hardcode localhost).
  static String resolveUrl(String? url) {
    if (url == null || url.isEmpty) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    // Gunakan ApiClient.resolveAbsolute yang sudah benar memetakan
    // base URL (termasuk produksi ths-thm.cloud) ke origin.
    return ApiClient.resolveAbsolute(url);
  }
}
