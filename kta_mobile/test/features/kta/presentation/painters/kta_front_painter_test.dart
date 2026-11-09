import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kta_mobile/core/design/tokens.dart';
import 'package:kta_mobile/features/kta/data/models/anggota.dart';
import 'package:kta_mobile/features/kta/presentation/painters/kta_front_painter.dart';

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

  Future<ui.Image> createTestImage({int width = 10, int height = 10}) async {
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    canvas.drawRect(
      Rect.fromLTWH(0, 0, width.toDouble(), height.toDouble()),
      Paint()..color = Colors.blue,
    );
    final picture = recorder.endRecording();
    return picture.toImage(width, height);
  }

  group('KtaFrontPainter', () {
    test('paints without error using PictureRecorder', () {
      final painter = KtaFrontPainter(anggota: mockAnggota);
      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder);
      final size = const Size(KTALayout.cardWidth, KTALayout.cardHeight);

      expect(() => painter.paint(canvas, size), returnsNormally);
      final picture = recorder.endRecording();
      expect(picture, isNotNull);
    });

    test('paints all 5 ranks without error', () {
      for (final tingkatan in Tingkatan.values) {
        final anggota = mockAnggota.copyWith(tingkatan: tingkatan);
        final painter = KtaFrontPainter(anggota: anggota);
        final recorder = ui.PictureRecorder();
        final canvas = Canvas(recorder);
        final size = const Size(KTALayout.cardWidth, KTALayout.cardHeight);

        expect(
          () => painter.paint(canvas, size),
          returnsNormally,
          reason: 'Failed for tingkatan: ${tingkatan.name}',
        );
        final picture = recorder.endRecording();
        expect(picture, isNotNull);
      }
    });

    test('paints with images provided (background, logo, photo, qr)', () async {
      final bg = await createTestImage(width: 856, height: 540);
      final logo = await createTestImage(width: 112, height: 112);
      final photo = await createTestImage(width: 240, height: 300);
      final qr = await createTestImage(width: 185, height: 185);

      final painter = KtaFrontPainter(
        anggota: mockAnggota,
        backgroundImage: bg,
        logoImage: logo,
        photoImage: photo,
        qrImage: qr,
      );

      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder);
      final size = const Size(KTALayout.cardWidth, KTALayout.cardHeight);

      expect(() => painter.paint(canvas, size), returnsNormally);
      final picture = recorder.endRecording();
      expect(picture, isNotNull);
    });

    test('paints with wide and tall photos (aspect ratio crop)', () async {
      final widePhoto = await createTestImage(width: 400, height: 200);
      final tallPhoto = await createTestImage(width: 150, height: 400);

      for (final photo in [widePhoto, tallPhoto]) {
        final painter = KtaFrontPainter(
          anggota: mockAnggota,
          photoImage: photo,
        );
        final recorder = ui.PictureRecorder();
        final canvas = Canvas(recorder);
        final size = const Size(KTALayout.cardWidth, KTALayout.cardHeight);

        expect(() => painter.paint(canvas, size), returnsNormally);
        expect(recorder.endRecording(), isNotNull);
      }
    });

    test('paints with female gender (P) and null gender', () {
      final female = mockAnggota.copyWith(jenisKelamin: JenisKelamin.P);
      final noGender = Anggota(
        nama: 'TEST NO GENDER',
        nomor: '01.2024',
        ranting: 'RANTING TEST',
        tempatDadar: 'LARANTUKA',
        tahunDadar: '2024',
        tingkatan: Tingkatan.muda,
        tempatTanggalLahir: 'LARANTUKA',
        pekerjaan: 'PEGAWAI',
        status: 'AKTIF',
        alamat: 'ALAMAT TEST',
      );

      for (final a in [female, noGender]) {
        final painter = KtaFrontPainter(anggota: a);
        final recorder = ui.PictureRecorder();
        final canvas = Canvas(recorder);
        final size = const Size(KTALayout.cardWidth, KTALayout.cardHeight);

        expect(() => painter.paint(canvas, size), returnsNormally);
        expect(recorder.endRecording(), isNotNull);
      }
    });

    test('paints with long name and multiline ranting', () {
      final longMember = mockAnggota.copyWith(
        nama: 'FRANCISCUS XAVERIUS FLORENTINUS SILVESTER BALUN LEWOKEDA',
        ranting: 'RANTING KHUSUS ST. FRANSISKUS ASISI LARANTUKA BARAT TIMUR',
        nomor: '01.2024.000000000001',
      );

      final painter = KtaFrontPainter(anggota: longMember);
      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder);
      final size = const Size(KTALayout.cardWidth, KTALayout.cardHeight);

      expect(() => painter.paint(canvas, size), returnsNormally);
      expect(recorder.endRecording(), isNotNull);
    });

    test('paints with various expiry formats', () {
      for (final exp in ['2035-12', 'invalid-date', null, '']) {
        final a = mockAnggota.copyWith(berlakuSampai: exp);
        final painter = KtaFrontPainter(anggota: a);
        final recorder = ui.PictureRecorder();
        final canvas = Canvas(recorder);
        final size = const Size(KTALayout.cardWidth, KTALayout.cardHeight);

        expect(() => painter.paint(canvas, size), returnsNormally);
        expect(recorder.endRecording(), isNotNull);
      }
    });

    test('paints with minimal and empty fields', () {
      const minimalAnggota = Anggota(
        nama: '',
        nomor: '',
        ranting: '',
        tempatDadar: '',
        tahunDadar: '',
        tingkatan: Tingkatan.pratama,
        tempatTanggalLahir: '',
        pekerjaan: '',
        status: '',
        alamat: '',
      );

      final painter = KtaFrontPainter(anggota: minimalAnggota);
      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder);
      final size = const Size(KTALayout.cardWidth, KTALayout.cardHeight);

      expect(() => painter.paint(canvas, size), returnsNormally);
      final picture = recorder.endRecording();
      expect(picture, isNotNull);
    });

    test('shouldRepaint returns true when properties change', () async {
      final painter1 = KtaFrontPainter(anggota: mockAnggota);
      final painter2 = KtaFrontPainter(
        anggota: mockAnggota.copyWith(nama: 'BERBEDA'),
      );
      final painterSame = KtaFrontPainter(anggota: mockAnggota);

      expect(painter1.shouldRepaint(painterSame), isFalse);
      expect(painter1.shouldRepaint(painter2), isTrue);

      final img = await createTestImage();
      final painterWithImg = KtaFrontPainter(
        anggota: mockAnggota,
        backgroundImage: img,
      );
      expect(painter1.shouldRepaint(painterWithImg), isTrue);
    });
  });
}
