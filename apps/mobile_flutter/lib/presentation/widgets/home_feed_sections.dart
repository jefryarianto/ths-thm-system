import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../core/constants/app_constants.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/berita.dart';
import '../../data/models/kegiatan.dart';
import '../../logic/home_feed/home_feed_bloc.dart';

/// Section "Agenda" beranda — daftar vertikal kartu kompak dari data nyata
/// `GET /public/activities` (model [Kegiatan]).
///
/// Kartu dibuat **sama formatnya dengan kartu berita** (thumbnail kiri +
/// Expanded teks) agar konsisten, dan **bisa diklik** menuju
/// `/kegiatan/:id` (detail kegiatan).
class AgendaSection extends StatelessWidget {
  const AgendaSection({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<HomeFeedBloc, HomeFeedState>(
      builder: (context, state) {
        final kegiatan = switch (state) {
          HomeFeedLoaded(:final kegiatan) =>
            kegiatan.where((k) => kegiatanTampil(k.status)).toList(),
          _ => const <Kegiatan>[],
        };
        if (kegiatan.isEmpty) return const SizedBox.shrink();

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(left: 16, bottom: 10),
              child: Text('Agenda',
                  style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color:
                          Theme.of(context).textTheme.headlineSmall?.color)),
            ),
            ...kegiatan.map((k) => Padding(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 4),
                  child: _AgendaCard(kegiatan: k),
                )),
          ],
        );
      },
    );
  }
}

/// Kartu agenda kompak — format sama dengan kartu berita:
/// kotak tanggal PRIMARY (persegi 84x72) di kiri + nama/ringkas di kanan,
/// dibungkus [InkWell] agar bisa diklik menuju detail kegiatan.
class _AgendaCard extends StatelessWidget {
  final Kegiatan kegiatan;

  const _AgendaCard({required this.kegiatan});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => context.push<void>('/kegiatan/${kegiatan.id}'),
      borderRadius: BorderRadius.circular(14),
      child: Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: AppTheme.lightSurface,
          borderRadius: BorderRadius.circular(14),
          boxShadow: AppTheme.softShadow(),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Kotak tanggal PRIMARY kiri — memakai dimensi thumbnail berita.
            Container(
              width: 84,
              height: 72,
              color: AppTheme.primary,
              alignment: Alignment.center,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(kegiatan.bulanSingkat,
                      style: const TextStyle(
                          color: AppTheme.onPrimary,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.5)),
                  Text(kegiatan.tanggalAngka,
                      style: const TextStyle(
                          color: AppTheme.onPrimary,
                          fontSize: 20,
                          fontWeight: FontWeight.w900)),
                ],
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.calendar_today, size: 14, color: AppTheme.textMuted),
                        const SizedBox(width: 4),
                        Text(kegiatan.nama,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                height: 1.25,
                                color: AppTheme.navy)),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(kegiatan.ringkas,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 11, color: AppTheme.textMuted)),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Section "Berita" beranda: feed vertikal kartu putih dari data nyata
/// `GET /public/berita` (model [Berita]).
class BeritaFeedSection extends StatelessWidget {
  const BeritaFeedSection({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<HomeFeedBloc, HomeFeedState>(
      builder: (context, state) {
        final berita = switch (state) {
          HomeFeedLoaded(:final berita) => berita,
          _ => const <Berita>[],
        };
        if (berita.isEmpty) return const SizedBox.shrink();

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(left: 16, bottom: 10),
              child: Text('Berita',
                  style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color:
                          Theme.of(context).textTheme.headlineSmall?.color)),
            ),
            ...berita.map((b) => Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  child: _BeritaCard(berita: b),
                )),
          ],
        );
      },
    );
  }
}

/// Kartu berita: thumbnail kiri + judul/ringkasan kanan.
class _BeritaCard extends StatelessWidget {
  final Berita berita;

  const _BeritaCard({required this.berita});

  /// API mengembalikan nama file relatif (`berita-*.jpg`); file disajikan
  /// publik di `{baseUrl}/uploads/...` (lihat setupStaticUploads).
  bool get _hasGambar => berita.gambar != null && berita.gambar!.isNotEmpty;

  String get _gambarUrl {
    final raw = berita.gambar!;
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    return '${AppConstants.baseUrl}/uploads/$raw';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: () => context.push<void>('/berita/${berita.slug}'),
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: theme.cardColor,
          borderRadius: BorderRadius.circular(14),
          boxShadow: AppTheme.softShadow(),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: Container(
                width: 84,
                height: 72,
                color: theme.colorScheme.surfaceContainerHighest,
                alignment: Alignment.center,
                child: _hasGambar
                    ? Image.network(
                        _gambarUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Icon(
                            Icons.article_outlined,
                            color: theme.colorScheme.onSurfaceVariant),
                      )
                    : Icon(Icons.article_outlined,
                        color: theme.colorScheme.onSurfaceVariant),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.article_outlined, size: 14, color: theme.colorScheme.onSurfaceVariant),
                      const SizedBox(width: 4),
                      Text(berita.judul,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                            height: 1.25,
                          )),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${berita.tanggal.day} ${_bulan(berita.tanggal.month)}',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  static String _bulan(int m) => const [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'Mei',
        'Jun',
        'Jul',
        'Agu',
        'Sep',
        'Okt',
        'Nov',
        'Des',
      ][m - 1];
}