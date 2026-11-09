import 'package:flutter_test/flutter_test.dart';
import 'package:kta_mobile/features/kta/data/local/kta_local_storage.dart';
import 'package:kta_mobile/features/kta/data/models/anggota.dart';
import 'package:kta_mobile/features/kta/data/repositories/kta_repository.dart';
import 'package:kta_mobile/features/kta/data/services/kta_api_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

class FakeKtaApiService extends Fake implements KtaApiService {
  int fetchCallCount = 0;
  int searchCallCount = 0;
  Anggota? returnAnggota;
  List<Anggota> returnSearch = [];

  @override
  Future<Anggota> fetchAnggota(String id) async {
    fetchCallCount++;
    if (returnAnggota != null) return returnAnggota!;
    throw Exception('Not found');
  }

  @override
  Future<List<Anggota>> searchAnggota(String query) async {
    searchCallCount++;
    return returnSearch;
  }
}

void main() {
  group('KtaRepository', () {
    late FakeKtaApiService fakeApiService;
    late KtaLocalStorage localStorage;
    late KtaRepository repository;

    const testAnggota = Anggota(
      nama: 'Budi Santoso',
      nomor: '01.001.2024',
      ranting: 'Ranting A',
      tempatDadar: 'Padepokan',
      tahunDadar: '2020',
      tingkatan: Tingkatan.pratama,
      tempatTanggalLahir: 'Jakarta, 01-01-1990',
      pekerjaan: 'Wiraswasta',
      status: 'Warga',
      alamat: 'Jl. Merdeka No. 1',
    );

    setUp(() async {
      SharedPreferences.setMockInitialValues({});
      localStorage = KtaLocalStorage();
      await localStorage.init();

      fakeApiService = FakeKtaApiService();
      repository = KtaRepository(
        apiService: fakeApiService,
        localStorage: localStorage,
      );
    });

    test('getAnggota returns cached anggota if present without calling API', () async {
      await localStorage.cacheAnggota(testAnggota);

      final result = await repository.getAnggota('01.001.2024');

      expect(result.nama, testAnggota.nama);
      expect(result.nomor, testAnggota.nomor);
      expect(fakeApiService.fetchCallCount, 0);
    });

    test('getAnggota calls API and caches result when not in cache', () async {
      fakeApiService.returnAnggota = testAnggota;

      final result = await repository.getAnggota('01.001.2024');

      expect(result.nama, testAnggota.nama);
      expect(fakeApiService.fetchCallCount, 1);

      // Verify it was cached
      final cached = await localStorage.getCachedAnggota('01.001.2024');
      expect(cached, isNotNull);
      expect(cached!.nomor, testAnggota.nomor);

      // Second call should come from cache
      final secondResult = await repository.getAnggota('01.001.2024');
      expect(secondResult.nomor, testAnggota.nomor);
      expect(fakeApiService.fetchCallCount, 1);
    });

    test('getAnggota works without localStorage (fetches from API)', () async {
      final repoWithoutCache = KtaRepository(apiService: fakeApiService);
      fakeApiService.returnAnggota = testAnggota;

      final result = await repoWithoutCache.getAnggota('01.001.2024');

      expect(result.nomor, testAnggota.nomor);
      expect(fakeApiService.fetchCallCount, 1);
    });

    test('searchAnggota delegates to KtaApiService', () async {
      fakeApiService.returnSearch = [testAnggota];

      final results = await repository.searchAnggota('Budi');

      expect(results.length, 1);
      expect(results.first.nama, 'Budi Santoso');
      expect(fakeApiService.searchCallCount, 1);
    });

    test('KtaRepositoryImpl constructor supports backward compatibility', () async {
      final impl = KtaRepositoryImpl(
        apiService: fakeApiService,
        localStorage: localStorage,
      );
      fakeApiService.returnAnggota = testAnggota;

      final result = await impl.getAnggota('01.001.2024');
      expect(result.nomor, testAnggota.nomor);
    });
  });
}
