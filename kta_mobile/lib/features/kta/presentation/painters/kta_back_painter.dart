import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import '../../../../core/design/tokens.dart';
import '../../../../core/text/text_fit.dart';
import '../../data/models/anggota.dart';

class KtaBackPainter extends CustomPainter {
  final Anggota anggota;
  final ui.Image? backgroundImage;
  final ui.Image? tandaTanganImage;

  KtaBackPainter({
    required this.anggota,
    this.backgroundImage,
    this.tandaTanganImage,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final clipRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, 0, size.width, size.height),
      const Radius.circular(KTALayout.cornerRadius),
    );
    canvas.clipRRect(clipRect);

    if (backgroundImage != null) {
      canvas.drawImageRect(
        backgroundImage!,
        Rect.fromLTWH(
          0,
          0,
          backgroundImage!.width.toDouble(),
          backgroundImage!.height.toDouble(),
        ),
        Rect.fromLTWH(0, 0, size.width, size.height),
        Paint()..filterQuality = FilterQuality.high,
      );
    }

    _drawText(
      canvas,
      'DATA ANGGOTA',
      KTALayout.backLabelX,
      KTALayout.y(48.65),
      KTATypography.pt(7.0),
      true,
      KTAColors.gold,
    );

    final nameRaw = anggota.nama.trim();
    final nameText = nameRaw.isEmpty ? '[BELUM DIISI]' : nameRaw;
    final sex = anggota.jenisKelamin?.name ?? '';
    final maxNameWidth = 508.0 -
        (sex.isNotEmpty ? 90.0 + KTATypography.pt(5.3) : 0.0);
    final nameFitted = fitSingle(
      nameText,
      maxNameWidth,
      KTATypography.pt(5.3),
      KTATypography.pt(3.6),
      true,
    );
    final backGenderX = KTALayout.backValueX +
        _measureText(nameFitted.text, nameFitted.size, true) +
        90.0;

    final birthFitted = fitSingle(
      _resolveValue(anggota.tempatTanggalLahir),
      520.0,
      KTATypography.pt(5.3),
      KTATypography.pt(3.6),
      false,
    );

    final jobFitted = fitSingle(
      _resolveValue(anggota.pekerjaan),
      520.0,
      KTATypography.pt(5.3),
      KTATypography.pt(3.6),
      false,
    );

    final statusFitted = fitSingle(
      _resolveValue(anggota.status),
      520.0,
      KTATypography.pt(5.3),
      KTATypography.pt(3.6),
      false,
    );

    final pelantikanFitted = fitSingle(
      _resolvePelantikan(anggota.tanggalPelantikan, anggota.tahunPelantikan),
      520.0,
      KTATypography.pt(5.3),
      KTATypography.pt(3.6),
      false,
    );

    final rows = [
      (
        label: 'NAMA LENGKAP',
        yMm: 41.4,
        fitted: nameFitted,
        bold: true,
        color: KTAColors.white,
      ),
      (
        label: 'TEMPAT / TANGGAL LAHIR',
        yMm: 37.4,
        fitted: birthFitted,
        bold: false,
        color: KTAColors.offWhite,
      ),
      (
        label: 'PEKERJAAN',
        yMm: 33.4,
        fitted: jobFitted,
        bold: false,
        color: KTAColors.offWhite,
      ),
      (
        label: 'STATUS',
        yMm: 29.4,
        fitted: statusFitted,
        bold: false,
        color: KTAColors.offWhite,
      ),
      (
        label: 'PELANTIKAN',
        yMm: 25.4,
        fitted: pelantikanFitted,
        bold: false,
        color: KTAColors.offWhite,
      ),
    ];

    final labelSize = KTATypography.pt(4.0);
    for (final row in rows) {
      final y = KTALayout.y(row.yMm);
      _drawText(
        canvas,
        row.label,
        KTALayout.backLabelX,
        y,
        labelSize,
        true,
        KTAColors.offWhite,
      );
      _drawText(
        canvas,
        ':',
        KTALayout.backColonX,
        y,
        labelSize,
        true,
        KTAColors.offWhite,
      );
      _drawText(
        canvas,
        row.fitted.text,
        KTALayout.backValueX,
        y,
        row.fitted.size,
        row.bold,
        row.color,
      );
    }

    if (sex.isNotEmpty) {
      _drawText(
        canvas,
        sex,
        backGenderX,
        KTALayout.y(41.4),
        KTATypography.pt(5.3),
        true,
        KTAColors.white,
      );
    }

    final addressY = KTALayout.y(21.4);
    _drawText(
      canvas,
      'ALAMAT',
      KTALayout.backLabelX,
      addressY,
      labelSize,
      true,
      KTAColors.offWhite,
    );
    _drawText(
      canvas,
      ':',
      KTALayout.backColonX,
      addressY,
      labelSize,
      true,
      KTAColors.offWhite,
    );

    final addressWrapped = wrap(
      _resolveValue(anggota.alamat),
      520.0,
      3,
      KTATypography.pt(5.3),
      KTATypography.pt(4.0),
      false,
    );
    final addressLines = addressWrapped.lines.isEmpty
        ? [_resolveValue(anggota.alamat)]
        : addressWrapped.lines;
    for (int i = 0; i < addressLines.length; i++) {
      _drawText(
        canvas,
        addressLines[i],
        KTALayout.backValueX,
        addressY + 24.0 * i,
        addressWrapped.size,
        false,
        KTAColors.offWhite,
      );
    }

    final issueDate = anggota.tanggalTerbit?.trim();
    final issueDateText =
        (issueDate != null && issueDate.isNotEmpty) ? issueDate : '...............';
    final issueFitted = fitSingle(
      'TANGGAL TERBIT : $issueDateText',
      360.0,
      KTATypography.pt(5.0),
      KTATypography.pt(3.6),
      false,
    );
    _drawText(
      canvas,
      issueFitted.text,
      KTALayout.backLabelX,
      KTALayout.y(3.5),
      issueFitted.size,
      false,
      KTAColors.offWhite,
    );

    _drawText(
      canvas,
      'KOORDINATOR DISTRIK',
      KTALayout.coordinatorX,
      KTALayout.y(12.2),
      labelSize,
      true,
      KTAColors.offWhite,
    );

    if (tandaTanganImage != null) {
      final srcW = tandaTanganImage!.width.toDouble();
      final srcH = tandaTanganImage!.height.toDouble();
      const dstX = KTALayout.coordinatorX;
      const dstY = KTALayout.signatureY;
      const dstW = KTALayout.signatureWidth;
      const dstH = KTALayout.signatureHeight;
      final srcAspect = srcW / srcH;
      const dstAspect = dstW / dstH;

      double drawW;
      double drawH;
      double drawX;
      double drawY;

      if (srcAspect > dstAspect) {
        drawW = dstW;
        drawH = dstW / srcAspect;
        drawX = dstX;
        drawY = dstY + (dstH - drawH) / 2.0;
      } else {
        drawH = dstH;
        drawW = dstH * srcAspect;
        drawX = dstX + (dstW - drawW) / 2.0;
        drawY = dstY;
      }

      canvas.drawImageRect(
        tandaTanganImage!,
        Rect.fromLTWH(0, 0, srcW, srcH),
        Rect.fromLTWH(drawX, drawY, drawW, drawH),
        Paint()..filterQuality = FilterQuality.high,
      );
    }

    final coordRaw = anggota.koordinator?.trim();
    final coordText = (coordRaw != null && coordRaw.isNotEmpty)
        ? coordRaw
        : 'E. HENDRIKUS MASAN BEDA';
    final coordFitted = fitSingle(
      coordText,
      330.0,
      KTATypography.pt(5.0),
      KTATypography.pt(3.8),
      false,
    );

    final coordWidth =
        _measureText(coordFitted.text, coordFitted.size, false);
    canvas.drawLine(
      Offset(KTALayout.coordinatorX, KTALayout.y(5.7)),
      Offset(KTALayout.coordinatorX + coordWidth, KTALayout.y(5.7)),
      Paint()
        ..color = KTAColors.signatureLine
        ..strokeWidth = 1.6,
    );

    _drawText(
      canvas,
      coordFitted.text,
      KTALayout.coordinatorX,
      KTALayout.y(3.5),
      coordFitted.size,
      false,
      KTAColors.offWhite,
    );

    final microtext = List.generate(
      18,
      (_) => 'Fortiter in Re, Suaviter in Modo • ',
    ).join('');
    _drawText(
      canvas,
      microtext,
      -20.0,
      KTALayout.y(0.75),
      KTATypography.pt(2.6),
      false,
      KTAColors.microtextNavy,
    );
  }

  void _drawText(
    Canvas canvas,
    String text,
    double x,
    double baseline,
    double size,
    bool bold,
    Color color, {
    TextAlign align = TextAlign.left,
  }) {
    final painter = TextPainter(
      text: TextSpan(
        text: text,
        style: TextStyle(
          fontFamily: KTATypography.fontFamily,
          fontSize: size,
          fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
          color: color,
          height: 1.0,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();

    double baselineOffset =
        painter.computeDistanceToActualBaseline(TextBaseline.alphabetic);
    if (baselineOffset.isNaN || baselineOffset <= 0) {
      baselineOffset = size * 0.8;
    }

    double drawX = x;
    if (align == TextAlign.right) {
      drawX = x - painter.width;
    } else if (align == TextAlign.center) {
      drawX = x - painter.width / 2.0;
    }

    painter.paint(canvas, Offset(drawX, baseline - baselineOffset));
  }

  double _measureText(String text, double size, bool bold) {
    final painter = TextPainter(
      text: TextSpan(
        text: text,
        style: TextStyle(
          fontFamily: KTATypography.fontFamily,
          fontSize: size,
          fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
          height: 1.0,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    return painter.width;
  }

  String _resolveValue(String? value) {
    if (value == null) return '[BELUM DIISI]';
    final trimmed = value.trim();
    return trimmed.isEmpty ? '[BELUM DIISI]' : trimmed;
  }

  String _resolvePelantikan(String? tanggal, String? tahun) {
    if (tanggal != null && tanggal.trim().isNotEmpty) {
      return tanggal.trim();
    }
    if (tahun != null && tahun.trim().isNotEmpty) {
      return tahun.trim();
    }
    return '[BELUM DIISI]';
  }

  @override
  bool shouldRepaint(covariant KtaBackPainter oldDelegate) {
    return oldDelegate.anggota != anggota ||
        oldDelegate.backgroundImage != backgroundImage ||
        oldDelegate.tandaTanganImage != tandaTanganImage;
  }
}
