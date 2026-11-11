import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_flutter/data/models/member.dart';
import 'package:mobile_flutter/presentation/widgets/kta_card_widget.dart';

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
/// dengan berkas golden. Latar kartu di-precache lebih dulu supaya golden
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
  });

  await tester.pumpAndSettle();
}

void main() {
  testWidgets('golden kartu KTA sisi depan', (tester) async {
    await _pumpCard(tester, KtaCardFullSize(member: _sampleMember()));

    await expectLater(
      find.byType(KtaCardFullSize),
      matchesGoldenFile('goldens/kta_front.png'),
    );
  });

  testWidgets('golden kartu KTA sisi belakang', (tester) async {
    await _pumpCard(
      tester,
      KtaCardFullSize(member: _sampleMember(), showBack: true),
    );

    await expectLater(
      find.byType(KtaCardFullSize),
      matchesGoldenFile('goldens/kta_back.png'),
    );
  });
}
