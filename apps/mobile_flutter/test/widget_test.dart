import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_flutter/core/theme/app_theme.dart';
import 'package:mobile_flutter/core/utils/formatters.dart';
import 'package:mobile_flutter/data/models/due.dart';
import 'package:mobile_flutter/presentation/widgets/app_loading_spinner.dart';
import 'package:mobile_flutter/presentation/widgets/due_item_card.dart';
import 'package:mobile_flutter/presentation/widgets/secure_kta_wrapper.dart';

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

  testWidgets('DueItemCard menampilkan badge lunas, nominal & tanggal bayar',
      (tester) async {
    final due = Due.fromJson({
      'id': 'd1',
      'periode': '2026-10',
      'jumlah': 150000.0,
      'status': 'lunas',
      'tanggalBayar': '2026-10-12T07:00:00.000Z',
      'createdAt': '2026-10-01T07:00:00.000Z',
    });
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: Scaffold(
          body: DueItemCard(due: due),
        ),
      ),
    );
    expect(find.text('Iuran 2026-10'), findsOneWidget);
    expect(find.text('Rp 150.000'), findsOneWidget);
    expect(find.text('lunas'), findsOneWidget);
    expect(find.textContaining('Dibayar 12 Oktober'), findsOneWidget);
    expect(find.byIcon(Icons.check_circle), findsOneWidget);
    expect(find.byIcon(Icons.chevron_right), findsOneWidget);
  });

  testWidgets('DueItemCard non-lunas menampilkan badge status & ikon schedule',
      (tester) async {
    final due = Due.fromJson({
      'id': 'd2',
      'periode': '2026-11',
      'jumlah': 150000.0,
      'status': 'menunggu_verifikasi',
    });
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: Scaffold(body: DueItemCard(due: due)),
      ),
    );
    expect(find.text('lunas'), findsNothing);
    // Status panjang (>14 karakter) dirapikan jadi badge pendek "Belum lunas".
    expect(find.text('Belum lunas'), findsOneWidget);
    expect(find.byIcon(Icons.schedule), findsOneWidget);
    expect(find.byIcon(Icons.check_circle), findsNothing);
  });

  test('Tema global: background #F8FAFC, teks kontras tinggi, card radius 16',
      () {
    final theme = AppTheme.light();
    expect(theme.scaffoldBackgroundColor, const Color(0xFFF8FAFC));
    expect(AppTheme.navy, const Color(0xFF0F2E5A));
    expect(AppTheme.textSlate, const Color(0xFF1E293B));
    expect(AppTheme.textMuted, const Color(0xFF64748B));
    expect(AppTheme.primary, const Color(0xFFB8860B));
    expect(theme.textTheme.titleMedium?.color, AppTheme.navy);
    expect(theme.textTheme.bodyMedium?.color, AppTheme.textSlate);
    expect(theme.textTheme.bodySmall?.color, AppTheme.textMuted);
    final shape = theme.cardTheme.shape;
    expect(shape, isA<RoundedRectangleBorder>());
    expect(
      (shape as RoundedRectangleBorder).borderRadius,
      BorderRadius.circular(16),
    );
  });

  testWidgets('SecureKtaWrapper menampilkan jam live HH:mm:ss dan kode verifikasi',
      (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(body: SecureKtaWrapper(childKtaExisting: SizedBox())),
      ),
    );
    await tester.pump();
    expect(find.text('LIVE'), findsOneWidget);
    expect(
      find.textContaining(RegExp(r'^\d{2}:\d{2}:\d{2}$')),
      findsOneWidget,
    );
    expect(find.textContaining('VERIFIKASI '), findsOneWidget);

    // Detik berjalan aktif — satu tick tidak boleh error.
    await tester.pump(const Duration(seconds: 1));
    expect(tester.takeException(), isNull);

    // Dispose wrapper: timer dihentikan tanpa error.
    await tester.pumpWidget(const SizedBox());
    expect(tester.takeException(), isNull);
  });

  testWidgets('SecureKtaWrapper tanpa jam (viewer) tetap aman', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: SecureKtaWrapper(
            showLiveClock: false,
            childKtaExisting: SizedBox(),
          ),
        ),
      ),
    );
    await tester.pump();
    expect(find.text('LIVE'), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
