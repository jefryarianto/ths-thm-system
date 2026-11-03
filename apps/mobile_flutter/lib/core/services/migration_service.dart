import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'api_cache.dart';
import 'api_cache_encrypted.dart';
import 'assessment_outbox_service.dart';
import 'assessment_outbox_encrypted.dart';

/// One-time migration service to move data from SharedPreferences to encrypted storage.
///
/// Run this once on app startup (guarded by a version flag in secure storage).
/// After successful migration, old SharedPreferences keys are cleared.
class MigrationService {
  MigrationService._();
  static final MigrationService instance = MigrationService._();

  static const String _migrationVersionKey = 'migration_completed_version';
  static const int _currentMigrationVersion = 1;

  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();
  final SharedPreferences? _prefsOverride;

  MigrationService({SharedPreferences? prefsOverride})
      : _prefsOverride = prefsOverride;

  /// Check if migration has been completed for current version.
  Future<bool> isMigrationCompleted() async {
    try {
      final version = await _secureStorage.read(key: _migrationVersionKey);
      return version == _currentMigrationVersion.toString();
    } catch (_) {
      return false;
    }
  }

  /// Run migration from SharedPreferences to encrypted storage.
  /// Returns true if migration ran (or was already completed), false on error.
  Future<bool> migrate() async {
    // Check if already migrated
    if (await isMigrationCompleted()) {
      return true;
    }

    try {
      final prefs = _prefsOverride ?? await SharedPreferences.getInstance();
      final apiCacheEncrypted = ApiCacheEncrypted.instance;
      final outboxEncrypted = AssessmentOutboxEncrypted();

      // 1. Migrate API Cache
      await _migrateApiCache(prefs, apiCacheEncrypted);

      // 2. Migrate Assessment Outbox
      await _migrateAssessmentOutbox(prefs, outboxEncrypted);

      // 3. Mark migration as completed
      await _secureStorage.write(
        key: _migrationVersionKey,
        value: _currentMigrationVersion.toString(),
      );

      // 4. Clear old SharedPreferences keys (optional - keep for rollback)
      // await _clearOldKeys(prefs);

      return true;
    } catch (e) {
      // Migration failed - log but don't block app
      // In production, send to error reporting
      return false;
    }
  }

  /// Migrate API cache keys from SharedPreferences to encrypted storage.
  Future<void> _migrateApiCache(
    SharedPreferences prefs,
    ApiCacheEncrypted encryptedCache,
  ) async {
    final keys = prefs.getKeys();
    const cachePrefix = 'api_cache:';

    for (final key in keys) {
      if (!key.startsWith(cachePrefix)) continue;

      final raw = prefs.getString(key);
      if (raw == null || raw.isEmpty) continue;

      try {
        final decoded = jsonDecode(raw);
        if (decoded is! Map<String, dynamic>) continue;
        final data = decoded['data'];
        if (data == null) continue;

        // Extract cache key without prefix
        final cacheKey = key.substring(cachePrefix.length);
        await encryptedCache.set(cacheKey, data);
      } catch (_) {
        // Skip corrupt entries
      }
    }
  }

  /// Migrate assessment outbox from SharedPreferences to encrypted storage.
  Future<void> _migrateAssessmentOutbox(
    SharedPreferences prefs,
    AssessmentOutboxEncrypted encryptedOutbox,
  ) async {
    const outboxKey = 'ths_thm_assessment_outbox_queue_v1';

    final raw = prefs.getString(outboxKey);
    if (raw == null || raw.isEmpty) return;

    try {
      final list = jsonDecode(raw) as List<dynamic>;
      for (final itemJson in list) {
        if (itemJson is! Map<String, dynamic>) continue;

        try {
          final item = AssessmentOutboxItem.fromJson(itemJson);
          await encryptedOutbox.enqueue(item);
        } catch (_) {
          // Skip corrupt items
        }
      }
    } catch (_) {
      // Skip corrupt outbox
    }

    // Also migrate score card caches
    const scoreCardPrefix = 'ths_thm_scorecard_cache_';
    final keys = prefs.getKeys();

    for (final key in keys) {
      if (!key.startsWith(scoreCardPrefix)) continue;

      final raw = prefs.getString(key);
      if (raw == null || raw.isEmpty) continue;

      try {
        final decoded = jsonDecode(raw);
        if (decoded is! Map<String, dynamic>) continue;
        final data = decoded['data'];
        if (data == null) continue;

        final kegiatanId = key.substring(scoreCardPrefix.length);
        await encryptedOutbox.cacheScoreCard(kegiatanId, data);
      } catch (_) {
        // Skip corrupt entries
      }
    }
  }

  /// Clear old SharedPreferences keys after successful migration.
  /// Called separately if you want to clean up after verifying migration.
  Future<void> clearOldKeys() async {
    try {
      final prefs = _prefsOverride ?? await SharedPreferences.getInstance();
      const cachePrefix = 'api_cache:';
      const outboxKey = 'ths_thm_assessment_outbox_queue_v1';
      const scoreCardPrefix = 'ths_thm_scorecard_cache_';

      final keys = prefs.getKeys().where((k) =>
          k.startsWith(cachePrefix) ||
          k == outboxKey ||
          k.startsWith(scoreCardPrefix)
      ).toList();

      for (final key in keys) {
        await prefs.remove(key);
      }
    } catch (_) {}
  }

  /// Force re-migration (for testing or version bump).
  Future<void> forceRemigrate() async {
    await _secureStorage.delete(key: _migrationVersionKey);
    await migrate();
  }
}