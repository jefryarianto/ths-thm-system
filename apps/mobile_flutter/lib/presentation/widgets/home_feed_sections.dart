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

  static const _gold = Color(0xFFB8860B);

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
/// kotak tanggal EMAS (persegi 84x72) di kiri + nama/ringkas di kanan,
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
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          boxShadow: const [
            BoxShadow(
                color: Color(0x14000000), blurRadius: 8, offset: Offset(0, 2)),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Kotak tanggal EMAS kiri — memakai dimensi thumbnail berita.
            Container(
              width: 84,
              height: 72,
              color: AgendaSection._gold,
              alignment: Alignment.center,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(kegiatan.bulanSingkat,
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.5)),
                  Text(kegiatan.tanggalAngka,
                      style: const TextStyle(
                          color: Colors.white,
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
                        Icon(Icons.calendar_today, size: 14, color: Color(0xFF607D8F)),
                        const SizedBox(width: 4),
                        Text(kegiatan.nama,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                height: 1.25,
                                color: Color(0xFF3E2F1D))),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(kegiatan.ringkas,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 11, color: Color(0xFF8A7A66))),
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
    return InkWell(
      onTap: () => context.push<void>('/berita/${berita.slug}'),
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          boxShadow: const [
            BoxShadow(
                color: Color(0x0F000000), blurRadius: 6, offset: Offset(0, 2)),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: Container(
                width: 84,
                height: 72,
                color: const Color(0xFFF0E8DB),
                alignment: Alignment.center,
                child: _hasGambar
                    ? Image.network(
                        _gambarUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => const Icon(
                            Icons.article_outlined,
                            color: Color(0xFFB0A85C)),
                      )
                    : const Icon(Icons.article_outlined,
                        color: Color(0xFFB0A85C)),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
Row(
                      children: [
                        Icon(Icons.article_outlined, size: 14, color: Color(0xFF607D8F)),
                        const SizedBox(width: 4),
                        Text(berita.judul,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                height: 1.25,
                                color: AppTheme.textSlate)),
                      ],
                    ),
                    const SizedBox(height: 4),
                  Text(
                    '${berita.tanggal.day} ${_bulan(berita.tanggal.month)}',
                    style:
                        const TextStyle(fontSize: 11, color: Color(0xFF8A7A66)),
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
