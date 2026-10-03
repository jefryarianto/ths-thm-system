import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_flutter/core/theme/app_theme.dart';

/// Audit kontras WCAG 2.1 untuk token warna inti aplikasi.
///
/// Menjaga perbaikan dark mode tidak mundur: setiap pasangan
/// foreground/background yang dipakai di UI diuji di dua tema.
/// Ambang: 4.5:1 untuk teks normal, 3:1 untuk ikon/garis.
double contrastRatio(Color a, Color b) {
  double channel(double c) => c <= 0.03928
      ? c / 12.92
      : math.pow((c + 0.055) / 1.055, 2.4).toDouble();

  double luminance(Color c) =>
      0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);

  final la = luminance(a);
  final lb = luminance(b);
  final lighter = math.max(la, lb);
  final darker = math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

Matcher meets(double minimum) => greaterThanOrEqualTo(minimum);

void main() {
  final light = AppTheme.light();
  final dark = AppTheme.dark();
  final ls = light.colorScheme;
  final ds = dark.colorScheme;

  group('Kelengkapan ColorScheme', () {
    test('mode terang: peran container tidak jatuh ke fallback Flutter', () {
      // Tanpa definisi, Flutter 3.44 memakai `secondaryContainer ?? secondary`
      // sehingga tombol tonal tampil solid biru info.
      expect(ls.secondaryContainer, isNot(ls.secondary));
      expect(ls.secondaryContainer, AppTheme.primaryContainer);
      expect(ls.onSecondaryContainer, AppTheme.onPrimaryContainer);
      expect(ls.tertiaryContainer, isNot(ls.tertiary));
      expect(ls.surfaceDim, isNot(ls.surfaceBright));
    });

    test('mode gelap: peran container & error memakai varian gelap', () {
      expect(ds.secondaryContainer, isNot(ds.secondary));
      expect(ds.secondaryContainer, AppTheme.darkPrimaryContainer);
      expect(ds.tertiaryContainer, isNot(ds.tertiary));
      expect(ds.surfaceDim, isNot(ds.surfaceBright));
      // Error mode gelap harus varian terang agar kontras di surface gelap.
      expect(ds.error, AppTheme.errorOnDark);
      expect(ds.errorContainer, AppTheme.errorContainerDark);
    });
  });

  group('Kontras teks — mode terang (≥ 4.5:1)', () {
    final pairs = <String, (Color, Color)>{
      'onSurface / surface': (ls.onSurface, ls.surface),
      'onSurfaceVariant / surface': (ls.onSurfaceVariant, ls.surface),
      'onPrimary / primary': (ls.onPrimary, ls.primary),
      'onPrimaryContainer / primaryContainer':
          (ls.onPrimaryContainer, ls.primaryContainer),
      'onSecondaryContainer / secondaryContainer':
          (ls.onSecondaryContainer, ls.secondaryContainer),
      'onTertiaryContainer / tertiaryContainer':
          (ls.onTertiaryContainer, ls.tertiaryContainer),
      'onError / error': (ls.onError, ls.error),
      'onErrorContainer / errorContainer':
          (ls.onErrorContainer, ls.errorContainer),
      'error / surface (ikon & teks)': (ls.error, ls.surface),
      'success / surface (teks status)': (AppTheme.success, ls.surface),
      'warning / surface (teks status)': (AppTheme.warning, ls.surface),
      'primary / surface (ikon)': (ls.primary, ls.surface),
      'successContainer / onSuccessContainer':
          (AppTheme.successContainer, AppTheme.onSuccessContainer),
      'warningContainer / onWarningContainer':
          (AppTheme.warningContainer, AppTheme.onWarningContainer),
      'errorContainer / onErrorContainer':
          (AppTheme.errorContainer, AppTheme.onErrorContainer),
      'onSurface / latar kartu level':
          (ls.onSurface, AppTheme.levelBg(Brightness.light)),
      'onSurfaceVariant / latar kartu level':
          (ls.onSurfaceVariant, AppTheme.levelBg(Brightness.light)),
    };

    pairs.forEach((name, pair) {
      test(name, () {
        expect(contrastRatio(pair.$1, pair.$2), meets(4.5), reason: name);
      });
    });

    test('outline / surface (border & ikon) ≥ 3:1', () {
      expect(contrastRatio(ls.outline, ls.surface), meets(3.0));
    });
  });

  group('Kontras teks — mode gelap (≥ 4.5:1)', () {
    final pairs = <String, (Color, Color)>{
      'onSurface / surface': (ds.onSurface, ds.surface),
      'onSurfaceVariant / surface': (ds.onSurfaceVariant, ds.surface),
      'onPrimary / primary': (ds.onPrimary, ds.primary),
      'onPrimaryContainer / primaryContainer':
          (ds.onPrimaryContainer, ds.primaryContainer),
      'onSecondaryContainer / secondaryContainer':
          (ds.onSecondaryContainer, ds.secondaryContainer),
      'onTertiaryContainer / tertiaryContainer':
          (ds.onTertiaryContainer, ds.tertiaryContainer),
      'onError / error': (ds.onError, ds.error),
      'onErrorContainer / errorContainer':
          (ds.onErrorContainer, ds.errorContainer),
      'error / surface (ikon & teks)': (ds.error, ds.surface),
      'success varian gelap / surface':
          (AppTheme.successOnDark, ds.surface),
      'warning varian gelap / surface':
          (AppTheme.warningOnDark, ds.surface),
      'primary / surface (ikon)': (ds.primary, ds.surface),
      'successContainer / onSuccessContainer':
          (AppTheme.successContainer, AppTheme.onSuccessContainer),
      'warningContainer / onWarningContainer':
          (AppTheme.warningContainer, AppTheme.onWarningContainer),
      'errorContainer / onErrorContainer':
          (AppTheme.errorContainerDark, AppTheme.onErrorContainerDark),
      'onSurface / latar kartu level':
          (ds.onSurface, AppTheme.levelBg(Brightness.dark)),
      'onSurfaceVariant / latar kartu level':
          (ds.onSurfaceVariant, AppTheme.levelBg(Brightness.dark)),
    };

    pairs.forEach((name, pair) {
      test(name, () {
        expect(contrastRatio(pair.$1, pair.$2), meets(4.5), reason: name);
      });
    });

    test('outline / surface (border & ikon) ≥ 3:1', () {
      expect(contrastRatio(ds.outline, ds.surface), meets(3.0));
    });
  });

  group('Gradien kartu statistik (iuran)', () {
    void check(Gradient gradient, String label) {
      final colors = (gradient as LinearGradient).colors;
      for (final color in colors) {
        expect(contrastRatio(AppTheme.onStatGradient, color), meets(4.5),
            reason: '$label — putih di atas ${color.toARGB32().toRadixString(16)}');
      }
    }

    test('mode terang: putih lolos di kedua ujung', () {
      check(AppTheme.statGradientLight, 'statGradientLight');
      expect(light.brightness, Brightness.light);
      check(AppTheme.statGradient(Brightness.light), 'statGradient(terang)');
    });

    test('mode gelap: putih lolos di kedua ujung', () {
      check(AppTheme.statGradientDark, 'statGradientDark');
      check(AppTheme.statGradient(Brightness.dark), 'statGradient(gelap)');
    });
  });
}
