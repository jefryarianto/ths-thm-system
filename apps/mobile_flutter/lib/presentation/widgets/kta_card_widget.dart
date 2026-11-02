import 'dart:convert';
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../core/utils/kta_layout.dart';
import '../../data/models/card_data.dart';
import '../../data/models/member.dart';
import '../../data/models/member_kta.dart';

/// Kartu KTA flip (depan/belakang) yang merender ulang tata letak presisi mm
/// dari referensi NextJS `KtaPreview`. Memakai font `KtaDejaVu` (DejaVu Sans)
/// dan artwork PNG hasil ekspor `depan.svg` / `belakang.svg`.
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
                                  child:
                                      _KtaBack(kta: kta, layout: layout),
                                )
                              : _KtaFront(kta: kta, layout: layout),
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

/// Kartu berukuran penuh sesuai kanvas CR80 856×540 — dipakai untuk
/// preview/zoom dan ekspor gambar agar hasil persis ukuran kartu.
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

/// Menyiapkan `MemberKta` + `KtaLayout` (memuat font DejaVu) sekali, lalu
/// menyerahkan sisi kartu yang aktif ke `builder`.
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
    }
    return widget.builder(context, kta, layout);
  }
}

// ─────────────────────────── SISI DEPAN ───────────────────────────

class _KtaFront extends StatelessWidget {
  final MemberKta kta;
  final KtaLayout layout;
  const _KtaFront({required this.kta, required this.layout});

  @override
  Widget build(BuildContext context) {
    final f = layout.fields;
    final rank = KtaRank.forLevel(kta.tingkat);
    return ClipRRect(
      borderRadius: BorderRadius.circular(KtaSpec.radiusPx),
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Artwork dasar + bleed 2 mm (89,6 × 57,98 mm) di offset (-2,-2).
          Positioned(
            left: -KtaSpec.bleedMm * KtaSpec.pxPerMm,
            top: -KtaSpec.bleedMm * KtaSpec.pxPerMm,
            child: Image.asset(
              'assets/images/kta/depan.png',
              width: KtaSpec.bgW,
              height: KtaSpec.bgH,
              fit: BoxFit.fill,
            ),
          ),
          // Foto 20 × 30 mm (trim: 4,4 / 12,48 mm), radius 1,4 mm.
          Positioned(
            left: mmToPx(4.4),
            top: mmToPx(12.48),
            width: mmToPx(20),
            height: mmToPx(30),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(mmToPx(1.4)),
              child: _KtaImage(url: kta.fotoUrl, fit: BoxFit.cover),
            ),
          ),
          // Strip tingkat (posisi dari CSS: left 65,223 artwork, top 23,48-2i).
          for (var i = 0; i < rank.count; i++)
            Positioned(
              left: mmToPx(63.223),
              top: mmToPx(21.48 - 2 * i),
              width: mmToPx(18.254),
              height: mmToPx(1.5),
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: rank.color,
                  borderRadius: BorderRadius.circular(mmToPx(0.25)),
                ),
              ),
            ),
          // QR 20,5 × 20,5 mm (trim: 62,1 / 25,88 mm), latar putih.
          Positioned(
            left: mmToPx(62.1),
            top: mmToPx(25.88),
            width: mmToPx(20.5),
            height: mmToPx(20.5),
            child: ColoredBox(
              color: Colors.white,
              child: _KtaQr(dataUrl: kta.qrImageUrl, verificationUrl: ''),
            ),
          ),
          // Teks presisi.
          Positioned.fill(
            child: CustomPaint(
              painter: _FrontTextPainter(kta: kta, layout: layout, fields: f),
            ),
          ),
        ],
      ),
    );
  }
}

class _FrontTextPainter extends CustomPainter {
  final MemberKta kta;
  final KtaLayout layout;
  final Map<String, Fit> fields;
  _FrontTextPainter({required this.kta, required this.layout, required this.fields});

  @override
  void paint(Canvas canvas, Size size) {
    _paintLines(canvas, fields['nomor']!, 28.1, 32.6, 2.5, bold: true);
    _paintText(canvas, kta.jenisKelamin, 52, 32.6, 5.2, bold: true);
    _paintLines(canvas, fields['depanNama']!, 28.1, 26, 2.5, bold: true);
    _paintLines(canvas, fields['ranting']!, 28.1, 19.1, 2.5, bold: true);
    _paintLines(canvas, fields['berlaku']!, 4.4, 5.1, 2.5);
    // "Pindai QR untuk validasi keabsahan anggota" — rata kanan x=81,477.
    const pindai = 'Pindai QR untuk validasi keabsahan anggota';
    _paintText(canvas, pindai, 81.477, 5.1, 4, bold: false, rightAlign: true);
  }

  void _paintLines(Canvas canvas, Fit fit, double x, double y, double leading,
      {bool bold = false}) {
    for (var i = 0; i < fit.lines.length; i++) {
      final baseline = (KtaSpec.mmH - (y - leading * i)) * KtaSpec.pxPerMm;
      _paintAtBaseline(canvas, fit.lines[i], fit.pt, x, baseline, bold: bold);
    }
  }

  void _paintText(Canvas canvas, String text, double x, double y, double pt,
      {bool bold = false, bool rightAlign = false}) {
    final baseline = (KtaSpec.mmH - y) * KtaSpec.pxPerMm;
    _paintAtBaseline(canvas, text, pt, x, baseline,
        bold: bold, rightAlign: rightAlign);
  }

  void _paintAtBaseline(Canvas canvas, String text, double pt, double xMm,
      double baselinePx,
      {bool bold = false, bool rightAlign = false}) {
    final painter = TextPainter(
      text: TextSpan(
        text: text,
        style: TextStyle(
          fontFamily: KtaSpec.fontFamily,
          fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
          fontSize: pt * 25.4 / 72 * KtaSpec.pxPerMm,
          color: const Color(0xFF111111),
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    final baseline = painter.computeLineMetrics().first.baseline;
    var dx = mmToPx(xMm);
    if (rightAlign) dx -= painter.width;
    painter.paint(canvas, Offset(dx, baselinePx - baseline));
  }

  @override
  bool shouldRepaint(covariant _FrontTextPainter oldDelegate) =>
      oldDelegate.kta != kta || oldDelegate.layout != layout;
}

// ─────────────────────────── SISI BELAKANG ───────────────────────────

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
            left: -KtaSpec.bleedMm * KtaSpec.pxPerMm,
            top: -KtaSpec.bleedMm * KtaSpec.pxPerMm,
            child: Image.asset(
              'assets/images/kta/belakang.png',
              width: KtaSpec.bgW,
              height: KtaSpec.bgH,
              fit: BoxFit.fill,
            ),
          ),
          // Tanda tangan (opsional) — trim 48,1 / 42,58 mm, 19,5 × 5,1 mm.
          if (kta.tandaTanganUrl.isNotEmpty)
            Positioned(
              left: mmToPx(48.1),
              top: mmToPx(42.58),
              width: mmToPx(19.5),
              height: mmToPx(5.1),
              child: _KtaImage(url: kta.tandaTanganUrl, fit: BoxFit.contain),
            ),
          // Stempel/cap distrik — menyertai tanda tangan penandatangan.
          // Cap diletakkan menimpa area ttd (seperti cap fisik), semi transparan.
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
              painter: _BackTextPainter(
                  kta: kta, layout: layout, fields: f, koorWidthMm: koorWidth),
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

  @override
  void paint(Canvas canvas, Size size) {
    final belakangNama = fields['belakangNama']!;
    _paintLines(canvas, belakangNama, 29.2, 41.4, 2.4);
    // Jenis kelamin mengikuti lebar nama (x = 29,2 + lebarNama + 9).
    _paintText(
      canvas,
      kta.jenisKelamin,
      29.2 + belakangNama.widthMm + 9,
      41.4,
      5.3,
    );
    _paintLines(canvas, fields['lahir']!, 29.2, 37.4, 2.4);
    _paintLines(canvas, fields['pekerjaan']!, 29.2, 33.4, 2.4);
    _paintLines(canvas, fields['status']!, 29.2, 29.4, 2.4);
    _paintLines(canvas, fields['pelantikan']!, 29.2, 25.4, 2.4);
    _paintLines(canvas, fields['alamat']!, 29.2, 21.4, 2.4);
    _paintLines(canvas, fields['terbit']!, 4.4, 3.5, 2.4);
    _paintLines(canvas, fields['koordinator']!, 48.1, 3.5, 2.4);

    // Garis tanda tangan — trim 48,1 / 48,28 mm, lebar mengikuti koordinator.
    final linePaint = Paint()
      ..color = const Color(0xFF0B377B)
      ..strokeWidth = mmToPx(0.45 / 72 * 25.4) // 0,45pt
      ..strokeCap = StrokeCap.square;
    canvas.drawLine(
      Offset(mmToPx(48.1), mmToPx(48.28)),
      Offset(mmToPx(48.1) + koorWidthMm * KtaSpec.pxPerMm, mmToPx(48.28)),
      linePaint,
    );
  }

  void _paintLines(Canvas canvas, Fit fit, double x, double y, double leading,
      {bool bold = false}) {
    for (var i = 0; i < fit.lines.length; i++) {
      final baseline = (KtaSpec.mmH - (y - leading * i)) * KtaSpec.pxPerMm;
      _paintAtBaseline(canvas, fit.lines[i], fit.pt, x, baseline, bold: bold);
    }
  }

  void _paintText(Canvas canvas, String text, double x, double y, double pt,
      {bool bold = false, bool rightAlign = false}) {
    final baseline = (KtaSpec.mmH - y) * KtaSpec.pxPerMm;
    _paintAtBaseline(canvas, text, pt, x, baseline,
        bold: bold, rightAlign: rightAlign);
  }

  void _paintAtBaseline(Canvas canvas, String text, double pt, double xMm,
      double baselinePx,
      {bool bold = false, bool rightAlign = false}) {
    final painter = TextPainter(
      text: TextSpan(
        text: text,
        style: TextStyle(
          fontFamily: KtaSpec.fontFamily,
          fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
          fontSize: pt * 25.4 / 72 * KtaSpec.pxPerMm,
          color: const Color(0xFF111111),
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    final baseline = painter.computeLineMetrics().first.baseline;
    var dx = mmToPx(xMm);
    if (rightAlign) dx -= painter.width;
    painter.paint(canvas, Offset(dx, baselinePx - baseline));
  }

  @override
  bool shouldRepaint(covariant _BackTextPainter oldDelegate) =>
      oldDelegate.kta != kta || oldDelegate.layout != layout;
}

// ─────────────────────────── PENDUKUNG ───────────────────────────

/// Gambar dari URL http(s) atau data:base64; kosong → area transparan.
class _KtaImage extends StatelessWidget {
  final String url;
  final BoxFit fit;
  const _KtaImage({required this.url, required this.fit});

  @override
  Widget build(BuildContext context) {
    if (url.isEmpty) return const SizedBox.shrink();
    if (url.startsWith('data:')) {
      final bytes = _tryDecodeDataUrl(url);
      if (bytes == null) return const SizedBox.shrink();
      return Image.memory(bytes, fit: fit, gaplessPlayback: true);
    }
    if (url.startsWith('http')) {
      return Image.network(url, fit: fit, errorBuilder: (_, __, ___) {
        return const SizedBox.shrink();
      });
    }
    return const SizedBox.shrink();
  }
}

/// QR dari data URL, atau generator lokal bila URL kosong / gagal decode.
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
        size: mmToPx(20.5),
      );
    }
    return const SizedBox.shrink();
  }
}

Uint8List? _tryDecodeDataUrl(String dataUrl) {
  final comma = dataUrl.indexOf(',');
  if (comma <= 0) return null;
  try {
    return base64Decode(dataUrl.substring(comma + 1));
  } catch (_) {
    return null;
  }
}