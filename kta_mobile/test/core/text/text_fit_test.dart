import 'package:flutter_test/flutter_test.dart';
import 'package:kta_mobile/core/design/tokens.dart';
import 'package:kta_mobile/core/text/text_fit.dart';

void main() {
  group('fitSingle', () {
    test('returns exact text in uppercase trimmed when it fits at baseSize', () {
      final result = fitSingle('  john doe  ', 200, 20, 10, false);
      expect(result.text, equals('JOHN DOE'));
      expect(result.size, equals(20));
      expect(result.overflow, isFalse);
    });

    test('reduces size to fit maxWidth', () {
      final result = fitSingle(
        'VERY LONG NAME',
        200,
        25,
        13,
        true,
      );
      expect(result.size, lessThan(25));
      expect(result.size, greaterThanOrEqualTo(13));
      expect(result.overflow, isFalse);
    });

    test('reduces size in ~0.25 decrements without going below minSize', () {
      final result = fitSingle('MEDIUM LENGTH NAME', 250, 20, 12, true);
      expect(result.size, greaterThan(12));
      expect(result.size, lessThan(20));
      expect(result.overflow, isFalse);
    });

    test('detects overflow when text cannot fit within minSize', () {
      final result = fitSingle(
        'EXTREMELY LONG STRING THAT CANNOT FIT IN A NARROW BOUND',
        50,
        25,
        13,
        true,
      );
      expect(result.size, equals(13));
      expect(result.overflow, isTrue);
    });

    test('uses custom fontFamily when provided', () {
      final result = fitSingle(
        'TEST NAME',
        200,
        20,
        10,
        false,
        fontFamily: 'Roboto',
      );
      expect(result.overflow, isFalse);
    });
  });

  group('wrap', () {
    test('splits text into max lines without overflow', () {
      final result = wrap(
        'RANTING YANG NAMA NYA SANGAT PANJANG SEKALI',
        275,
        3,
        KTATypography.pt(5.1),
        KTATypography.pt(3.8),
        true,
      );
      expect(result.lines.length, greaterThan(1));
      expect(result.lines.length, lessThanOrEqualTo(3));
      expect(result.overflow, isFalse);
      expect(
        result.lines,
        equals(['RANTING YANG', 'NAMA NYA SANGAT', 'PANJANG SEKALI']),
      );
    });

    test('keeps single line if words fit at baseSize', () {
      final result = wrap('JAKARTA', 300, 3, 20, 12, true);
      expect(result.lines, equals(['JAKARTA']));
      expect(result.size, equals(20));
      expect(result.overflow, isFalse);
    });

    test('splits long unbreakable tokens across chunks if single word exceeds maxWidth', () {
      final result = wrap(
        'ABCDEFGHIJKLMN OPQRSTUVWXYZ',
        100,
        4,
        18,
        12,
        false,
      );
      expect(result.lines.length, lessThanOrEqualTo(4));
      expect(result.overflow, isFalse);
    });

    test('detects overflow when text exceeds maxLines even at minSize', () {
      final result = wrap(
        'SATU DUA TIGA EMPAT LIMA ENAM TUJUH DELAPAN SEMBILAN SEPULUH',
        50,
        2,
        20,
        15,
        true,
      );
      expect(result.lines, isEmpty);
      expect(result.size, equals(15));
      expect(result.overflow, isTrue);
    });

    test('handles empty strings gracefully', () {
      final result = wrap('', 200, 2, 20, 10, false);
      expect(result.lines, isEmpty);
      expect(result.overflow, isFalse);
    });
  });

  group('FittedText and WrappedText value equality & toString', () {
    test('FittedText equality', () {
      const a = FittedText(text: 'NAME', size: 14.5, overflow: false);
      const b = FittedText(text: 'NAME', size: 14.5, overflow: false);
      const c = FittedText(text: 'NAME2', size: 14.5, overflow: false);

      expect(a, equals(b));
      expect(a.hashCode, equals(b.hashCode));
      expect(a, isNot(equals(c)));
      expect(a.toString(), contains('FittedText'));
    });

    test('WrappedText equality', () {
      const a = WrappedText(lines: ['LINE 1', 'LINE 2'], size: 15.0, overflow: false);
      const b = WrappedText(lines: ['LINE 1', 'LINE 2'], size: 15.0, overflow: false);
      const c = WrappedText(lines: ['LINE 1'], size: 15.0, overflow: false);

      expect(a, equals(b));
      expect(a.hashCode, equals(b.hashCode));
      expect(a, isNot(equals(c)));
      expect(a.toString(), contains('WrappedText'));
    });
  });
}
