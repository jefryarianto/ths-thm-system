import 'dart:convert';
import 'dart:developer';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../api/api_client.dart';
import '../constants/app_constants.dart';
import 'app_update_service.dart';

/// Menginisialisasi Firebase Cloud Messaging, mendaftarkan token perangkat ke
/// server (hanya jika sesi valid), dan memantau pesan push.
///
/// Token didaftarkan ulang saat login sukses atau saat Firebase menghasilkan
/// token baru ([onTokenRefresh]). Token **tidak** dihapus saat logout agar
/// push pembaruan tetap sampai ke perangkat.
class FcmService {
  FcmService._internal();

  static final FcmService instance = FcmService._internal();

  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  static const String _tokenKey = 'fcm_device_token';

  String? _lastFcmToken;

  /// Inisialisasi FCM: minta izin notifikasi, ambil token awal, daftarkan
  /// handler pesan foreground/opened. Tidak memblokir start-up.
  Future<void> initialize() async {
    try {
      await _messaging.requestPermission();

      _lastFcmToken = await _messaging.getToken();
      if (_lastFcmToken != null) {
        await _persist(_lastFcmToken!);
        _registerToken(_lastFcmToken!);
      }

      _messaging.onTokenRefresh.listen((token) async {
        _lastFcmToken = token;
        await _persist(token);
        _registerToken(token);
      });

      FirebaseMessaging.onMessage.listen(_onForegroundMessage);
      FirebaseMessaging.onMessageOpenedApp.listen(_onMessageOpened);

      final initial = await _messaging.getInitialMessage();
      if (initial != null) _onMessageOpened(initial);
    } catch (error, stack) {
      log('FcmService.initialize gagal',
          name: 'FcmService', error: error, stackTrace: stack);
    }
  }

  /// Mendaftarkan token FCM ke server. Dipanggil setelah login berhasil dan
  /// juga di [initialize]. Jika token sudah ada di penyimpanan, coba
  /// daftarkan lagi (re-register saat restart sesi).
  Future<void> registerAfterLogin() async {
    final token = _lastFcmToken ?? await _storage.read(key: _tokenKey);
    if (token != null) _registerToken(token);
  }

  // ── Private ──────────────────────────────────────────────────────────

  void _onForegroundMessage(RemoteMessage msg) {
    _handleData(msg);
  }

  void _onMessageOpened(RemoteMessage msg) {
    _handleData(msg);
  }

  void _handleData(RemoteMessage msg) {
    final data = msg.data;
    if (data['type'] == 'app_update') {
      log('Push app_update diterima', name: 'FcmService');
      AppUpdateService.instance.checkNow(force: true);
    }
  }

  void _registerToken(String fcmToken) async {
    try {
      final accessToken = await ApiClient().getAccessToken();
      if (accessToken == null) return; // Belum login — coba lagi nanti

      await ApiClient().dio.post(
            '${AppConstants.baseUrl}/notifications/fcm-token',
            data: jsonEncode({'token': fcmToken, 'platform': 'android'}),
          );
    } catch (error) {
      // Gagal registrasi — tidak fatal; server akan menerima saat next attempt.
      log('FCM token register gagal', name: 'FcmService', error: error);
    }
  }

  Future<void> _persist(String token) async {
    await _storage.write(key: _tokenKey, value: token);
  }
}
