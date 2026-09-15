import 'package:flutter/material.dart';

/// Tema aplikasi THS-THM — warna utama hijau tua khas organisasi.
class AppTheme {
  static const Color primary = Color(0xFF1B5E20);
  static const Color primaryDark = Color(0xFF0D3B12);
  static const Color accent = Color(0xFF2E7D32);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color background = Color(0xFFF4F6F4);
  static const Color success = Color(0xFF16A34A);
  static const Color warning = Color(0xFFB45309);
  static const Color danger = Color(0xFFB91C1C);

  static ThemeData light() {
    final scheme = ColorScheme.fromSeed(
      seedColor: primary,
      primary: primary,
      secondary: accent,
    );
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: background,
      appBarTheme: const AppBarTheme(
        backgroundColor: primary,
        foregroundColor: Colors.white,
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
          minimumSize: const Size.fromHeight(50),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.white,
        indicatorColor: primary.withValues(alpha: 0.12),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: selected ? primary : Colors.grey.shade600,
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
        primary: accent,
        secondary: primary,
      ),
      scaffoldBackgroundColor: const Color(0xFF121412),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFF0F120F),
        foregroundColor: Colors.white,
        elevation: 0,
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
