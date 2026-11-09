import '../models/anggota.dart';
import '../services/kta_api_service.dart';

abstract class KtaRepository {
  Future<Anggota> getAnggota(String id);
  Future<List<Anggota>> searchAnggota(String query);
}

class KtaRepositoryImpl implements KtaRepository {
  final KtaApiService apiService;

  const KtaRepositoryImpl({required this.apiService});

  @override
  Future<Anggota> getAnggota(String id) {
    return apiService.fetchAnggota(id);
  }

  @override
  Future<List<Anggota>> searchAnggota(String query) {
    return apiService.searchAnggota(query);
  }
}
