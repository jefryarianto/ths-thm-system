import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kta_mobile/features/kta/data/models/anggota.dart';
import 'package:kta_mobile/features/kta/presentation/painters/kta_back_painter.dart';
import 'package:kta_mobile/features/kta/presentation/painters/kta_front_painter.dart';
import 'package:kta_mobile/features/kta/presentation/screens/kta_preview_screen.dart';
import 'package:kta_mobile/features/kta/presentation/widgets/kta_card.dart';

void main() {
  const mockAnggota = Anggota(
    nama: 'YOHANES PAULUS KERA KERAF',
    jenisKelamin: JenisKelamin.L,
    nomor: '01.2024.0001',
    ranting: 'RANTING LARANTUKA KOTA',
    tempatDadar: 'LARANTUKA',
    tahunDadar: '2024',
    berlakuSampai: '2031-10',
    tingkatan: Tingkatan.tamtama,
    fotoUrl: 'https://example.com/foto.jpg',
    qrImageUrl: 'https://example.com/qr.png',
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

  Widget createTestWidget({
    Anggota anggota = mockAnggota,
    VoidCallback? onExportFront,
    VoidCallback? onExportBack,
    VoidCallback? onPrintPdf,
  }) {
    return MaterialApp(
      home: Scaffold(
        body: SizedBox(
          width: 800,
          height: 900,
          child: KtaCard(
            anggota: anggota,
            onExportFront: onExportFront,
            onExportBack: onExportBack,
            onPrintPdf: onPrintPdf,
          ),
        ),
      ),
    );
  }

  group('KtaCard Widget Tests', () {
    testWidgets('renders Depan and Belakang tabs', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pump();

      expect(find.text('Depan'), findsOneWidget);
      expect(find.text('Belakang'), findsOneWidget);
    });

    testWidgets('renders action buttons: Unduh Depan, Unduh Belakang, Cetak PDF',
        (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pump();

      expect(find.text('Unduh Depan'), findsOneWidget);
      expect(find.text('Unduh Belakang'), findsOneWidget);
      expect(find.text('Cetak PDF'), findsOneWidget);
      expect(find.byIcon(Icons.download), findsNWidgets(2));
      expect(find.byIcon(Icons.print), findsOneWidget);
    });

    testWidgets('initial view shows front side with KtaFrontPainter',
        (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pump();

      expect(
        find.byWidgetPredicate(
          (widget) => widget is CustomPaint && widget.painter is KtaFrontPainter,
        ),
        findsOneWidget,
      );
    });

    testWidgets('switches to Belakang side when Belakang tab is tapped',
        (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pump();

      await tester.tap(find.text('Belakang'));
      await tester.pumpAndSettle();

      expect(
        find.byWidgetPredicate(
          (widget) => widget is CustomPaint && widget.painter is KtaBackPainter,
        ),
        findsOneWidget,
      );
    });

    testWidgets('calls onExportFront when Unduh Depan button is pressed',
        (tester) async {
      var exportFrontCalled = false;
      await tester.pumpWidget(
        createTestWidget(
          onExportFront: () {
            exportFrontCalled = true;
          },
        ),
      );
      await tester.pump();

      await tester.tap(find.text('Unduh Depan'));
      await tester.pump();

      expect(exportFrontCalled, isTrue);
    });

    testWidgets('calls onExportBack when Unduh Belakang button is pressed',
        (tester) async {
      var exportBackCalled = false;
      await tester.pumpWidget(
        createTestWidget(
          onExportBack: () {
            exportBackCalled = true;
          },
        ),
      );
      await tester.pump();

      await tester.tap(find.text('Unduh Belakang'));
      await tester.pump();

      expect(exportBackCalled, isTrue);
    });

    testWidgets('calls onPrintPdf when Cetak PDF button is pressed',
        (tester) async {
      var printPdfCalled = false;
      await tester.pumpWidget(
        createTestWidget(
          onPrintPdf: () {
            printPdfCalled = true;
          },
        ),
      );
      await tester.pump();

      await tester.tap(find.text('Cetak PDF'));
      await tester.pump();

      expect(printPdfCalled, isTrue);
    });
  });

  group('KtaPreviewScreen Widget Tests', () {
    testWidgets('renders AppBar with title KTA Saya and displays KtaCard',
        (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: KtaPreviewScreen(anggota: mockAnggota),
        ),
      );
      await tester.pump();

      expect(find.text('KTA Saya'), findsOneWidget);
      expect(find.byType(KtaCard), findsOneWidget);
    });
  });
}
