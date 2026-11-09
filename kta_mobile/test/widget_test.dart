import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kta_mobile/features/kta/data/models/anggota.dart';
import 'package:kta_mobile/features/kta/data/repositories/kta_repository.dart';
import 'package:kta_mobile/features/kta/presentation/screens/kta_list_screen.dart';
import 'package:kta_mobile/features/kta/presentation/screens/kta_preview_screen.dart';
import 'package:kta_mobile/main.dart';

class _FakeRepo implements KtaRepository {
  @override
  Future<Anggota> getAnggota(String id) async => throw UnimplementedError();

  @override
  Future<List<Anggota>> searchAnggota(String query) async => [];
}

const _dummyAnggota = Anggota(
  nama: 'TEST MEMBER',
  jenisKelamin: JenisKelamin.L,
  nomor: '01.2024.0001',
  ranting: 'RANTING TEST',
  tempatDadar: 'LARANTUKA',
  tahunDadar: '2024',
  berlakuSampai: '2031-10',
  tingkatan: Tingkatan.tamtama,
  verifyUrl: 'https://example.com/verify/001',
  tempatTanggalLahir: 'LARANTUKA, 10 OKTOBER 1995',
  pekerjaan: 'WIRASWASTA',
  status: 'ANGGOTA TETAP',
  alamat: 'JL. TEST',
  tanggalPelantikan: '10 OKTOBER 2024',
  tahunPelantikan: '2024',
  tanggalTerbit: '10 OKTOBER 2024',
  koordinator: 'TEST KOORDINATOR',
);

void main() {
  testWidgets('MyApp launches with KtaListScreen by default', (tester) async {
    await tester.pumpWidget(MyApp(repository: _FakeRepo()));
    await tester.pumpAndSettle();

    expect(find.byType(KtaListScreen), findsOneWidget);
    expect(find.text('KTA Anggota'), findsOneWidget);
    expect(find.byIcon(Icons.search), findsOneWidget);
  });

  testWidgets('MyApp launches with KtaPreviewScreen when initialAnggota is given',
      (tester) async {
    await tester.pumpWidget(
      MyApp(
        repository: _FakeRepo(),
        initialAnggota: _dummyAnggota,
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byType(KtaPreviewScreen), findsOneWidget);
    expect(find.text('KTA Saya'), findsOneWidget);
  });
}
