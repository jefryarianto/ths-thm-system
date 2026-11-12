import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Latar halaman aplikasi per akun. Salinan file disimpan di direktori
/// dukungan aplikasi agar tidak hilang saat cache dibersihkan.
class AppBackgroundController extends ChangeNotifier {
  AppBackgroundController({Future<Directory> Function()? supportDir})
      : _supportDir = supportDir ?? getApplicationSupportDirectory;

  final Future<Directory> Function() _supportDir;
  String? _userId;
  String? _imagePath;

  static String _prefKey(String userId) => 'app_background_path:$userId';

  String? get imagePath => _imagePath;

  Future<void> loadForUser(String userId) async {
    _userId = userId;
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString(_prefKey(userId));
    _imagePath = stored != null && File(stored).existsSync() ? stored : null;
    notifyListeners();
  }

  Future<void> setImage(String sourcePath) async {
    final userId = _userId;
    if (userId == null) return;

    final dir = Directory('${(await _supportDir()).path}/backgrounds');
    await dir.create(recursive: true);

    final dot = sourcePath.lastIndexOf('.');
    final ext = dot > sourcePath.lastIndexOf(Platform.pathSeparator)
        ? sourcePath.substring(dot)
        : '.jpg';
    var target = File(
      '${dir.path}/background-$userId-${DateTime.now().microsecondsSinceEpoch}$ext',
    );
    var suffix = 0;
    while (target.existsSync()) {
      suffix++;
      target = File(
        '${dir.path}/background-$userId-${DateTime.now().microsecondsSinceEpoch}-$suffix$ext',
      );
    }
    await target.writeAsBytes(await File(sourcePath).readAsBytes());

    final previous = _imagePath;
    _imagePath = target.path;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefKey(userId), target.path);
    if (previous != null && previous != target.path) {
      final old = File(previous);
      if (old.existsSync()) await old.delete();
    }
    notifyListeners();
  }

  Future<void> clear() async {
    final userId = _userId;
    if (userId == null) return;
    final path = _imagePath;
    _imagePath = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_prefKey(userId));
    if (path != null) {
      final file = File(path);
      if (file.existsSync()) await file.delete();
    }
    notifyListeners();
  }

  /// Hanya membersihkan state di memori; file dan preferensi tetap tersimpan
  /// agar latar kembali saat akun yang sama login lagi.
  void reset() {
    _userId = null;
    _imagePath = null;
    notifyListeners();
  }
}
