import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kta_mobile/core/design/tokens.dart';

void main() {
  group('Design Tokens export', () {
    test('exports KTAColors correctly', () {
      expect(KTAColors.primaryNavy, equals(const Color(0xFF0B377B)));
    });

    test('exports KTATypography correctly', () {
      expect(KTATypography.fontFamily, equals('KTADejaVu'));
    });

    test('exports KTALayout correctly', () {
      expect(KTALayout.cardWidth, equals(856.0));
      expect(KTALayout.cardHeight, equals(539.8));
    });
  });

  group('KTATypography', () {
    test('fontFamily is KTADejaVu', () {
      expect(KTATypography.fontFamily, equals('KTADejaVu'));
    });

    test('pt helper converts point sizes to logical pixels', () {
      const ptValue = 7.0;
      final expected = ptValue * 25.4 / 72.0 * 10.0;
      expect(KTATypography.pt(ptValue), closeTo(expected, 0.0001));
    });

    test('mm helper converts millimeters to logical pixels', () {
      expect(KTATypography.mm(1.0), equals(10.0));
      expect(KTATypography.mm(53.98), closeTo(539.8, 0.0001));
    });

    test('engravedShadow produces triple-layer shadow for normal headers', () {
      final shadows = KTATypography.engravedShadow(isGold: false);
      expect(shadows.length, equals(3));
      expect(shadows[0].offset, equals(const Offset(1.4, 1.4)));
      expect(shadows[0].color, equals(KTAColors.shadowNavy));
      expect(shadows[1].offset, equals(const Offset(-0.9, -0.9)));
      expect(shadows[1].color, equals(KTAColors.highlightWhite));
      expect(shadows[2].offset, equals(Offset.zero));
      expect(shadows[2].color, equals(KTAColors.offWhite));
    });

    test('engravedShadow produces triple-layer shadow for gold headers', () {
      final shadows = KTATypography.engravedShadow(isGold: true);
      expect(shadows.length, equals(3));
      expect(shadows[0].offset, equals(const Offset(1.4, 1.4)));
      expect(shadows[0].color, equals(KTAColors.shadowNavy));
      expect(shadows[1].offset, equals(const Offset(-0.9, -0.9)));
      expect(shadows[1].color, equals(KTAColors.highlightGold));
      expect(shadows[2].offset, equals(Offset.zero));
      expect(shadows[2].color, equals(KTAColors.gold));
    });

    test('predefined styles use KTADejaVu fontFamily', () {
      expect(KTATypography.orgHeader1.fontFamily, equals('KTADejaVu'));
      expect(KTATypography.cardTitle.fontFamily, equals('KTADejaVu'));
      expect(KTATypography.namePrimary.fontFamily, equals('KTADejaVu'));
      expect(KTATypography.backSectionTitle.fontFamily, equals('KTADejaVu'));
    });
  });

  group('KTALayout', () {
    test('card dimensions match CR80 specifications', () {
      expect(KTALayout.cardWidth, equals(856.0));
      expect(KTALayout.cardHeight, equals(539.8));
      expect(KTALayout.cornerRadius, equals(31.8));
    });

    test('y helper converts bottomMm to top-origin coordinate', () {
      expect(KTALayout.y(0.0), closeTo(539.8, 0.0001));
      expect(KTALayout.y(53.98), closeTo(0.0, 0.0001));
      expect(KTALayout.y(30.7), closeTo((53.98 - 30.7) * 10.0, 0.0001));
    });

    test('photo frame constants match DESIGN.md', () {
      expect(KTALayout.photoX, equals(44.0));
      expect(KTALayout.photoY, equals(145.8));
      expect(KTALayout.photoWidth, equals(240.0));
      expect(KTALayout.photoHeight, equals(300.0));
      expect(KTALayout.photoRadius, equals(14.0));
    });

    test('rank badge constants match DESIGN.md', () {
      expect(KTALayout.badgeX, equals(47.5));
      expect(KTALayout.badgeWidth, equals(233.0));
      expect(KTALayout.badgeHeight, equals(15.0));
      expect(KTALayout.badgeRadius, equals(1.5));
    });

    test('logo constants match DESIGN.md', () {
      expect(KTALayout.logoX, equals(700.0));
      expect(KTALayout.logoY, equals(30.8));
      expect(KTALayout.logoSize, equals(112.0));
    });

    test('badge container constants match DESIGN.md', () {
      expect(KTALayout.badgeContainerX, equals(44.0));
      expect(KTALayout.badgeContainerY, equals(453.8));
      expect(KTALayout.badgeContainerWidth, equals(240.0));
      expect(KTALayout.badgeContainerHeight, equals(48.0));
      expect(KTALayout.badgeContainerRadius, equals(3.0));
    });

    test('QR code constants match DESIGN.md', () {
      expect(KTALayout.qrX, equals(641.0));
      expect(KTALayout.qrY, equals(22.0));
      expect(KTALayout.qrSize, equals(185.0));
    });

    test('column and alignment positions match DESIGN.md', () {
      expect(KTALayout.leftColumnX, equals(44.0));
      expect(KTALayout.rightColumnX, equals(306.0));
      expect(KTALayout.headerX, equals(683.0));
      expect(KTALayout.expiryX, equals(733.5));
      expect(KTALayout.dividerX, equals(625.0));
    });
  });
}
