import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_flutter/core/theme/app_theme.dart';
import 'package:mobile_flutter/core/utils/formatters.dart';
import 'package:mobile_flutter/data/models/due.dart';
import 'package:mobile_flutter/presentation/screens/verification_result_screen.dart';
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
        home: Scaffold(
          body: SecureKtaWrapper(
            showLiveClock: true,
            childKtaExisting: SizedBox(),
          ),
        ),
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

  testWidgets('SecureKtaWrapper default menyembunyikan banner verifikasi',
      (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: SecureKtaWrapper(childKtaExisting: SizedBox()),
        ),
      ),
    );
    await tester.pump();
    expect(find.text('LIVE'), findsNothing);
    expect(find.textContaining('VERIFIKASI '), findsNothing);
    expect(tester.takeException(), isNull);
  });

  // ── Formatters.extractQrToken ───────────────────────────────────────

  test('Formatters.extractQrToken mengekstrak dari URL normalized /verify/', () {
    expect(
      Formatters.extractQrToken('https://ths-thm.cloud/verify/abc123def'),
      'abc123def',
    );
  });

  test('Formatters.extractQrToken menangani URL lama /api/documents/verify/', () {
    expect(
      Formatters.extractQrToken(
          'https://ths-thm.cloud/api/documents/verify/tok-legacy?tab=1'),
      'tok-legacy',
    );
  });

  test('Formatters.extractQrToken mengembalikan token mentah jika bukan URL', () {
    expect(Formatters.extractQrToken('raw-token-xyz'), 'raw-token-xyz');
  });

  // ── VerificationResultScreen ────────────────────────────────────────

  // Helper: buat Response palsu dari payload sesuai format TransformInterceptor.
  Future<Response> fakeVerifyFetch(
    Map<String, dynamic> doc, {
    int statusCode = 200,
    String? message,
  }) async {
    if (statusCode >= 400) {
      throw DioException(
        requestOptions: RequestOptions(path: '/documents/verify/tok'),
        response: Response(
          requestOptions: RequestOptions(path: '/documents/verify/tok'),
          statusCode: statusCode,
          data: {'message': message ?? 'Not Found'},
        ),
      );
    }
    return Response(
      requestOptions: RequestOptions(path: '/documents/verify/tok'),
      statusCode: 200,
      data: <String, dynamic>{
        'success': true,
        'data': doc,
        'timestamp': '2026-09-16T00:00:00.000Z',
      },
    );
  }

  const validDoc = <String, dynamic>{
    'valid': true,
    'tipe': 'kartu_anggota',
    'nomorDokumen': 'KTA-2026-0001',
    'status': 'generated',
    'createdAt': '2026-01-10T07:00:00.000Z',
    'nomorAnggota': 'THS-001',
    'namaAnggota': 'John Doe',
    'firstScanned': false,
    'scanCount': 3,
    'lastScannedAt': '2026-09-10T07:00:00.000Z',
    'scanLimit': 25,
    'scanLeft': 22,
    'member': <String, dynamic>{
      'nomorAnggota': 'THS-001',
      'namaLengkap': 'John Doe',
      'jenisKelamin': 'Laki-laki',
      'tempatLahir': 'Jakarta',
      'tanggalLahir': '1990-01-01T00:00:00.000Z',
      'statusKeanggotaan': 'aktif',
      'ranting': 'Ranting Harapan',
      'wilayah': 'Wilayah Jakarta',
      'distrik': 'Distrik DKI',
    },
  };

  const invalidDoc = <String, dynamic>{
    'valid': false,
    'tipe': 'kartu_anggota',
    'nomorDokumen': 'KTA-000',
    'status': 'revoked',
    'createdAt': '2026-01-01T00:00:00.000Z',
    'nomorAnggota': '',
    'namaAnggota': '',
    'firstScanned': false,
    'scanCount': 0,
    'lastScannedAt': null,
    'scanLimit': 25,
    'scanLeft': 25,
    'member': null,
  };

  group('VerificationResultScreen', () {
    testWidgets('menampilkan kartu valid dengan data anggota',
        (tester) async {
      // Lebihkan viewport agar semua konten ListView muat.
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(MaterialApp(
        theme: AppTheme.light(),
        home: Scaffold(
          body: VerificationResultScreen(
            token: 'tok-valid',
            fetch: (_) async => fakeVerifyFetch(validDoc),
          ),
        ),
      ));

      // Tunggu fetch selesai + rebuild.
      await tester.pumpAndSettle();

      expect(find.text('Kartu Anggota Valid'), findsOneWidget);
      expect(find.text('✓ TERVERIFIKASI'), findsOneWidget);
      expect(find.text('KTA-2026-0001'), findsOneWidget);
      expect(find.text('John Doe'), findsWidgets);
      expect(find.text('Anggota Aktif'), findsOneWidget);
      expect(find.text('3 kali'), findsOneWidget);
      expect(find.textContaining('Ranting Harapan'), findsOneWidget);
      expect(find.text('Verifikasi Ulang'), findsNothing);
      expect(find.text('Dokumen Tidak Valid'), findsNothing);
    });

    testWidgets('menampilkan kartu tidak valid',
        (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(MaterialApp(
        theme: AppTheme.light(),
        home: Scaffold(
          body: VerificationResultScreen(
            token: 'tok-invalid',
            fetch: (_) async => fakeVerifyFetch(invalidDoc),
          ),
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('Dokumen Tidak Valid'), findsOneWidget);
      expect(find.text('✗ TIDAK VALID'), findsOneWidget);
      expect(find.text('Peringatan'), findsOneWidget);
      expect(find.textContaining('tidak tercatat'), findsOneWidget);
      expect(find.text('Verifikasi Ulang'), findsOneWidget);
      expect(find.text('Kartu Anggota Valid'), findsNothing);
    });

    testWidgets('menampilkan kartu error 404 dengan tombol coba lagi',
        (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(MaterialApp(
        theme: AppTheme.light(),
        home: Scaffold(
          body: VerificationResultScreen(
            token: 'tok-404',
            fetch: (_) async =>
                fakeVerifyFetch({}, statusCode: 404, message: 'Token QR tidak valid'),
          ),
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.textContaining('Token QR tidak valid'), findsOneWidget);
      expect(find.text('Coba Lagi'), findsOneWidget);
      expect(find.text('Verifikasi Ulang'), findsNothing);
    });
  });
}
