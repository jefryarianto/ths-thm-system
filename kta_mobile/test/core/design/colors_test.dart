import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kta_mobile/core/design/colors.dart';

void main() {
  group('KTAColors', () {
    test('Primary foundation colors match DESIGN.md', () {
      expect(KTAColors.primaryNavy, equals(const Color(0xFF0B377B)));
      expect(KTAColors.deepNavy, equals(const Color(0xFF143B76)));
      expect(KTAColors.mediumBlue, equals(const Color(0xFF185AB5)));
      expect(KTAColors.brightBlue, equals(const Color(0xFF3373AE)));
      expect(KTAColors.white, equals(const Color(0xFFFFFFFF)));
      expect(KTAColors.offWhite, equals(const Color(0xFFDFEAF3)));
    });

    test('Accent & interactive colors match DESIGN.md', () {
      expect(KTAColors.gold, equals(const Color(0xFFF8DB38)));
      expect(KTAColors.lightGold, equals(const Color(0xFFFFF2A1)));
      expect(KTAColors.warmGold, equals(const Color(0xFFE4B500)));
    });

    test('Typography colors match DESIGN.md', () {
      expect(KTAColors.darkText, equals(const Color(0xFF111C25)));
      expect(KTAColors.mediumText, equals(const Color(0xFF000000)));
      expect(KTAColors.lightText, equals(const Color(0xFF8193A0)));
    });

    test('Functional state colors match DESIGN.md', () {
      expect(KTAColors.borderBlue, equals(const Color(0xFFA9B9CB)));
      expect(KTAColors.photoPlaceholder, equals(const Color(0xFFDDE6EA)));
      expect(KTAColors.qrWhite, equals(const Color(0xFFFFFFFF)));
      expect(KTAColors.microtextNavy, equals(const Color(0xFF0B377B)));
      expect(KTAColors.signatureLine, equals(const Color(0xFF0B377B)));
      expect(KTAColors.shadowNavy, equals(const Color(0xFF17394F)));
      expect(KTAColors.highlightWhite, equals(const Color(0xFFFFFFFF)));
      expect(KTAColors.highlightGold, equals(const Color(0xFFFFF2A1)));
      expect(KTAColors.badgeBlue, equals(const Color(0xFF185AB5)));
      expect(KTAColors.badgeGold, equals(const Color(0xFFE4B500)));
    });
  });
}
