import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/card_design.dart';
import '../../data/models/card_data.dart';
import '../../data/models/member.dart';

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
    _ctrl = AnimationController(duration: const Duration(milliseconds: 400), vsync: this);
    _anim = Tween<double>(begin: 0, end: 1)
        .animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut));
  }
  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }
  void _flip() { _showFront ? _ctrl.forward() : _ctrl.reverse(); _showFront = !_showFront; }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, c) {
      final scaleWidth = c.maxWidth / CardSpec.w;
      final scaleHeight = c.maxHeight.isFinite ? c.maxHeight / CardSpec.h : double.infinity;
      final scale = scaleWidth < scaleHeight ? scaleWidth : scaleHeight;
      final w = CardSpec.w * scale;
      final h = CardSpec.h * scale;
      return GestureDetector(
        onTap: _flip,
        child: SizedBox(
          width: w,
          height: h,
          child: OverflowBox(
            alignment: Alignment.center,
            minWidth: 0,
            maxWidth: CardSpec.w,
            minHeight: 0,
            maxHeight: CardSpec.h,
            child: Transform.scale(
              scale: scale,
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
                            transform: Matrix4.identity()..rotateY(math.pi),
                            child: _KtaCardBack(member: widget.member, cardData: widget.cardData))
                        : _KtaCardFront(member: widget.member, cardData: widget.cardData),
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
    return SizedBox(
      width: CardSpec.w,
      height: CardSpec.h,
      child: showBack
          ? _KtaCardBack(member: member, cardData: cardData)
          : _KtaCardFront(member: member, cardData: cardData),
    );
  }
}
class _KtaCardFront extends StatelessWidget {
  final Member member;
  final CardData? cardData;
  const _KtaCardFront({required this.member, this.cardData});
  @override
  Widget build(BuildContext context) {
    final lv = getLevelVisual(member.tingkat);
    final distrik = member.namaDistrik.isEmpty ? 'THS-THM' : member.namaDistrik;
    return ClipRRect(borderRadius: BorderRadius.circular(CardSpec.radius),
      child: Container(width: CardSpec.w, height: CardSpec.h,
        decoration: BoxDecoration(color: CardColors.frontBg, border: Border.all(color: CardColors.frontBorder)),
        child: Stack(children: [
          Positioned.fill(child: CustomPaint(painter: _FrontDecorPainter())),
          Positioned(top: FrontLayout.circle1Top, right: FrontLayout.circle1Right,
              child: _bgCircle(FrontLayout.circle1Size, CardColors.guillocheFront)),
          Positioned(bottom: -FrontLayout.circle2Bottom.abs(), left: FrontLayout.circle2Left,
              child: _bgCircle(FrontLayout.circle2Size, CardColors.guillocheBack)),
          const Positioned.fill(child: CustomPaint(painter: _GuillochePainter(CardColors.guillocheFront))),
          Positioned(left: FrontLayout.wmLeft, top: FrontLayout.wmTop,
              child: _wm('assets/images/peta-indonesia.png', FrontLayout.wmW, FrontLayout.wmH, FrontLayout.wmOpacity, CardColors.watermarkMap)),
          _NamePattern(name: member.namaLengkap, color: CardColors.watermarkMap, opacity: Pat.frontOpacity),
          Positioned(top: FrontLayout.headerPadTop, left: FrontLayout.headerPadH, right: FrontLayout.headerPadH,
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                _logo(FrontLayout.logoSize, FrontLayout.logoImg, FrontLayout.logoBorder),
                const SizedBox(width: FrontLayout.headerGap),
                Expanded(child: _hdr(distrik)),
                if (cardData != null && cardData!.status.isNotEmpty) ...[
                  const SizedBox(width: 8),
                  _statusBadge(cardData!.status),
                ],
              ])),
          Positioned(left: FrontLayout.photoBigLeft, top: FrontLayout.photoBigTop,
              child: _photo(FrontLayout.photoBigW, FrontLayout.photoBigH, member)),
          Positioned(right: FrontLayout.photoSmallRight, top: FrontLayout.photoSmallTop,
              child: _photo(FrontLayout.photoSmallW, FrontLayout.photoSmallH, member)),
          if (lv.stripCount > 0) Positioned(right: FrontLayout.rankRight,
              top: FrontLayout.rankTop, child: _rank(lv, member.tingkat)),
          Positioned(left: FrontLayout.infoLeft, top: FrontLayout.infoTop, right: FrontLayout.infoRight, child: _info(member)),
          Positioned(left: FrontLayout.bottomLeft, bottom: FrontLayout.bottomBottom,
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Berlaku sampai', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: CardColors.label)),
                const SizedBox(height: 2),
                Text(validUntilText(), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: CardColors.value)),
              ])),
          Positioned(right: FrontLayout.signerRight, bottom: FrontLayout.signerBottom,
              width: FrontLayout.signerW, height: FrontLayout.signerH, child: _signer(distrik, cardData: cardData)),
        ]),),);
  }
}
class _KtaCardBack extends StatelessWidget {
  final Member member;
  final CardData? cardData;
  const _KtaCardBack({required this.member, this.cardData});
  @override
  Widget build(BuildContext context) {
    final verificationUrl = (cardData?.verificationUrl ?? '').trim();
    final qrData = verificationUrl.isNotEmpty
        ? verificationUrl
        : (member.nomorAnggota.isNotEmpty ? member.nomorAnggota : member.id);
    final distrik = member.namaDistrik.isEmpty ? 'THS-THM' : member.namaDistrik;
    return ClipRRect(borderRadius: BorderRadius.circular(CardSpec.radius),
      child: Container(width: CardSpec.w, height: CardSpec.h,
        decoration: const BoxDecoration(color: CardColors.backBg),
        child: Stack(children: [
          Positioned.fill(child: CustomPaint(painter: _BackDecorPainter())),
          const Positioned.fill(child: CustomPaint(painter: _GuillochePainter(CardColors.guillocheBack))),
          Positioned(left: (CardSpec.w - BackLayout.wmW) / 2, top: (CardSpec.h - BackLayout.wmH) / 2,
              child: _wm('assets/images/peta-indonesia.png', BackLayout.wmW, BackLayout.wmH, BackLayout.wmOpacity, CardColors.white)),
          _NamePattern(name: member.namaLengkap, color: CardColors.white, opacity: Pat.backOpacity),
          Positioned(top: 0, left: 0, right: 0, height: BackLayout.headerHeight, child: _backHdr(distrik)),
          Positioned(left: BackLayout.qrLeft, top: BackLayout.qrTop, child: Container(
            width: BackLayout.qrSize, height: BackLayout.qrSize, padding: const EdgeInsets.all(BackLayout.qrPadding),
            decoration: BoxDecoration(color: CardColors.white, borderRadius: BorderRadius.circular(16),
                border: Border.all(width: BackLayout.qrBorderW, color: CardColors.stampText)),
            child: Stack(children: [
              Positioned.fill(
                  child: QrImageView(data: qrData, version: QrVersions.auto,
                      errorCorrectionLevel: QrErrorCorrectLevel.H, padding: const EdgeInsets.all(0))),
              Positioned.fill(
                child: LayoutBuilder(builder: (context, c) {
                  final size = c.maxWidth * 0.26;
                  return Center(
                    child: Container(
                      width: size, height: size,
                      decoration: const BoxDecoration(shape: BoxShape.circle, color: Colors.white),
                      padding: EdgeInsets.all(size * 0.12),
                      child: Image.asset('assets/images/logo.png', fit: BoxFit.contain),
                    ),
                  );
                }),
              ),
            ]))),
          Positioned(left: BackLayout.infoLeft, top: BackLayout.infoTop, right: BackLayout.infoRight, child: _backInfo(member)),
          Positioned(left: BackLayout.footerLeft, right: BackLayout.footerRight, bottom: BackLayout.footerBottom,
              child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
                const Expanded(child: Text('Jika kartu ini ditemukan, harap menghubungi sekretariat THS-THM setempat.',
                    style: TextStyle(fontSize: 15, height: 22/15, color: CardColors.white))),
                if (verificationUrl.isNotEmpty) ...[
                  const SizedBox(width: 24),
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 360),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.end, mainAxisSize: MainAxisSize.min, children: [
                      const Text('URL VERIFIKASI', style: TextStyle(fontSize: 12, color: CardColors.white)),
                      const SizedBox(height: 2),
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Text(verificationUrl, maxLines: 1,
                            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: CardColors.white)),
                      ),
                    ]),
                  ),
                ],
              ])),
        ]),),);
  }
}
Widget _bgCircle(double sz, Color c) => Container(width: sz, height: sz, decoration: BoxDecoration(shape: BoxShape.circle, color: c));
Widget _wm(String asset, double w, double h, double op, Color tint) =>
    Opacity(opacity: op, child: ColorFiltered(colorFilter: ColorFilter.mode(tint, BlendMode.srcIn),
        child: Image.asset(asset, width: w, height: h, fit: BoxFit.contain)));
Widget _logo(double sz, double img, double bw) =>
    Container(width: sz, height: sz, decoration: BoxDecoration(shape: BoxShape.circle,
        color: Colors.white.withValues(alpha: 0.95), border: Border.all(width: bw, color: Colors.white)),
        child: Center(child: Image.asset('assets/images/logo.png', width: img, height: img, fit: BoxFit.contain)));
Widget _hdr(String distrik) {
  final rows = [('KARTU TANDA ANGGOTA', 2.0), ('ORGANISASI PENCAK SILAT PENDIDIKAN', 1.1),
    ('TUNGGAL HATI SEMINARI - TUNGGAL HATI MARIA', 0.5),
    ('DISTRIK KEUSKUPAN ${distrik.replaceFirst(RegExp(r'^keuskupan\s*', caseSensitive: false), '').toUpperCase()}', 0.0)];
  return Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min,
      children: rows.map((r) => Padding(padding: const EdgeInsets.only(bottom: 1),
          child: Text(r.$1, maxLines: 1, overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: FrontLayout.headerFont, height: FrontLayout.headerLineH / FrontLayout.headerFont,
                  fontWeight: FontWeight.w900, letterSpacing: r.$2,
                  color: CardColors.white, fontFamily: CardFonts.openSansBold)))).toList());
}
Widget _statusBadge(String status) {
  // Status dokumen kartu dari server: generated/downloaded = AKTIF, revoked = DICABUT
  final revoked = status == 'revoked';
  final label = revoked ? 'DICABUT' : 'AKTIF';
  return Container(
    margin: const EdgeInsets.only(top: 2),
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(
      color: revoked ? AppTheme.error : AppTheme.success,
      borderRadius: BorderRadius.circular(20),
      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.25), blurRadius: 4)],
    ),
    child: Text(label,
        maxLines: 1,
        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.white, letterSpacing: 1)),
  );
}
Widget _photo(double w, double h, Member m) {
  final crop = photoCrop(w, h);
  if (m.fotoPath.isEmpty) return SizedBox(width: w, height: h, child: _fbIcon(m.jenisKelamin, w * 0.5));
  return ClipRect(child: SizedBox(width: w, height: h, child: Stack(children: [
      Positioned(left: crop.left, top: 0, width: crop.w, height: crop.h,
          child: Image.network(m.fotoUrl, fit: BoxFit.cover, gaplessPlayback: true,
              errorBuilder: (_, __, ___) => _fbIcon(m.jenisKelamin, w * 0.5))),
  ])));
}
Widget _fbIcon(String jk, double sz) => Center(child: Image.asset(
    jk == 'P' ? 'assets/images/woman-icon.png' : 'assets/images/man-icon.png',
    width: sz, height: sz, fit: BoxFit.contain, opacity: const AlwaysStoppedAnimation(0.9)));
Widget _rank(LevelVisual lv, String t) => SizedBox(width: FrontLayout.rankW,
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      Text(t.toUpperCase(), maxLines: 1,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: CardColors.rankText, letterSpacing: 1)),
      const SizedBox(height: 3),
      Column(children: List.generate(lv.stripCount, (_) => Container(margin: const EdgeInsets.only(bottom: 3),
          height: FrontLayout.rankStripH, width: FrontLayout.rankW,
          decoration: BoxDecoration(color: lv.color, borderRadius: BorderRadius.circular(3),
              border: Border.all(color: CardColors.rankStripBorder, width: 1))))),
    ]));
Widget _info(Member m) {
  final ttl = ttlText(m.tempatLahir, m.tanggalLahir);
  Widget row(String label, String value, {bool strong = false}) => Padding(
      padding: const EdgeInsets.only(bottom: FrontLayout.rowMarginBottom),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
        Text(label.toUpperCase(), style: const TextStyle(fontSize: FrontLayout.labelFont, fontWeight: FontWeight.w800, color: CardColors.label, letterSpacing: 0.5)),
        const SizedBox(height: 3),
        Text(value.toUpperCase(), maxLines: 2, overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: strong ? FrontLayout.valueStrongFont : FrontLayout.valueFont,
                fontWeight: FontWeight.w700, color: strong ? CardColors.valueStrong : CardColors.value,
                fontFamily: CardFonts.ocrA, shadows: [Shadow(color: strong ? CardColors.valueStrong : CardColors.value, blurRadius: strong ? 2 : 1.5)])),
      ]));
  return Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
    row('No. Anggota', m.nomorAnggota, strong: true),
    Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Expanded(child: row('Nama', m.namaLengkap)),
      SizedBox(width: 40, child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
        const Text('JK', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: CardColors.label, letterSpacing: 0.5)),
        const SizedBox(height: 3),
        Text(m.jenisKelamin == 'P' ? 'P' : 'L', style: const TextStyle(fontSize: FrontLayout.valueFont, fontWeight: FontWeight.w700, color: CardColors.value, fontFamily: CardFonts.ocrA, shadows: [Shadow(color: CardColors.value, blurRadius: 1.5)])),
      ])),
    ]),
    row('Tempat, Tanggal Lahir', ttl),
    row('Ranting', m.namaRanting),
    row('Wilayah', m.namaWilayah),
  ]);
}
Widget _signer(String distrik, {CardData? cardData}) {
  // Resolve signers: prefer API data (distrik-scoped) → fallback defaults
  final signers = (cardData != null && cardData.signers.isNotEmpty)
      ? cardData.signers
      : [CardSigner(signerName: cardData?.signerName.isNotEmpty == true ? cardData!.signerName : 'Koordinator Distrik', signerTitle: cardData?.signerTitle.isNotEmpty == true ? cardData!.signerTitle : 'THS-THM')];
  final stampUrl = cardData?.stampUrl ?? '';
  final sigUrl = cardData?.signatureUrl ?? '';

  return Stack(clipBehavior: Clip.none, children: [
    // Teks KOORDINATORAT DISTRIK THS-THM + KEUSKUPAN <distrik>
    Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
      const SizedBox(height: 35),
      const Text('KOORDINATORAT DISTRIK THS-THM', maxLines: 1, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: CardColors.ttd)),
      const SizedBox(height: 1),
      Text('KEUSKUPAN ${distrik.replaceFirst(RegExp(r'^keuskupan\s*', caseSensitive: false), '').toUpperCase()}',
          maxLines: 1, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: CardColors.ttd)),
    ]),
    // Tanda tangan — gambar dari server bila ada; DITARUH DI BAWAH stempel
    // (stempel dicetak menutupi bagian tengah tanda tangan, sesuai kartu resmi)
    Positioned(left: -68, top: 63, child: Transform.rotate(angle: -8 * math.pi / 180,
        child: SizedBox(width: 175, height: 60, child: sigUrl.isNotEmpty
            ? Image.network(sigUrl, fit: BoxFit.contain, gaplessPlayback: true, opacity: const AlwaysStoppedAnimation(0.7),
                errorBuilder: (_, __, ___) => const SizedBox.shrink())
            : const SizedBox.shrink()))),
    // Stempel — gambar dari server bila ada, lingkaran kosong bila tidak.
    // Ditempatkan di tengah blok tanda tangan (bukan melayang di kiri),
    // sejajar dengan baris jabatan & nama penandatangan di bawahnya.
    Positioned(left: -55, top: 35, child: Transform.rotate(angle: -8 * math.pi / 180,
        child: SizedBox(width: 110, height: 110, child: Container(decoration: BoxDecoration(shape: BoxShape.circle,
            border: Border.all(width: 2, color: CardColors.stampBorder)), child: ClipOval(child: stampUrl.isNotEmpty
            ? Image.network(stampUrl, width: 110, height: 110, fit: BoxFit.cover, gaplessPlayback: true,
                errorBuilder: (_, __, ___) => const SizedBox.shrink())
            : const SizedBox.shrink()))))),
    // Nama penandatangan — bawah kartu, rata kiri, beberapa signers bertumpuk
    Positioned(left: 0, bottom: 0, child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min,
        children: List.generate(signers.length, (i) => Padding(
            key: ValueKey(i),
            padding: EdgeInsets.only(bottom: i < signers.length - 1 ? 34 : 0),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
              if (signers[i].signerName.isNotEmpty) Text(signers[i].signerName.toUpperCase(), maxLines: 1, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: CardColors.value, decoration: TextDecoration.underline)),
              if (signers[i].signerTitle.isNotEmpty) ...[
                const SizedBox(height: 1),
                Text(signers[i].signerTitle.toUpperCase(), maxLines: 1, overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: CardColors.value)),
              ],
            ]))))),
  ]);
}
Widget _backHdr(String distrik) => Stack(children: [
  Positioned.fill(child: CustomPaint(painter: _HeaderGradientPainter())),
  Positioned(left: BackLayout.headerPadH, top: (BackLayout.headerHeight - BackLayout.logoSize) / 2,
      child: Container(width: BackLayout.logoSize, height: BackLayout.logoSize,
          decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: 0.14),
              border: Border.all(width: 1, color: Colors.white.withValues(alpha: 0.45))),
          child: Center(child: Image.asset('assets/images/logo.png', width: BackLayout.logoImg, height: BackLayout.logoImg, fit: BoxFit.contain)))),
  Positioned(left: BackLayout.headerPadH + BackLayout.logoSize + BackLayout.headerGap, top: 14, right: BackLayout.headerPadH,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
        const Text('VERIFIKASI KARTU ANGGOTA', maxLines: 1, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, letterSpacing: 3, color: CardColors.white)),
        const SizedBox(height: 2),
        Text('Scan QR untuk memeriksa keabsahan anggota', style: TextStyle(fontSize: 13, color: CardColors.white.withValues(alpha: 0.88))),
      ])),
  Positioned(bottom: 0, left: 0, right: 0, height: 1, child: Container(color: CardColors.white.withValues(alpha: 0.30))),
]);
Widget _backInfo(Member m) {
  final ttl = ttlText(m.tempatLahir, m.tanggalLahir);
  Widget row(String label, String value) => Padding(padding: const EdgeInsets.only(bottom: 12),
      child: Row(children: [
        SizedBox(width: BackLayout.rowLabelW, child: Text(label, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: CardColors.white))),
        SizedBox(width: BackLayout.rowColonW, child: Text(':', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: CardColors.white.withValues(alpha: 0.9)))),
        Expanded(child: Text(properCase(value), maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: CardColors.white))),
      ]));
  return Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
    Text('Halaman verifikasi publik hanya menampilkan data minimum untuk membuktikan keabsahan anggota.',
        style: TextStyle(fontSize: 18, height: 27 / 18, color: CardColors.white.withValues(alpha: 0.95))),
    const SizedBox(height: 16),
    row('TTL', ttl), row('Dadar', dadarText(m.tempatDadar, m.tahunDadar)),
    row('Status', m.statusKeanggotaan == 'aktif' ? 'Aktif' : 'Nonaktif'),
    row('Valid s/d', validUntilText()),
    row('Alamat', m.alamat.isEmpty ? '-' : properCase(m.alamat)),
  ]);
}
class _NamePattern extends StatelessWidget {
  final String name; final Color color; final double opacity;
  const _NamePattern({required this.name, required this.color, required this.opacity});
  @override
  Widget build(BuildContext context) {
    final n = name.isEmpty ? 'THS-THM' : name;
    return Positioned.fill(
      child: OverflowBox(
        maxWidth: double.infinity,
        maxHeight: double.infinity,
        child: Transform.rotate(
          angle: Pat.angleDeg * math.pi / 180,
          child: Opacity(
            opacity: opacity,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: List.generate(Pat.rows, (_) => Padding(
                padding: const EdgeInsets.only(bottom: Pat.stepY),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(Pat.cols, (_) => Padding(
                    padding: const EdgeInsets.only(right: Pat.gapX),
                    child: Text(n, style: TextStyle(fontSize: Pat.fontSize, fontWeight: FontWeight.w900, color: color, letterSpacing: 2)),
                  )),
                ),
              )),
            ),
          ),
        ),
      ),
    );
  }
}

class _HeaderGradientPainter extends CustomPainter {
  @override
  void paint(Canvas c, Size s) {
    c.drawRect(Offset.zero & s, Paint()..shader = const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight,
        colors: [CardColors.headerFrom, CardColors.headerTo]).createShader(Offset.zero & s));
  }
  @override bool shouldRepaint(covariant CustomPainter o) => false;
}

class _FrontDecorPainter extends CustomPainter {
  @override
  void paint(Canvas c, Size s) {
    final b = Offset.zero & s;
    _w(c, s, CardColors.headerFrom, 0.9, CardColors.headerTo, 0.0,
        const Alignment(-1, -1), const Alignment(0.2, 1), 'M-60 110 C140 30,320 200,500 110 C680 20,780 20,916 100 L916 560 L-60 560Z');
    _w(c, s, CardColors.bottomFrom, 0.6, CardColors.bottomTo, 0.0,
        const Alignment(1, -1), const Alignment(-0.2, 1), 'M-40 300 C180 200,380 380,560 300 C740 220,780 220,900 290 L900 560 L-40 560Z');
    _w(c, s, CardColors.bottomFrom, 0.45, CardColors.backGradEnd, 0.0,
        const Alignment(-1, 1), const Alignment(1, -1), 'M-60 440 C150 350,340 530,540 440 C740 350,790 370,916 440 L916 560 L-60 560Z');
    c.drawRect(Rect.fromLTWH(0, 0, s.width, 104), Paint()..shader = const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight,
        colors: [CardColors.headerFrom, CardColors.headerTo]).createShader(b));
    final bp = Paint()..shader = LinearGradient(begin: Alignment.topRight, end: Alignment.bottomLeft,
        colors: [CardColors.bottomFrom.withValues(alpha: 0.8), CardColors.bottomTo.withValues(alpha: 0.2)]).createShader(b);
    c.drawPath(Path()..moveTo(0, 462)..cubicTo(140, 436, 300, 476, 470, 450)..cubicTo(720, 424, 790, 424, 856, 452)..lineTo(856, 540)..lineTo(0, 540)..close(), bp);
  }
  void _w(Canvas c, Size s, Color f, double fa, Color t, double ta, Alignment b, Alignment e, String d) {
    c.drawPath(_p(d, s), Paint()..shader = LinearGradient(begin: b, end: e,
        colors: [f.withValues(alpha: fa), t.withValues(alpha: ta)]).createShader(Offset.zero & s));
  }
  @override bool shouldRepaint(covariant CustomPainter o) => false;
}

class _BackDecorPainter extends CustomPainter {
  @override
  void paint(Canvas c, Size s) {
    c.drawRect(Offset.zero & s, Paint()..shader = const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight,
        colors: [CardColors.backGradStart, CardColors.backGradMid, CardColors.backGradEnd], stops: [0.0, 0.5, 1.0]).createShader(Offset.zero & s));
    c.drawPath(_p('M-40 170 C160 90,340 240,520 170 C780 90,790 90,920 170 L920 540 L-40 540Z', s),
        Paint()..color = Colors.white.withValues(alpha: 0.06));
  }
  @override bool shouldRepaint(covariant CustomPainter o) => false;
}

class _GuillochePainter extends CustomPainter {
  final Color stroke;
  const _GuillochePainter(this.stroke);
  @override
  void paint(Canvas c, Size s) {
    final p = Paint()..color = stroke..style = PaintingStyle.stroke;
    c.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(16, 16, s.width - 32, s.height - 32), const Radius.circular(22)), p..strokeWidth = 1.2);
    c.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(22, 22, s.width - 44, s.height - 44), const Radius.circular(18)), p..strokeWidth = 0.8);
    c.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(27, 27, s.width - 54, s.height - 54), const Radius.circular(14)), p..strokeWidth = 0.5);
  }
  @override bool shouldRepaint(covariant CustomPainter o) => false;
}

Path _p(String d, Size s) {
  final path = Path();
  final rx = RegExp(r'[-+]?\d*\.?\d+');
  final nums = rx.allMatches(d).map((m) => double.parse(m.group(0)!)).toList();
  var i = 0, x = 0.0, y = 0.0;
  for (final ch in d.replaceAll(rx, '|').split('|')) {
    if (ch.isEmpty) continue;
    final c = ch.trim();
    if (c == 'M' || c == 'm') { x = nums[i++]; y = nums[i++]; path.moveTo(x, y); }
    else if (c == 'L' || c == 'l') { x = nums[i++]; y = nums[i++]; path.lineTo(x, y); }
    else if (c == 'C' || c == 'c') {
      final x1 = nums[i++], y1 = nums[i++], x2 = nums[i++], y2 = nums[i++];
      x = nums[i++]; y = nums[i++]; path.cubicTo(x1, y1, x2, y2, x, y);
    }
    else if (c == 'S' || c == 's') {
      final x2 = nums[i++], y2 = nums[i++];
      x = nums[i++]; y = nums[i++]; path.cubicTo(x, y, x2, y2, x, y);
    }
    else if (c == 'Z' || c == 'z') {
      path.close();
    }
  }
  return path;
}