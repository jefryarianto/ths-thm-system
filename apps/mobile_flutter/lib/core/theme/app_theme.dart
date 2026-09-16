import 'package:flutter/material.dart';

/// Tema aplikasi THS-THM — desain modern & profesional:
/// emas sebagai warna aksi (brand logo), latar biru langit `#E3F2FD` dengan
/// kartu putih, aksen biru rosario, hitam teks, merah putih perisai.
class AppTheme {
  /// Emas tua — tombol & ikon di atas latar terang (kontras ≥3:1 utk ikon,
  /// ≥ 3.25:1 umumnya). Dipasangkan dengan teks hitam `onPrimary`.
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

  /// Latar aplikasi (Material Blue-50 `#E3F2FD`) — kesan modern, segar,
  /// dan profesional; kartu putih di atasnya menonjol dengan kontras halus.
  static const Color background = Color(0xFFE3F2FD);
  static const Color success = Color(0xFF16A34A);
  static const Color warning = Color(0xFFB45309);
  static const Color danger = Color(0xFFB91C1C);

  /// Warna permukaan lembut untuk bar statistik / placeholder (biru rosario
  /// dengan transparansi sangat rendah, di atas latar #E3F2FD).
  static const Color surfaceMuted = Color(0xFFF0F7FE);

  /// Gradien header beranda & layar utama — emas brand ke kuning logo:
  /// dari `primaryDark` (emas tua) menuju `primaryLight` (kuning logo).
  /// Dipakai pada kartu hero agar terasa modern & profesional.
  static const LinearGradient headerGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [primaryDark, primary, primaryLight],
    stops: [0.0, 0.55, 1.0],
  );

  static ThemeData light() {
    final scheme = ColorScheme.fromSeed(
      seedColor: primary,
      primary: primary,
      onPrimary: onPrimary,
      secondary: accent,
      onSecondary: Colors.white,
      surface: surface,
      error: danger,
    );

    // Warna garis halus (biru rosario dengan alpha rendah) — tema modern.
    const line = Color(0x2E2B5AA6); // ~18% biru rosario
    const softLine = Color(0x1F2B5AA6); // ~12%

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: background,
      splashFactory: InkSparkle.splashFactory,
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        foregroundColor: primaryDark,
        elevation: 0,
        scrolledUnderElevation: 0,
        shadowColor: Color(0x1F2B5AA6),
        surfaceTintColor: Colors.transparent,
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontSize: 17,
          fontWeight: FontWeight.w700,
          color: primaryDark,
        ),
        iconTheme: IconThemeData(color: primaryDark),
        actionsIconTheme: IconThemeData(color: primaryDark),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: Colors.white,
        surfaceTintColor: Colors.transparent,
        shadowColor: const Color(0x1F2B5AA6),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: softLine),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: line),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: line),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppTheme.primary, width: 1.6),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppTheme.danger),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppTheme.danger, width: 1.6),
        ),
        labelStyle: TextStyle(color: Colors.grey.shade700),
        floatingLabelStyle: const TextStyle(
          color: AppTheme.primaryDark,
          fontWeight: FontWeight.w600,
        ),
        helperStyle: TextStyle(fontSize: 12, color: Colors.grey.shade600),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: onPrimary,
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          elevation: 0,
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
          padding: const EdgeInsets.symmetric(horizontal: 20),
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
          minimumSize: const Size.fromHeight(48),
          side: BorderSide(color: primary.withValues(alpha: 0.55)),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: Colors.white,
        selectedColor: primary.withValues(alpha: 0.14),
        side: const BorderSide(color: softLine),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        labelStyle: const TextStyle(fontWeight: FontWeight.w600),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      ),
      dividerTheme: const DividerThemeData(
        color: softLine,
        thickness: 1,
        space: 1,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.white,
        elevation: 0,
        height: 68,
        surfaceTintColor: Colors.transparent,
        shadowColor: const Color(0x1F2B5AA6),
        indicatorColor: primary.withValues(alpha: 0.14),
        indicatorShape: const StadiumBorder(),
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
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: Colors.white,
        modalBackgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        showDragHandle: true,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      ),
      datePickerTheme: DatePickerThemeData(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        headerBackgroundColor: primaryDark,
        headerForegroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        todayBorder: const BorderSide(color: AppTheme.primary, width: 1.5),
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: primary,
        linearTrackColor: softLine,
      ),
      snackBarTheme: const SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        elevation: 4,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(12)),
        ),
      ),
      listTileTheme: ListTileThemeData(
        iconColor: primaryDark,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  static ThemeData dark() {
    final base = ThemeData.dark(useMaterial3: true);
    const navyBg = Color(0xFF0B1322);
    const navyBar = Color(0xFF111D33);
    return base.copyWith(
      colorScheme: base.colorScheme.copyWith(
        primary: primaryDark,
        onPrimary: Colors.white,
        secondary: accent,
        onSecondary: Colors.white,
        surface: const Color(0xFF16233A),
      ),
      scaffoldBackgroundColor: navyBg,
      appBarTheme: const AppBarTheme(
        backgroundColor: navyBar,
        foregroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: const Color(0xFF16233A),
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: Colors.white.withValues(alpha: 0.08)),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: navyBar,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
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
