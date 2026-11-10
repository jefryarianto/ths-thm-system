import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import '../../../../core/design/tokens.dart';
import '../../../../core/text/text_fit.dart';
import '../../data/models/anggota.dart';

class _BadgeConfig {
  final int count;
  final Color color;

  const _BadgeConfig(this.count, this.color);
}

class KtaFrontPainter extends CustomPainter {
  final Anggota anggota;
  final ui.Image? backgroundImage;
  final ui.Image? logoImage;
  final ui.Image? photoImage;
  final ui.Image? qrImage;

  KtaFrontPainter({
    required this.anggota,
    this.backgroundImage,
    this.logoImage,
    this.photoImage,
    this.qrImage,
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

    if (logoImage != null) {
      canvas.drawImageRect(
        logoImage!,
        Rect.fromLTWH(
          0,
          0,
          logoImage!.width.toDouble(),
          logoImage!.height.toDouble(),
        ),
        const Rect.fromLTWH(
          KTALayout.logoX,
          KTALayout.logoY,
          KTALayout.logoSize,
          KTALayout.logoSize,
        ),
        Paint()..filterQuality = FilterQuality.high,
      );
    }

    _drawHeaderText(
      canvas,
      'ORGANISASI PENCAK SILAT PENDIDIKAN',
      KTALayout.headerX,
      KTALayout.y(49.45),
      KTATypography.pt(5.2),
      false,
    );
    _drawHeaderText(
      canvas,
      'TUNGGAL HATI SEMINARI – TUNGGAL HATI MARIA',
      KTALayout.headerX,
      KTALayout.y(46.4),
      KTATypography.pt(6.4),
      false,
    );
    _drawHeaderText(
      canvas,
      'DISTRIK KEUSKUPAN LARANTUKA',
      KTALayout.headerX,
      KTALayout.y(43.1),
      KTATypography.pt(5.6),
      false,
    );
    _drawHeaderText(
      canvas,
      'KARTU TANDA ANGGOTA',
      KTALayout.headerX,
      KTALayout.y(37.1),
      KTATypography.pt(6.4),
      true,
    );

    final photoRect = RRect.fromRectAndRadius(
      const Rect.fromLTWH(
        KTALayout.photoX,
        KTALayout.photoY,
        KTALayout.photoWidth,
        KTALayout.photoHeight,
      ),
      const Radius.circular(KTALayout.photoRadius),
    );
    canvas.drawRRect(photoRect, Paint()..color = KTAColors.photoPlaceholder);

    if (photoImage != null) {
      canvas.save();
      canvas.clipRRect(photoRect);
      final srcW = photoImage!.width.toDouble();
      final srcH = photoImage!.height.toDouble();
      const dstW = KTALayout.photoWidth;
      const dstH = KTALayout.photoHeight;
      final srcAspect = srcW / srcH;
      const dstAspect = dstW / dstH;

      Rect srcRect;
      if (srcAspect > dstAspect) {
        final cropW = srcH * dstAspect;
        srcRect = Rect.fromLTWH((srcW - cropW) / 2, 0, cropW, srcH);
      } else {
        final cropH = srcW / dstAspect;
        srcRect = Rect.fromLTWH(0, (srcH - cropH) / 2, srcW, cropH);
      }

      canvas.drawImageRect(
        photoImage!,
        srcRect,
        const Rect.fromLTWH(
          KTALayout.photoX,
          KTALayout.photoY,
          KTALayout.photoWidth,
          KTALayout.photoHeight,
        ),
        Paint()..filterQuality = FilterQuality.high,
      );
      canvas.restore();
    }

    canvas.drawRRect(
      photoRect,
      Paint()
        ..color = KTAColors.borderBlue
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.0,
    );

    final badgeContainer = RRect.fromRectAndRadius(
      const Rect.fromLTWH(
        KTALayout.badgeContainerX,
        KTALayout.badgeContainerY,
        KTALayout.badgeContainerWidth,
        KTALayout.badgeContainerHeight,
      ),
      const Radius.circular(KTALayout.badgeContainerRadius),
    );
    canvas.drawRRect(badgeContainer, Paint()..color = KTAColors.white);
    canvas.drawRRect(
      badgeContainer,
      Paint()
        ..color = KTAColors.borderBlue
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.0,
    );

    final badge = _getBadge(anggota.tingkatan);
    final badgeYs = badge.count == 1
        ? [470.3]
        : badge.count == 2
            ? [KTALayout.y(6.45) - 15.0, KTALayout.y(4.45) - 15.0]
            : [454.8, 470.8, 486.8];

    for (final yy in badgeYs) {
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(
            KTALayout.badgeX,
            yy,
            KTALayout.badgeWidth,
            KTALayout.badgeHeight,
          ),
          const Radius.circular(KTALayout.badgeRadius),
        ),
        Paint()..color = badge.color,
      );
    }

    final nameRaw = anggota.nama.trim();
    final nameText = nameRaw.isEmpty ? '[BELUM DIISI]' : nameRaw;
    final sex = anggota.jenisKelamin?.name ?? '';
    final maxNameWidth =
        506.0 - (sex.isNotEmpty ? 40.0 + KTATypography.pt(7.0) : 0.0);
    final nameFitted = fitSingle(
      nameText,
      maxNameWidth,
      KTATypography.pt(7.0),
      KTATypography.pt(3.8),
      true,
    );
    final genderX = KTALayout.rightColumnX +
        _measureText(nameFitted.text, nameFitted.size, true) +
        40.0;

    _drawLabel(
      canvas,
      'NAMA LENGKAP',
      KTALayout.rightColumnX,
      KTALayout.y(33.5),
      4.0,
    );
    _drawTripleLayerText(
      canvas,
      nameFitted.text,
      KTALayout.rightColumnX,
      KTALayout.y(30.7),
      nameFitted.size,
      true,
    );
    if (sex.isNotEmpty) {
      _drawText(
        canvas,
        sex,
        genderX,
        KTALayout.y(30.7),
        nameFitted.size,
        true,
        KTAColors.mediumText,
      );
    }

    final dadarParts = [
      anggota.tempatDadar.trim(),
      anggota.tahunDadar.trim(),
    ].where((s) => s.isNotEmpty).toList();
    final dadarText = dadarParts.isEmpty ? '[BELUM DIISI]' : dadarParts.join(', ');
    final dadarFitted = fitSingle(
      dadarText,
      275.0,
      KTATypography.pt(5.1),
      KTATypography.pt(3.8),
      true,
    );
    _drawLabel(
      canvas,
      'TEMPAT / TAHUN DADAR',
      KTALayout.rightColumnX,
      KTALayout.y(26.6),
      4.0,
    );
    _drawText(
      canvas,
      dadarFitted.text,
      KTALayout.rightColumnX,
      KTALayout.y(23.8),
      dadarFitted.size,
      true,
      KTAColors.mediumText,
    );

    final branchRaw = anggota.ranting.trim();
    final branchText = branchRaw.isEmpty ? '[BELUM DIISI]' : branchRaw;
    final branchWrapped = wrap(
      branchText,
      275.0,
      3,
      KTATypography.pt(5.1),
      KTATypography.pt(3.8),
      true,
    );
    _drawLabel(
      canvas,
      'RANTING',
      KTALayout.rightColumnX,
      KTALayout.y(19.7),
      4.0,
    );
    for (int i = 0; i < branchWrapped.lines.length; i++) {
      _drawText(
        canvas,
        branchWrapped.lines[i],
        KTALayout.rightColumnX,
        KTALayout.y(16.9) + i * 25.0,
        branchWrapped.size,
        true,
        KTAColors.mediumText,
      );
    }

    final numberRaw = anggota.nomor.trim();
    final numberText = numberRaw.isEmpty ? '[BELUM DIISI]' : numberRaw;
    final numberFitted = fitSingle(
      numberText,
      275.0,
      KTATypography.pt(5.2),
      KTATypography.pt(3.8),
      true,
    );
    _drawLabel(
      canvas,
      'NO. ANGGOTA',
      KTALayout.rightColumnX,
      KTALayout.y(7.7),
      4.0,
    );
    _drawText(
      canvas,
      numberFitted.text,
      KTALayout.rightColumnX,
      KTALayout.y(4.9),
      numberFitted.size,
      true,
      KTAColors.mediumText,
    );

    final expiryText = _formatExpiry(anggota.berlakuSampai);
    _drawText(
      canvas,
      'EXP: $expiryText',
      KTALayout.expiryX,
      KTALayout.y(23.4),
      KTATypography.pt(5.0),
      true,
      KTAColors.mediumText,
      align: TextAlign.center,
    );

    canvas.drawLine(
      Offset(KTALayout.dividerX, KTALayout.y(20.99)),
      Offset(KTALayout.dividerX, KTALayout.y(4.51)),
      Paint()
        ..color = KTAColors.primaryNavy
        ..strokeWidth = 1.235,
    );

    if (qrImage != null) {
      canvas.drawImageRect(
        qrImage!,
        Rect.fromLTWH(
          0,
          0,
          qrImage!.width.toDouble(),
          qrImage!.height.toDouble(),
        ),
        Rect.fromLTWH(
          KTALayout.qrX,
          KTALayout.y(KTALayout.qrY),
          KTALayout.qrSize,
          KTALayout.qrSize,
        ),
        Paint()..filterQuality = FilterQuality.high,
      );
    }

    _drawMicrotext(canvas);
  }

  void _drawHeaderText(
    Canvas canvas,
    String text,
    double x,
    double baseline,
    double size,
    bool isGold,
  ) {
    final layerColors = [
      KTAColors.shadowNavy,
      isGold ? KTAColors.lightGold : KTAColors.white,
      isGold ? KTAColors.gold : KTAColors.offWhite,
    ];
    final offsets = [
      const Offset(1.4, 1.4),
      const Offset(-0.9, -0.9),
      Offset.zero,
    ];
    for (int i = 0; i < 3; i++) {
      _drawText(
        canvas,
        text,
        x + offsets[i].dx,
        baseline + offsets[i].dy,
        size,
        true,
        layerColors[i],
        align: TextAlign.right,
      );
    }
  }

  void _drawTripleLayerText(
    Canvas canvas,
    String text,
    double x,
    double baseline,
    double size,
    bool bold,
  ) {
    final layerColors = [
      KTAColors.lightText,
      KTAColors.highlightWhite,
      KTAColors.darkText,
    ];
    final offsets = [
      const Offset(1.3, 1.2),
      const Offset(-0.8, -0.8),
      Offset.zero,
    ];
    for (int i = 0; i < 3; i++) {
      _drawText(
        canvas,
        text,
        x + offsets[i].dx,
        baseline + offsets[i].dy,
        size,
        bold,
        layerColors[i],
      );
    }
  }

  void _drawLabel(
    Canvas canvas,
    String text,
    double x,
    double baseline,
    double ptSize,
  ) {
    _drawText(
      canvas,
      text,
      x,
      baseline,
      KTATypography.pt(ptSize),
      true,
      KTAColors.mediumText,
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

  String _formatExpiry(String? s) {
    if (s == null || s.trim().isEmpty) return 'MM/YY';
    final match = RegExp(r'^(\d{4})-(0[1-9]|1[0-2])$').firstMatch(s.trim());
    if (match != null) {
      final year = match.group(1)!;
      final month = match.group(2)!;
      return '$month/${year.substring(2)}';
    }
    return 'FORMAT?';
  }

  _BadgeConfig _getBadge(Tingkatan tingkatan) {
    switch (tingkatan) {
      case Tingkatan.pratama:
        return const _BadgeConfig(1, KTAColors.badgeBlue);
      case Tingkatan.tamtama:
        return const _BadgeConfig(2, KTAColors.badgeBlue);
      case Tingkatan.muda:
        return const _BadgeConfig(1, KTAColors.badgeGold);
      case Tingkatan.madya:
        return const _BadgeConfig(2, KTAColors.badgeGold);
      case Tingkatan.utama:
        return const _BadgeConfig(3, KTAColors.badgeGold);
    }
  }

  void _drawMicrotext(Canvas canvas) {
    final microtext = List.filled(18, 'PRO PATRIA ET ECCLESIA •').join(' ');
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

  @override
  bool shouldRepaint(covariant KtaFrontPainter oldDelegate) {
    return oldDelegate.anggota != anggota ||
        oldDelegate.backgroundImage != backgroundImage ||
        oldDelegate.logoImage != logoImage ||
        oldDelegate.photoImage != photoImage ||
        oldDelegate.qrImage != qrImage;
  }
}
