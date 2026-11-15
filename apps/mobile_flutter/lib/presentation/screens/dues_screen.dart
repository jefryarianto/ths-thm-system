import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/utils/formatters.dart';
import '../../core/utils/snack_bar_helper.dart';
import '../../data/models/bank_info.dart';
import '../../data/models/due.dart';
import '../../logic/dues/dues_bloc.dart';
import '../widgets/app_bar_icon_title.dart';
import '../widgets/app_loading_spinner.dart';
import '../widgets/dues/bank_info_card.dart';
import '../widgets/dues/due_list_widget.dart';
import '../widgets/dues/dues_summary_card.dart';
import '../widgets/state_views.dart';

class DuesScreen extends StatefulWidget {
  const DuesScreen({super.key});

  @override
  State<DuesScreen> createState() => _DuesScreenState();
}

class _DuesScreenState extends State<DuesScreen> {
  final _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    final state = context.read<DuesBloc>().state;
    if (state is! DuesLoaded && state is! DuesLoading) {
      context.read<DuesBloc>().add(const DuesLoadRequested());
    }
  }

  bool _isPaid(String status) {
    final s = status.toLowerCase();
    return s.contains('lunas') || s == 'paid';
  }

  Future<void> _pickAndUploadProof(Due due) async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (sheetContext) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 12),
            const Text(
              'Unggah Bukti Pembayaran',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            ListTile(
              leading: Icon(Icons.photo_camera_outlined,
                  color: Theme.of(sheetContext).colorScheme.primary),
              title: const Text('Ambil Foto (Kamera)',
                  style: TextStyle(fontWeight: FontWeight.w600)),
              onTap: () => Navigator.of(sheetContext).pop(ImageSource.camera),
            ),
            ListTile(
              leading: Icon(Icons.photo_library_outlined,
                  color: Theme.of(sheetContext).colorScheme.primary),
              title: const Text('Pilih dari Galeri',
                  style: TextStyle(fontWeight: FontWeight.w600)),
              onTap: () => Navigator.of(sheetContext).pop(ImageSource.gallery),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );

    if (source == null || !mounted) return;

    try {
      final picked = await _picker.pickImage(
        source: source,
        maxWidth: 1600,
        maxHeight: 1600,
        imageQuality: 85,
      );

      if (picked == null || !mounted) return;

      context.read<DuesBloc>().add(
            DuesUploadProofRequested(
              iuranId: due.id,
              filePath: picked.path,
            ),
          );
    } catch (e) {
      if (mounted) {
        showCenteredSnackBar(context, 'Gagal memilih gambar: $e');
      }
    }
  }

  void _showDueDetail(Due due, List<dynamic>? bankInfos) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => _DueDetailSheet(
        due: due,
        bankInfos: bankInfos,
        onUpload: () {
          Navigator.of(ctx).pop();
          _pickAndUploadProof(due);
        },
      ),
    );
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
      body: BlocConsumer<DuesBloc, DuesState>(
        listener: (context, state) {
          if (state is DuesProofUploadSuccess) {
            showCenteredSnackBar(context, state.message);
          } else if (state is DuesError) {
            showCenteredSnackBar(context, state.message);
          }
        },
        builder: (context, state) {
          if (state is DuesLoading) {
            return const Center(child: AppLoadingSpinner());
          }
          if (state is DuesError && state is! DuesLoaded) {
            return ErrorStateView(
              message: state.message,
              onRetry: () =>
                  context.read<DuesBloc>().add(const DuesLoadRequested()),
            );
          }

          final List<Due> dues;
          LockStatus? lockStatus;
          List<dynamic>? bankInfos;

          if (state is DuesLoaded) {
            dues = state.dues;
            lockStatus = state.lockStatus;
            bankInfos = state.bankInfos;
          } else if (state is DuesProofUploading) {
            dues = state.dues;
          } else if (state is DuesProofUploadSuccess) {
            dues = state.dues;
          } else {
            dues = [];
          }

          final unpaid = dues.where((d) => !_isPaid(d.status)).toList();
          final hasUnpaid = unpaid.isNotEmpty;
          final unpaidSum = unpaid.fold<double>(0, (s, d) => s + d.jumlah);
          final isLocked = lockStatus?.isLocked == true;

          return RefreshIndicator(
            onRefresh: () async =>
                context.read<DuesBloc>().add(const DuesLoadRequested()),
            child: CustomScrollView(
              slivers: [
                // Lock Banner (apabila akun terkunci karena iuran)
                if (isLocked && lockStatus != null)
                  SliverToBoxAdapter(
                    child: _LockBanner(lockStatus: lockStatus),
                  ),

                // Overdue warning banner
                if (hasUnpaid)
                  SliverToBoxAdapter(
                    child: _OverdueBanner(
                      unpaidCount: unpaid.length,
                      unpaidSum: unpaidSum,
                      onTap: () => _showDueDetail(unpaid.first, bankInfos),
                    ),
                  ),

                // Ringkasan statistik iuran
                const SliverToBoxAdapter(
                  child: DuesSummaryCard(
                    expanded: true,
                    onToggle: _noop,
                  ),
                ),

                // Kartu Rekening Tujuan & QRIS
                const SliverToBoxAdapter(
                  child: BankInfoCard(),
                ),

                // Header daftar iuran
                SliverToBoxAdapter(
                  child: DueListWidget(
                    onTap: (due) => _showDueDetail(due, bankInfos),
                    onUpload: (due) => _pickAndUploadProof(due),
                  ),
                ),

                const SliverToBoxAdapter(
                  child: SizedBox(height: 32),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

void _noop() {}

/// Banner peringatan lock iuran
class _LockBanner extends StatelessWidget {
  final LockStatus lockStatus;

  const _LockBanner({required this.lockStatus});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isOverride = lockStatus.gracePeriodType == 'override';
    final isExtended = lockStatus.gracePeriodType == 'extended';

    final Color bannerColor = isOverride
        ? Colors.red
        : isExtended
            ? Colors.orange
            : Colors.amber.shade800;

    final String title = isOverride
        ? 'Akun Dibatasi (Lock Aktif)'
        : 'Peringatan Jatuh Tempo Iuran';

    final String subtitle = isOverride
        ? 'Fitur dibekukan sementara. Segera lakukan pembayaran untuk membuka akses.'
        : isExtended
            ? 'Masa tenggang diperpanjang: ${lockStatus.graceDaysRemaining} hari lagi.'
            : 'Masa tenggang: ${lockStatus.graceDaysRemaining} hari sebelum fitur dibekukan.';

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: bannerColor.withValues(alpha: 0.1),
        border: Border.all(color: bannerColor.withValues(alpha: 0.35)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.lock_clock_outlined, color: bannerColor, size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: bannerColor,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurface,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Banner tunggakan iuran
class _OverdueBanner extends StatelessWidget {
  final int unpaidCount;
  final double unpaidSum;
  final VoidCallback onTap;

  const _OverdueBanner({
    required this.unpaidCount,
    required this.unpaidSum,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                theme.colorScheme.error,
                theme.colorScheme.error.withValues(alpha: 0.85),
              ],
            ),
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: theme.colorScheme.error.withValues(alpha: 0.3),
                blurRadius: 8,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.warning_amber_rounded,
                    color: Colors.white, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '$unpaidCount iuran belum lunas',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Total: ${Formatters.rupiah(unpaidSum)} — ketuk untuk bayar',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.9),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: Colors.white, size: 28),
            ],
          ),
        ),
      ),
    );
  }
}

/// Bottom Sheet Detail Iuran + Upload Bukti Bayar
class _DueDetailSheet extends StatelessWidget {
  final Due due;
  final List<dynamic>? bankInfos;
  final VoidCallback onUpload;

  const _DueDetailSheet({
    required this.due,
    this.bankInfos,
    required this.onUpload,
  });

  bool get _isPaid =>
      due.status.toLowerCase().contains('lunas') ||
      due.status.toLowerCase() == 'paid';

  Color _getStatusColor(String status) {
    final s = status.toLowerCase();
    if (s.contains('lunas') || s == 'paid') return Colors.green;
    if (s.contains('menunggu') || s.contains('pending')) return Colors.orange;
    if (s.contains('menunggak')) return Colors.red;
    return Colors.grey;
  }

  String _getStatusLabel(String status) {
    final s = status.toLowerCase();
    if (s.contains('lunas') || s == 'paid') return 'Lunas';
    if (s.contains('menunggu') || s.contains('pending')) {
      return 'Menunggu Verifikasi';
    }
    if (s.contains('menunggak')) return 'Menunggak';
    if (s.contains('belum')) return 'Belum Lunas';
    return status;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final statusColor = _getStatusColor(due.status);

    return DraggableScrollableSheet(
      initialChildSize: 0.75,
      maxChildSize: 0.95,
      minChildSize: 0.4,
      expand: false,
      builder: (context, scrollController) => Container(
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: ListView(
          controller: scrollController,
          padding: const EdgeInsets.all(20),
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: theme.colorScheme.onSurfaceVariant
                      .withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

            // Header periode & nominal
            Row(
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: statusColor.withValues(alpha: 0.12),
                  child: Icon(
                    _isPaid ? Icons.check_circle : Icons.pending_outlined,
                    color: statusColor,
                    size: 26,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Iuran Periode ${due.periode}',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(
                        Formatters.rupiah(due.jumlah),
                        style: theme.textTheme.headlineSmall?.copyWith(
                          color: theme.colorScheme.primary,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Text(
                    _getStatusLabel(due.status),
                    style: TextStyle(
                      color: statusColor,
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
            const Divider(height: 32),

            // Informasi detail
            _buildRow('ID Transaksi', due.id, theme),
            if (due.tanggalJatuhTempo != null)
              _buildRow('Jatuh Tempo',
                  Formatters.dateLong(due.tanggalJatuhTempo), theme),
            if (due.tanggalBayar != null)
              _buildRow('Tanggal Bayar',
                  Formatters.dateLong(due.tanggalBayar), theme),

            const SizedBox(height: 16),

            // ── Section Bukti Pembayaran ───────────────────────
            _buildProofSection(context, theme),

            const SizedBox(height: 20),

            // ── Rekening Tujuan Transfer ───────────────────────
            if (!_isPaid) ...[
              Text(
                'Rekening Tujuan Transfer',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              _buildBankInfoSection(context, theme),
              const SizedBox(height: 16),
            ],

            // ── Tombol Unggah Bukti ────────────────────────────
            if (due.canUploadProof)
              SizedBox(
                width: double.infinity,
                height: 48,
                child: FilledButton.icon(
                  onPressed: onUpload,
                  icon: const Icon(Icons.upload_file_outlined),
                  label: Text(
                    due.buktiBayarPath != null &&
                            due.buktiBayarPath!.isNotEmpty
                        ? 'Ganti Bukti Pembayaran'
                        : 'Unggah Bukti Pembayaran',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildRow(String label, String value, ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 130,
            child: Text(
              label,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProofSection(BuildContext context, ThemeData theme) {
    final hasProof =
        due.buktiBayarPath != null && due.buktiBayarPath!.trim().isNotEmpty;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: theme.colorScheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.receipt_long_outlined,
                  size: 20, color: theme.colorScheme.primary),
              const SizedBox(width: 8),
              Text(
                'Bukti Pembayaran',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (hasProof) ...[
            GestureDetector(
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => _ProofViewerScreen(url: due.buktiUrl),
                  ),
                );
              },
              child: ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: AspectRatio(
                  aspectRatio: 16 / 9,
                  child: CachedNetworkImage(
                    imageUrl: due.buktiUrl,
                    fit: BoxFit.cover,
                    placeholder: (_, __) => const Center(
                      child: CircularProgressIndicator(),
                    ),
                    errorWidget: (_, __, ___) => Center(
                      child: Text(
                        'Gagal memuat gambar',
                        style: TextStyle(
                            color: theme.colorScheme.onSurfaceVariant),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Ketuk gambar untuk memperbesar',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
                fontSize: 11,
              ),
            ),
          ] else
            Text(
              _isPaid
                  ? 'Pembayaran dicatat manual (tanpa bukti digital).'
                  : 'Belum ada bukti pembayaran yang diunggah.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildBankInfoSection(BuildContext context, ThemeData theme) {
    final list = bankInfos;
    if (list != null && list.isNotEmpty) {
      return Column(
        children: list.map((item) {
          final bank = item is BankInfo ? item : BankInfo.fromJson(item as Map<String, dynamic>);
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: Icon(Icons.account_balance,
                  color: theme.colorScheme.primary),
              title: Text(
                '${bank.bankName} - ${bank.accountNumber}',
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              subtitle: Text('a.n. ${bank.accountName}'),
              trailing: IconButton(
                icon: const Icon(Icons.copy, size: 18),
                tooltip: 'Salin Nomor Rekening',
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: bank.accountNumber));
                  showCenteredSnackBar(context, 'Nomor rekening disalin!');
                },
              ),
            ),
          );
        }).toList(),
      );
    }

    return const BankInfoCard();
  }
}

/// Viewer layar penuh untuk gambar bukti pembayaran
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
          minScale: 0.5,
          maxScale: 4.0,
          child: CachedNetworkImage(
            imageUrl: url,
            fit: BoxFit.contain,
            placeholder: (_, __) =>
                const Center(child: CircularProgressIndicator(color: Colors.white)),
            errorWidget: (_, __, ___) => const Center(
              child: Text('Gagal memuat gambar',
                  style: TextStyle(color: Colors.white)),
            ),
          ),
        ),
      ),
    );
  }
}
