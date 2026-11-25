import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_flutter/core/utils/email_normalizer.dart';

void main() {
  group('normalizeEmail', () {
    test('menghapus spasi di sekitar email dan menurunkan huruf', () {
      expect(normalizeEmail('  User@Example.COM  '), 'user@example.com');
    });

    test('mengembalikan string kosong untuk input spasi saja', () {
      expect(normalizeEmail('   '), '');
    });
  });
}
