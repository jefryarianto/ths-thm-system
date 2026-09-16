import 'package:flutter/material.dart';

import 'secure_kta_container.dart';

/// Alias lama dari [SecureKtaContainer].
///
/// Dipertahankan agar kode transisi tidak merusak pemanggilan yang ada.
/// Seluruh logika — proteksi FLAG_SECURE, jam live terenkripsi, dan warna
/// dari tema global — kini hidup di [SecureKtaContainer].
@Deprecated(
  'Gunakan SecureKtaContainer '
  '(presentation/widgets/secure_kta_container.dart)',
)
class SecureKtaWrapper extends StatelessWidget {
  /// TEMPATKAN widget KTA lama Anda di sini (desain internal tidak disentuh).
  final Widget childKtaExisting;

  /// Tampilkan jam verifikasi live di atas widget KTA (default `false`).
  final bool showLiveClock;

  /// Nyalakan `FLAG_SECURE` + proteksi perekaman saat halaman dibuka.
  final bool enableScreenProtection;

  const SecureKtaWrapper({
    super.key,
    required this.childKtaExisting,
    this.showLiveClock = false,
    this.enableScreenProtection = true,
  });

  @override
  Widget build(BuildContext context) {
    return SecureKtaContainer(
      childKtaExisting: childKtaExisting,
      showLiveClock: showLiveClock,
      enableScreenProtection: enableScreenProtection,
    );
  }
}