import 'package:flutter/material.dart';

/// Tema aplikasi THS-THM — Sistem Warna Baru (Primary #072AC8)
/// Latar abu ultra-terang `#FAF9FF`, skema teks Navy/Slate/Muted,
/// Biru #072AC8 sebagai warna brand utama.
///
/// Semua teks di aplikasi mewarisi skema warna ini melalui `Theme.of(context)`
/// sehingga perubahan tema langsung diterapkan secara global.
class AppTheme {
  // ── BRAND COLORS ──────────────────────────────────────────────────────
  /// Primary Blue — warna identitas utama aplikasi (#072AC8)
  /// Digunakan untuk: FAB, primary button, active navigation, selected tab,
  /// active state, progress indicator, CTA, switch/checkbox/radio aktif
  static const Color primary = Color(0xFF072AC8);

  /// Primary Dark — pressed/focused state (#051C8A)
  static const Color primaryDark = Color(0xFF051C8A);

  /// Primary Light — highlight, secondary visual emphasis (#3D5BE0)
  static const Color primaryLight = Color(0xFF3D5BE0);

  /// Primary Container — selected navigation indicator, selected card, chip,
  /// filter aktif, background info primary-related, container icon (#DDE4FF)
  static const Color primaryContainer = Color(0xFFDDE4FF);

  /// On Primary Container — text/icon on primary container (#00145C)
  static const Color onPrimaryContainer = Color(0xFF00145C);

  /// On Primary — text/icon on primary background (#FFFFFF)
  static const Color onPrimary = Color(0xFFFFFFFF);

  // ── NAVY / INSTITUTIONAL ──────────────────────────────────────────────
  /// Navy — heading, judul halaman, angka statistik penting, teks institusional (#06154F)
  static const Color navy = Color(0xFF06154F);

  // ── GOLD / ACCENT (merek THS-THM) ────────────────────────────────────
  /// Gold 400 — aksen keemasan merek THS-THM (#D4AF37), dipakai busur kedua
  /// `AppLoadingSpinner`. Sama dengan `--gold-400` di web (light mode).
  static const Color gold400 = Color(0xFFD4AF37);

  /// Gold 300 — versi lebih terang (#E5C76E) untuk mode gelap, sama dengan
  /// `--gold-400` di web (dark mode).
  static const Color gold300 = Color(0xFFE5C76E);

  // ── SEMANTIC COLORS ───────────────────────────────────────────────────
  /// Info — informasi, badge informasi, status informasi, icon info (#2B63E6)
  static const Color info = Color(0xFF2B63E6);

  /// Success — Aktif, Berhasil, Sinkronisasi berhasil, Data tersimpan (#1B7F4B)
  static const Color success = Color(0xFF1B7F4B);

  /// Success Container — background badge success (#B7F1CE)
  static const Color successContainer = Color(0xFFB7F1CE);

  /// On Success Container — text on success container (#002111)
  static const Color onSuccessContainer = Color(0xFF002111);

  /// Warning — Menunggu, Pending, Perlu perhatian, Data belum lengkap (#8A6200)
  static const Color warning = Color(0xFF8A6200);

  /// Warning Container — background badge warning (#FFDEA0)
  static const Color warningContainer = Color(0xFFFFDEA0);

  /// On Warning Container — text on warning container (#2A1A00)
  static const Color onWarningContainer = Color(0xFF2A1A00);

  /// Error — Error, Ditolak, Data tidak valid, Gagal menyimpan (#BA1A1A)
  static const Color error = Color(0xFFBA1A1A);

  /// Error Container — background badge error (#FFDAD6)
  static const Color errorContainer = Color(0xFFFFDAD6);

  /// On Error Container — text on error container (#410002)
  static const Color onErrorContainer = Color(0xFF410002);

  // ── LINK COLORS ───────────────────────────────────────────────────────
  /// Link Blue — hyperlink, "Lihat Detail", navigasi tekstual (#1E5BFF)
  static const Color linkBlue = Color(0xFF1E5BFF);

  /// Link Dark — link pressed/hover state (#1646C7)
  static const Color linkBlueDark = Color(0xFF1646C7);

  // ── LIGHT MODE SURFACE COLORS ─────────────────────────────────────────
  /// Light Background — #FAF9FF
  static const Color lightBackground = Color(0xFFFAF9FF);

  /// Light Surface — #FAF9FF
  static const Color lightSurface = Color(0xFFFAF9FF);

  /// Light Surface Variant — #E2E2EC
  static const Color lightSurfaceVariant = Color(0xFFE2E2EC);

  /// Light Outline — #757780
  static const Color lightOutline = Color(0xFF757780);

  /// Light Outline Variant — #C6C6D0
  static const Color lightOutlineVariant = Color(0xFFC6C6D0);

  // ── DARK MODE SURFACE COLORS ──────────────────────────────────────────
  /// Dark Background — #111318
  static const Color darkBackground = Color(0xFF111318);

  /// Dark Surface — #111318
  static const Color darkSurface = Color(0xFF111318);

  /// Dark Surface Variant — #45464F
  static const Color darkSurfaceVariant = Color(0xFF45464F);

  /// Dark Outline — #8F9099
  static const Color darkOutline = Color(0xFF8F9099);

  /// Dark Text Primary — #E3E2E9
  static const Color darkTextPrimary = Color(0xFFE3E2E9);

  /// Dark Text Secondary — #C6C6D0
  static const Color darkTextSecondary = Color(0xFFC6C6D0);

  // ── DARK MODE BRAND COLORS ────────────────────────────────────────────
  /// Dark Primary — #B8C3FF
  static const Color darkPrimary = Color(0xFFB8C3FF);

  /// On Dark Primary — #00218A
  static const Color onDarkPrimary = Color(0xFF00218A);

  /// Dark Primary Container — #0036B8
  static const Color darkPrimaryContainer = Color(0xFF0036B8);

  /// On Dark Primary Container — #DDE4FF
  static const Color onDarkPrimaryContainer = Color(0xFFDDE4FF);

  // ── SHAPE TOKENS (sudut bulat) ───────────────────────────────────────
  /// Sistem radius tunggal agar kartu, tombol, dan input terasa satu bahasa.
  /// Skala dipakai di seluruh tema & widget — ganti di sini, bukan per file.
  static const Radius radiusSm = Radius.circular(8); // small chip, badge
  static const Radius radiusMd = Radius.circular(12); // button, input, list tile
  static const Radius radiusLg = Radius.circular(16); // card
  static const Radius radiusXl = Radius.circular(20); // FAB, menu
  static const Radius radiusSheet = Radius.circular(24); // bottom sheet

  /// Border radius siap pakai (paling sering dipakai: md untuk kontrol,
  /// lg untuk kartu, sheet untuk bottom sheet).
  static const BorderRadius radiusSmAll = BorderRadius.all(radiusSm);
  static const BorderRadius radiusMdAll = BorderRadius.all(radiusMd);
  static const BorderRadius radiusLgAll = BorderRadius.all(radiusLg);
  static const BorderRadius radiusXlAll = BorderRadius.all(radiusXl);
  static const BorderRadius radiusSheetTop =
      BorderRadius.vertical(top: radiusSheet);

  // ── TARGET SENTUH MINIMUM (a11y) ─────────────────────────────────────
  /// Material 3 minimum 48 dp; pakai 44 dp untuk kompak dalam list.
  static const double touchTargetCompact = 44.0;
  static const double touchTarget = 48.0;

  // ── LEGACY COMPATIBILITY ──────────────────────────────────────────────
  /// @deprecated Use [textSlate] instead
  @Deprecated('Use textSlate')
  static const Color textSlate = Color(0xFF1E293B);

  /// @deprecated Use [textMuted] instead
  @Deprecated('Use textMuted')
  static const Color textMuted = Color(0xFF64748B);

  /// @deprecated Use [primaryDark] instead
  @Deprecated('Use primaryDark')
  static const Color accent = Color(0xFF8E2F23);

  /// @deprecated Use [lightSurface] instead
  @Deprecated('Use lightSurface')
  static const Color surface = Color(0xFFFFFFFF);

  /// @deprecated Use [lightBackground] instead
  @Deprecated('Use lightBackground')
  static const Color background = Color(0xFFF9F8F6);

  /// @deprecated Use [successDark] or [success] instead
  @Deprecated('Use success or successContainer')
  static const Color successDark = Color(0xFF15803D);

  /// @deprecated Use [warning] instead
  @Deprecated('Use warning')
  static const Color danger = Color(0xFFB91C1C);

  /// @deprecated Use [linkBlue] instead
  @Deprecated('Use linkBlue')
  static const Color linkBlueLight = Color(0xFF9CC5F0);

  /// @deprecated Use [primaryLight] instead
  @Deprecated('Use primaryLight')
  static const Color primaryLightLegacy = Color(0xFFF5B301);

  /// @deprecated Use [primaryDark] instead
  @Deprecated('Use primaryDark')
  static const Color primaryDarkLegacy = Color(0xFF7A5A00);

  /// @deprecated Use [onPrimary] instead
  @Deprecated('Use onPrimary')
  static const Color onPrimaryLegacy = Color(0xFF1E1800);

  // ── THEME DATA ────────────────────────────────────────────────────────

  static ThemeData light() {
    const scheme = ColorScheme(
      brightness: Brightness.light,
      primary: primary,
      onPrimary: onPrimary,
      primaryContainer: primaryContainer,
      onPrimaryContainer: onPrimaryContainer,
      secondary: info,
      onSecondary: Colors.white,
      tertiary: linkBlue,
      onTertiary: Colors.white,
      error: error,
      onError: Colors.white,
      errorContainer: errorContainer,
      onErrorContainer: onErrorContainer,
      surface: lightSurface,
      onSurface: textSlate,
      onSurfaceVariant: textMuted,
      outline: lightOutline,
      outlineVariant: lightOutlineVariant,
      surfaceContainerHighest: lightSurfaceVariant,
      surfaceContainerHigh: lightSurfaceVariant,
      surfaceContainer: lightSurface,
      surfaceContainerLow: lightSurface,
      surfaceContainerLowest: lightBackground,
      surfaceTint: primary,
      shadow: Colors.black,
      scrim: Colors.black,
      inverseSurface: darkSurface,
      onInverseSurface: darkTextPrimary,
      inversePrimary: darkPrimary,
    );

    // Warna garis halus (outline dengan alpha) — tema modern
    const softLine = Color(0x1FC6C6D0); // ~12% outline variant

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: lightBackground,
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
        backgroundColor: lightSurface,
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
      // Template kartu default — radius 16, surface solid, bayangan sangat lembut
      cardTheme: CardThemeData(
        elevation: 1,
        color: lightSurface,
        surfaceTintColor: Colors.transparent,
        shadowColor: Colors.black.withValues(alpha: 0.04),
        shape: const RoundedRectangleBorder(borderRadius: radiusLgAll),
      ),
      inputDecorationTheme: const InputDecorationTheme(
        filled: true,
        fillColor: lightSurface,
        contentPadding:
            EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: radiusMdAll,
          borderSide: BorderSide(color: lightOutline),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: radiusMdAll,
          borderSide: BorderSide(color: lightOutline),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: radiusMdAll,
          borderSide: BorderSide(color: primary, width: 1.6),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: radiusMdAll,
          borderSide: BorderSide(color: error),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: radiusMdAll,
          borderSide: BorderSide(color: error, width: 1.6),
        ),
        labelStyle: TextStyle(color: textSlate),
        floatingLabelStyle: TextStyle(
          color: navy,
          fontWeight: FontWeight.w600,
        ),
        helperStyle: TextStyle(fontSize: 12, color: textMuted),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: onPrimary,
          minimumSize: const Size.fromHeight(52),
          shape: const RoundedRectangleBorder(borderRadius: radiusMdAll),
          elevation: 0,
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
          padding: const EdgeInsets.symmetric(horizontal: 20),
        ),
      ),
      // Teks link interaktif ("Lihat Detail", "Lihat Semua") memakai Link Blue
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
          shape: const RoundedRectangleBorder(
            borderRadius: radiusMdAll,
          ),
        ),
      ),
      chipTheme: const ChipThemeData(
        backgroundColor: lightSurface,
        selectedColor: primaryContainer,
        side: BorderSide(color: lightOutlineVariant),
        shape: RoundedRectangleBorder(borderRadius: radiusMdAll),
        labelStyle: TextStyle(fontWeight: FontWeight.w600),
        padding: EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      ),
      dividerTheme: const DividerThemeData(
        color: lightOutlineVariant,
        thickness: 1,
        space: 1,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: lightSurface,
        elevation: 0,
        height: 68,
        surfaceTintColor: Colors.transparent,
        shadowColor: softLine,
        indicatorColor: primaryContainer,
        indicatorShape: const StadiumBorder(),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            color: selected ? onPrimaryContainer : textMuted,
          );
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: selected ? primary : textMuted,
          );
        }),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: lightSurface,
        modalBackgroundColor: lightSurface,
        surfaceTintColor: Colors.transparent,
        showDragHandle: true,
        shape: RoundedRectangleBorder(borderRadius: radiusSheetTop),
      ),
      dialogTheme: const DialogThemeData(
        backgroundColor: lightSurface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: radiusXlAll),
      ),
      datePickerTheme: const DatePickerThemeData(
        backgroundColor: lightSurface,
        surfaceTintColor: Colors.transparent,
        headerBackgroundColor: primary,
        headerForegroundColor: onPrimary,
        shape: RoundedRectangleBorder(borderRadius: radiusXlAll),
        todayBorder: BorderSide(color: primary, width: 1.5),
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: primary,
        linearTrackColor: lightOutlineVariant,
      ),
      snackBarTheme: const SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        elevation: 4,
        shape: RoundedRectangleBorder(borderRadius: radiusMdAll),
      ),
      listTileTheme: const ListTileThemeData(
        iconColor: primary,
        shape: RoundedRectangleBorder(borderRadius: radiusMdAll),
      ),
    );
  }

  static ThemeData dark() {
    const scheme = ColorScheme(
      brightness: Brightness.dark,
      primary: darkPrimary,
      onPrimary: onDarkPrimary,
      primaryContainer: darkPrimaryContainer,
      onPrimaryContainer: onDarkPrimaryContainer,
      secondary: info,
      onSecondary: Colors.white,
      tertiary: linkBlue,
      onTertiary: Colors.white,
      error: error,
      onError: Colors.white,
      errorContainer: errorContainer,
      onErrorContainer: onErrorContainer,
      surface: darkSurface,
      onSurface: darkTextPrimary,
      onSurfaceVariant: darkTextSecondary,
      outline: darkOutline,
      outlineVariant: darkOutline,
      surfaceContainerHighest: darkSurfaceVariant,
      surfaceContainerHigh: darkSurfaceVariant,
      surfaceContainer: darkSurface,
      surfaceContainerLow: darkSurface,
      surfaceContainerLowest: darkBackground,
      surfaceTint: darkPrimary,
      shadow: Colors.black,
      scrim: Colors.black,
      inverseSurface: lightSurface,
      onInverseSurface: textSlate,
      inversePrimary: primary,
    );

    // const softLine = Color(0x1F8F9099); // ~12% dark outline (unused)

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: darkBackground,
      splashFactory: InkSparkle.splashFactory,
      textTheme: const TextTheme(
        headlineSmall: TextStyle(
          fontSize: 22,
          fontWeight: FontWeight.w800,
          color: darkTextPrimary,
          letterSpacing: -0.3,
        ),
        headlineMedium: TextStyle(
          fontSize: 26,
          fontWeight: FontWeight.w800,
          color: darkTextPrimary,
          letterSpacing: -0.5,
        ),
        titleLarge: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: darkTextPrimary,
        ),
        titleMedium: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w700,
          color: darkTextPrimary,
        ),
        titleSmall: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: darkTextPrimary,
        ),
        bodyLarge: TextStyle(fontSize: 16, height: 1.4, color: darkTextPrimary),
        bodyMedium: TextStyle(fontSize: 14, height: 1.35, color: darkTextPrimary),
        bodySmall: TextStyle(fontSize: 12, height: 1.3, color: darkTextSecondary),
        labelLarge: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: darkTextPrimary,
        ),
        labelMedium: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: darkTextSecondary,
        ),
        labelSmall: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w500,
          color: darkTextSecondary,
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: darkSurface,
        foregroundColor: darkTextPrimary,
        elevation: 0,
        scrolledUnderElevation: 0,
        shadowColor: Color(0x0A000000),
        surfaceTintColor: Colors.transparent,
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontSize: 17,
          fontWeight: FontWeight.w700,
          color: darkTextPrimary,
        ),
        iconTheme: IconThemeData(color: darkTextPrimary),
        actionsIconTheme: IconThemeData(color: darkTextPrimary),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: darkSurface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: radiusLgAll,
          side: BorderSide(color: darkOutline.withValues(alpha: 0.12)),
        ),
      ),
      inputDecorationTheme: const InputDecorationTheme(
        filled: true,
        fillColor: darkSurface,
        contentPadding:
            EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: radiusMdAll,
          borderSide: BorderSide(color: darkOutline),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: radiusMdAll,
          borderSide: BorderSide(color: darkOutline),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: radiusMdAll,
          borderSide: BorderSide(color: darkPrimary, width: 1.6),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: radiusMdAll,
          borderSide: BorderSide(color: error),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: radiusMdAll,
          borderSide: BorderSide(color: error, width: 1.6),
        ),
        labelStyle: TextStyle(color: darkTextSecondary),
        floatingLabelStyle: TextStyle(
          color: darkPrimary,
          fontWeight: FontWeight.w600,
        ),
        helperStyle: TextStyle(fontSize: 12, color: darkTextSecondary),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: darkPrimary,
          foregroundColor: onDarkPrimary,
          minimumSize: const Size.fromHeight(52),
          shape: const RoundedRectangleBorder(
            borderRadius: radiusMdAll,
          ),
          elevation: 0,
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
          padding: const EdgeInsets.symmetric(horizontal: 20),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: darkPrimary,
          disabledForegroundColor: darkPrimary.withValues(alpha: 0.4),
          textStyle: const TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: darkPrimary,
          minimumSize: const Size.fromHeight(48),
          side: BorderSide(color: darkPrimary.withValues(alpha: 0.55)),
          shape: const RoundedRectangleBorder(
            borderRadius: radiusMdAll,
          ),
        ),
      ),
      chipTheme: const ChipThemeData(
        backgroundColor: darkSurfaceVariant,
        selectedColor: darkPrimaryContainer,
        side: BorderSide(color: darkOutline),
        shape: RoundedRectangleBorder(borderRadius: radiusMdAll),
        labelStyle: TextStyle(fontWeight: FontWeight.w600, color: darkTextPrimary),
        padding: EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      ),
      dividerTheme: const DividerThemeData(
        color: darkOutline,
        thickness: 1,
        space: 1,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: darkSurface,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        indicatorColor: darkPrimaryContainer,
        indicatorShape: const StadiumBorder(),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            color: selected ? onDarkPrimaryContainer : darkTextSecondary,
          );
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: selected ? darkPrimary : darkTextSecondary,
          );
        }),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: darkSurface,
        modalBackgroundColor: darkSurface,
        surfaceTintColor: Colors.transparent,
        showDragHandle: true,
        shape: RoundedRectangleBorder(borderRadius: radiusSheetTop),
      ),
      dialogTheme: const DialogThemeData(
        backgroundColor: darkSurface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: radiusXlAll),
      ),
      datePickerTheme: const DatePickerThemeData(
        backgroundColor: darkSurface,
        surfaceTintColor: Colors.transparent,
        headerBackgroundColor: darkPrimary,
        headerForegroundColor: onDarkPrimary,
        shape: RoundedRectangleBorder(borderRadius: radiusXlAll),
        todayBorder: BorderSide(color: darkPrimary, width: 1.5),
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: darkPrimary,
        linearTrackColor: darkOutline,
      ),
      snackBarTheme: const SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        elevation: 4,
        shape: RoundedRectangleBorder(borderRadius: radiusMdAll),
      ),
      listTileTheme: const ListTileThemeData(
        iconColor: darkPrimary,
        shape: RoundedRectangleBorder(borderRadius: radiusMdAll),
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
    switch (status.toLowerCase()) {
      case 'lunas':
      case 'paid':
      case 'approved':
      case 'published':
      case 'generated':
      case 'aktif':
      case 'lulus':
      case 'hadir':
        return success;
      case 'belum bayar':
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
      case 'dibatalkan':
        return error;
      default:
        return textMuted;
    }
  }

  /// Warna container untuk status badge
  static Color statusContainerColor(String status) {
    switch (status.toLowerCase()) {
      case 'lunas':
      case 'paid':
      case 'approved':
      case 'published':
      case 'generated':
      case 'aktif':
      case 'lulus':
      case 'hadir':
        return successContainer;
      case 'belum bayar':
      case 'belum_dibayar':
      case 'unpaid':
      case 'pending':
      case 'menunggu_verifikasi':
      case 'draft':
      case 'diusulkan':
      case 'mengikuti_pendadaran':
        return warningContainer;
      case 'rejected':
      case 'gagal':
      case 'cancelled':
      case 'revoked':
      case 'menunggak':
      case 'nonaktif':
      case 'dibatalkan':
        return errorContainer;
      default:
        return lightSurfaceVariant;
    }
  }

  /// Warna teks untuk status badge
  static Color statusTextColor(String status) {
    switch (status.toLowerCase()) {
      case 'lunas':
      case 'paid':
      case 'approved':
      case 'published':
      case 'generated':
      case 'aktif':
      case 'lulus':
      case 'hadir':
        return onSuccessContainer;
      case 'belum bayar':
      case 'belum_dibayar':
      case 'unpaid':
      case 'pending':
      case 'menunggu_verifikasi':
      case 'draft':
      case 'diusulkan':
      case 'mengikuti_pendadaran':
        return onWarningContainer;
      case 'rejected':
      case 'gagal':
      case 'cancelled':
      case 'revoked':
      case 'menunggak':
      case 'nonaktif':
      case 'dibatalkan':
        return onErrorContainer;
      default:
        return textMuted;
    }
  }
}
