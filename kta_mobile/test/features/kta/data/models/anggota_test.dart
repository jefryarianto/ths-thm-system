import 'package:flutter_test/flutter_test.dart';
import 'package:kta_mobile/features/kta/data/models/anggota.dart';

void main() {
  group('Anggota Model', () {
    final fullJson = <String, dynamic>{
      'nama': 'TEST NAMA',
      'jenisKelamin': 'L',
      'nomor': '001.2024',
      'ranting': 'RANTING TEST',
      'tempatDadar': 'TEMPAT TEST',
      'tahunDadar': '2024',
      'tingkatan': 'tamtama',
      'berlakuSampai': '2031-10',
      'fotoUrl': 'https://example.com/foto.jpg',
      'qrImageUrl': 'https://example.com/qr.png',
      'verifyUrl': 'https://example.com/verify/001',
      'tempatTanggalLahir': 'JAKARTA, 1 JAN 2000',
      'pekerjaan': 'SWASTA',
      'status': 'AKTIF',
      'alamat': 'JL. TEST NO. 1',
      'tanggalPelantikan': '10 OKTOBER 2024',
      'tahunPelantikan': '2024',
      'tanggalTerbit': '1 JANUARI 2024',
      'koordinator': 'PENGURUS CABANG',
      'tandaTanganUrl': 'https://example.com/ttd.png',
    };

    test('fromJson parses full JSON matching TypeScript interface', () {
      final anggota = Anggota.fromJson(fullJson);

      expect(anggota.nama, equals('TEST NAMA'));
      expect(anggota.jenisKelamin, equals(JenisKelamin.L));
      expect(anggota.nomor, equals('001.2024'));
      expect(anggota.ranting, equals('RANTING TEST'));
      expect(anggota.tempatDadar, equals('TEMPAT TEST'));
      expect(anggota.tahunDadar, equals('2024'));
      expect(anggota.tingkatan, equals(Tingkatan.tamtama));
      expect(anggota.berlakuSampai, equals('2031-10'));
      expect(anggota.fotoUrl, equals('https://example.com/foto.jpg'));
      expect(anggota.qrImageUrl, equals('https://example.com/qr.png'));
      expect(anggota.verifyUrl, equals('https://example.com/verify/001'));
      expect(anggota.tempatTanggalLahir, equals('JAKARTA, 1 JAN 2000'));
      expect(anggota.pekerjaan, equals('SWASTA'));
      expect(anggota.status, equals('AKTIF'));
      expect(anggota.alamat, equals('JL. TEST NO. 1'));
      expect(anggota.tanggalPelantikan, equals('10 OKTOBER 2024'));
      expect(anggota.tahunPelantikan, equals('2024'));
      expect(anggota.tanggalTerbit, equals('1 JANUARI 2024'));
      expect(anggota.koordinator, equals('PENGURUS CABANG'));
      expect(anggota.tandaTanganUrl, equals('https://example.com/ttd.png'));
    });

    test('fromJson parses minimal JSON with null optional fields', () {
      final minimalJson = <String, dynamic>{
        'nama': 'TEST MINIMAL',
        'nomor': '002',
        'ranting': 'RANTING',
        'tempatDadar': 'TEMPAT',
        'tahunDadar': '2023',
        'tingkatan': 'pratama',
        'tempatTanggalLahir': 'SURABAYA, 2 FEB 1999',
        'pekerjaan': 'PELAJAR',
        'status': 'WARGA',
        'alamat': 'SURABAYA',
      };

      final anggota = Anggota.fromJson(minimalJson);

      expect(anggota.nama, equals('TEST MINIMAL'));
      expect(anggota.jenisKelamin, isNull);
      expect(anggota.tingkatan, equals(Tingkatan.pratama));
      expect(anggota.berlakuSampai, isNull);
      expect(anggota.fotoUrl, isNull);
      expect(anggota.qrImageUrl, isNull);
      expect(anggota.verifyUrl, isNull);
      expect(anggota.tanggalPelantikan, isNull);
      expect(anggota.tahunPelantikan, isNull);
      expect(anggota.tanggalTerbit, isNull);
      expect(anggota.koordinator, isNull);
      expect(anggota.tandaTanganUrl, isNull);
    });

    test('parses all Tingkatan enum values', () {
      for (final tingkatan in Tingkatan.values) {
        final json = Map<String, dynamic>.from(fullJson)
          ..['tingkatan'] = tingkatan.name;
        final parsed = Anggota.fromJson(json);
        expect(parsed.tingkatan, equals(tingkatan));
      }
    });

    test('parses all JenisKelamin enum values', () {
      final jsonL = Map<String, dynamic>.from(fullJson)..['jenisKelamin'] = 'L';
      expect(Anggota.fromJson(jsonL).jenisKelamin, equals(JenisKelamin.L));

      final jsonP = Map<String, dynamic>.from(fullJson)..['jenisKelamin'] = 'P';
      expect(Anggota.fromJson(jsonP).jenisKelamin, equals(JenisKelamin.P));

      final jsonNull = Map<String, dynamic>.from(fullJson)..['jenisKelamin'] = null;
      expect(Anggota.fromJson(jsonNull).jenisKelamin, isNull);
    });

    test('toJson serializes object back to Map matching types.ts keys', () {
      final anggota = Anggota.fromJson(fullJson);
      final json = anggota.toJson();

      expect(json['nama'], equals('TEST NAMA'));
      expect(json['jenisKelamin'], equals('L'));
      expect(json['nomor'], equals('001.2024'));
      expect(json['ranting'], equals('RANTING TEST'));
      expect(json['tempatDadar'], equals('TEMPAT TEST'));
      expect(json['tahunDadar'], equals('2024'));
      expect(json['tingkatan'], equals('tamtama'));
      expect(json['berlakuSampai'], equals('2031-10'));
      expect(json['fotoUrl'], equals('https://example.com/foto.jpg'));
      expect(json['qrImageUrl'], equals('https://example.com/qr.png'));
      expect(json['verifyUrl'], equals('https://example.com/verify/001'));
      expect(json['tempatTanggalLahir'], equals('JAKARTA, 1 JAN 2000'));
      expect(json['pekerjaan'], equals('SWASTA'));
      expect(json['status'], equals('AKTIF'));
      expect(json['alamat'], equals('JL. TEST NO. 1'));
      expect(json['tanggalPelantikan'], equals('10 OKTOBER 2024'));
      expect(json['tahunPelantikan'], equals('2024'));
      expect(json['tanggalTerbit'], equals('1 JANUARI 2024'));
      expect(json['koordinator'], equals('PENGURUS CABANG'));
      expect(json['tandaTanganUrl'], equals('https://example.com/ttd.png'));
    });

    test('copyWith creates modified clone', () {
      final anggota = Anggota.fromJson(fullJson);
      final updated = anggota.copyWith(
        nama: 'UPDATED NAMA',
        tingkatan: Tingkatan.utama,
      );

      expect(updated.nama, equals('UPDATED NAMA'));
      expect(updated.tingkatan, equals(Tingkatan.utama));
      expect(updated.nomor, equals(anggota.nomor));
      expect(updated.alamat, equals(anggota.alamat));
    });

    test('equality and hashCode work as expected', () {
      final a1 = Anggota.fromJson(fullJson);
      final a2 = Anggota.fromJson(fullJson);
      final a3 = a1.copyWith(nama: 'DIFFERENT');

      expect(a1, equals(a2));
      expect(a1.hashCode, equals(a2.hashCode));
      expect(a1, isNot(equals(a3)));
    });
  });
}
