import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// Skeleton loading (shimmer) yang reusable — pengganti [AppLoadingSpinner]
/// untuk daftar/konten agar pengguna melihat "denyin" tata letak akhir
/// alih-alih lingkaran berputar abstrak.
///
/// Gaya: blok abu lembut dengan gradien yang bergerak dari kiri ke kanan
/// (mirip shimmer Facebook/Skeleton Material 3). Mendukung tema gelap
/// secara otomatis melalui `colorScheme.surfaceContainerHighest`.
///
/// Komponen:
/// - [SkeletonLine] — satu batang teks (tinggi & lebar diatur).
/// - [SkeletonBox] — blok persegi panjang dengan radius konfigurable.
/// - [SkeletonCircle] — lingkaran (mis. untuk avatar/ikon).
/// - [SkeletonTile] — satu baris daftar lengkap (avatar + 2 baris teks).
/// - [SkeletonCard] — kartu dengan header, gambar, dan beberapa baris teks.
/// - [SkeletonList] — daftar [SkeletonTile] yang berulang.
/// - [SkeletonNotificationList] — khusus layar notifikasi.
///
/// Contoh pemakaian:
/// ```dart
/// if (state is NotificationLoading) return const SkeletonNotificationList();
/// ```

/// Warna dasar shimmer untuk tema terang/gelap.
class _SkeletonColors {
  const _SkeletonColors({
    required this.base,
    required this.highlight,
  });

  final Color base;
  final Color highlight;

  static _SkeletonColors of(BuildContext context) {
    final brightness = Theme.of(context).brightness;
    final scheme = Theme.of(context).colorScheme;
    if (brightness == Brightness.dark) {
      return _SkeletonColors(
        base: scheme.surfaceContainerHighest.withValues(alpha: 0.55),
        highlight: scheme.surfaceContainerLow.withValues(alpha: 0.65),
      );
    }
    return _SkeletonColors(
      base: scheme.surfaceContainerHighest,
      highlight: scheme.surface,
    );
  }
}

/// Animasi gradien shimmer yang dibagikan agar tidak membuat controller
/// baru untuk setiap blok.
class _ShimmerEffect extends StatefulWidget {
  final Widget child;

  const _ShimmerEffect({required this.child});

  @override
  State<_ShimmerEffect> createState() => _ShimmerEffectState();
}

class _ShimmerEffectState extends State<_ShimmerEffect>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = _SkeletonColors.of(context);
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        // Geser posisi gradien -1.0 → 2.0 (lebar 3x agar halus).
        final t = _controller.value * 3 - 1;
        return ShaderMask(
          shaderCallback: (bounds) {
            return LinearGradient(
              begin: Alignment(t - 0.6, 0),
              end: Alignment(t + 0.6, 0),
              colors: [
                colors.base,
                colors.highlight,
                colors.base,
              ],
              stops: const [0.0, 0.5, 1.0],
            ).createShader(bounds);
          },
          child: child!,
        );
      },
      child: widget.child,
    );
  }
}

/// Satu batang "teks" skeleton.
class SkeletonLine extends StatelessWidget {
  final double width;
  final double height;
  final double radius;

  const SkeletonLine({
    super.key,
    this.width = double.infinity,
    this.height = 12,
    this.radius = 6,
  });

  @override
  Widget build(BuildContext context) {
    return SkeletonBox(width: width, height: height, radius: radius);
  }
}

/// Blok skeleton serbaguna.
class SkeletonBox extends StatelessWidget {
  final double width;
  final double height;
  final double radius;

  const SkeletonBox({
    super.key,
    this.width = double.infinity,
    required this.height,
    this.radius = AppTheme.space8,
  });

  @override
  Widget build(BuildContext context) {
    final colors = _SkeletonColors.of(context);
    return _ShimmerEffect(
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: colors.base,
          borderRadius: BorderRadius.circular(radius),
        ),
      ),
    );
  }
}

/// Lingkaran skeleton (avatar / ikon).
class SkeletonCircle extends StatelessWidget {
  final double size;

  const SkeletonCircle({super.key, this.size = 44});

  @override
  Widget build(BuildContext context) {
    final colors = _SkeletonColors.of(context);
    return _ShimmerEffect(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: colors.base,
          shape: BoxShape.circle,
        ),
      ),
    );
  }
}

/// Satu baris daftar tipe ListTile (avatar + judul + subjudul).
class SkeletonTile extends StatelessWidget {
  final bool leadingCircle;

  const SkeletonTile({super.key, this.leadingCircle = true});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppTheme.space16,
        vertical: AppTheme.space12,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (leadingCircle) const SkeletonCircle(size: 44),
          if (leadingCircle) const SizedBox(width: AppTheme.space12),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SkeletonLine(height: 14, width: 180),
                SizedBox(height: AppTheme.space8),
                SkeletonLine(height: 11, width: 120),
                SizedBox(height: AppTheme.space8),
                SkeletonLine(height: 11, width: 80),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Kartu skeleton untuk berita / dokumen / feed.
class SkeletonCard extends StatelessWidget {
  final bool withImage;

  const SkeletonCard({super.key, this.withImage = true});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: AppTheme.space12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppTheme.space12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppTheme.space12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                SkeletonCircle(size: 32),
                SizedBox(width: AppTheme.space8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SkeletonLine(height: 11, width: 100),
                      SizedBox(height: AppTheme.space4),
                      SkeletonLine(height: 9, width: 60),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppTheme.space12),
            if (withImage) ...[
              const SkeletonBox(
                height: 140,
                radius: AppTheme.space8,
              ),
              const SizedBox(height: AppTheme.space12),
            ],
            const SkeletonLine(height: 14, width: 220),
            const SizedBox(height: AppTheme.space8),
            const SkeletonLine(height: 11),
            const SizedBox(height: AppTheme.space4),
            const SkeletonLine(height: 11, width: 260),
          ],
        ),
      ),
    );
  }
}

/// Daftar baris [SkeletonTile].
class SkeletonList extends StatelessWidget {
  final int itemCount;
  final bool leadingCircle;

  const SkeletonList({
    super.key,
    this.itemCount = 6,
    this.leadingCircle = true,
  });

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(vertical: AppTheme.space8),
      itemCount: itemCount,
      itemBuilder: (context, index) => SkeletonTile(
        leadingCircle: leadingCircle,
      ),
    );
  }
}

/// Khusus layar Notifikasi: avatar kotak bulat + 2 baris.
class SkeletonNotificationList extends StatelessWidget {
  final int itemCount;

  const SkeletonNotificationList({super.key, this.itemCount = 6});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.all(AppTheme.space12),
      itemCount: itemCount,
      itemBuilder: (context, index) => Card(
        margin: const EdgeInsets.only(bottom: AppTheme.space8),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTheme.space12),
        ),
        child: const Padding(
          padding: EdgeInsets.all(AppTheme.space16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SkeletonBox(
                width: 40,
                height: 40,
                radius: AppTheme.space8,
              ),
              SizedBox(width: AppTheme.space12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SkeletonLine(height: 13, width: 200),
                    SizedBox(height: AppTheme.space8),
                    SkeletonLine(height: 11, width: 160),
                    SizedBox(height: AppTheme.space8),
                    SkeletonLine(height: 10, width: 70),
                  ],
                ),
              ),
              SkeletonBox(
                width: 8,
                height: 8,
                radius: 4,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Grid skeleton untuk KTA / badge gamifikasi.
class SkeletonGrid extends StatelessWidget {
  final int itemCount;
  final double aspectRatio;

  const SkeletonGrid({
    super.key,
    this.itemCount = 6,
    this.aspectRatio = 1.0,
  });

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.all(AppTheme.space16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: AppTheme.space12,
        crossAxisSpacing: AppTheme.space12,
        childAspectRatio: 1.0,
      ),
      itemCount: itemCount,
      itemBuilder: (context, index) => const SkeletonBox(
        radius: AppTheme.space12,
        height: 120,
      ),
    );
  }
}
