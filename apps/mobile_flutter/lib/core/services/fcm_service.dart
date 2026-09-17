import 'dart:convert';
import 'dart:developer';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../api/api_client.dart';
import '../constants/app_constants.dart';
import 'app_navigator.dart';
import 'app_update_service.dart';

/// Menginisialisasi Firebase Cloud Messaging, mendaftarkan token perangkat ke
/// server (hanya jika sesi valid), dan memantau pesan push.
///
/// Token didaftarkan ulang saat login sukses atau saat Firebase menghasilkan
/// token baru ([onTokenRefresh]). Token **tidak** dihapus saat logout agar
/// push pembaruan tetap sampai ke perangkat.
///
/// Saat app berada di **foreground**, pesan push tidak muncul di tray otomatis
/// oleh sistem — karena itu ditampilkan lewat `flutter_local_notifications`
/// sehingga pengguna tetap melihat notifikasi. Mengetuk notifikasi lokal akan
/// membuka layar `/notifications` (atau memicu cek update untuk tipe
/// `app_update`). Saat app di background/terminated, tray menampilkan notifikasi
/// asli FCM dan mengetuknya membuka app (via [FirebaseMessaging.onMessageOpenedApp]).
class FcmService {
  FcmService._internal();

  static final FcmService instance = FcmService._internal();

  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  static const String _tokenKey = 'fcm_device_token';

  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  static const String _channelId = 'ths_thm_push';
  static const String _channelName = 'Notifikasi THS-THM';

  static const String _payloadAppUpdate = 'app_update';
  static const String _payloadNotification = 'notification';

  String? _lastFcmToken;
  bool _localNotificationsReady = false;

  /// Inisialisasi FCM: siapkan tampilan notifikasi lokal, minta izin,
  /// ambil token awal, daftarkan handler pesan foreground/opened. Tidak
  /// memblokir start-up.
  Future<void> initialize() async {
    try {
      await _initLocalNotifications();
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

  Future<void> _initLocalNotifications() async {
    const settings = InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
    );
    await _localNotifications.initialize(
      settings: settings,
      onDidReceiveNotificationResponse: _onLocalNotificationResponse,
    );
    await _localNotifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.requestNotificationsPermission();
    _localNotificationsReady = true;
  }

  void _onLocalNotificationResponse(NotificationResponse response) {
    final payload = response.payload;
    if (payload == _payloadAppUpdate) {
      AppUpdateService.instance.checkNow(force: true);
      return;
    }
    appNavigate?.call('/notifications');
  }

  void _onForegroundMessage(RemoteMessage msg) {
    _showLocalNotification(msg);
    _handleData(msg);
    // Segarkan jumlah notifikasi yang belum dibaca (badge Beranda).
    appRefreshNotifications?.call();
  }

  void _onMessageOpened(RemoteMessage msg) {
    final data = msg.data;
    if (data['type'] != 'app_update' && msg.notification != null) {
      appNavigate?.call('/notifications');
    }
    _handleData(msg);
  }

  void _handleData(RemoteMessage msg) {
    final data = msg.data;
    if (data['type'] == 'app_update') {
      log('Push app_update diterima', name: 'FcmService');
      AppUpdateService.instance.checkNow(force: true);
    }
  }

  /// Tampilkan push sebagai notifikasi lokal (dibutuhkan karena notifikasi
  /// FCM tidak otomatis muncul saat app di foreground).
  Future<void> _showLocalNotification(RemoteMessage msg) async {
    if (!_localNotificationsReady) return;
    final notification = msg.notification;
    final title =
        notification?.title ?? (msg.data['title'] as String? ?? 'THS-THM');
    final body =
        notification?.body ?? (msg.data['body'] as String? ?? '');
    final type = msg.data['type'];
    final payload = type == 'app_update'
        ? _payloadAppUpdate
        : _payloadNotification;
    try {
      // id konstan untuk app_update agar tidak menumpuk; selainnya berbasis waktu
      final id = type == 'app_update'
          ? 1
          : DateTime.now()
              .millisecondsSinceEpoch
              .remainder(0x7fffffff);
      await _localNotifications.show(
        id: id,
        title: title,
        body: body,
        notificationDetails: const NotificationDetails(
          android: AndroidNotificationDetails(
            _channelId,
            _channelName,
            channelDescription: 'Notifikasi push aplikasi THS-THM',
            importance: Importance.high,
            priority: Priority.high,
          ),
        ),
        payload: payload,
      );
    } catch (error) {
      log('Menampilkan notifikasi lokal gagal',
          name: 'FcmService', error: error);
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