import 'package:flutter/material.dart';

/// Tema aplikasi THS-THM — warna dasar logo: kuning/emas (dominasi),
/// hitam teks, merah putih perisai, dan biru rosario.
class AppTheme {
  /// Emas tua — latar AppBar/tombol & ikon di atas latar terang (kontras ≥3:1
  /// utk ikon, ≥ 3.25:1 umumnya). Dipasangkan dengan teks hitam `onPrimary`.
  static const Color primary = Color(0xFFB8860B);

  /// Emas pekat — teks/link kecil yang butuh kontras ≥4.5:1 di latar terang.
  static const Color primaryDark = Color(0xFF7A5A00);

  /// Kuning cerah khas logo (gradient & highlight).
  static const Color primaryLight = Color(0xFFF5B301);

  /// Hitam hangat — teks di atas emas.
  static const Color onPrimary = Color(0xFF1E1800);

  /// Merah perisai logo.
  static const Color accent = Color(0xFF8E2F23);

  /// Biru rosario.
  static const Color info = Color(0xFF2B5AA6);

  static const Color surface = Color(0xFFFFFFFF);
  static const Color background = Color(0xFFFBF7EE);
  static const Color success = Color(0xFF16A34A);
  static const Color warning = Color(0xFFB45309);
  static const Color danger = Color(0xFFB91C1C);

  static ThemeData light() {
    final scheme = ColorScheme.fromSeed(
      seedColor: primary,
      primary: primary,
      onPrimary: onPrimary,
      secondary: accent,
      onSecondary: Colors.white,
      surface: surface,
    );
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: background,
      appBarTheme: const AppBarTheme(
        backgroundColor: primary,
        foregroundColor: onPrimary,
        elevation: 0,
        centerTitle: false,
      ),
      cardTheme: CardThemeData(
        elevation: 1,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: onPrimary,
          minimumSize: const Size.fromHeight(50),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: primaryDark,
          textStyle: const TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: primaryDark,
          side: BorderSide(color: primary.withValues(alpha: 0.55)),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.white,
        indicatorColor: primary.withValues(alpha: 0.18),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            color: selected ? primaryDark : Colors.grey.shade600,
          );
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: selected ? primaryDark : Colors.grey.shade600,
          );
        }),
      ),
      snackBarTheme:
          const SnackBarThemeData(behavior: SnackBarBehavior.floating),
    );
  }

  static ThemeData dark() {
    final base = ThemeData.dark(useMaterial3: true);
    return base.copyWith(
      colorScheme: base.colorScheme.copyWith(
        primary: primaryDark,
        onPrimary: Colors.white,
        secondary: accent,
        onSecondary: Colors.white,
      ),
      scaffoldBackgroundColor: const Color(0xFF171310),
      appBarTheme: const AppBarTheme(
        backgroundColor: primaryDark,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: const Color(0xFF1E1812),
        indicatorColor: primaryLight.withValues(alpha: 0.22),
      ),
    );
  }

  /// Warna pelengkap label status.
  static Color statusColor(String status) {
    switch (status) {
      case 'Lunas':
      case 'lunas':
      case 'paid':
      case 'approved':
      case 'published':
      case 'generated':
      case 'aktif':
      case 'lulus':
      case 'Hadir':
        return success;
      case 'Belum Bayar':
      case 'belum_dibayar':
      case 'unpaid':
      case 'pending':
      case 'menunggu_verifikasi':
      case 'draft':
      case 'diusulkan':
      case 'mengikuti_pendadaran':
        return warning;
      case 'rejected':
      case 'gagal':
      case 'cancelled':
      case 'revoked':
      case 'menunggak':
      case 'nonaktif':
      case 'Dibatalkan':
        return danger;
      default:
        return const Color(0xFF6B7280);
    }
  }
}
