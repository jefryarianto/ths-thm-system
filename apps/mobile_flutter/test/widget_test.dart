import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_flutter/core/utils/formatters.dart';
import 'package:mobile_flutter/data/models/due.dart';
import 'package:mobile_flutter/presentation/widgets/app_loading_spinner.dart';

void main() {
  testWidgets('AppLoadingSpinner default merender dual-ring + logo dan beranimasi', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(body: AppLoadingSpinner()),
      ),
    );
    await tester.pump();

    // Kain canvas dua cincin + logo digambar tanpa error.
    expect(find.byType(AppLoadingSpinner), findsOneWidget);
    expect(tester.takeException(), isNull);

    // Animasi kedua cincin berjalan.
    await tester.pump(const Duration(milliseconds: 450));
    expect(tester.takeException(), isNull);
    await tester.pump(const Duration(milliseconds: 900));
    expect(tester.takeException(), isNull);
  });

  testWidgets('AppLoadingSpinner.small menampilkan CircularProgressIndicator', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(body: AppLoadingSpinner.small()),
      ),
    );
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  test('AppLoadingSpinner dual-ring memakai jarak antar-ring & ring-ke-logo sama', () {
    final f = AppLoadingSpinner.debugSpacingFractions();
    final ringGap = f[2];
    final logoGap = f[3];
    // Kedua celah harus identik (toleransi floating point kecil).
    expect(ringGap, closeTo(logoGap, 1e-9));
    // Celah positif dan wajar: sekitar 7.5% dari ukuran spinner.
    expect(ringGap, closeTo(0.075, 1e-9));
  });

  test('Formatters.rupiah memformat ribuan', () {
    expect(Formatters.rupiah(1000000), 'Rp 1.000.000');
    expect(Formatters.rupiah(25000), 'Rp 25.000');
    expect(Formatters.rupiah(0), 'Rp 0');
  });

  test('Formatters.extractQrToken mengekstrak token dari URL', () {
    expect(
      Formatters.extractQrToken(
          'https://thsthm.test/api/documents/verify/abc123'),
      'abc123',
    );
    expect(
      Formatters.extractQrToken('https://thsthm.test/documents/verify/xyz#frag'),
      'xyz',
    );
    expect(Formatters.extractQrToken('token-murni-123'), 'token-murni-123');
    expect(Formatters.extractQrToken('  '), '');
  });

  test('Formatters.dateLong merender tanggal Indonesia', () {
    expect(Formatters.dateLong('2026-03-01T07:00:00.000Z'), contains('Maret'));
    expect(Formatters.dateLong(null), '-');
  });

  group('Due.fromJson', () {
    test('mendukung jumlah sebagai num maupun String (Decimal Prisma)', () {
      final fromNum = Due.fromJson({
        'id': 'd1',
        'periode': '2026-01',
        'jumlah': 150000.0,
        'status': 'lunas',
        'tanggalBayar': '2026-01-10T07:00:00.000Z',
        'createdAt': '2026-01-01T07:00:00.000Z',
      });
      expect(fromNum.jumlah, 150000.0);

      // Prisma Decimal sering ter-serialize menjadi String, mis. "150000.00".
      final fromString = Due.fromJson({
        'id': 'd2',
        'periode': '2026-02',
        'jumlah': '250000.50',
        'status': 'menunggu_verifikasi',
      });
      expect(fromString.jumlah, 250000.5);
      expect(fromString.status, 'menunggu_verifikasi');
    });

    test('tahan null untuk jumlah dan tanggal', () {
      final due = Due.fromJson({
        'id': 'd3',
        'periode': '2026-03',
        'status': 'belum_dibayar',
      });
      expect(due.jumlah, 0);
      expect(due.tanggalBayar, isNull);
      expect(due.createdAt, isEmpty);
    });
  });
}
