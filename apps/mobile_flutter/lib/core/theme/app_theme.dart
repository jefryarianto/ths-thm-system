import 'package:flutter/material.dart';

/// Tema aplikasi THS-THM — aksesibilitas & kontras tinggi:
/// latar abu ultra-terang `#F8FAFC`, skema teks Navy/Slate/Muted, emas tua
/// hanya sebagai aksen kecil (garis tepi aktif / badge).
///
/// Semua teks di aplikasi mewarisi skema warna ini melalui `Theme.of(context)`
/// (lihat `textTheme` di `light()`), sehingga perubahan tema langsung
/// diterapkan secara global tanpa menyentuh tiap widget.
class AppTheme {
  // ── Skema kontras tinggi ─────────────────────────────────────────────
  /// Deep Navy Blue — judul utama & label penting (`#0F2E5A`).
  static const Color navy = Color(0xFF0F2E5A);

  /// Slate Grey gelap — teks konten / isi utama (`#1E293B`).
  static const Color textSlate = Color(0xFF1E293B);

  /// Muted Grey — teks sub-informasi / keterangan (`#64748B`).
  static const Color textMuted = Color(0xFF64748B);

  /// Biru utama — warna pengenal aplikasi (akan digunakan pada FAB, tombol, dan elemen pengenal).
  static const Color primary = Color(0xFF1E5BB2);

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

  /// Bright Blue — teks link interaktif ("Lihat Detail", "Lihat Semua").
  /// Kontras ≈5.9:1 di atas `#F8FAFC`/putih → lolos WCAG AA (≥4.5:1) untuk
  /// ukuran teks normal, termasuk bagi pengguna low-vision.
  static const Color linkBlue = Color(0xFF1E5BB2);

  /// Bright Blue pekat — state link ditekan/hover (kontras lebih tinggi lagi).
  static const Color linkBlueDark = Color(0xFF154A8F);

  /// Bright Blue muda — teks link pada dark mode (kontras ≥≥4.5:1 di navy).
  static const Color linkBlueLight = Color(0xFF9CC5F0);

  static const Color surface = Color(0xFFFFFFFF);

  /// Latar aplikasi — abu ultra-terang yang bersih (`#F8FAFC`) agar konten
  /// di atasnya menonjol dengan kontras lembut namun tetap tinggi.
  static const Color background = Color(0xFFF9F8F6);
  static const Color success = Color(0xFF16A34A);

  /// Hijau sukses gelap — teks badge "lunas" (kontras ≥ 4.5:1 di atas putih).
  static const Color successDark = Color(0xFF15803D);
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
      onSurface: textSlate,
      onSurfaceVariant: textMuted,
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
      // ── Skema teks kontras tinggi (diwariskan ke seluruh `Text`) ────────
      textTheme: const TextTheme(
        headlineSmall: TextStyle(
          fontSize: 22,
          fontWeight: FontWeight.w800,
          color: navy,
          letterSpacing: -0.3,
        ),
        headlineMedium: TextStyle(
          fontSize: 26,
          fontWeight: FontWeight.w800,
          color: navy,
          letterSpacing: -0.5,
        ),
        titleLarge: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: navy,
        ),
        titleMedium: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w700,
          color: navy,
        ),
        titleSmall: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: navy,
        ),
        bodyLarge: TextStyle(fontSize: 16, height: 1.4, color: textSlate),
        bodyMedium: TextStyle(fontSize: 14, height: 1.35, color: textSlate),
        bodySmall: TextStyle(fontSize: 12, height: 1.3, color: textMuted),
        labelLarge: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: navy,
        ),
        labelMedium: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: textMuted,
        ),
        labelSmall: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w500,
          color: textMuted,
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        foregroundColor: navy,
        elevation: 0,
        scrolledUnderElevation: 0,
        shadowColor: Color(0x0A000000),
        surfaceTintColor: Colors.transparent,
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontSize: 17,
          fontWeight: FontWeight.w700,
          color: navy,
        ),
        iconTheme: IconThemeData(color: navy),
        actionsIconTheme: IconThemeData(color: navy),
      ),
      // Template kartu default — radius 16, putih solid, bayangan sangat lembut.
      cardTheme: CardThemeData(
        elevation: 1,
        color: Colors.white,
        surfaceTintColor: Colors.transparent,
        shadowColor: Colors.black.withValues(alpha: 0.04),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
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
        labelStyle: const TextStyle(color: AppTheme.textSlate),
        floatingLabelStyle: const TextStyle(
          color: AppTheme.navy,
          fontWeight: FontWeight.w600,
        ),
        helperStyle: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
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
      // Teks link interaktif ("Lihat Detail", "Lihat Semua") memakai Bright
      // Blue #1E5BB2 — bukan emas — agar terlihat sebagai aksi yang dapat
      // ditekan dengan kontras kuat di atas latar terang.
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: linkBlue,
          disabledForegroundColor: linkBlue.withValues(alpha: 0.4),
          textStyle: const TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: linkBlue,
          minimumSize: const Size.fromHeight(48),
          side: BorderSide(color: linkBlue.withValues(alpha: 0.55)),
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
      // Link interaktif pada dark mode memakai biru muda agar tetap ≥4.5:1.
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: linkBlueLight,
          textStyle: const TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: linkBlueLight,
          side: BorderSide(color: linkBlueLight.withValues(alpha: 0.55)),
        ),
      ),
    );
  }

  /// Bayangan kartu sangat lembut (aksesibilitas): hitam 4% opacity,
  /// blur 10pt. Dipakai sebagai dasar `CardTheme` & komponen Container
  /// agar tampilan konsisten di seluruh aplikasi.
  static List<BoxShadow> softShadow() {
    return [
      BoxShadow(
        color: Colors.black.withValues(alpha: 0.04),
        blurRadius: 10,
        offset: const Offset(0, 2),
      ),
    ];
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
