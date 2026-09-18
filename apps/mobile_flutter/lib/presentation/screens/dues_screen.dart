import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/due.dart';
import '../../logic/dues/dues_bloc.dart';
import '../widgets/app_bar_icon_title.dart';
import '../widgets/app_loading_spinner.dart';
import '../widgets/due_item_card.dart';

class DuesScreen extends StatefulWidget {
  const DuesScreen({super.key});

  @override
  State<DuesScreen> createState() => _DuesScreenState();
}

class _DuesScreenState extends State<DuesScreen> {
  @override
  void initState() {
    super.initState();
    final state = context.read<DuesBloc>().state;
    if (state is! DuesLoaded && state is! DuesLoading) {
      context.read<DuesBloc>().add(const DuesLoadRequested());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const AppBarIconTitle(
          icon: Icons.account_balance_wallet_outlined,
          title: 'Status Iuran',
        ),
      ),
      body: BlocBuilder<DuesBloc, DuesState>(
        builder: (context, state) {
          if (state is DuesLoading) {
            return const AppLoadingSpinner();
          }
          if (state is DuesError) {
            return _Error(message: state.message);
          }
          if (state is! DuesLoaded) {
            return const Center(child: Text('Belum ada data iuran'));
          }
          final dues = state.dues;
          final lunas = dues.where((d) => _isPaid(d.status)).length;
          return Column(
            children: [
              _SummaryBar(total: dues.length, lunas: lunas),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: () async =>
                      context.read<DuesBloc>().add(const DuesLoadRequested()),
                  child: dues.isEmpty
                      ? ListView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          children: const [
                            SizedBox(height: 120),
                            Center(child: Text('Tidak ada data iuran')),
                          ],
                        )
                      : ListView.builder(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.all(12),
                          itemCount: dues.length,
                          itemBuilder: (context, i) => DueItemCard(
                            due: dues[i],
                            onTap: () => _showDueDetail(context, dues[i]),
                          ),
                        ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  bool _isPaid(String status) {
    return status.toLowerCase().contains('lunas') ||
        status.toLowerCase() == 'paid';
  }

  /// Buka detail iuran (bottom sheet) — dipanggil dari `DueItemCard.onTap`.
  void _showDueDetail(BuildContext context, Due due) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Detail Iuran ${due.periode}',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppTheme.navy)),
              const SizedBox(height: 12),
              _row('Status', due.status),
              _row('Jumlah', Formatters.rupiah(due.jumlah)),
              _row('Tanggal Jatuh Tempo',
                  Formatters.dateLong(due.tanggalJatuhTempo)),
              _row(
                  'Tanggal Bayar',
                  due.tanggalBayar != null
                      ? Formatters.dateLong(due.tanggalBayar)
                      : '-'),
              const SizedBox(height: 12),
              _ProofSection(due: due),
            ],
          ),
        ),
      ),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
              width: 140,
              child: Text(label,
                  style: const TextStyle(fontSize: 13, color: AppTheme.textMuted))),
          Expanded(
            child: Text(value,
                style:
                    const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }
}

class _SummaryBar extends StatelessWidget {
  final int total;
  final int lunas;
  const _SummaryBar({required this.total, required this.lunas});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      margin: const EdgeInsets.all(12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [theme.colorScheme.primary, theme.colorScheme.primaryContainer],
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _stat(theme, 'Total Iuran', '$total'),
          _stat(theme, 'Lunas', '$lunas'),
          _stat(theme, 'Belum Lunas', '${total - lunas}'),
        ],
      ),
    );
  }

  Widget _stat(ThemeData theme, String label, String value) {
    return Column(
      children: [
        Text(value,
            style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: theme.colorScheme.onPrimary)),
        Text(label,
            style: TextStyle(
                fontSize: 11,
                color: theme.colorScheme.onPrimary.withValues(alpha: 0.8))),
      ],
    );
  }
}

/// Bagian "Bukti Pembayaran" pada detail iuran — menampilkan gambar bukti dari
/// `iuran.buktiBayarPath` (mis. `/api/uploads/proofs/...`). Tap gambar membuka
/// viewer layar penuh (zoom). Tanpa bukti → placeholder sesuai status.
class _ProofSection extends StatelessWidget {
  final Due due;
  const _ProofSection({required this.due});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final url = due.buktiUrl;
    final paid = due.status.toLowerCase().contains('lunas') ||
        due.status.toLowerCase() == 'paid';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Divider(),
        const SizedBox(height: 8),
        Row(children: [
          Icon(Icons.receipt_long_outlined,
              size: 18, color: theme.colorScheme.primary),
          const SizedBox(width: 6),
          Text('Bukti Pembayaran',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: theme.colorScheme.onSurface)),
        ]),
        const SizedBox(height: 10),
        if (url.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: theme.colorScheme.outlineVariant),
            ),
            child: Row(children: [
              Icon(Icons.image_not_supported_outlined,
                  size: 18, color: theme.colorScheme.onSurfaceVariant),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  paid
                      ? 'Pembayaran dicatat manual (tanpa bukti unggah).'
                      : 'Belum ada bukti pembayaran yang diunggah.',
                  style: TextStyle(fontSize: 13, color: theme.colorScheme.onSurfaceVariant),
                ),
              ),
            ]),
          )
        else
          GestureDetector(
            onTap: () => _openViewer(context, url),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: AspectRatio(
                aspectRatio: 4 / 3,
                child: CachedNetworkImage(
                  imageUrl: url,
                  fit: BoxFit.cover,
                  placeholder: (_, __) => Container(
                    color: theme.colorScheme.surfaceContainerHighest,
                    child: const Center(child: AppLoadingSpinner.small()),
                  ),
                  errorWidget: (_, __, ___) => Container(
                    color: theme.colorScheme.surfaceContainerHighest,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.broken_image_outlined,
                            size: 28, color: theme.colorScheme.onSurfaceVariant),
                        const SizedBox(height: 4),
                        Text('Gambar tidak dapat dimuat',
                            style: TextStyle(
                                fontSize: 12, color: theme.colorScheme.onSurfaceVariant)),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        if (url.isNotEmpty) ...[
          const SizedBox(height: 8),
          Center(
            child: Text('Ketuk untuk melihat ukuran penuh',
                style:
                    TextStyle(fontSize: 11, color: theme.colorScheme.onSurfaceVariant)),
          ),
        ],
      ],
    );
  }

  void _openViewer(BuildContext context, String url) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => _ProofViewerScreen(url: url)),
    );
  }
}

/// Viewer layar penuh (latar gelap, zoom) untuk gambar bukti pembayaran.
class _ProofViewerScreen extends StatelessWidget {
  final String url;
  const _ProofViewerScreen({required this.url});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: const Text('Bukti Pembayaran'),
      ),
      body: Center(
        child: InteractiveViewer(
          maxScale: 5,
          minScale: 0.8,
          child: CachedNetworkImage(
            imageUrl: url,
            fit: BoxFit.contain,
            placeholder: (_, __) =>
                const Center(child: AppLoadingSpinner.small(color: Colors.white)),
            errorWidget: (_, __, ___) => const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.broken_image_outlined,
                      size: 48, color: Colors.white54),
                  SizedBox(height: 12),
                  Text('Gambar tidak dapat dimuat',
                      style: TextStyle(color: Colors.white70)),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Error extends StatelessWidget {
  final String message;
  const _Error({required this.message});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 48, color: theme.colorScheme.error),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center, style: TextStyle(color: theme.colorScheme.onSurface)),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () =>
                  context.read<DuesBloc>().add(const DuesLoadRequested()),
              child: const Text('Coba Lagi'),
            ),
          ],
        ),
      ),
    );
  }
}