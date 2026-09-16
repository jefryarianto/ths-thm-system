import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/constants/app_constants.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/berita.dart';
import '../../data/models/kegiatan.dart';
import '../../logic/home_feed/home_feed_bloc.dart';

/// Section "Agenda" beranda: kartu horizontal dengan kotak tanggal EMAS
/// di atas, dari data nyata `GET /activities` (model [Kegiatan]).
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
                      color: Theme.of(context).textTheme.headlineSmall?.color)),
            ),
            SizedBox(
              height: 170,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: kegiatan.length,
                separatorBuilder: (_, __) => const SizedBox(width: 12),
                itemBuilder: (context, i) => _AgendaCard(kegiatan: kegiatan[i]),
              ),
            ),
          ],
        );
      },
    );
  }
}

/// Kartu agenda: kotak tanggal emas di atas + nama + ringkasan lokasi/tanggal.
class _AgendaCard extends StatelessWidget {
  final Kegiatan kegiatan;

  const _AgendaCard({required this.kegiatan});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 150,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: const [
          BoxShadow(
              color: Color(0x14000000), blurRadius: 8, offset: Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            color: AgendaSection._gold,
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Column(
              children: [
                Text(kegiatan.bulanSingkat,
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.5)),
                Text(kegiatan.tanggalAngka,
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.w900)),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(kegiatan.nama,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        height: 1.2,
                        color: AppTheme.textSlate)),
                const SizedBox(height: 6),
                Text(kegiatan.ringkas,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 11, color: Color(0xFF6F5330))),
              ],
            ),
          ),
        ],
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
                      color: Theme.of(context).textTheme.headlineSmall?.color)),
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
    return Container(
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
                Text(berita.judul,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        height: 1.25,
                        color: AppTheme.textSlate)),
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
