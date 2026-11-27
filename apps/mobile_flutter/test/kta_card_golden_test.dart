import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_flutter/data/models/card_data.dart';
import 'package:mobile_flutter/data/models/member.dart';
import 'package:mobile_flutter/presentation/widgets/kta_card_widget.dart';
import 'package:qr_flutter/qr_flutter.dart';

const String _qrPng =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAEklEQVR4nGMQsS77jw8zjAwFAOjfcQHz+VeSAAAAAElFTkSuQmCC';
const String _signaturePng =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAEklEQVR4nGPgNq/+jw8zjAwFANxQbwH5or+xAAAAAElFTkSuQmCC';
const String _stampPng =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAE0lEQVR4nGN4sZXhPz7MMDIUAAAwEqcBv+faXQAAAABJRU5ErkJggg==';

CardData _sampleCardData({
  String qrCode = _qrPng,
  String verificationUrl = 'https://ths-thm.cloud/verify/abc',
  String signerTitle = 'KOORDINATOR DISTRIK FLORES TIMUR',
  String stampImage = _stampPng,
}) =>
    CardData(
      signers: const [],
      signerName: 'YOSEPH PEHAN BETAN',
      signerTitle: signerTitle,
      signatureImage: _signaturePng,
      stampImage: stampImage,
      verificationUrl: verificationUrl,
      qrCode: qrCode,
      generated: true,
    );

/// Anggota contoh dengan data lengkap agar golden stabil (tanpa jaringan:
/// foto kosong sehingga tidak ada `NetworkImage`).
Member _sampleMember() => const Member(
      id: 'anggota-1',
      email: 'anggota@example.com',
      nomorAnggota: 'LRT-0103-001-1994',
      namaLengkap: 'Jefry Arianto Baba',
      jenisKelamin: 'L',
      tingkat: 'MUDA',
      statusKeanggotaan: 'AKTIF',
      statusValidasi: 'VALID',
      statusData: 'LENGKAP',
      tempatLahir: 'Rote',
      tanggalLahir: '1983-07-06',
      tempatDadar: 'Larantuka',
      tahunDadar: '1998',
      alamat: 'Jalan Ikan Tenggiri No. 40 Postoh, Larantuka, Flores Timur, NTT',
      noHp: '081234567890',
      fotoPath: '',
      rantingId: 'ranting-1',
      namaRanting: 'San Juan Lebao',
      namaWilayah: 'Larantuka',
      namaDistrik: 'Flores Timur',
    );

/// Render kartu pada ukuran kanvas aslinya (856 × 539,8 px) lalu bandingkan
/// dengan berkas golden. Semua gambar di-precache lebih dulu supaya golden
/// tidak flaky karena decode gambar asinkron.
Future<void> _pumpCard(WidgetTester tester, Widget card) async {
  tester.view.physicalSize = const Size(856, 540);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);

  await tester.pumpWidget(
    MaterialApp(home: Scaffold(body: Center(child: card))),
  );

  await tester.runAsync(() async {
    final context = tester.element(find.byType(KtaCardFullSize));
    await precacheImage(
        const AssetImage('assets/images/kta/depan.png'), context);
    await precacheImage(
        const AssetImage('assets/images/kta/belakang.png'), context);
    await precacheImage(const AssetImage('assets/images/logo.png'), context);
    for (final url in [_qrPng, _signaturePng, _stampPng]) {
      await precacheImage(MemoryImage(ktaDecodeDataUrl(url)!), context);
    }
  });

  await tester.pumpAndSettle();
}

int _logoImageCount(WidgetTester tester) =>
    tester.widgetList<Image>(find.byType(Image)).where((widget) {
      final provider = widget.image;
      return provider is AssetImage &&
          provider.assetName == 'assets/images/logo.png';
    }).length;

int _memoryImageCount(WidgetTester tester) =>
    tester.widgetList<Image>(find.byType(Image)).where((widget) {
      return widget.image is MemoryImage;
    }).length;

void main() {
  testWidgets('golden kartu KTA sisi depan', (tester) async {
    await _pumpCard(
      tester,
      KtaCardFullSize(
          member: _sampleMember(), cardData: _sampleCardData()),
    );

    await expectLater(
      find.byType(KtaCardFullSize),
      matchesGoldenFile('goldens/kta_front.png'),
    );
  });

  testWidgets('golden kartu KTA sisi belakang', (tester) async {
    await _pumpCard(
      tester,
      KtaCardFullSize(
        member: _sampleMember(),
        cardData: _sampleCardData(),
        showBack: true,
      ),
    );

    await expectLater(
      find.byType(KtaCardFullSize),
      matchesGoldenFile('goldens/kta_back.png'),
    );
  });

  testWidgets('QR API menjadi sumber utama tanpa overlay logo tambahan',
      (tester) async {
    await _pumpCard(
      tester,
      KtaCardFullSize(
          member: _sampleMember(), cardData: _sampleCardData()),
    );

    expect(find.byType(QrImageView), findsNothing);
    expect(_logoImageCount(tester), 1);
  });

  testWidgets('fallback QR lokal memakai logo tengah', (tester) async {
    await _pumpCard(
      tester,
      KtaCardFullSize(
        member: _sampleMember(),
        cardData: _sampleCardData(qrCode: ''),
      ),
    );

    expect(find.byType(QrImageView), findsOneWidget);
    expect(_logoImageCount(tester), 2);
  });

  testWidgets('sisi belakang memakai signerTitle dari API', (tester) async {
    await _pumpCard(
      tester,
      KtaCardFullSize(
        member: _sampleMember(),
        cardData: _sampleCardData(signerTitle: 'KETUA DISTRIK LARANTUKA'),
        showBack: true,
      ),
    );

    expect(find.text('KETUA DISTRIK LARANTUKA'), findsOneWidget);
    expect(find.text('YOSEPH PEHAN BETAN'), findsOneWidget);
    expect(_memoryImageCount(tester), 2);
  });

  testWidgets('stempel kosong disembunyikan dan judul memakai fallback',
      (tester) async {
    await _pumpCard(
      tester,
      KtaCardFullSize(
        member: _sampleMember(),
        cardData: _sampleCardData(signerTitle: '', stampImage: ''),
        showBack: true,
      ),
    );

    expect(find.text('KOORDINATOR DISTRIK'), findsOneWidget);
    expect(_memoryImageCount(tester), 1);
  });
}
