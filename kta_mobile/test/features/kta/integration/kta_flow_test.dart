import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kta_mobile/features/kta/data/models/anggota.dart';
import 'package:kta_mobile/features/kta/data/repositories/kta_repository.dart';
import 'package:kta_mobile/features/kta/presentation/screens/kta_list_screen.dart';
import 'package:kta_mobile/features/kta/presentation/screens/kta_preview_screen.dart';
import 'package:kta_mobile/features/kta/presentation/widgets/kta_card.dart';
import 'package:kta_mobile/main.dart' as app;

class MockKtaRepository implements KtaRepository {
  final List<Anggota> anggotaList;

  MockKtaRepository({required this.anggotaList});

  @override
  Future<Anggota> getAnggota(String id) async {
    return anggotaList.firstWhere(
      (a) => a.nomor == id,
      orElse: () => throw Exception('Anggota tidak ditemukan'),
    );
  }

  @override
  Future<List<Anggota>> searchAnggota(String query) async {
    final q = query.toLowerCase();
    return anggotaList.where((a) {
      return a.nama.toLowerCase().contains(q) ||
          a.nomor.toLowerCase().contains(q) ||
          a.ranting.toLowerCase().contains(q);
    }).toList();
  }
}

const testAnggota = Anggota(
  nama: 'YOHANES PAULUS KERA KERAF',
  jenisKelamin: JenisKelamin.L,
  nomor: '01.2024.0001',
  ranting: 'RANTING LARANTUKA KOTA',
  tempatDadar: 'LARANTUKA',
  tahunDadar: '2024',
  berlakuSampai: '2031-10',
  tingkatan: Tingkatan.tamtama,
  fotoUrl: 'https://example.com/foto1.jpg',
  qrImageUrl: 'https://example.com/qr1.png',
  verifyUrl: 'https://example.com/verify/001',
  tempatTanggalLahir: 'LARANTUKA, 10 OKTOBER 1995',
  pekerjaan: 'WIRASWASTA',
  status: 'ANGGOTA TETAP',
  alamat: 'JL. TIGA NOMOR 14, RT 002 / RW 001, KEL. POSTOH',
  tanggalPelantikan: '10 OKTOBER 2024',
  tahunPelantikan: '2024',
  tanggalTerbit: '10 OKTOBER 2024',
  koordinator: 'E. HENDRIKUS MASAN BEDA',
  tandaTanganUrl: 'https://example.com/ttd1.png',
);

void main() {
  group('KTA Flow Integration Tests', () {
    late MockKtaRepository mockRepo;

    setUp(() {
      mockRepo = MockKtaRepository(anggotaList: [testAnggota]);
      app.appRepositoryOverride = mockRepo;
    });

    tearDown(() {
      app.appRepositoryOverride = null;
    });

    testWidgets(
        'Full KTA flow: search -> preview -> switch tabs -> check DATA ANGGOTA -> actions',
        (tester) async {
      app.main();
      await tester.pumpAndSettle();

      // Verify KtaListScreen is active
      expect(find.byType(KtaListScreen), findsOneWidget);
      expect(find.text('KTA Anggota'), findsOneWidget);
      expect(find.byIcon(Icons.search), findsOneWidget);

      // Search member
      await tester.tap(find.byIcon(Icons.search));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'Yohanes');
      await tester.pumpAndSettle();

      // Tap on member result
      expect(find.text('YOHANES PAULUS KERA KERAF'), findsWidgets);
      await tester.tap(find.text('YOHANES PAULUS KERA KERAF').first);
      await tester.pumpAndSettle();

      // View KtaPreviewScreen
      expect(find.byType(KtaPreviewScreen), findsOneWidget);
      expect(find.byType(KtaCard), findsOneWidget);

      // Verify Depan tab is visible
      expect(find.text('Depan'), findsOneWidget);
      expect(find.text('Belakang'), findsOneWidget);

      // Switch to Belakang tab
      await tester.tap(find.text('Belakang'));
      await tester.pumpAndSettle();

      // Check DATA ANGGOTA appears on back side
      expect(find.text('DATA ANGGOTA'), findsOneWidget);

      // Verify and exercise action buttons: Unduh Depan, Unduh Belakang, Cetak PDF
      expect(find.text('Unduh Depan'), findsOneWidget);
      expect(find.text('Unduh Belakang'), findsOneWidget);
      expect(find.text('Cetak PDF'), findsOneWidget);

      await tester.tap(find.text('Unduh Depan'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Unduh Belakang'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Cetak PDF'));
      await tester.pumpAndSettle();
    });

    testWidgets(
        'Direct KtaPreviewScreen flow out of the box with initialAnggota',
        (tester) async {
      app.main(initialAnggota: testAnggota);
      await tester.pumpAndSettle();

      expect(find.byType(KtaPreviewScreen), findsOneWidget);
      expect(find.text('Depan'), findsOneWidget);
      expect(find.text('Belakang'), findsOneWidget);

      await tester.tap(find.text('Belakang'));
      await tester.pumpAndSettle();

      expect(find.text('DATA ANGGOTA'), findsOneWidget);
    });
  });
}
