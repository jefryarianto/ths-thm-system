import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Mengelola mode tema (terang/gelap/sistem) dan persistensinya.
class ThemeController extends ChangeNotifier {
  static const _prefKey = 'theme_mode';

  ThemeController([ThemeMode initial = ThemeMode.system]) : _mode = initial;

  ThemeMode _mode;
  ThemeMode get mode => _mode;

  set mode(ThemeMode value) {
    if (value == _mode) return;
    _mode = value;
    notifyListeners();
    _persist();
  }

  /// Muat mode tersimpan dari shared_preferences.
  static Future<ThemeController> load() async {
    final prefs = await SharedPreferences.getInstance();
    final value = prefs.getString(_prefKey);
    return ThemeController(_parse(value));
  }

  static ThemeMode _parse(String? value) {
    switch (value) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      default:
        return ThemeMode.system;
    }
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    final key = switch (_mode) {
      ThemeMode.light => 'light',
      ThemeMode.dark => 'dark',
      ThemeMode.system => 'system',
    };
    await prefs.setString(_prefKey, key);
  }
}