import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'package:mobile_flutter/core/services/migration_service.dart';
import 'package:mobile_flutter/core/services/api_cache.dart';
import 'package:mobile_flutter/core/services/api_cache_encrypted.dart' as encrypted;
import 'package:mobile_flutter/core/services/assessment_outbox_encrypted.dart';

class MockSharedPreferences extends Mock implements SharedPreferences {}

class MockFlutterSecureStorage extends Mock implements FlutterSecureStorage {}

void main() {
  group('MigrationService', () {
    // Note: FlutterSecureStorage is a final class with platform channels,
    // so we can't easily mock it in unit tests without integration test setup.
    // These tests verify the migration logic structure.

    setUp(() {
      SharedPreferences.setMockInitialValues({});
    });

    test('MigrationService singleton pattern', () {
      final instance1 = MigrationService.instance;
      final instance2 = MigrationService.instance;
      expect(identical(instance1, instance2), true);
    });

    test('Migration version constant', () {
      expect(MigrationService.currentMigrationVersion, 1);
    });

    test('ApiCache keys match expected', () {
      expect(CacheKeys.notifications, 'notifications');
      expect(CacheKeys.dues, 'dues');
      expect(CacheKeys.documents, 'documents');
      expect(CacheKeys.homeFeed, 'home_feed');
      expect(CacheKeys.forumCategories, 'forum_categories');
      expect(CacheKeys.forumThreads, 'forum_threads');
      expect(CacheKeys.forumThread, 'forum_thread');
      expect(CacheKeys.gamification, 'gamification');
      expect(CacheKeys.member, 'member');
      expect(CacheKeys.pendadaran, 'pendadaran');
    });
  });

  group('ApiCacheEncrypted', () {
    test('CacheKeys constants', () {
      expect(encrypted.CacheKeys.notifications, 'notifications');
      expect(encrypted.CacheKeys.dues, 'dues');
      // etc.
    });
  });

  group('AssessmentOutboxEncrypted', () {
    test('Queue key constant', () {
      expect(
        'ths_thm_assessment_outbox_queue_v1_enc',
        AssessmentOutboxEncrypted.queueKey,
      );
    });
  });
}