import 'package:local_auth/local_auth.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Biometric authentication service for app-lock feature.
/// Supports Face ID (iOS), Touch ID (iOS), Fingerprint (Android), Face (Android).
class BiometricAuthService {
  static final BiometricAuthService _instance = BiometricAuthService._internal();
  factory BiometricAuthService() => _instance;
  BiometricAuthService._internal();

  final LocalAuthentication _localAuth = LocalAuthentication();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  static const String _biometricEnabledKey = 'biometric_auth_enabled';
  static const String _biometricTypeKey = 'biometric_type';

  /// Check if biometric hardware is available on device
  Future<bool> isBiometricAvailable() async {
    try {
      final isAvailable = await _localAuth.canCheckBiometrics;
      final isDeviceSupported = await _localAuth.isDeviceSupported();
      return isAvailable && isDeviceSupported;
    } catch (e) {
      return false;
    }
  }

  /// Get list of enrolled biometric types
  Future<List<BiometricType>> getAvailableBiometrics() async {
    try {
      return await _localAuth.getAvailableBiometrics();
    } catch (e) {
      return [];
    }
  }

  /// Get human-readable name for biometric type
  String getBiometricName(BiometricType type) {
    switch (type) {
      case BiometricType.face:
        return 'Face ID / Face Recognition';
      case BiometricType.fingerprint:
        return 'Fingerprint / Touch ID';
      case BiometricType.strong:
        return 'Strong Biometric (Face/Fingerprint)';
      case BiometricType.weak:
        return 'Weak Biometric';
      case BiometricType.iris:
        return 'Iris Scan';
      default:
        return 'Biometric';
    }
  }

  /// Check if biometric auth is enabled in settings
  Future<bool> isBiometricEnabled() async {
    try {
      final value = await _storage.read(key: _biometricEnabledKey);
      return value == 'true';
    } catch (e) {
      return false;
    }
  }

  /// Enable/disable biometric authentication
  Future<void> setBiometricEnabled(bool enabled) async {
    await _storage.write(key: _biometricEnabledKey, value: enabled.toString());
    if (!enabled) {
      await _storage.delete(key: _biometricTypeKey);
    }
  }

  /// Authenticate user with biometrics
  /// Returns true on success, false on failure/cancel
  Future<bool> authenticate({
    required String reason,
    bool useErrorDialogs = true,
    bool stickyAuth = true,
    List<BiometricType> preferredTypes = const [
      BiometricType.strong,
      BiometricType.face,
      BiometricType.fingerprint,
    ],
  }) async {
    try {
      final isAvailable = await isBiometricAvailable();
      if (!isAvailable) return false;

      final availableTypes = await getAvailableBiometrics();
      if (availableTypes.isEmpty) return false;

      // Prefer strong biometrics, fallback to any available
      final typesToUse = preferredTypes
          .where((t) => availableTypes.contains(t))
          .toList();

      if (typesToUse.isEmpty) {
        typesToUse.addAll(availableTypes);
      }

      final didAuthenticate = await _localAuth.authenticate(
        localizedReason: reason,
        options: AuthenticationOptions(
          biometricOnly: true,
          useErrorDialogs: useErrorDialogs,
          stickyAuth: stickyAuth,
          sensitiveTransaction: false,
        ),
      );

      return didAuthenticate;
    } on Exception catch (e) {
      // Handle platform-specific errors gracefully
      return false;
    }
  }

  /// Quick auth for app resume (shorter reason)
  Future<bool> quickAuth() async {
    return authenticate(
      reason: 'Buka aplikasi THS-THM',
      useErrorDialogs: false,
      stickyAuth: false,
    );
  }

  /// Save last successful biometric type used (for UI display)
  Future<void> saveBiometricType(BiometricType type) async {
    await _storage.write(key: _biometricTypeKey, value: type.name);
  }

  /// Get last used biometric type
  Future<BiometricType?> getLastBiometricType() async {
    try {
      final name = await _storage.read(key: _biometricTypeKey);
      if (name == null) return null;
      return BiometricType.values.firstWhere(
        (t) => t.name == name,
        orElse: () => BiometricType.strong,
      );
    } catch (e) {
      return null;
    }
  }

  /// Reset biometric settings (use on logout)
  Future<void> reset() async {
    await _storage.delete(key: _biometricEnabledKey);
    await _storage.delete(key: _biometricTypeKey);
  }
}