import '../../../../core/auth/auth_service.dart';
import '../local/kta_local_storage.dart';
import '../models/anggota.dart';
import '../services/kta_api_service.dart';

abstract class KtaRepository {
  Future<Anggota> getAnggota(String id);
  Future<List<Anggota>> searchAnggota(String query);

  factory KtaRepository({
    required KtaApiService apiService,
    KtaLocalStorage? localStorage,
    AuthService? authService,
  }) = KtaRepositoryImpl;
}

class KtaRepositoryImpl implements KtaRepository {
  final KtaApiService apiService;
  final KtaLocalStorage? localStorage;
  final AuthService? authService;

  const KtaRepositoryImpl({
    required this.apiService,
    this.localStorage,
    this.authService,
  });

  @override
  Future<Anggota> getAnggota(String id) async {
    if (localStorage != null) {
      final cached = await localStorage!.getCachedAnggota(id);
      if (cached != null) {
        return cached;
      }
    }

    final remote = await apiService.fetchAnggota(id);
    if (localStorage != null) {
      await localStorage!.cacheAnggota(remote);
    }
    return remote;
  }

  @override
  Future<List<Anggota>> searchAnggota(String query) async {
    return apiService.searchAnggota(query);
  }
}
