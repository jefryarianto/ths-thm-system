import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_client.dart';
import '../constants/app_constants.dart';

/// Item outbox penilaian offline pendadaran.
class AssessmentOutboxItem {
  final String id;
  final String kegiatanId;
  final String ujianPraktekId;
  final String calonAnggotaId;
  final String? calonNama;
  final Map<String, double> skorByItem;
  final Map<String, String> catatanByItem;
  final DateTime createdAt;
  final int retryCount;
  final String? lastError;

  AssessmentOutboxItem({
    required this.id,
    required this.kegiatanId,
    required this.ujianPraktekId,
    required this.calonAnggotaId,
    this.calonNama,
    required this.skorByItem,
    this.catatanByItem = const {},
    DateTime? createdAt,
    this.retryCount = 0,
    this.lastError,
  }) : createdAt = createdAt ?? DateTime.now();

  Map<String, dynamic> toJson() => {
        'id': id,
        'kegiatanId': kegiatanId,
        'ujianPraktekId': ujianPraktekId,
        'calonAnggotaId': calonAnggotaId,
        'calonNama': calonNama,
        'skorByItem': skorByItem,
        'catatanByItem': catatanByItem,
        'createdAt': createdAt.toIso8601String(),
        'retryCount': retryCount,
        'lastError': lastError,
      };

  factory AssessmentOutboxItem.fromJson(Map<String, dynamic> json) {
    final rawSkor = json['skorByItem'] as Map<String, dynamic>? ?? {};
    final skorMap = <String, double>{};
    rawSkor.forEach((k, v) {
      if (v is num) skorMap[k] = v.toDouble();
    });

    final rawCatatan = json['catatanByItem'] as Map<String, dynamic>? ?? {};
    final catatanMap = <String, String>{};
    rawCatatan.forEach((k, v) {
      if (v != null) catatanMap[k] = v.toString();
    });

    return AssessmentOutboxItem(
      id: json['id'] as String? ?? DateTime.now().millisecondsSinceEpoch.toString(),
      kegiatanId: json['kegiatanId'] as String? ?? '',
      ujianPraktekId: json['ujianPraktekId'] as String? ?? '',
      calonAnggotaId: json['calonAnggotaId'] as String? ?? '',
      calonNama: json['calonNama'] as String?,
      skorByItem: skorMap,
      catatanByItem: catatanMap,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
      retryCount: (json['retryCount'] as num?)?.toInt() ?? 0,
      lastError: json['lastError'] as String?,
    );
  }

  AssessmentOutboxItem copyWith({
    int? retryCount,
    String? lastError,
  }) {
    return AssessmentOutboxItem(
      id: id,
      kegiatanId: kegiatanId,
      ujianPraktekId: ujianPraktekId,
      calonAnggotaId: calonAnggotaId,
      calonNama: calonNama,
      skorByItem: skorByItem,
      catatanByItem: catatanByItem,
      createdAt: createdAt,
      retryCount: retryCount ?? this.retryCount,
      lastError: lastError ?? this.lastError,
    );
  }
}

/// Hasil proses sinkronisasi antrean outbox.
class OutboxSyncResult {
  final int syncedCount;
  final int failedCount;
  final List<String> errorMessages;

  const OutboxSyncResult({
    required this.syncedCount,
    required this.failedCount,
    this.errorMessages = const [],
  });

  bool get hasErrors => failedCount > 0;
  bool get isSuccess => syncedCount > 0 && failedCount == 0;
}

/// Layanan persistent outbox queue untuk penilaian offline pendadaran.
class AssessmentOutboxService {
  static const String _queueKey = 'ths_thm_assessment_outbox_queue_v1';
  static const String _scoreCardCachePrefix = 'ths_thm_scorecard_cache_';

  final SharedPreferences? _prefOverride;

  AssessmentOutboxService({SharedPreferences? prefOverride})
      : _prefOverride = prefOverride;

  Future<SharedPreferences> _getPrefs() async {
    return _prefOverride ?? await SharedPreferences.getInstance();
  }

  /// Menambahkan item ke antrean outbox (upsert per kegiatanId + calonAnggotaId).
  Future<void> enqueue(AssessmentOutboxItem item) async {
    final prefs = await _getPrefs();
    final items = await getQueue();

    // Hapus draft lama untuk peserta yang sama di kegiatan yang sama jika ada
    items.removeWhere((x) =>
        x.kegiatanId == item.kegiatanId &&
        x.calonAnggotaId == item.calonAnggotaId);

    items.add(item);
    await _saveQueue(prefs, items);
  }

  /// Mengambil semua item dalam antrean outbox.
  Future<List<AssessmentOutboxItem>> getQueue() async {
    final prefs = await _getPrefs();
    final raw = prefs.getString(_queueKey);
    if (raw == null || raw.isEmpty) return [];

    try {
      final list = jsonDecode(raw) as List<dynamic>;
      return list
          .whereType<Map<String, dynamic>>()
          .map(AssessmentOutboxItem.fromJson)
          .toList();
    } catch (_) {
      return [];
    }
  }

  /// Mengambil jumlah item yang belum tersinkronisasi (opsional filter per kegiatan).
  Future<int> getPendingCount({String? kegiatanId}) async {
    final items = await getQueue();
    if (kegiatanId == null) return items.length;
    return items.where((x) => x.kegiatanId == kegiatanId).length;
  }

  /// Mengambil daftar calon anggota ID yang memiliki antrean penilaian offline.
  Future<Set<String>> getPendingCandidateIds({String? kegiatanId}) async {
    final items = await getQueue();
    if (kegiatanId == null) {
      return items.map((x) => x.calonAnggotaId).toSet();
    }
    return items
        .where((x) => x.kegiatanId == kegiatanId)
        .map((x) => x.calonAnggotaId)
        .toSet();
  }

  /// Menghapus satu item dari antrean outbox berdasarkan ID.
  Future<void> remove(String id) async {
    final prefs = await _getPrefs();
    final items = await getQueue();
    items.removeWhere((x) => x.id == id);
    await _saveQueue(prefs, items);
  }
  /// Menghapus semua antrean outbox.
  Future<void> clear({String? kegiatanId}) async {
    final prefs = await _getPrefs();
    if (kegiatanId == null) {
      await prefs.remove(_queueKey);
    } else {
      final items = await getQueue();
      items.removeWhere((x) => x.kegiatanId == kegiatanId);
      await _saveQueue(prefs, items);
    }
  }


  /// Menyinkronkan semua antrean outbox ke backend via [ApiClient].
  Future<OutboxSyncResult> syncAll(ApiClient apiClient, {String? kegiatanId}) async {
    final items = await getQueue();
    final toSync = kegiatanId == null
        ? List<AssessmentOutboxItem>.from(items)
        : items.where((x) => x.kegiatanId == kegiatanId).toList();

    if (toSync.isEmpty) {
      return const OutboxSyncResult(syncedCount: 0, failedCount: 0);
    }

    int synced = 0;
    int failed = 0;
    final errors = <String>[];
    final remainingItems = List<AssessmentOutboxItem>.from(items);

    for (final item in toSync) {
      try {
        final requestItems = item.skorByItem.entries.map((e) => {
              'itemPenilaianId': e.key,
              'skor': e.value,
              if (item.catatanByItem[e.key] != null &&
                  item.catatanByItem[e.key]!.isNotEmpty)
                'komentar': item.catatanByItem[e.key],
            }).toList();

        await apiClient.dio.post(
          AppConstants.graduationUjianPraktekScore(
              item.kegiatanId, item.ujianPraktekId),
          data: {
            'scores': [
              {
                'calonAnggotaId': item.calonAnggotaId,
                'items': requestItems,
              }
            ],
          },
        );

        synced++;
        remainingItems.removeWhere((x) => x.id == item.id);
      } on DioException catch (e) {
        failed++;
        final msg = apiClient.messageFromError(e,
            fallback: 'Gagal kirim nilai peserta ${item.calonNama ?? item.calonAnggotaId}');
        errors.add(msg);

        final idx = remainingItems.indexWhere((x) => x.id == item.id);
        if (idx != -1) {
          remainingItems[idx] = item.copyWith(
            retryCount: item.retryCount + 1,
            lastError: msg,
          );
        }
      } catch (err) {
        failed++;
        errors.add(err.toString());
        final idx = remainingItems.indexWhere((x) => x.id == item.id);
        if (idx != -1) {
          remainingItems[idx] = item.copyWith(
            retryCount: item.retryCount + 1,
            lastError: err.toString(),
          );
        }
      }
    }

    final prefs = await _getPrefs();
    await _saveQueue(prefs, remainingItems);

    return OutboxSyncResult(
      syncedCount: synced,
      failedCount: failed,
      errorMessages: errors,
    );
  }

  /// Menyimpan cache response my-score-card secara lokal untuk akses offline.
  Future<void> cacheScoreCard(String kegiatanId, Map<String, dynamic> data) async {
    try {
      final prefs = await _getPrefs();
      final key = '$_scoreCardCachePrefix$kegiatanId';
      final payload = {
        'cachedAt': DateTime.now().toIso8601String(),
        'data': data,
      };
      await prefs.setString(key, jsonEncode(payload));
    } catch (_) {
      // Abaikan error cache lokal
    }
  }

  /// Mengambil cache response my-score-card jika offline.
  Future<Map<String, dynamic>?> getCachedScoreCard(String kegiatanId) async {
    try {
      final prefs = await _getPrefs();
      final key = '$_scoreCardCachePrefix$kegiatanId';
      final raw = prefs.getString(key);
      if (raw == null || raw.isEmpty) return null;

      final json = jsonDecode(raw) as Map<String, dynamic>;
      return json['data'] as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  Future<void> _saveQueue(
      SharedPreferences prefs, List<AssessmentOutboxItem> items) async {
    if (items.isEmpty) {
      await prefs.remove(_queueKey);
    } else {
      final raw = jsonEncode(items.map((x) => x.toJson()).toList());
      await prefs.setString(_queueKey, raw);
    }
  }
}
