import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;

/// Opsi konfigurasi Firebase untuk platform saat ini.
///
/// Ditulis manual dari `android/app/google-services.json` (project
/// `ayo-lapor-56443`, client `org.thsthm.mobile.flutter`). Karena app
/// hanya menargetkan Android, cukup satu set opsi; jika nanti mendukung
/// iOS, tambahkan cabang platform di sini (pola `flutterfire configure`).
class DefaultFirebaseOptions {
  static const FirebaseOptions currentPlatform = FirebaseOptions(
    apiKey: 'AIzaSyBIBJEXUyW3URFs4OjlBPcn55SFWpakfQI',
    appId: '1:172370970635:android:179c126495609fea921f0e',
    messagingSenderId: '172370970635',
    projectId: 'ayo-lapor-56443',
    storageBucket: 'ayo-lapor-56443.firebasestorage.app',
  );
}
