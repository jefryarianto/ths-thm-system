import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mobile_flutter/core/services/assessment_outbox_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('AssessmentOutboxService', () {
    late SharedPreferences prefs;
    late AssessmentOutboxService service;

    setUp(() async {
      SharedPreferences.setMockInitialValues({});
      prefs = await SharedPreferences.getInstance();
      service = AssessmentOutboxService(prefOverride: prefs);
    });

    test('enqueue & getQueue stores assessment offline items persistently', () async {
      final item1 = AssessmentOutboxItem(
        id: 'outbox-1',
        kegiatanId: 'keg-100',
        ujianPraktekId: 'ujian-200',
        calonAnggotaId: 'calon-1',
        calonNama: 'Budi Santoso',
        skorByItem: {'item-1': 85.0, 'item-2': 90.0},
        catatanByItem: {'item-1': 'Bagus'},
      );

      await service.enqueue(item1);

      final queue = await service.getQueue();
      expect(queue.length, 1);
      expect(queue.first.calonNama, 'Budi Santoso');
      expect(queue.first.skorByItem['item-1'], 85.0);
      expect(queue.first.catatanByItem['item-1'], 'Bagus');
    });

    test('enqueue upserts draft if candidate already exists in outbox for same event', () async {
      final item1 = AssessmentOutboxItem(
        id: 'outbox-1',
        kegiatanId: 'keg-100',
        ujianPraktekId: 'ujian-200',
        calonAnggotaId: 'calon-1',
        skorByItem: {'item-1': 70.0},
      );
      final item2 = AssessmentOutboxItem(
        id: 'outbox-2',
        kegiatanId: 'keg-100',
        ujianPraktekId: 'ujian-200',
        calonAnggotaId: 'calon-1',
        skorByItem: {'item-1': 95.0},
      );

      await service.enqueue(item1);
      await service.enqueue(item2);

      final queue = await service.getQueue();
      expect(queue.length, 1);
      expect(queue.first.id, 'outbox-2');
      expect(queue.first.skorByItem['item-1'], 95.0);
    });

    test('getPendingCount & getPendingCandidateIds filter accurately', () async {
      await service.enqueue(AssessmentOutboxItem(
        id: 'outbox-1',
        kegiatanId: 'keg-100',
        ujianPraktekId: 'ujian-200',
        calonAnggotaId: 'calon-1',
        skorByItem: {'item-1': 80.0},
      ));
      await service.enqueue(AssessmentOutboxItem(
        id: 'outbox-2',
        kegiatanId: 'keg-200',
        ujianPraktekId: 'ujian-300',
        calonAnggotaId: 'calon-2',
        skorByItem: {'item-1': 85.0},
      ));

      expect(await service.getPendingCount(), 2);
      expect(await service.getPendingCount(kegiatanId: 'keg-100'), 1);
      expect(await service.getPendingCount(kegiatanId: 'keg-999'), 0);

      final candidateIds = await service.getPendingCandidateIds(kegiatanId: 'keg-100');
      expect(candidateIds.contains('calon-1'), isTrue);
      expect(candidateIds.contains('calon-2'), isFalse);
    });

    test('remove and clear correctly delete items', () async {
      await service.enqueue(AssessmentOutboxItem(
        id: 'outbox-1',
        kegiatanId: 'keg-100',
        ujianPraktekId: 'ujian-200',
        calonAnggotaId: 'calon-1',
        skorByItem: {'item-1': 80.0},
      ));
      await service.enqueue(AssessmentOutboxItem(
        id: 'outbox-2',
        kegiatanId: 'keg-100',
        ujianPraktekId: 'ujian-200',
        calonAnggotaId: 'calon-2',
        skorByItem: {'item-1': 90.0},
      ));

      await service.remove('outbox-1');
      var queue = await service.getQueue();
      expect(queue.length, 1);
      expect(queue.first.id, 'outbox-2');

      await service.clear(kegiatanId: 'keg-100');
      queue = await service.getQueue();
      expect(queue.isEmpty, isTrue);
    });

    test('cacheScoreCard & getCachedScoreCard stores and retrieves scorecard offline', () async {
      final mockData = {
        'ujianAktif': {'id': 'ujian-123', 'status': 'berlangsung'},
        'aspects': [
          {'id': 'asp-1', 'namaAspek': 'Jurus Dasar', 'bobot': 30}
        ],
        'participants': [
          {'id': 'p-1', 'namaLengkap': 'Agus'}
        ],
      };

      await service.cacheScoreCard('keg-100', mockData);

      final cached = await service.getCachedScoreCard('keg-100');
      expect(cached, isNotNull);
      expect(cached!['ujianAktif']['id'], 'ujian-123');
      expect((cached['aspects'] as List).first['namaAspek'], 'Jurus Dasar');
    });
  });
}
