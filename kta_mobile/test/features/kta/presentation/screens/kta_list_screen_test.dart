import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:kta_mobile/features/kta/data/models/anggota.dart';
import 'package:kta_mobile/features/kta/data/repositories/kta_repository.dart';
import 'package:kta_mobile/features/kta/presentation/screens/kta_list_screen.dart';
import 'package:kta_mobile/features/kta/presentation/screens/kta_preview_screen.dart';
import 'package:kta_mobile/features/kta/presentation/widgets/anggota_search_delegate.dart';
import 'package:kta_mobile/features/kta/presentation/widgets/kta_card.dart';

class FakeKtaRepository implements KtaRepository {
  List<Anggota> searchResults = [];
  Exception? searchError;
  String? lastSearchQuery;

  @override
  Future<List<Anggota>> searchAnggota(String query) async {
    lastSearchQuery = query;
    if (searchError != null) throw searchError!;
    return searchResults;
  }

  @override
  Future<Anggota> getAnggota(String id) async {
    return searchResults.firstWhere((a) => a.nomor == id);
  }
}

const mockAnggota1 = Anggota(
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
  tandaTanganUrl: 'https://example.com/ttd.png',
);

const mockAnggota2 = Anggota(
  nama: 'MARIA GUADALUPE',
  jenisKelamin: JenisKelamin.P,
  nomor: '02.2024.0002',
  ranting: 'RANTING ILE MANDIRI',
  tempatDadar: 'LEWOLEBA',
  tahunDadar: '2023',
  berlakuSampai: '2030-05',
  tingkatan: Tingkatan.pratama,
  fotoUrl: 'https://example.com/foto2.jpg',
  qrImageUrl: 'https://example.com/qr2.png',
  verifyUrl: 'https://example.com/verify/002',
  tempatTanggalLahir: 'LEWOLEBA, 15 MEI 1998',
  pekerjaan: 'GURU',
  status: 'ANGGOTA TETAP',
  alamat: 'JL. SUDIRMAN NO. 10',
  tanggalPelantikan: '15 MEI 2023',
  tahunPelantikan: '2023',
  tanggalTerbit: '15 MEI 2023',
  koordinator: 'E. HENDRIKUS MASAN BEDA',
  tandaTanganUrl: 'https://example.com/ttd.png',
);

void main() {
  late FakeKtaRepository fakeRepo;

  setUp(() {
    fakeRepo = FakeKtaRepository();
    fakeRepo.searchResults = [mockAnggota1, mockAnggota2];
  });

  group('KtaListScreen Widget Tests', () {
    testWidgets('renders AppBar with title KTA Anggota, search icon, and placeholder body',
        (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: KtaListScreen(repository: fakeRepo),
        ),
      );
      await tester.pump();

      expect(find.text('KTA Anggota'), findsOneWidget);
      expect(find.byIcon(Icons.search), findsOneWidget);
      expect(find.text('Cari anggota untuk melihat KTA'), findsOneWidget);
    });

    testWidgets('tapping search icon launches AnggotaSearchDelegate and shows prompt for < 2 chars',
        (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: KtaListScreen(repository: fakeRepo),
        ),
      );
      await tester.pump();

      await tester.tap(find.byIcon(Icons.search));
      await tester.pumpAndSettle();

      expect(find.byType(TextField), findsOneWidget);
      expect(find.text('Ketik minimal 2 karakter'), findsOneWidget);
    });

    testWidgets('shows minimal 2 karakter prompt when query length is 1',
        (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: KtaListScreen(repository: fakeRepo),
        ),
      );
      await tester.pump();

      await tester.tap(find.byIcon(Icons.search));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'Y');
      await tester.pumpAndSettle();

      expect(find.text('Ketik minimal 2 karakter'), findsOneWidget);
      expect(fakeRepo.lastSearchQuery, isNull);
    });

    testWidgets('displays list of results with nama, nomor, and ranting when query >= 2 chars',
        (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: KtaListScreen(repository: fakeRepo),
        ),
      );
      await tester.pump();

      await tester.tap(find.byIcon(Icons.search));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'Yohanes');
      await tester.pumpAndSettle();

      expect(fakeRepo.lastSearchQuery, equals('Yohanes'));
      expect(find.text('YOHANES PAULUS KERA KERAF'), findsOneWidget);
      expect(find.textContaining('01.2024.0001'), findsOneWidget);
      expect(find.textContaining('RANTING LARANTUKA KOTA'), findsOneWidget);
      expect(find.text('MARIA GUADALUPE'), findsOneWidget);
    });

    testWidgets('displays Tidak ditemukan when search result is empty',
        (tester) async {
      fakeRepo.searchResults = [];

      await tester.pumpWidget(
        MaterialApp(
          home: KtaListScreen(repository: fakeRepo),
        ),
      );
      await tester.pump();

      await tester.tap(find.byIcon(Icons.search));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'NonExistent');
      await tester.pumpAndSettle();

      expect(find.text('Tidak ditemukan'), findsOneWidget);
    });

    testWidgets('displays error message when search throws error',
        (tester) async {
      fakeRepo.searchError = Exception('Koneksi internet bermasalah');

      await tester.pumpWidget(
        MaterialApp(
          home: KtaListScreen(repository: fakeRepo),
        ),
      );
      await tester.pump();

      await tester.tap(find.byIcon(Icons.search));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'Testing');
      await tester.pumpAndSettle();

      expect(find.textContaining('Koneksi internet bermasalah'), findsOneWidget);
    });

    testWidgets('selecting a member returns item and navigates to KtaPreviewScreen',
        (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: KtaListScreen(repository: fakeRepo),
        ),
      );
      await tester.pump();

      await tester.tap(find.byIcon(Icons.search));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'Yohanes');
      await tester.pumpAndSettle();

      await tester.tap(find.text('YOHANES PAULUS KERA KERAF'));
      await tester.pumpAndSettle();

      expect(find.byType(KtaPreviewScreen), findsOneWidget);
      expect(find.text('KTA Saya'), findsOneWidget);
      expect(find.byType(KtaCard), findsOneWidget);
      final preview =
          tester.widget<KtaPreviewScreen>(find.byType(KtaPreviewScreen));
      expect(preview.anggota?.nama, equals('YOHANES PAULUS KERA KERAF'));
    });

    testWidgets('clear action clears query in search delegate',
        (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: KtaListScreen(repository: fakeRepo),
        ),
      );
      await tester.pump();

      await tester.tap(find.byIcon(Icons.search));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'Yohanes');
      await tester.pumpAndSettle();
      expect(find.text('YOHANES PAULUS KERA KERAF'), findsOneWidget);

      await tester.tap(find.byIcon(Icons.clear));
      await tester.pumpAndSettle();

      expect(find.text('Ketik minimal 2 karakter'), findsOneWidget);
    });

    testWidgets('leading back button closes search and returns to list screen',
        (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: KtaListScreen(repository: fakeRepo),
        ),
      );
      await tester.pump();

      await tester.tap(find.byIcon(Icons.search));
      await tester.pumpAndSettle();

      await tester.tap(find.byIcon(Icons.arrow_back));
      await tester.pumpAndSettle();

      expect(find.byType(KtaListScreen), findsOneWidget);
      expect(find.text('Cari anggota untuk melihat KTA'), findsOneWidget);
      expect(find.byType(KtaPreviewScreen), findsNothing);
    });

    testWidgets('works when KtaRepository is provided via Provider',
        (tester) async {
      await tester.pumpWidget(
        Provider<KtaRepository>.value(
          value: fakeRepo,
          child: const MaterialApp(
            home: KtaListScreen(),
          ),
        ),
      );
      await tester.pump();

      await tester.tap(find.byIcon(Icons.search));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'Maria');
      await tester.pumpAndSettle();

      expect(fakeRepo.lastSearchQuery, equals('Maria'));
      expect(find.text('MARIA GUADALUPE'), findsOneWidget);
    });
  });

  group('AnggotaSearchDelegate Tests', () {
    testWidgets('buildResults renders search results when query >= 2',
        (tester) async {
      final delegate = AnggotaSearchDelegate(fakeRepo);
      delegate.query = 'Maria';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => delegate.buildResults(context),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('MARIA GUADALUPE'), findsOneWidget);
    });

    testWidgets('buildLeading and buildActions render expected icon buttons',
        (tester) async {
      final delegate = AnggotaSearchDelegate(fakeRepo);

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            appBar: AppBar(
              leading: Builder(
                builder: (context) => delegate.buildLeading(context),
              ),
              actions: [
                Builder(
                  builder: (context) => Row(
                    children: delegate.buildActions(context),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
      await tester.pump();

      expect(find.byIcon(Icons.arrow_back), findsOneWidget);
      expect(find.byIcon(Icons.clear), findsOneWidget);
    });
  });
}
