import 'package:flutter/material.dart';

/// NavigatorKey global agar navigasi bisa dipicu dari luar widget tree
/// (mis. handler notifikasi FCM di [FcmService]).
final GlobalKey<NavigatorState> appNavigatorKey = GlobalKey<NavigatorState>();

/// Callback navigasi ke lokasi go_router (di-set dari `main.dart`).
typedef AppNavigateCallback = void Function(String location);
AppNavigateCallback? appNavigate;

/// Callback untuk meminta UI memuat ulang data notifikasi setelah push
/// diterima saat app di foreground (badge unread & list).
typedef AppRefreshNotificationsCallback = Future<void> Function();
AppRefreshNotificationsCallback? appRefreshNotifications;