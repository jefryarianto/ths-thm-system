import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Platform channel aman "THS-THM" untuk proteksi konten window.
///
/// Android — memanggil `WindowManager.LayoutParams.FLAG_SECURE` di native
/// (lihat `MainActivity.kt`): memblokir screenshot (tombol fisik, Recent
/// Apps/preview) dan rekaman layar (MediaProjection / screen cast) secara
/// sistem; area konten tampil kosong bagi perekam.
///
/// iOS — tidak ada API publik yang setara untuk memblokir screenshot/recording
/// (capability tersebut memang dibatasi Apple). Channel tetap disediakan agar
/// kode Dart konsisten dan siap menyambut pendekatan native masa depan.
class SecureWindowChannel {
  SecureWindowChannel._();

  static const MethodChannel _channel = MethodChannel('ths_thm/secure_window');

  /// Jumlah pemohon proteksi yang masih aktif (reference counting).
  ///
  /// Beberapa widget boleh membungkus konten KTA secara bersamaan (kartu di
  /// Halaman Beranda + layar KTA Digital/Viewer yang tertumpuk di navigasi).
  /// `FLAG_SECURE` baru dilepas oleh OS ketika pemohon TERAKHIR melepasnya,
  /// sehingga satu halaman yang ditutup tidak mematikan proteksi halaman lain.
  static int _protectionRequests = 0;

  /// Aktifkan proteksi window (FLAG_SECURE). No-op di luar Android.
  /// Aman dipanggil berulang — setiap pemanggilan menambah satu pemohon.
  static Future<void> enable() async {
    if (kIsWeb || !Platform.isAndroid) return;
    _protectionRequests++;
    if (_protectionRequests > 1) return; // FLAG_SECURE sudah aktif
    try {
      await _channel.invokeMethod<bool>('setSecure', {'enabled': true});
    } catch (_) {
      // Non-fatal: proteksi tidak boleh membuat aplikasi crash.
    }
  }

  /// Normalisasi proteksi window (hapus FLAG_SECURE). No-op di luar Android.
  /// Hanya mematikan FLAG_SECURE saat tidak ada pemohon tersisa.
  static Future<void> disable() async {
    if (kIsWeb || !Platform.isAndroid) return;
    if (_protectionRequests == 0) return;
    _protectionRequests--;
    if (_protectionRequests > 0) return; // masih diminta widget lain
    try {
      await _channel.invokeMethod<bool>('setSecure', {'enabled': false});
    } catch (_) {
      // Abaikan — saat halaman KTA tertutup proteksi boleh gagal.
    }
  }
}