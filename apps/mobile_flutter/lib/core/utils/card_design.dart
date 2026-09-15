import 'package:flutter/painting.dart';
import 'formatters.dart';

/// Port spec desain kartu KTA dari packages/card-design.
/// Semua ukuran dalam kanvas CR80 landscape 856x540.

class CardSpec {
  static const double w = 856;
  static const double h = 540;
  static const double radius = 28;
}

class CardColors {
  static const Color frontBg = Color(0xFFF7FCFF);
  static const Color frontBorder = Color(0xFFDBEAFE);
  static const Color backBg = Color(0xFF1E40AF);
  static const Color headerFrom = Color(0xFF2563EB);
  static const Color headerTo = Color(0xFF1D4ED8);
  static const Color bottomFrom = Color(0xFF93C5FD);
  static const Color bottomTo = Color(0xFFDBEAFE);
  static const Color backGradStart = Color(0xFF2563EB);
  static const Color backGradMid = Color(0xFF1E40AF);
  static const Color backGradEnd = Color(0xFF0F2B4A);
  static const Color label = Color(0xFF1E3A5F);
  static const Color value = Color(0xFF111827);
  static const Color valueStrong = Color(0xFF0F2B4A);
  static const Color rankText = Color(0xFF0F2B4A);
  static const Color white = Color(0xFFFFFFFF);
  static const Color ttd = Color(0xFF334155);
  static const Color stampBorder = Color(0x4D1E40AF);
  static const Color stampText = Color(0xFF1E40AF);
  static const Color rankStripBorder = Color(0x40000000);
  static const Color guillocheFront = Color(0x4D1D4ED8);
  static const Color guillocheBack = Color(0x66BFDBFE);
  static const Color watermarkMap = Color(0xFF1D4ED8);
}

class CardFonts {
  static const String ocrA = 'OCR A Extended';
  static const String openSansBold = 'OpenSans-Bold';
  static const String roboto = 'Roboto';
}
class FrontLayout {
  static const double headerPadTop = 14;
  static const double headerPadH = 24;
  static const double headerGap = 14;
  static const double headerFont = 16;
  static const double headerLineH = 19;
  static const double headerRowGap = 1;
  static const double logoSize = 150;
  static const double logoImg = 140;
  static const double logoBorder = 2;
  static const double photoBigLeft = 40;
  static const double photoBigTop = 164;
  static const double photoBigW = 185;
  static const double photoBigH = 235;
  static const double photoSmallRight = 40;
  static const double photoSmallTop = 154;
  static const double photoSmallW = 130;
  static const double photoSmallH = 150;
  static const double faceCrop = 0.6;
  static const double pasfotoAspect = 0.786;
  static const double rankRight = 40;
  static const double rankTop = 316;
  static const double rankW = 130;
  static const double rankStripH = 9;
  static const double rankStripGap = 3;
  static const double infoLeft = 250;
  static const double infoTop = 164;
  static const double infoRight = 176;
  static const double rowMarginBottom = 13;
  static const double labelFont = 12;
  static const double valueFont = 15;
  static const double valueStrongFont = 19;
  static const double bottomLeft = 40;
  static const double bottomBottom = 14;
  static const double signerRight = -8;
  static const double signerBottom = 14;
  static const double signerW = 340;
  static const double signerH = 146;
  static const double wmLeft = 128;
  static const double wmTop = 166;
  static const double wmW = 600;
  static const double wmH = 207;
  static const double wmOpacity = 0.35;
  static const double circle1Top = -80;
  static const double circle1Right = -80;
  static const double circle1Size = 320;
  static const double circle2Bottom = -110;
  static const double circle2Left = -80;
  static const double circle2Size = 380;
}

class BackLayout {
  static const double headerHeight = 104;
  static const double headerPadH = 28;
  static const double headerGap = 16;
  static const double logoSize = 68;
  static const double logoImg = 62;
  static const double qrLeft = 48;
  static const double qrTop = 145;
  static const double qrSize = 210;
  static const double qrBorderW = 4;
  static const double qrPadding = 16;
  static const double infoLeft = 300;
  static const double infoTop = 145;
  static const double infoRight = 48;
  static const double infoPadding = 24;
  static const double rowLabelW = 115;
  static const double rowColonW = 18;
  static const double footerLeft = 48;
  static const double footerRight = 48;
  static const double footerBottom = 32;
  static const double wmW = 480;
  static const double wmH = 166;
  static const double wmOpacity = 0.5;
}

class Pat {
  static const double angleDeg = -24;
  static const double fontSize = 18;
  static const double gapX = 16;
  static const int cols = 6;
  static const int rows = 9;
  static const double top = 76;
  static const double stepY = 40;
  static const double frontOpacity = 0.05;
  static const double backOpacity = 0.06;
}

class LevelVisual {
  final int stripCount;
  final Color color;
  final String label;
  const LevelVisual(this.stripCount, this.color, this.label);
}

LevelVisual getLevelVisual(String? tingkat) {
  switch (tingkat) {
    case 'Pratama':
      return const LevelVisual(1, Color(0xFF1D4ED8), 'Biru 1');
    case 'Tamtama':
      return const LevelVisual(2, Color(0xFF1D4ED8), 'Biru 2');
    case 'Muda':
      return const LevelVisual(1, Color(0xFFCA8A04), 'Kuning 1');
    case 'Madya':
      return const LevelVisual(2, Color(0xFFCA8A04), 'Kuning 2');
    case 'Utama':
      return const LevelVisual(3, Color(0xFFCA8A04), 'Kuning 3');
    default:
      return const LevelVisual(0, Color(0xFF94A3B8), 'Tanpa strip');
  }
}

({double w, double h, double left}) photoCrop(double boxW, double boxH) {
  final h2 = boxH / FrontLayout.faceCrop;
  final w2 = h2 * FrontLayout.pasfotoAspect;
  return (w: w2, h: h2, left: (boxW - w2) / 2);
}

String validUntilText([DateTime? base]) {
  final d = (base ?? DateTime.now()).add(const Duration(days: 365 * 5));
  return Formatters.dateLong(d.toIso8601String());
}

/// Format "Dadar": lokasi, tahun — mirip fmt.dadar di packages/card-design.
String dadarText(String tempatDadar, String tahunDadar) {
  final parts = [tempatDadar, tahunDadar].where((e) => e.isNotEmpty).toList();
  return parts.isEmpty ? '-' : parts.join(', ');
}

String ttlText(String? tempatLahir, String? tanggalLahirIso) {
  final d = tanggalLahirIso == null ? null : DateTime.tryParse(tanggalLahirIso);
  return [
    (tempatLahir == null || tempatLahir.isEmpty) ? '-' : tempatLahir,
    d == null ? '-' : Formatters.dateLong(d.toIso8601String()),
  ].join(', ');
}

String properCase(String? s) {
  if (s == null || s.trim().isEmpty) return '';
  return s.replaceAll(RegExp(r'\s+'), ' ').trim().split(' ').map((w) {
    if (RegExp(r'^(ths-thm)([.,])?$', caseSensitive: false).hasMatch(w)) {
      final m = RegExp(r'^(ths-thm)([.,])?$', caseSensitive: false).firstMatch(w)!;
      return 'THS-THM${m.group(2) ?? ''}';
    }
    if (RegExp(r'^(ttl|dadar|kta|qr|url)$', caseSensitive: false).hasMatch(w)) return w.toUpperCase();
    if (RegExp(r'^\d+([.,]\d+)?$').hasMatch(w)) return w;
    return w[0].toUpperCase() + w.substring(1).toLowerCase();
  }).join(' ');
}

String up(String s) => s.isEmpty ? '-' : s.toUpperCase();