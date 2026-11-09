import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kta_mobile/core/design/tokens.dart';
import 'package:kta_mobile/features/kta/data/models/anggota.dart';
import 'package:kta_mobile/features/kta/presentation/painters/kta_back_painter.dart';

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

  group('KtaBackPainter', () {
    test('paints without error using PictureRecorder', () {
      final painter = KtaBackPainter(anggota: mockAnggota);
      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder);
      final size = const Size(KTALayout.cardWidth, KTALayout.cardHeight);

      expect(() => painter.paint(canvas, size), returnsNormally);
      final picture = recorder.endRecording();
      expect(picture, isNotNull);
    });

    test('paints with all fields filled', () {
      final painter = KtaBackPainter(anggota: mockAnggota);
      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder);
      final size = const Size(KTALayout.cardWidth, KTALayout.cardHeight);

      expect(() => painter.paint(canvas, size), returnsNormally);
      final picture = recorder.endRecording();
      expect(picture, isNotNull);
    });

    test('paints with long address wrapping to multiple lines', () {
      final anggota = mockAnggota.copyWith(
        alamat:
            'JL. TRANS FLORES NOMOR 123, RT 005 / RW 002, KELURAHAN SAROTARI TENGAH, KECAMATAN LARANTUKA, KABUPATEN FLORES TIMUR, NUSA TENGGARA TIMUR',
      );
      final painter = KtaBackPainter(anggota: anggota);
      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder);
      final size = const Size(KTALayout.cardWidth, KTALayout.cardHeight);

      expect(() => painter.paint(canvas, size), returnsNormally);
      final picture = recorder.endRecording();
      expect(picture, isNotNull);
    });

    test('paints with images provided (background, signature)', () async {
      final bg = await createTestImage(width: 856, height: 540);
      final ttd = await createTestImage(width: 254, height: 50);

      final painter = KtaBackPainter(
        anggota: mockAnggota,
        backgroundImage: bg,
        tandaTanganImage: ttd,
      );
      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder);
      final size = const Size(KTALayout.cardWidth, KTALayout.cardHeight);

      expect(() => painter.paint(canvas, size), returnsNormally);
      final picture = recorder.endRecording();
      expect(picture, isNotNull);
    });

    test('paints with signatures of varying aspect ratios (tall and wide)', () async {
      final tallTtd = await createTestImage(width: 50, height: 100);
      final wideTtd = await createTestImage(width: 500, height: 50);

      for (final ttd in [tallTtd, wideTtd]) {
        final painter = KtaBackPainter(
          anggota: mockAnggota,
          tandaTanganImage: ttd,
        );
        final recorder = ui.PictureRecorder();
        final canvas = Canvas(recorder);
        final size = const Size(KTALayout.cardWidth, KTALayout.cardHeight);

        expect(() => painter.paint(canvas, size), returnsNormally);
        final picture = recorder.endRecording();
        expect(picture, isNotNull);
      }
    });

    test('paints with female gender (P) and null gender', () {
      for (final gender in [JenisKelamin.P, null]) {
        final anggota = mockAnggota.copyWith(jenisKelamin: gender);
        final painter = KtaBackPainter(anggota: anggota);
        final recorder = ui.PictureRecorder();
        final canvas = Canvas(recorder);
        final size = const Size(KTALayout.cardWidth, KTALayout.cardHeight);

        expect(() => painter.paint(canvas, size), returnsNormally);
        final picture = recorder.endRecording();
        expect(picture, isNotNull);
      }
    });

    test('paints with empty/null optional fields using fallbacks', () {
      const emptyAnggota = Anggota(
        nama: '',
        jenisKelamin: null,
        nomor: '',
        ranting: '',
        tempatDadar: '',
        tahunDadar: '',
        tingkatan: Tingkatan.pratama,
        tempatTanggalLahir: '',
        pekerjaan: '',
        status: '',
        alamat: '',
        tanggalPelantikan: null,
        tahunPelantikan: null,
        tanggalTerbit: null,
        koordinator: null,
      );

      final painter = KtaBackPainter(anggota: emptyAnggota);
      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder);
      final size = const Size(KTALayout.cardWidth, KTALayout.cardHeight);

      expect(() => painter.paint(canvas, size), returnsNormally);
      final picture = recorder.endRecording();
      expect(picture, isNotNull);
    });

    test('paints with only tahunPelantikan when tanggalPelantikan is null', () {
      const anggota = Anggota(
        nama: 'TEST NAME',
        nomor: '01.001',
        ranting: 'RANTING',
        tempatDadar: 'TEMPAT',
        tahunDadar: '2024',
        tingkatan: Tingkatan.pratama,
        tempatTanggalLahir: 'TEMPAT, 01 JAN 2000',
        pekerjaan: 'GURU',
        status: 'ANGGOTA MUDA',
        alamat: 'ALAMAT SINGKAT',
        tanggalPelantikan: null,
        tahunPelantikan: '2023',
      );

      final painter = KtaBackPainter(anggota: anggota);
      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder);
      final size = const Size(KTALayout.cardWidth, KTALayout.cardHeight);

      expect(() => painter.paint(canvas, size), returnsNormally);
      final picture = recorder.endRecording();
      expect(picture, isNotNull);
    });

    test('paints with very long coordinator name', () {
      final anggota = mockAnggota.copyWith(
        koordinator: 'PROF. DR. IR. HENDRIKUS MASAN BEDA, S.FIL., M.TH., PH.D.',
      );
      final painter = KtaBackPainter(anggota: anggota);
      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder);
      final size = const Size(KTALayout.cardWidth, KTALayout.cardHeight);

      expect(() => painter.paint(canvas, size), returnsNormally);
      final picture = recorder.endRecording();
      expect(picture, isNotNull);
    });

    test('shouldRepaint returns true when fields differ and false when identical', () async {
      final img1 = await createTestImage(width: 10, height: 10);
      final img2 = await createTestImage(width: 20, height: 20);

      final painter1 = KtaBackPainter(
        anggota: mockAnggota,
        backgroundImage: img1,
        tandaTanganImage: img1,
      );
      final painterSame = KtaBackPainter(
        anggota: mockAnggota,
        backgroundImage: img1,
        tandaTanganImage: img1,
      );
      final painterDiffAnggota = KtaBackPainter(
        anggota: mockAnggota.copyWith(nama: 'BERBEDA'),
        backgroundImage: img1,
        tandaTanganImage: img1,
      );
      final painterDiffBg = KtaBackPainter(
        anggota: mockAnggota,
        backgroundImage: img2,
        tandaTanganImage: img1,
      );
      final painterDiffTtd = KtaBackPainter(
        anggota: mockAnggota,
        backgroundImage: img1,
        tandaTanganImage: img2,
      );

      expect(painter1.shouldRepaint(painterSame), isFalse);
      expect(painter1.shouldRepaint(painterDiffAnggota), isTrue);
      expect(painter1.shouldRepaint(painterDiffBg), isTrue);
      expect(painter1.shouldRepaint(painterDiffTtd), isTrue);
    });
  });
}
