import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Mengelola mode tema (terang/gelap/sistem) dan persistensinya.
///
/// Default adalah **terang** (bukan `system`) agar identitas brand tetap
/// konsisten: latar `#E3F2FD`, kartu putih, AppBar putih. Bila ikut mode sistem,
/// pengguna ber-tema gelap justru melihat navy gelap dan menganggap desain baru
/// (termasuk warna latar `#E3F2FD` dan palet emas/biru) tidak diterapkan.
class ThemeController extends ChangeNotifier {
  static const _prefKey = 'theme_mode';

  ThemeController([ThemeMode initial = ThemeMode.light]) : _mode = initial;

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
      case 'system':
        return ThemeMode.system;
      default:
        // Simpanan kosong / rusak → terang (identitas brand THS-THM).
        return ThemeMode.light;
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