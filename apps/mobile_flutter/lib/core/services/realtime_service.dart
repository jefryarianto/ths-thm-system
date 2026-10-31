import 'dart:async';

import 'package:socket_io_client/socket_io_client.dart' as io;

import '../api/api_client.dart';
import '../constants/app_constants.dart';

/// Klien Socket.IO untuk event realtime (notifikasi, forum, dsb).
///
/// Terhubung ke origin yang sama dengan API (baseUrl tanpa path `/api`).
/// Nginx mem-proxy `/socket.io` ke container API (lihat nginx/production.conf),
/// jadi socket tidak perlu auth tambahan selain token via `auth`.
class RealtimeService {
  RealtimeService._();
  static final RealtimeService instance = RealtimeService._();

  io.Socket? _socket;
  final _listeners = <String, List<Function>>{};
  final _wiredEvents = <String>{};

  bool get isConnected => _socket?.connected ?? false;

  /// Sambungkan socket dengan token akses saat ini (jika belum terhubung).
  Future<void> connect() async {
    if (_socket?.connected == true) return;

    final token = await ApiClient().getAccessToken();
    if (token == null || token.isEmpty) return;

    final socketOrigin = _originFromBaseUrl(AppConstants.baseUrl);
    final socket = io.io(
      socketOrigin,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .setReconnectionAttempts(10)
          .setReconnectionDelay(1000)
          .build(),
    );

    socket.onConnect((_) {
      _wiredEvents.clear();
      _wirePendingEvents();
    });
    socket.onDisconnect((_) {});
    socket.onConnectError((_) {});
    socket.onError((_) {});

    _socket = socket;
  }

  /// Daftarkan handler untuk sebuah event. Jika socket sudah terhubung,
  /// handler langsung aktif; jika belum, diwire ulang saat (re)connect.
  void on(String event, Function handler) {
    _listeners.putIfAbsent(event, () => []).add(handler);
    _wirePendingEvents();
  }

  void off(String event, [Function? handler]) {
    final handlers = _listeners[event];
    if (handlers == null) return;
    if (handler == null) {
      _listeners.remove(event);
      _wiredEvents.remove(event);
      _socket?.off(event);
      return;
    }
    handlers.remove(handler);
    if (handlers.isEmpty) {
      _listeners.remove(event);
      _wiredEvents.remove(event);
      _socket?.off(event);
    }
  }

  void disconnect() {
    _socket?.dispose();
    _socket = null;
    _listeners.clear();
    _wiredEvents.clear();
  }

  void _wirePendingEvents() {
    final socket = _socket;
    if (socket == null || !socket.connected) return;
    for (final event in _listeners.keys) {
      if (_wiredEvents.contains(event)) continue;
      socket.on(event, (data) => _dispatch(event, data));
      _wiredEvents.add(event);
    }
  }

  void _dispatch(String event, dynamic data) {
    final handlers = List<Function>.from(_listeners[event] ?? const []);
    for (final h in handlers) {
      try {
        h(data);
      } catch (_) {
        // Handler error tidak boleh menggagalkan handler lain.
      }
    }
  }

  static String _originFromBaseUrl(String baseUrl) {
    final uri = Uri.parse(baseUrl);
    final scheme = uri.scheme;
    final host = uri.host;
    final port = uri.hasPort ? ':${uri.port}' : '';
    return '$scheme://$host$port';
  }
}
