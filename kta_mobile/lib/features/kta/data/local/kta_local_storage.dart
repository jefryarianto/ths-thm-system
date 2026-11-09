import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/anggota.dart';

class KtaLocalStorage {
  static const _prefix = 'anggota_';
  SharedPreferences? prefs;

  KtaLocalStorage({this.prefs});

  Future<SharedPreferences> get _instance async {
    return prefs ??= await SharedPreferences.getInstance();
  }

  Future<void> init() async {
    prefs = await _instance;
  }

  Future<void> cacheAnggota(Anggota a) async {
    final storage = await _instance;
    await storage.setString('$_prefix${a.nomor}', jsonEncode(a.toJson()));
  }

  Future<Anggota?> getCachedAnggota(String id) async {
    final storage = await _instance;
    final json = storage.getString('$_prefix$id');
    if (json == null) return null;
    return Anggota.fromJson(jsonDecode(json) as Map<String, dynamic>);
  }

  Future<void> clearCache() async {
    final storage = await _instance;
    final keys = storage.getKeys().where((k) => k.startsWith(_prefix)).toList();
    for (final k in keys) {
      await storage.remove(k);
    }
  }
}
