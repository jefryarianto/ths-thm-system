import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:kta_mobile/features/kta/data/models/anggota.dart';
import 'package:kta_mobile/features/kta/data/repositories/kta_repository.dart';
import 'package:kta_mobile/features/kta/data/services/kta_api_service.dart';

void main() {
  group('KtaApiService', () {
    const baseUrl = 'https://api.example.com';
    final sampleJson = {
      'nama': 'TEST NAMA',
      'jenisKelamin': 'L',
      'nomor': '001.2024',
      'ranting': 'RANTING TEST',
      'tempatDadar': 'TEMPAT TEST',
      'tahunDadar': '2024',
      'tingkatan': 'tamtama',
      'berlakuSampai': '2031-10',
      'fotoUrl': null,
      'qrImageUrl': null,
      'verifyUrl': 'https://example.com/verify/001',
      'tempatTanggalLahir': 'JAKARTA, 1 JAN 2000',
      'pekerjaan': 'SWASTA',
      'status': 'AKTIF',
      'alamat': 'JL. TEST NO. 1',
      'tahunPelantikan': '2024',
      'tanggalTerbit': '1 JANUARI 2024',
    };

    test('fetchAnggota returns Anggota on 200 response', () async {
      final mockClient = MockClient((request) async {
        expect(request.url.toString(), equals('$baseUrl/api/anggota/001.2024'));
        expect(request.method, equals('GET'));
        return http.Response(jsonEncode(sampleJson), 200, headers: {
          'content-type': 'application/json',
        });
      });

      final service = KtaApiService(
        baseUrl: baseUrl,
        client: mockClient,
      );

      final result = await service.fetchAnggota('001.2024');
      expect(result.nama, equals('TEST NAMA'));
      expect(result.nomor, equals('001.2024'));
      expect(result.tingkatan, equals(Tingkatan.tamtama));
    });

    test('fetchAnggota includes Authorization header when token getter provided', () async {
      final mockClient = MockClient((request) async {
        expect(request.headers['Authorization'], equals('Bearer my-secret-token'));
        return http.Response(jsonEncode(sampleJson), 200);
      });

      final service = KtaApiService(
        baseUrl: baseUrl,
        getToken: () => 'my-secret-token',
        client: mockClient,
      );

      final result = await service.fetchAnggota('001.2024');
      expect(result.nama, equals('TEST NAMA'));
    });

    test('fetchAnggota omits Authorization header when token getter returns null', () async {
      final mockClient = MockClient((request) async {
        expect(request.headers.containsKey('Authorization'), isFalse);
        return http.Response(jsonEncode(sampleJson), 200);
      });

      final service = KtaApiService(
        baseUrl: baseUrl,
        getToken: () => null,
        client: mockClient,
      );

      final result = await service.fetchAnggota('001.2024');
      expect(result.nama, equals('TEST NAMA'));
    });

    test('fetchAnggota throws Exception on non-200 response', () async {
      final mockClient = MockClient((request) async {
        return http.Response('Not Found', 404);
      });

      final service = KtaApiService(
        baseUrl: baseUrl,
        client: mockClient,
      );

      expect(() => service.fetchAnggota('non-existent'), throwsException);
    });

    test('searchAnggota returns List<Anggota> on 200 response', () async {
      final mockClient = MockClient((request) async {
        expect(request.url.path, equals('/api/anggota'));
        expect(request.url.queryParameters['search'], equals('TEST NAMA'));
        return http.Response(jsonEncode([sampleJson]), 200);
      });

      final service = KtaApiService(
        baseUrl: baseUrl,
        client: mockClient,
      );

      final results = await service.searchAnggota('TEST NAMA');
      expect(results.length, equals(1));
      expect(results.first.nama, equals('TEST NAMA'));
    });

    test('searchAnggota throws Exception on non-200 response', () async {
      final mockClient = MockClient((request) async {
        return http.Response('Internal Server Error', 500);
      });

      final service = KtaApiService(
        baseUrl: baseUrl,
        client: mockClient,
      );

      expect(() => service.searchAnggota('query'), throwsException);
    });
  });

  group('KtaRepository', () {
    const baseUrl = 'https://api.example.com';
    final sampleJson = {
      'nama': 'REPO TEST',
      'jenisKelamin': 'P',
      'nomor': '002.2024',
      'ranting': 'RANTING TEST',
      'tempatDadar': 'TEMPAT',
      'tahunDadar': '2024',
      'tingkatan': 'muda',
      'tempatTanggalLahir': 'BANDUNG, 1 JAN 2001',
      'pekerjaan': 'PNS',
      'status': 'AKTIF',
      'alamat': 'JL. REPO NO. 2',
    };

    test('KtaRepositoryImpl delegates getAnggota and searchAnggota to KtaApiService', () async {
      final mockClient = MockClient((request) async {
        if (request.url.path.contains('/api/anggota/002.2024')) {
          return http.Response(jsonEncode(sampleJson), 200);
        } else if (request.url.path == '/api/anggota') {
          return http.Response(jsonEncode([sampleJson]), 200);
        }
        return http.Response('Not Found', 404);
      });

      final service = KtaApiService(baseUrl: baseUrl, client: mockClient);
      final repository = KtaRepositoryImpl(apiService: service);

      final anggota = await repository.getAnggota('002.2024');
      expect(anggota.nama, equals('REPO TEST'));

      final list = await repository.searchAnggota('REPO');
      expect(list.length, equals(1));
      expect(list.first.nama, equals('REPO TEST'));
    });
  });
}
