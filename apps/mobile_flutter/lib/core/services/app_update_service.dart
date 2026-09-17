import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:open_filex/open_filex.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/api_client.dart';
import '../constants/app_constants.dart';

/// Status hasil pengecekan pembaruan aplikasi.
enum AppUpdateStatus {
  /// Pengecekan sedang berjalan (belum ada keputusan).
  checking,

  /// Aplikasi sudah versi terbaru (tidak menampilkan banner apa pun).
  upToDate,

  /// Versi lebih baru tersedia — bersifat himbauan (bisa menunda).
  updateAvailable,

  /// Versi terpasang di bawah `minVersionCode` — wajib update.
  forceUpdate,

  /// Sedang mengunduh APK.
  downloading,

  /// Terjadi kesalahan saat mengunduh/verifikasi.
  error,
}

/// Info rilis mobile app dari `GET /api/public/mobile-app-info`.
@immutable
class AppUpdateInfo {
  final bool enabled;
  final int versionCode;
  final String versionName;
  final int minVersionCode;
  final String changelog;
  final String apkUrl;

  const AppUpdateInfo({
    required this.enabled,
    required this.versionCode,
    required this.versionName,
    required this.minVersionCode,
    required this.changelog,
    required this.apkUrl,
  });

  factory AppUpdateInfo.fromJson(Map<String, dynamic> json) {
    return AppUpdateInfo(
      enabled: json['enabled'] == true,
      versionCode: (json['versionCode'] as num?)?.toInt() ?? 0,
      versionName: (json['versionName'] as String?) ?? '0.0.0',
      minVersionCode: (json['minVersionCode'] as num?)?.toInt() ?? 0,
      changelog: (json['changelog'] as String?) ?? '',
      apkUrl: (json['apkUrl'] as String?) ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'enabled': enabled,
      'versionCode': versionCode,
      'versionName': versionName,
      'minVersionCode': minVersionCode,
      'changelog': changelog,
      'apkUrl': apkUrl,
    };
  }
}

/// State yang diekspos ke UI lewat [AppUpdateService.instance.notifier].
@immutable
class AppUpdateState {
  final AppUpdateStatus status;
  final AppUpdateInfo? info;
  final String? error;

  /// Progress unduhan 0..1 (hanya relevan saat [status] == downloading).
  final double downloadProgress;

  const AppUpdateState({
    this.status = AppUpdateStatus.checking,
    this.info,
    this.error,
    this.downloadProgress = 0,
  });

  AppUpdateState copyWith({
    AppUpdateStatus? status,
    AppUpdateInfo? info,
    String? error,
    double? downloadProgress,
  }) {
    return AppUpdateState(
      status: status ?? this.status,
      info: info ?? this.info,
      error: error ?? this.error,
      downloadProgress: downloadProgress ?? this.downloadProgress,
    );
  }
}

/// Layanan pengecekan & pemasangan pembaruan APK (self-hosted).
///
/// Alur:
/// 1. [checkNow] memanggil `GET /api/public/mobile-app-info`, membandingkan
///    `versionCode` terpasang (`package_info_plus`) dengan nilai server, lalu
///    menyimpan hasil di [notifier] (banner login membacanya).
/// 2. Hasil di-cache 1 jam di `shared_preferences` agar tidak membebani API
///    setiap kali halaman login dibuka; [checkNow] dengan `force: true`
///    (dipicu notifikasi FCM `app_update`) mengabaikan cache.
/// 3. [downloadAndInstall] mengunduh APK lewat `Dio` (progress di [notifier])
///    lalu membuka installer Android via `open_filex`.
class AppUpdateService {
  AppUpdateService._internal();

  static final AppUpdateService instance = AppUpdateService._internal();

  static const String _cacheKey = 'app_update_cache';
  static const String _cacheTimeKey = 'app_update_cache_time';
  static const Duration _cacheTtl = Duration(hours: 1);
  static const String _fallbackApkName = 'ths-thm-mobile-latest.apk';

  final ValueNotifier<AppUpdateState> notifier =
      ValueNotifier(const AppUpdateState(status: AppUpdateStatus.checking));

  bool _downloading = false;

  /// Nama file APK di folder terunduh.
  String get _apkFilename => 'ths-thm-mobile-update.apk';

  /// URL APK: gunakan `apkUrl` dari server bila diisi, jika tidak fallback
  /// ke endpoint statis bawaan `{baseUrl}/app/<fallback>`.
  String _resolveApkUrl(AppUpdateInfo info) {
    if (info.apkUrl.trim().isNotEmpty) return info.apkUrl.trim();
    return '${AppConstants.baseUrl}/app/$_fallbackApkName';
  }

  /// Jalankan pengecekan pembaruan. `force: true` mengabaikan cache (dipakai
  /// saat menerima push FCM bertipe `app_update`).
  Future<void> checkNow({bool force = false}) async {
    final cached = await _loadCached();
    if (!force && cached != null) {
      await resolveInstalledVersionCode();
      _apply(cached);
      return;
    }

    try {
      final response = await ApiClient()
          .dio
          .get('${AppConstants.baseUrl}/public/mobile-app-info');
      final data =
          response.data is Map ? (response.data as Map)['data'] : response.data;
      if (data is! Map) {
        throw StateError('Respons mobile-app-info tidak valid');
      }
      final info = AppUpdateInfo.fromJson(Map<String, dynamic>.from(data));

      await _saveCache(info);
      await resolveInstalledVersionCode();

      _apply(info);
    } catch (_) {
      // Gagal jaringan/alur → diam saja (tidak menampilkan banner error) agar
      // tidak mengganggu pengguna. Status di-set upToDate.
      if (!force) {
        notifier.value = const AppUpdateState(status: AppUpdateStatus.upToDate);
      }
    }
  }

  Future<AppUpdateInfo?> _loadCached() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_cacheKey);
    final time = prefs.getInt(_cacheTimeKey);
    if (raw == null || time == null) return null;
    if (DateTime.now().millisecondsSinceEpoch - time >
        _cacheTtl.inMilliseconds) {
      return null;
    }
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map) return null;
      return AppUpdateInfo.fromJson(Map<String, dynamic>.from(decoded));
    } catch (_) {
      return null;
    }
  }

  Future<void> _saveCache(AppUpdateInfo info) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_cacheKey, jsonEncode(info.toJson()));
    await prefs.setInt(_cacheTimeKey, DateTime.now().millisecondsSinceEpoch);
  }

  void _apply(AppUpdateInfo info) {
    if (!info.enabled || info.versionCode <= 0) {
      notifier.value = const AppUpdateState(status: AppUpdateStatus.upToDate);
      return;
    }

    final installed = _installedVersionCode ?? 0;
    AppUpdateStatus status;
    if (installed < info.minVersionCode) {
      status = AppUpdateStatus.forceUpdate;
    } else if (installed < info.versionCode) {
      status = AppUpdateStatus.updateAvailable;
    } else {
      status = AppUpdateStatus.upToDate;
    }
    notifier.value = AppUpdateState(status: status, info: info);
  }

  /// versionCode aplikasi terpasang (bagian `+N` dari `pubspec.yaml`).
  static int? _installedVersionCode;

  Future<int> resolveInstalledVersionCode() async {
    if (_installedVersionCode != null) return _installedVersionCode!;
    try {
      final package = await PackageInfo.fromPlatform();
      _installedVersionCode = int.tryParse(package.buildNumber) ?? 0;
    } catch (_) {
      _installedVersionCode = 0;
    }
    return _installedVersionCode!;
  }

  /// Unduh APK versi baru lalu serahkan ke installer Android.
  ///
  /// Memerlukan izin "Instal aplikasi tidak diketahui" di perangkat
  /// (dialog OS pertama kali) — limitasi keamanan Android.
  Future<void> downloadAndInstall(AppUpdateInfo info) async {
    if (_downloading) return;
    _downloading = true;
    notifier.value = AppUpdateState(
      status: AppUpdateStatus.downloading,
      info: info,
      downloadProgress: 0,
    );

    try {
      final dir = await getApplicationDocumentsDirectory();
      final filePath = '${dir.path}${_separator()}$_apkFilename';

      await ApiClient().dio.download(
        _resolveApkUrl(info),
        filePath,
        onReceiveProgress: (received, total) {
          final progress = total > 0 ? received / total : 0.0;
          notifier.value = AppUpdateState(
            status: AppUpdateStatus.downloading,
            info: info,
            downloadProgress: progress.clamp(0.0, 1.0),
          );
        },
      );

      notifier.value = AppUpdateState(
        status: AppUpdateStatus.upToDate,
        info: info,
        downloadProgress: 1,
      );

      await OpenFilex.open(filePath);
    } catch (error) {
      notifier.value = AppUpdateState(
        status: AppUpdateStatus.error,
        info: info,
        error: _friendlyError(error),
      );
    } finally {
      _downloading = false;
    }
  }

  String _separator() => '/';

  String _friendlyError(Object error) {
    final message = error.toString();
    if (message.contains('SocketException') || message.contains('Connection')) {
      return 'Gagal mengunduh. Periksa koneksi internet Anda.';
    }
    return 'Gagal mengunduh pembaruan. Coba lagi.';
  }
}
