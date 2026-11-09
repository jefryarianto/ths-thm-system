import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:kta_mobile/features/kta/data/local/kta_local_storage.dart';
import 'package:kta_mobile/features/kta/data/models/anggota.dart';

void main() {
  group('KtaLocalStorage', () {
    late KtaLocalStorage localStorage;

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
    });

    test('getCachedAnggota returns null when item is not in cache', () async {
      final result = await localStorage.getCachedAnggota('01.001.2024');
      expect(result, isNull);
    });

    test('cacheAnggota stores anggota and getCachedAnggota retrieves it', () async {
      await localStorage.cacheAnggota(testAnggota);

      final cached = await localStorage.getCachedAnggota('01.001.2024');
      expect(cached, isNotNull);
      expect(cached!.nama, testAnggota.nama);
      expect(cached.nomor, testAnggota.nomor);
      expect(cached.tingkatan, testAnggota.tingkatan);
    });

    test('clearCache removes only anggota cached keys', () async {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('other_key', 'keep_me');

      await localStorage.cacheAnggota(testAnggota);
      expect(await localStorage.getCachedAnggota('01.001.2024'), isNotNull);

      await localStorage.clearCache();

      expect(await localStorage.getCachedAnggota('01.001.2024'), isNull);
      expect(prefs.getString('other_key'), 'keep_me');
    });

    test('works with injected SharedPreferences instance in constructor', () async {
      final prefs = await SharedPreferences.getInstance();
      final customStorage = KtaLocalStorage(prefs: prefs);

      await customStorage.cacheAnggota(testAnggota);
      final cached = await customStorage.getCachedAnggota('01.001.2024');
      expect(cached?.nomor, testAnggota.nomor);
    });
  });
}
