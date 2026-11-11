import 'dart:convert';
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../core/utils/kta_layout.dart';
import '../../core/utils/kta_design.dart';
import '../../data/models/card_data.dart';
import '../../data/models/member.dart';
import '../../data/models/member_kta.dart';

class KtaFlipCard extends StatefulWidget {
  final Member member;
  final CardData? cardData;
  const KtaFlipCard({super.key, required this.member, this.cardData});
  @override
  State<KtaFlipCard> createState() => _KtaFlipCardState();
}

class _KtaFlipCardState extends State<KtaFlipCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _anim;
  bool _showFront = true;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      duration: const Duration(milliseconds: 400),
      vsync: this,
    );
    _anim = Tween<double>(begin: 0, end: 1)
        .animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  void _flip() {
    _showFront ? _ctrl.forward() : _ctrl.reverse();
    _showFront = !_showFront;
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, c) {
      final scaleWidth = c.maxWidth / KtaSpec.w;
      final scaleHeight = c.maxHeight.isFinite
          ? c.maxHeight / KtaSpec.h
          : double.infinity;
      final scale = scaleWidth < scaleHeight ? scaleWidth : scaleHeight;
      final w = KtaSpec.w * scale;
      final h = KtaSpec.h * scale;
      return GestureDetector(
        onTap: _flip,
        child: SizedBox(
          width: w,
          height: h,
          child: OverflowBox(
            alignment: Alignment.center,
            minWidth: 0,
            maxWidth: KtaSpec.w,
            minHeight: 0,
            maxHeight: KtaSpec.h,
            child: Transform.scale(
              scale: scale,
              child: KtaLayoutHost(
                member: widget.member,
                cardData: widget.cardData,
                builder: (context, kta, layout) {
                  return SizedBox(
                    width: KtaSpec.w,
                    height: KtaSpec.h,
                    child: AnimatedBuilder(
                      animation: _anim,
                      builder: (context, _) {
                        final angle = _anim.value * math.pi;
                        return Transform(
                          alignment: Alignment.center,
                          transform: Matrix4.identity()
                            ..setEntry(3, 2, 0.001)
                            ..rotateY(angle),
                          child: angle > math.pi / 2
                              ? Transform(
                                  alignment: Alignment.center,
                                  transform: Matrix4.identity()
                                    ..rotateY(math.pi),
                                  child: _KtaBack(kta: kta, layout: layout),
                                ):_KtaFront(kta: kta, layout: layout),
                        );
                      },
                    ),

                  );
                },
              ),
            ),
          ),
        ),
      );
    });
  }
}

class KtaCardFullSize extends StatelessWidget {
  final Member member;
  final CardData? cardData;
  final bool showBack;
  const KtaCardFullSize({
    super.key,
    required this.member,
    this.cardData,
    this.showBack = false,
  });

  @override
  Widget build(BuildContext context) {
    return KtaLayoutHost(
      member: member,
      cardData: cardData,
      builder: (context, kta, layout) {
        return SizedBox(
          width: KtaSpec.w,
          height: KtaSpec.h,
          child: showBack ? _KtaBack(kta: kta, layout: layout) : _KtaFront(kta: kta, layout: layout),
        );
      },
    );
  }
}

class KtaLayoutHost extends StatefulWidget {
  final Member member;
  final CardData? cardData;
  final Widget Function(BuildContext context, MemberKta kta, KtaLayout layout)
      builder;
  const KtaLayoutHost({
    super.key,
    required this.member,
    this.cardData,
    required this.builder,
  });

  @override
  State<KtaLayoutHost> createState() => _KtaLayoutHostState();
}

class _KtaLayoutHostState extends State<KtaLayoutHost> {
  MemberKta? _kta;
  KtaLayout? _layout;

  @override
  void initState() {
    super.initState();
    _compute();
  }

  @override
  void didUpdateWidget(KtaLayoutHost oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.member != widget.member ||
        oldWidget.cardData != widget.cardData) {
      _compute();
    }
  }

  Future<void> _compute() async {
    final kta = MemberKta.from(widget.member, widget.cardData);
    try {
      await KtaLayoutCalculator.ensureFonts();
      final layout = KtaLayoutCalculator().calculate(kta);
      if (!mounted) return;
      setState(() {
        _kta = kta;
        _layout = layout;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _kta = kta;
        _layout = const KtaLayout(
          fields: {},
          warnings: ['Font atau pengukuran teks gagal dimuat.'],
        );
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final kta = _kta;
    final layout = _layout;
    if (kta == null || layout == null) {
      return const SizedBox(width: KtaSpec.w, height: KtaSpec.h);
    }// Passing fallbackInitials (first 3 uppercase letters of name) so _KtaImage can show initials when fotoUrl is empty.
    final fallbackInitials = kta.namaLengkap.isNotEmpty
        ? '${kta.namaLengkap.substring(0, 3).toUpperCase()}'
        : null;
    
    return widget.builder(context, kta, layout);
  }
}

double mmToPx(double mm) => mm * KtaSpec.pxPerMm;

class _KtaFront extends StatelessWidget {
  final MemberKta kta;
  final KtaLayout layout;
  final String? fallbackInitials;
  const _KtaFront({required this.kta, required this.layout}): fallbackInitials = null;

  @override
  Widget build(BuildContext context) {
    final f = layout.fields;
    final rank = KtaRank.forLevel(kta.tingkat);
    final displayInitials = fallbackInitials ?? (kta.namaLengkap.isNotEmpty ? '${kta.namaLengkap.substring(0, 3).toUpperCase()}' : null);
    
    return ClipRRect(
      borderRadius: BorderRadius.circular(KtaSpec.radiusPx),
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Latar TANPA teks (sama dengan `public/kta/background/depan.png` di
          // web) — seluruh teks kartu dilukis kode di atasnya.
          Positioned(
            left: 0,
            top: 0,
            width: KtaSpec.w,
            height: KtaSpec.h,
            child: Image.asset(
              'assets/images/kta/depan.png',
              fit: BoxFit.fill,
            ),
          ),
          Positioned(
            left: KtaPositions.logoX,
            top: KtaPositions.logoY,
            child: Image.asset(
              // Logo yayasan ada di `assets/images/logo.png` (bukan folder
              // `kta/`), sama seperti referensi web `KtaCard.tsx`.
              'assets/images/logo.png',
              width: KtaPositions.logoW,
              height: KtaPositions.logoH,
              fit: BoxFit.contain,
            ),
          ),
          Positioned(
            left: 0,
            top: 0,
            child: _HeaderShadow(text: "ORGANISASI PENCAK SILAT PENDIDIKAN", yMm: 49.45, fontSizePt: 5.2, yellow: false),
          ),
          Positioned(
            left: 0,
            top: 0,
            child: _HeaderShadow(text: "TUNGGAL HATI SEMINARI – TUNGGAL HATI MARIA", yMm: 46.4, fontSizePt: 6.4, yellow: false),
          ),
          Positioned(
            left: 0,
            top: 0,
            child: _HeaderShadow(text: "DISTRIK KEUSKUPAN LARANTUKA", yMm: 43.1, fontSizePt: 5.6, yellow: false),
          ),
          Positioned(
            left: 0,
            top: 0,
            child: _HeaderShadow(text: "KARTU TANDA ANGGOTA", yMm: 37.1, fontSizePt: 6.4, yellow: true),
          ),
          Positioned(
            left: KtaPositions.photoX,
            top: KtaPositions.photoY,
            width: KtaPositions.photoW,
            height: KtaPositions.photoH,
            child: Container(
              decoration: BoxDecoration(
                color: KtaColors.photoPlaceholder,
                borderRadius: BorderRadius.circular(KtaPositions.photoRadius),
                border: Border.all(color: KtaColors.borderBlue, width: 1),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(KtaPositions.photoRadius),
                child: _KtaImage(url: kta.fotoUrl, fit: BoxFit.cover),
              ),
            ),
          ),
          // Pelat putih di belakang strip tingkat (referensi SVG: rect
          // x=44 y=453.8 w=240 h=48 rx=3, garis #A9B9CB).
          Positioned(
            left: 44,
            top: 453.8,
            width: 240,
            height: 48,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: KtaColors.white,
                borderRadius: BorderRadius.circular(3),
                border: Border.all(color: KtaColors.borderBlue, width: 1),
              ),
            ),
          ),
          ..._buildRankBadges(rank),
          Positioned(
            left: KtaPositions.qrX,
            top: KtaPositions.qrY,
            width: KtaPositions.qrSize,
            height: KtaPositions.qrSize,
            child: ColoredBox(
              color: KtaColors.white,
              child: _KtaQr(dataUrl: kta.qrImageUrl, verificationUrl: ''),
            ),
          ),
          // `Positioned.fill` (bukan `left/top` + `SizedBox.expand`) agar
          // CustomPaint mendapat ukuran kanvas yang pasti.
          Positioned.fill(
            child: CustomPaint(
              painter: _FrontTextPainter(kta: kta, layout: layout, fields: f),
            ),
          ),
          Positioned.fill(
            child: CustomPaint(
              painter: _BackMicrotext(isFront: true),
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildRankBadges(KtaRank rank) {
    final widgets = <Widget>[];
    final yPositions = _getBadgeYPositions(rank.count);
    
    for (var i = 0; i < rank.count; i++) {
      // Nilai `KtaPositions.badge*` sudah dalam px kanvas (referensi SVG),
      // jadi TIDAK boleh dikonversi mm→px lagi.
      widgets.add(Positioned(
        left: KtaPositions.badgeX,
        top: yPositions[i],
        width: KtaPositions.badgeW,
        height: KtaPositions.badgeH,
        child: Container(
          decoration: BoxDecoration(
            color: rank.color,
            borderRadius: BorderRadius.circular(KtaPositions.badgeRadius),
          ),
        ),
      ));
    }
    return widgets;
  }

  List<double> _getBadgeYPositions(int count) {
    if (count == 1) return [KtaPositions.badgeY1];
    if (count == 2) return [KtaPositions.badgeY2a, KtaPositions.badgeY2b];
    return [KtaPositions.badgeY3a, KtaPositions.badgeY3b, KtaPositions.badgeY3c];
  }
}

class _HeaderShadow extends StatelessWidget {
  final String text;
  final double yMm;
  final double fontSizePt;
  final bool yellow;
  
  const _HeaderShadow({required this.text, required this.yMm, required this.fontSizePt, required this.yellow});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: KtaSpec.w,
      height: KtaSpec.h,
      child: CustomPaint(
        painter: _HeaderShadowPainter(text: text, yMm: yMm, fontSizePt: fontSizePt, yellow: yellow),
      ),
    );
  }
}

class _HeaderShadowPainter extends CustomPainter {
  final String text;
  final double yMm;
  final double fontSizePt;
  final bool yellow;
  
  _HeaderShadowPainter({required this.text, required this.yMm, required this.fontSizePt, required this.yellow});

  /// Batas kiri blok header (px kanvas) — masih di area aman kartu dan tidak
  /// menabrak foto/logo.
  static const double _leftLimit = 40.0;

  /// Ukur teks TANPA `maxWidth`: header harus tetap satu baris. Teks yang
  /// kepanjangan diperkecil ukuran fontnya di [paint] — bukan dibungkus ke
  /// baris baru, karena baris kedua akan menabrak baris header berikutnya.
  TextPainter _layout(String value, double fontSize, Color? color) {
    return TextPainter(
      text: TextSpan(
        text: value,
        style: TextStyle(
          fontFamily: 'KtaDejaVu',
          fontWeight: FontWeight.w700,
          fontSize: fontSize,
          color: color,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
  }

  @override
  void paint(Canvas canvas, Size size) {
    final highlightColor = yellow ? KtaColors.highlightGold : KtaColors.white;
    final shadowColor = yellow ? KtaColors.shadowNavy : Color(0xFF17394F);
    final textColor = yellow ? Color(0xFFF8DB38) : KtaColors.offWhite;

    const maxWidth = KtaPositions.headerRightX - _leftLimit;
    var fontSize = fontSizePt * 25.4 / 72 * KtaSpec.pxPerMm;

    var measured = _layout(text, fontSize, null);
    for (var i = 0; i < 4 && measured.width > maxWidth; i++) {
      fontSize *= maxWidth / measured.width;
      measured = _layout(text, fontSize, null);
    }

    final textWidth = measured.width;
    final x = KtaPositions.headerRightX - textWidth;
    final metrics = measured.computeLineMetrics();
    final baseline = metrics.isEmpty ? measured.height : metrics.first.baseline;
    final y = (KtaSpec.mmH - yMm) * KtaSpec.pxPerMm;

    _layout(text, fontSize, shadowColor)
        .paint(canvas, Offset(x + 1.4, y + 1.4 - baseline));
    _layout(text, fontSize, highlightColor)
        .paint(canvas, Offset(x - 0.9, y - 0.9 - baseline));
    _layout(text, fontSize, textColor).paint(canvas, Offset(x, y - baseline));
  }

  @override
  bool shouldRepaint(covariant _HeaderShadowPainter oldDelegate) =>
      oldDelegate.text != text || oldDelegate.yMm != yMm || oldDelegate.fontSizePt != fontSizePt || oldDelegate.yellow != yellow;
}

class _FrontTextPainter extends CustomPainter {
  final MemberKta kta;
  final KtaLayout layout;
  final Map<String, Fit> fields;
  
  _FrontTextPainter({required this.kta, required this.layout, required this.fields});

  @override
  void paint(Canvas canvas, Size size) {
    // `toUnits` HANYA untuk nilai bersatuan mm (mis. `KtaSpec.mmH - 7.7`).
    // Nilai `KtaPositions.*` sudah dalam px kanvas (0-856) — jangan dikonversi
    // lagi, kalau tidak teks tergambar 10x terlalu jauh ke kanan.
    final toUnits = (double mm) => mm * KtaSpec.pxPerMm;

    // Label statis — posisi x memakai px kanvas apa adanya.
    // Di _KtaFront.build(): ambil fallbackInitials dari member.namaLengkap.
    final fallbackInitials = kta.namaLengkap.isNotEmpty
        ? '${kta.namaLengkap.substring(0, 3).toUpperCase()}'
        : null;

    // Posisi foto + initials fallback (handled by _KtaFront widget above)
    _paintSingle(canvas, fields['nomor']!, KtaPositions.cardX, toUnits(KtaSpec.mmH - 4.9), 2.5, bold: true);
    
    _paintAtBaseline(canvas, 'NAMA LENGKAP', KtaText.ptSectionLabel, KtaPositions.cardX, toUnits(KtaSpec.mmH - 33.5), bold: true);
    _paintSingle(canvas, fields['depanNama']!, KtaPositions.cardX, toUnits(KtaSpec.mmH - 30.7), 2.5, bold: true);
    
    if (kta.jenisKelamin.isNotEmpty) {
      final nameWidth = fields['depanNama']!.widthMm * KtaSpec.pxPerMm;
      _paintAtBaseline(canvas, kta.jenisKelamin, KtaText.ptNamePrimaryBase, KtaPositions.cardX + nameWidth + 40, toUnits(KtaSpec.mmH - 30.7), bold: true);
    }

    _paintAtBaseline(canvas, 'TEMPAT / TAHUN DADAR', KtaText.ptSectionLabel, KtaPositions.cardX, toUnits(KtaSpec.mmH - 26.6), bold: true);
    _paintSingle(canvas, fields['dadar']!, KtaPositions.cardX, toUnits(KtaSpec.mmH - 23.8), 2.5, bold: true);

    _paintAtBaseline(canvas, 'RANTING', KtaText.ptSectionLabel, KtaPositions.cardX, toUnits(KtaSpec.mmH - 19.7), bold: true);
    _paintLines(canvas, fields['ranting']!, KtaPositions.cardX, toUnits(KtaSpec.mmH - 16.9), 2.5, bold: true);

    // "EXP: MM/YY" tepat di atas QR — referensi: x=733.5 (tengah), y(23.4),
    // pt 5, tebal.
    _paintSingle(canvas, fields['exp']!, KtaPositions.expiryTextX,
        toUnits(KtaSpec.mmH - 23.4), 2.5,
        bold: true, center: true);
  }

  void _paintSingle(Canvas canvas, Fit fit, double x, double yBaseline, double leading,
      {bool bold = false, bool rightAlign = false, bool center = false}) {
    for (var i = 0; i < fit.lines.length; i++) {
      _paintAtBaseline(canvas, fit.lines[i], fit.pt, x, yBaseline + (i * leading * KtaSpec.pxPerMm),
          bold: bold, rightAlign: rightAlign, center: center);
    }
  }

  void _paintLines(Canvas canvas, Fit fit, double x, double yBaseline, double leading,
      {bool bold = false, bool rightAlign = false}) {
    _paintSingle(canvas, fit, x, yBaseline, leading, bold: bold, rightAlign: rightAlign);
  }

  void _paintAtBaseline(Canvas canvas, String text, double pt, double x,
      double yBaselinePx,
      {bool bold = false, bool rightAlign = false, bool center = false}) {
    // Baris kosong (mis. field belum diisi) tidak punya line metrics. Lewati
    // saja: dulu `.first` melempar StateError di tengah paint() sehingga
    // SELURUH lapisan teks kartu ikut gagal digambar.
    if (text.isEmpty) return;
    final painter = TextPainter(
      text: TextSpan(
        text: text,
        style: TextStyle(
          fontFamily: 'KtaDejaVu',
          fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
          fontSize: pt * 25.4 / 72 * KtaSpec.pxPerMm,
          color: KtaColors.darkText,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();

    final metrics = painter.computeLineMetrics();
    final baseline = metrics.isEmpty ? painter.height : metrics.first.baseline;
    var dx = x;
    if (rightAlign) dx -= painter.width;
    if (center) dx -= painter.width / 2;
    painter.paint(canvas, Offset(dx, yBaselinePx - baseline));
  }

  @override
  bool shouldRepaint(covariant _FrontTextPainter oldDelegate) =>
      oldDelegate.kta != kta || oldDelegate.layout != layout;
}

class _BackMicrotext extends CustomPainter {
  final bool isFront;
  
  _BackMicrotext({required this.isFront});

  @override
  void paint(Canvas canvas, Size size) {
    final text = isFront ? 'PRO PATRIA ET ECCLESIA' : 'Fortiter in Re, Suaviter in Modo';
    final yMm = 0.75;
    final xStart = -20.0;
    final repeatCount = 18;
    
    final microtext = '$text • ';
    
    final textSpan = TextSpan(
      text: microtext * repeatCount,
      style: TextStyle(
        fontFamily: 'KtaDejaVu',
        fontWeight: FontWeight.w400,
        fontSize: KtaText.ptMicrotext * 25.4 / 72 * KtaSpec.pxPerMm,
        color: KtaColors.microtextNavy,
      ),
    );
    
    final painter = TextPainter(
      text: textSpan,
      textDirection: TextDirection.ltr,
    )..layout();
    
    painter.paint(canvas, Offset(mmToPx(xStart), (KtaSpec.mmH - yMm) * KtaSpec.pxPerMm - painter.height / 2));
  }

  @override
  bool shouldRepaint(covariant _BackMicrotext oldDelegate) => oldDelegate.isFront != isFront;
}

class _KtaBack extends StatelessWidget {
  final MemberKta kta;
  final KtaLayout layout;
  const _KtaBack({required this.kta, required this.layout});

  @override
  Widget build(BuildContext context) {
    final f = layout.fields;
    final koorWidth = f['koordinator']?.widthMm ?? 0;
    
    return ClipRRect(
      borderRadius: BorderRadius.circular(KtaSpec.radiusPx),
      child: Stack(
        fit: StackFit.expand,
        children: [
          Positioned(
            left: 0,
            top: 0,
            width: KtaSpec.w,
            height: KtaSpec.h,
            child: Image.asset(
              'assets/images/kta/belakang.png',
              fit: BoxFit.fill,
            ),
          ),
          if (kta.tandaTanganUrl.isNotEmpty)
            Positioned(
              left: mmToPx(48.1),
              top: mmToPx(42.58),
              width: mmToPx(19.5),
              height: mmToPx(5.1),
              child: _KtaImage(url: kta.tandaTanganUrl, fit: BoxFit.contain),
            ),
          if (kta.stampImageUrl.isNotEmpty)
            Positioned(
              left: mmToPx(53),
              top: mmToPx(44.5),
              width: mmToPx(11),
              height: mmToPx(11),
              child: Opacity(
                opacity: 0.85,
                child: ClipOval(
                  child: _KtaImage(url: kta.stampImageUrl, fit: BoxFit.contain),
                ),
              ),
            ),
          Positioned.fill(
            child: CustomPaint(
              painter: _BackTextPainter(kta: kta, layout: layout, fields: f, koorWidthMm: koorWidth),
            ),
          ),
          Positioned.fill(
            child: CustomPaint(
              painter: _BackMicrotext(isFront: false),
            ),
          ),
        ],
      ),
    );
  }
}

class _BackTextPainter extends CustomPainter {
  final MemberKta kta;
  final KtaLayout layout;
  final Map<String, Fit> fields;
  final double koorWidthMm;
  
  _BackTextPainter({
    required this.kta,
    required this.layout,
    required this.fields,
    required this.koorWidthMm,
  });

  /// Lima baris data sisi belakang: label di kiri, titik dua, lalu nilai.
  static const List<String> _rowLabels = [
    'NAMA LENGKAP',
    'TEMPAT / TANGGAL LAHIR',
    'PEKERJAAN',
    'STATUS',
    'PELANTIKAN',
  ];

  @override
  void paint(Canvas canvas, Size size) {
    // Judul sisi belakang (referensi SVG: x=44, y(48.65), pt 7, kuning).
    _paintText(canvas, 'DATA ANGGOTA', 4.4, 48.65,
        KtaText.ptBackSectionTitle,
        bold: true, color: KtaColors.gold);

    // Label + titik dua tiap baris data (x=44 dan x=271 pada referensi).
    for (var i = 0; i < _rowLabels.length; i++) {
      final rowY = 41.4 - i * 4;
      _paintText(canvas, _rowLabels[i], 4.4, rowY, KtaText.ptBackFieldLabel,
          bold: true);
      _paintText(canvas, ':', 27.1, rowY, KtaText.ptBackFieldLabel,
          bold: true);
    }
    _paintText(canvas, 'ALAMAT', 4.4, 21.4, KtaText.ptBackFieldLabel, bold: true);
    _paintText(canvas, ':', 27.1, 21.4, KtaText.ptBackFieldLabel, bold: true);
    _paintText(canvas, 'KOORDINATOR DISTRIK', 48.1, 12.2,
        KtaText.ptBackFieldLabel, bold: true);

    final belakangNama = fields['belakangNama']!;
    _paintSingle(canvas, belakangNama, 29.2, 41.4, 2.4, bold: false);
    
    if (kta.jenisKelamin.isNotEmpty) {
      _paintText(canvas, kta.jenisKelamin, 29.2 + belakangNama.widthMm + 9, 41.4, 5.3, bold: false);
    }
    
    _paintSingle(canvas, fields['lahir']!, 29.2, 37.4, 2.4, bold: false);
    _paintSingle(canvas, fields['pekerjaan']!, 29.2, 33.4, 2.4, bold: false);
    _paintSingle(canvas, fields['status']!, 29.2, 29.4, 2.4, bold: false);
    _paintSingle(canvas, fields['pelantikan']!, 29.2, 25.4, 2.4, bold: false);
    _paintSingle(canvas, fields['alamat']!, 29.2, 21.4, 2.4, bold: false);
    _paintSingle(canvas, fields['terbit']!, 4.4, 3.5, 2.4, bold: false);
    _paintSingle(canvas, fields['koordinator']!, 48.1, 3.5, 2.4, bold: false);

    // Garis tanda tangan hanya digambar bila ada nama koordinator; tanpa nama
    // panjangnya nol dan dengan `strokeCap.square` menyisakan titik kecil.
    if (koorWidthMm > 0) {
      final linePaint = Paint()
        ..color = KtaColors.signatureLine
        ..strokeWidth = 0.45 / 72 * 25.4 * KtaSpec.pxPerMm
        ..strokeCap = StrokeCap.square;

      canvas.drawLine(
        Offset(mmToPx(48.1), mmToPx(48.28)),
        Offset(mmToPx(48.1) + koorWidthMm * KtaSpec.pxPerMm, mmToPx(48.28)),
        linePaint,
      );
    }
  }

  void _paintSingle(Canvas canvas, Fit fit, double x, double y, double leading,
      {bool bold = false}) {
    for (var i = 0; i < fit.lines.length; i++) {
      final baseline = (KtaSpec.mmH - (y - leading * i)) * KtaSpec.pxPerMm;
      _paintAtBaseline(canvas, fit.lines[i], fit.pt, mmToPx(x), baseline,
          bold: bold);
    }
  }

  void _paintText(Canvas canvas, String text, double x, double y, double pt,
      {bool bold = false, Color? color}) {
    final baseline = (KtaSpec.mmH - y) * KtaSpec.pxPerMm;
    _paintAtBaseline(canvas, text, pt, mmToPx(x), baseline,
        bold: bold, color: color);
  }

  void _paintAtBaseline(Canvas canvas, String text, double pt, double xSvg,
      double ySvg,
      {bool bold = false, bool rightAlign = false, Color? color}) {
    if (text.isEmpty) return;
    final painter = TextPainter(
      text: TextSpan(
        text: text,
        style: TextStyle(
          fontFamily: 'KtaDejaVu',
          fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
          fontSize: pt * 25.4 / 72 * KtaSpec.pxPerMm,
          color: color ?? KtaColors.darkText,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    final metrics = painter.computeLineMetrics();
    final baseline = metrics.isEmpty ? painter.height : metrics.first.baseline;
    var dx = xSvg;
    if (rightAlign) dx -= painter.width;
    painter.paint(canvas, Offset(dx, ySvg - baseline));
  }

  @override
  bool shouldRepaint(covariant _BackTextPainter oldDelegate) =>
      oldDelegate.kta != kta || oldDelegate.layout != layout;
}

class _KtaImage extends StatelessWidget {
  final String url;
  final BoxFit fit;
  final String? fallbackInitials;
  const _KtaImage({required this.url, required this.fit, this.fallbackInitials});

  @override
  Widget build(BuildContext context) {
    if (url.isEmpty) {
      // Fallback: tampilkan inisial 3 huruf dari nama jika foto tidak ada.
      if (fallbackInitials != null) {
        return Container(
          alignment: Alignment.center,
          child: Text(
            fallbackInitials!,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: KtaColors.darkText,
            ),
          ),
        );
      }
      return const SizedBox.shrink();
    }
    // Handle data: URIs (base64-encoded images).
    if (url.startsWith('data:')) {
      final bytes = _tryDecodeDataUrl(url);
      if (bytes == null) return const SizedBox.shrink();
      return Image.memory(bytes, fit: fit, gaplessPlayback: true);
    }
    // Handle full https?:// URLs via Image.network.
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return Image.network(url, fit: fit, errorBuilder: (_, __, ___) {
        return const SizedBox.shrink();
      });
    }
    // Handle any other string as an absolute path under /api/uploads/ (same convention
    // used by Member.fotoUrl getter: prepend /api/uploads/ if not already absolute).
    final absUrl = _toAbsolutePhotoUrl(url);
    if (absUrl.isNotEmpty) {
      return Image.network(absUrl, fit: fit, errorBuilder: (_, __, ___) {
        return const SizedBox.shrink();
      });
    }
    // Fallback: empty placeholder.
    return const SizedBox.shrink();
  }
}

class _KtaQr extends StatelessWidget {
  final String dataUrl;
  final String verificationUrl;
  const _KtaQr({required this.dataUrl, required this.verificationUrl});

  @override
  Widget build(BuildContext context) {
    if (dataUrl.startsWith('data:')) {
      final bytes = _tryDecodeDataUrl(dataUrl);
      if (bytes != null) {
        return Image.memory(bytes, fit: BoxFit.contain, gaplessPlayback: true);
      }
    }
    if (verificationUrl.isNotEmpty) {
      return QrImageView(
        data: verificationUrl,
        version: QrVersions.auto,
        size: KtaPositions.qrSize,
      );
    }
    return const SizedBox.shrink();
  }
}Uint8List? _tryDecodeDataUrl(String dataUrl) {
  final comma = dataUrl.indexOf(',');
  if (comma <= 0) return null;
  try {
    return base64Decode(dataUrl.substring(comma + 1));
  } catch (_) {
    return null;
  }
}

String _toAbsolutePhotoUrl(String photoPath) {
  // Jika sudah URL absolut (http/https), kembalikan seperti ada.
  if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
    return photoPath;
  }
  // Jika data URL (data:image/...), kembalikan seperti ada.
  if (photoPath.startsWith('data:')) {
    return photoPath;
  }
  // Jika path relativ (mis. 'foto.jpg' atau '/api/uploads/foto.jpg'),
  // pastikan diawali '/api/uploads/'.
  final p = photoPath.trim();
  if (p.isEmpty) return '';
  if (p.startsWith('/api/uploads/')) return p;
  if (p.startsWith('/')) return '/api/uploads' + p;
  return '/api/uploads/$p';
}
