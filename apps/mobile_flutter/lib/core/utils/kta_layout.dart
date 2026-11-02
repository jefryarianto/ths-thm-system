import 'package:flutter/painting.dart';
import 'package:flutter/services.dart';
import '../../data/models/member_kta.dart';

/// Spesifikasi kanvas KTA — port dari `KtaPreview.module.css`.
///
/// Kanvas dirender pada resolusi 10 px/mm (=254 dpi) sehingga 1 mm desain
/// sama persis dengan 10 px Flutter. Ukuran potong kartu CR80: 85,6 × 53,98 mm
/// dengan bleed 2 mm pada tiap sisi (89,6 × 57,98 mm).
class KtaSpec {
  static const double mmW = 85.6;
  static const double mmH = 53.98;
  static const double bleedMm = 2.0;
  static const double pxPerMm = 10.0;

  static const double w = mmW * pxPerMm; // 856
  static const double h = mmH * pxPerMm; // 539.8
  static const double bgW = (mmW + 2 * bleedMm) * pxPerMm; // 896
  static const double bgH = (mmH + 2 * bleedMm) * pxPerMm; // 579.8
  static const double radiusMm = 3.18;
  static const double radiusPx = radiusMm * pxPerMm;

  static const String fontFamily = 'KtaDejaVu';
}

/// Hasil penghitungan fit untuk satu teks.
class Fit {
  final List<String> lines;
  final double pt; // ukuran font dalam pt
  final double widthMm; // lebar teks terpasang dalam mm
  final bool ok; // true bila muat di area aman
  const Fit({required this.lines, required this.pt, required this.widthMm, required this.ok});
}

/// Hasil `calculate` — field per posisi + daftar peringatan.
class KtaLayout {
  final Map<String, Fit> fields;
  final List<String> warnings;
  const KtaLayout({required this.fields, required this.warnings});
}

/// Sisi kartu (depan/belakang).
enum KtaSide { depan, belakang }

/// Warna & jumlah strip tingkat, sama dengan map `rank` di referensi.
class KtaRank {
  final int count;
  final Color color;
  const KtaRank(this.count, this.color);

  static const Map<String, KtaRank> _byName = {
    'PRATAMA': KtaRank(1, Color(0xFF1256AD)),
    'TAMTAMA': KtaRank(2, Color(0xFF1256AD)),
    'MUDA': KtaRank(1, Color(0xFFE7B600)),
    'MADYA': KtaRank(2, Color(0xFFE7B600)),
    'UTAMA': KtaRank(3, Color(0xFFE7B600)),
  };

  /// Fallback ke MUDA sama seperti `rank[m.tingkat] || rank.MUDA`.
  static KtaRank forLevel(String? tingkat) =>
      _byName[(tingkat ?? '').trim().toUpperCase()] ??
      const KtaRank(1, Color(0xFFE7B600));
}

/// Kalkulator layout — port setia `single`, `wrap`, `calculate` dari TSX.
/// Memakai TextPainter agar hasil ukur teks presisi sama dengan canvas browser.
class KtaLayoutCalculator {
  final TextPainter _painter =
      TextPainter(textDirection: TextDirection.ltr);

  static bool _fontsLoaded = false;

  /// Pastikan font KtaDejaVu (reguler + bold) sudah dimuat sebelum mengukur teks.
  static Future<void> ensureFonts() async {
    if (_fontsLoaded) return;
    final loader = FontLoader(KtaSpec.fontFamily)
      ..addFont(rootBundle.load('assets/fonts/DejaVuSans.ttf'))
      ..addFont(rootBundle.load('assets/fonts/DejaVuSans-Bold.ttf'));
    await loader.load();
    _fontsLoaded = true;
  }

  double _widthMm(String value, double pt, bool bold) {
    _painter.text = TextSpan(
      text: value,
      style: TextStyle(
        fontFamily: KtaSpec.fontFamily,
        fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
        fontSize: pt * 25.4 / 72 * KtaSpec.pxPerMm,
      ),
    );
    _painter.layout();
    return _painter.width / KtaSpec.pxPerMm;
  }

  Fit single(String value, double width, double max, double min, bool bold) {
    final text = normalise(value);
    for (var t = (max * 10).round(); t >= (min * 10).round(); t--) {
      final pt = t / 10;
      final w = _widthMm(text, pt, bold);
      if (w <= width) {
        return Fit(lines: [text], pt: pt, widthMm: w, ok: true);
      }
    }
    return Fit(
      lines: [text],
      pt: min,
      widthMm: _widthMm(text, min, bold),
      ok: false,
    );
  }

  Fit wrap(String value, double width, int maxLines, double max, double min, bool bold) {
    final text = normalise(value);
    for (var t = (max * 10).round(); t >= (min * 10).round(); t--) {
      final pt = t / 10;
      final lines = <String>[];
      var line = '';
      for (final word in text.split(' ')) {
        final add = line.isEmpty ? word : '$line $word';
        if (_widthMm(add, pt, bold) <= width) {
          line = add;
          continue;
        }
        if (line.isNotEmpty) {
          lines.add(line);
          line = '';
        }
        for (final ch in word.split('')) {
          if (line.isNotEmpty && _widthMm(line + ch, pt, bold) > width) {
            lines.add(line);
            line = ch;
          } else {
            line += ch;
          }
        }
      }
      if (line.isNotEmpty) lines.add(line);
      if (lines.length <= maxLines &&
          lines.every((l) => _widthMm(l, pt, bold) <= width)) {
        var wm = 0.0;
        for (final l in lines) {
          final lw = _widthMm(l, pt, bold);
          if (lw > wm) wm = lw;
        }
        return Fit(lines: lines, pt: pt, widthMm: wm, ok: true);
      }
    }
    return Fit(
      lines: [text],
      pt: min,
      widthMm: _widthMm(text, min, bold),
      ok: false,
    );
  }

  KtaLayout calculate(MemberKta m) {
    final upTgl = up(m.pelantikanTanggal);
    final upThn = up(m.pelantikanTahun);
    final pelantikan = upTgl.isNotEmpty
        ? upTgl
        : (upThn.isNotEmpty ? upThn : '[TANGGAL / TAHUN BELUM DIISI]');

    final upBerlaku = up(m.tanggalBerlakuSampai);
    final berlaku = 'BERLAKU S.D. '
        '${upBerlaku.isNotEmpty ? upBerlaku : '[TGGL_EXPIRE]'}';
    final upTerbit = up(m.tanggalTerbit);
    final terbit = 'TANGGAL TERBIT : '
        '${upTerbit.isNotEmpty ? upTerbit : '...............'}';

    final fields = <String, Fit>{
      'nomor': single(up(m.nomorAnggota), 22.7, 5.1, 3.8, true),
      'depanNama': single(up(m.namaLengkap), 30.7, 5.1, 3.8, true),
      'ranting': wrap(up(m.ranting), 30.7, 3, 5.1, 3.8, true),
      'belakangNama': single(up(m.namaLengkap), 39, 5.3, 4, false),
      'lahir': single('${up(m.tempatLahir)}, ${up(m.tanggalLahir)}', 52, 5.3, 4, false),
      'pekerjaan': single(noData(m.pekerjaan), 52, 5.3, 4, false),
      'status': single(noData(m.status), 52, 5.3, 4, false),
      'pelantikan': single(pelantikan, 52, 5.3, 4, false),
      'alamat': wrap(up(m.alamat), 52, 3, 5.3, 4, false),
      'berlaku': single(berlaku, 41, 4, 4, false),
      'terbit': single(terbit, 39, 5, 5, false),
      'koordinator': single(up(m.namaKoordinator), 33.1, 5, 4, false),
    };

    final warnings = <String>[];
    fields.forEach((name, f) {
      if (!f.ok) warnings.add('Teks $name terlalu panjang untuk area aman.');
    });

    const missing = [
      'nomorAnggota', 'namaLengkap', 'ranting', 'fotoUrl', 'qrImageUrl',
      'tempatLahir', 'tanggalLahir', 'alamat', 'namaKoordinator',
    ];
    String rawOf(String key) {
      switch (key) {
        case 'nomorAnggota':
          return m.nomorAnggota;
        case 'namaLengkap':
          return m.namaLengkap;
        case 'ranting':
          return m.ranting;
        case 'fotoUrl':
          return m.fotoUrl;
        case 'qrImageUrl':
          return m.qrImageUrl;
        case 'tempatLahir':
          return m.tempatLahir;
        case 'tanggalLahir':
          return m.tanggalLahir;
        case 'alamat':
          return m.alamat;
        default:
          return m.namaKoordinator;
      }
    }
    for (final key in missing) {
      if (rawOf(key).trim().isEmpty) {
        warnings.add('Data $key belum diisi.');
      }
    }

    if (m.jenisKelamin != 'L' && m.jenisKelamin != 'P') {
      warnings.add('Jenis kelamin harus L atau P.');
    }
    const validLevels = ['PRATAMA', 'TAMTAMA', 'MUDA', 'MADYA', 'UTAMA'];
    if (!validLevels.contains(up(m.tingkat))) {
      warnings.add('Tingkat tidak valid.');
    }

    return KtaLayout(fields: fields, warnings: warnings);
  }
}

/// `v.trim().toUpperCase()` — setara `up()` di TSX.
String up(String? v) => (v ?? '').trim().toUpperCase();

/// `v.trim()` + kolaps spasi — setara `normalise()` di TSX.
String normalise(String v) => v.trim().replaceAll(RegExp(r'\s+'), ' ');

/// `up(v) || '[BELUM DIISI]'` — setara `noData()` di TSX.
String noData(String? v) {
  final u = up(v);
  return u.isEmpty ? '[BELUM DIISI]' : u;
}

/// Konversi mm → px kanvas (10 px/mm).
double mmToPx(double mm) => mm * KtaSpec.pxPerMm;
