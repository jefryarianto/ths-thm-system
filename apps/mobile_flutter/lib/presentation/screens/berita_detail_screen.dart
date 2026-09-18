import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';

import '../../core/api/api_client.dart';
import '../../core/constants/app_constants.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/berita.dart';
import '../widgets/app_loading_spinner.dart';

/// Detail berita — mengambil konten lengkap dari `GET /public/berita/:slug`
/// (publik, tidak butuh login) dan merender judul, tanggal, gambar,
/// ringkasan, serta isi berita (HTML) di dalam aplikasi.
class BeritaDetailScreen extends StatefulWidget {
  final String slug;

  /// Fetcher opsional untuk testing — `null` menggunakan [ApiClient] asli.
  final Future<Response> Function(String slug)? fetch;

  const BeritaDetailScreen({super.key, required this.slug, this.fetch});

  @override
  State<BeritaDetailScreen> createState() => _BeritaDetailScreenState();
}

class _BeritaDetailScreenState extends State<BeritaDetailScreen> {
  bool _loading = true;
  String? _error;
  Berita? _berita;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await (widget.fetch != null
          ? widget.fetch!(widget.slug)
          : ApiClient().dio.get(AppConstants.publicBeritaBySlug(widget.slug)));
      final data = res.data is Map<String, dynamic>
          ? (res.data as Map<String, dynamic>)['data']
          : null;
      if (data == null || data is! Map) {
        throw Exception('Berita tidak ditemukan');
      }
      setState(() {
        _berita = Berita.fromJson(data as Map<String, dynamic>);
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = ApiClient().messageFromError(e);
      });
    }
  }

  String get _gambarUrl {
    final raw = _berita?.gambar;
    if (raw == null || raw.isEmpty) return '';
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    return '${AppConstants.baseUrl}/uploads/$raw';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Berita')),
      body: _loading
          ? const AppLoadingSpinner()
          : _error != null
              ? _CenterRetry(message: _error!, onRetry: _load)
              : _body(),
    );
  }

  Widget _body() {
    final berita = _berita!;
    final theme = Theme.of(context);
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      children: [
        Text(
          berita.judul,
          style: theme.textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.w800,
            height: 1.3,
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Icon(Icons.calendar_today_outlined,
                size: 14, color: theme.colorScheme.onSurfaceVariant),
            const SizedBox(width: 6),
            Text(
              Formatters.dateLong(berita.tanggal.toIso8601String()),
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
        if (berita.ringkasan.isNotEmpty) ...[
          const SizedBox(height: 14),
          Text(
            berita.ringkasan,
            style: theme.textTheme.bodyLarge?.copyWith(
              fontWeight: FontWeight.w600,
              height: 1.5,
            ),
          ),
        ],
        if (_gambarUrl.isNotEmpty) ...[
          const SizedBox(height: 14),
          ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: Image.network(
              _gambarUrl,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                height: 160,
                color: theme.colorScheme.surfaceContainerHighest,
                alignment: Alignment.center,
                child: Icon(Icons.article_outlined,
                    color: theme.colorScheme.onSurfaceVariant, size: 40),
              ),
            ),
          ),
        ],
        if (berita.konten.isNotEmpty) ...[
          const SizedBox(height: 14),
          Html(
            data: berita.konten,
            style: {
              'body': Style(
                margin: Margins.zero,
                padding: HtmlPaddings.zero,
                fontSize: FontSize(14.5),
                lineHeight: const LineHeight(1.6),
                color: theme.textTheme.bodyMedium?.color,
              ),
            },
            shrinkWrap: true,
          ),
        ],
      ],
    );
  }
}

class _CenterRetry extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _CenterRetry({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.error_outline, size: 48, color: theme.colorScheme.error),
          const SizedBox(height: 12),
          Text(message, style: TextStyle(color: theme.colorScheme.onSurfaceVariant)),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh),
            label: const Text('Coba lagi'),
          ),
        ],
      ),
    );
  }
}