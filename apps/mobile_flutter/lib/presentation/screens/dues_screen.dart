import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../core/utils/snack_bar_helper.dart';
import '../../data/models/due.dart';
import '../../data/models/bank_info.dart';
import '../../core/constants/app_constants.dart';
import '../../core/api/api_client.dart';
import '../../logic/dues/dues_bloc.dart';
import '../widgets/app_bar_icon_title.dart';
import '../widgets/app_loading_spinner.dart';
import '../widgets/due_item_card.dart';
import '../widgets/skeleton_loader.dart';
import '../widgets/stale_data_banner.dart';
import '../widgets/state_views.dart';

class DuesScreen extends StatefulWidget {
  const DuesScreen({super.key});

  @override
  State<DuesScreen> createState() => _DuesScreenState();
}

class _DuesScreenState extends State<DuesScreen> {
  /// Data rekening tujuan (sumber: `GET /payments/bank-info`).
  List<BankInfo>? _bankInfos;
  bool _bankInfosLoaded = false;
  String? _bankInfosError;

  @override
  void initState() {
    super.initState();
    final state = context.read<DuesBloc>().state;
    if (state is! DuesLoaded && state is! DuesLoading) {
      context.read<DuesBloc>().add(const DuesLoadRequested());
    }
    _fetchBankInfo();
  }

  /// Ambil rekening tujuan dari API agar daftar iuran bisa menunjuk target
  /// pembayaran tanpa membuat iuran sendiri menyimpan akun bank.
  Future<void> _fetchBankInfo() async {
    try {
      final response = await ApiClient().dio.get(AppConstants.paymentsBankInfo);
      final dynamic data = response.data?['data'];
      if (data is! List) return;
      final infos = <BankInfo>[];
      for (final item in data) {
        if (item is Map<String, dynamic>) {
          infos.add(BankInfo.fromJson(item));
        }
      }
      if (mounted) {
        setState(() {
          _bankInfos = infos;
          _bankInfosLoaded = true;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _bankInfosError = e.toString();
          _bankInfosLoaded = true;
        });
      }
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
            return const SkeletonNotificationList();
          }
          if (state is DuesError) {
            return _Error(message: state.message);
          }
          // State unggah bukti juga membawa daftar iuran — perlakukan seperti
          // data ter-load agar layar tidak berkedip ke tampilan kosong.
          final List<Due> dues;
          if (state is DuesLoaded) {
            dues = state.dues;
          } else if (state is DuesProofUploading) {
            dues = state.dues;
          } else if (state is DuesProofUploadSuccess) {
            dues = state.dues;
          } else {
            return const EmptyStateView(
              icon: Icons.account_balance_wallet_outlined,
              title: 'Belum ada data iuran',
              message: 'Riwayat iuran Anda akan muncul di sini.',
            );
          }
          final lunas = dues.where((d) => _isPaid(d.status)).length;
          return Column(
            children: [
              _SummaryBar(total: dues.length, lunas: lunas),
              if (state is DuesLoaded && state.isStale)
                StaleDataBanner(
                  errorMessage: state.errorMessage,
                  onRefresh: () => context
                      .read<DuesBloc>()
                      .add(const DuesLoadRequested()),
                ),
              if (!_bankInfosLoaded)
                const Padding(
                  padding: EdgeInsets.symmetric(
                    horizontal: AppTheme.space12,
                    vertical: AppTheme.space4,
                  ),
                  child: Center(
                    child: CircularProgressIndicator(),
                  ),
                )
              else if (_bankInfos != null && _bankInfos!.isNotEmpty)
                _BankInfoPanel(bankInfos: _bankInfos!)
              else if (_bankInfosError != null)
                _BankInfoError(message: _bankInfosError!)
              else
                const SizedBox.shrink(),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: () async =>
                      context.read<DuesBloc>().add(const DuesLoadRequested()),
                  child: dues.isEmpty
                      ? ListView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          children: const [
                            SizedBox(height: 80),
                            EmptyStateView(
                              icon: Icons.receipt_long_outlined,
                              title: 'Tidak ada data iuran',
                              message:
                                  'Belum ada riwayat iuran pada periode ini.',
                            ),
                          ],
                        )
                      : ListView.builder(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.all(AppTheme.space12),
                          itemCount: dues.length,
                          itemBuilder: (context, i) => DueItemCard(
                            due: dues[i],
                            onTap: () => _showDueDetail(context, dues[i]),
                            onUpload: _dueCanUpload(dues[i])
                                ? () => _showDueDetail(context, dues[i])
                                : null,
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

  bool _dueCanUpload(Due due) => !_isPaid(due.status);

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
                  style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: AppTheme.space12),
              _row(context, 'Status', due.status),
              _row(context, 'Jumlah', Formatters.rupiah(due.jumlah)),
              _row(context, 'Tanggal Jatuh Tempo',
                  Formatters.dateLong(due.tanggalJatuhTempo)),
              _row(
                  context,
                  'Tanggal Bayar',
                  due.tanggalBayar != null
                      ? Formatters.dateLong(due.tanggalBayar)
                      : '-'),
              const SizedBox(height: AppTheme.space12),
              _ProofSection(due: due),
            ],
          ),
        ),
      ),
    );
  }

  Widget _row(BuildContext context, String label, String value) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppTheme.space4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
              width: 140,
              child: Text(label,
                  style: TextStyle(
                      fontSize: 13,
                      color: theme.colorScheme.onSurfaceVariant))),
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
      margin: const EdgeInsets.all(AppTheme.space12),
      padding: const EdgeInsets.all(AppTheme.space16),
      decoration: BoxDecoration(
        // Gradien brand sadar tema — putih lolos WCAG di kedua ujung gradien
        // (versi lama berakhir di primaryContainer: putih hanya 1,26:1).
        gradient: AppTheme.statGradient(theme.brightness),
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
            style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: AppTheme.onStatGradient)),
        Text(label,
            style: TextStyle(
                fontSize: 11,
                color: AppTheme.onStatGradient.withValues(alpha: 0.85))),
      ],
    );
  }
}

/// Bagian "Bukti Pembayaran" pada detail iuran — menampilkan gambar bukti dari
/// `iuran.buktiBayarPath` (mis. `/api/uploads/proofs/...`). Tap gambar membuka
/// viewer layar penuh (zoom). Tanpa bukti → placeholder sesuai status.

/// Panel rekening tujuan — tampil di atas daftar iuran.
class _BankInfoPanel extends StatelessWidget {
  final List<BankInfo> bankInfos;

  const _BankInfoPanel({required this.bankInfos});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: AppTheme.space12),
      padding: const EdgeInsets.all(AppTheme.space16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: theme.colorScheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.account_balance_wallet_outlined,
                  size: 18, color: theme.colorScheme.primary),
              const SizedBox(width: AppTheme.space8),
              Text('Rekening Tujuan Pembayaran',
                  style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: theme.colorScheme.onSurface)),
            ],
          ),
          const SizedBox(height: AppTheme.space12),
          ...bankInfos.map((info) => Padding(
                padding: const EdgeInsets.symmetric(
                  vertical: AppTheme.space8,
                  horizontal: AppTheme.space4,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          '${info.bankName} • ${info.accountNumber}',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: theme.colorScheme.onSurface,
                          ),
                        ),
                        if (info.accountName.isNotEmpty)
                          SizedBox(
                            width: 120,
                            child: Text(
                              'Ats. ${info.accountName}',
                              style: TextStyle(
                                fontSize: 12,
                                color: theme.colorScheme.onSurfaceVariant,
                              ),
                            ),
                          ),
                      ],
                    ),
                    if (info.qrisImageUrl != null && info.qrisImageUrl!.isNotEmpty)
                      SizedBox(
                        height: 16,
                        child: Text(
                          'QRIS: ${info.qrisImageUrl}',
                          style: TextStyle(
                            fontSize: 11,
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ),
                  ],
                ),
              )),
        ],
      ),
    );
  }
}

/// Tadapan ringan bila endpoint rekening tujuan tidak tersedia.
class _BankInfoError extends StatelessWidget {
  final String message;

  const _BankInfoError({required this.message});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: AppTheme.space12),
      padding: const EdgeInsets.all(AppTheme.space12),
      decoration: BoxDecoration(
        color: theme.colorScheme.errorContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(Icons.error_outline,
              size: 18, color: theme.colorScheme.onErrorContainer),
          const SizedBox(width: AppTheme.space8),
          Expanded(
            child: Text(
              message,
              style: TextStyle(
                fontSize: 12,
                color: theme.colorScheme.onErrorContainer,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProofSection extends StatefulWidget {
  final Due due;
  const _ProofSection({required this.due});

  @override
  State<_ProofSection> createState() => _ProofSectionState();
}

class _ProofSectionState extends State<_ProofSection> {
  final _imagePicker = ImagePicker();
  bool _uploading = false;

  bool get _paid => widget.due.status.toLowerCase().contains('lunas') ||
      widget.due.status.toLowerCase() == 'paid';

  bool get _canUpload => !_paid;

  /// Pilih gambar bukti (kamera/galeri) lalu kirim ke bloc untuk diunggah ke
  /// `POST /payments/:id/upload-proof`. Ukuran dibatasi agar hemat kuota dan
  /// sesuai limit 5MB di server.
  Future<void> _pickAndUpload() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: AppTheme.space8),
            const Text('Unggah Bukti Pembayaran',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined,
                  color: AppTheme.info),
              title: const Text('Ambil Foto (Kamera)',
                  style: TextStyle(fontWeight: FontWeight.w600)),
              onTap: () => Navigator.of(context).pop(ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined,
                  color: AppTheme.info),
              title: const Text('Pilih dari Galeri',
                  style: TextStyle(fontWeight: FontWeight.w600)),
              subtitle: const Text('Penyimpanan internal perangkat'),
              onTap: () => Navigator.of(context).pop(ImageSource.gallery),
            ),
          ],
        ),
      ),
    );

    if (source == null || !mounted) return;

    try {
      final result = await _imagePicker.pickImage(
        source: source,
        maxWidth: 1600,
        maxHeight: 1600,
        imageQuality: 85,
      );
      if (result == null || !mounted) return;
      setState(() => _uploading = true);
      context.read<DuesBloc>().add(DuesUploadProofRequested(
            iuranId: widget.due.id,
            filePath: result.path,
          ));
    } catch (e) {
      if (mounted) {
        setState(() => _uploading = false);
        showCenteredSnackBar(context, 'Gagal memilih gambar: $e');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final url = widget.due.buktiUrl;
    final paid = _paid;
    return BlocListener<DuesBloc, DuesState>(
      listener: (context, state) {
        if (state is DuesProofUploadSuccess) {
          setState(() => _uploading = false);
          showCenteredSnackBar(context, state.message);
          Navigator.of(context).pop();
        } else if (state is DuesError) {
          setState(() => _uploading = false);
          showCenteredSnackBar(context, state.message);
        }
      },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
        const Divider(),
        const SizedBox(height: AppTheme.space8),
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
            padding: const EdgeInsets.all(AppTheme.space16),
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: theme.colorScheme.outlineVariant),
            ),
            child: Row(children: [
              Icon(Icons.image_not_supported_outlined,
                  size: 18, color: theme.colorScheme.onSurfaceVariant),
              const SizedBox(width: AppTheme.space8),
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
          const SizedBox(height: AppTheme.space8),
          Center(
            child: Text('Ketuk untuk melihat ukuran penuh',
                style:
                    TextStyle(fontSize: 11, color: theme.colorScheme.onSurfaceVariant)),
          ),
        ],
        if (_canUpload) ..._buildUploadArea(theme),
        ],
      ),
    );
  }

  /// Tombol unggah bukti + keterangan status verifikasi. Hanya tampil untuk
  /// iuran yang belum lunas (`_canUpload`).
  List<Widget> _buildUploadArea(ThemeData theme) {
    final waiting =
        widget.due.status.toLowerCase().contains('verifikasi');
    return [
      const SizedBox(height: AppTheme.space12),
      SizedBox(
        width: double.infinity,
        child: FilledButton.icon(
          onPressed: _uploading ? null : _pickAndUpload,
          icon: _uploading
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                      strokeWidth: 2, color: Colors.white),
                )
              : const Icon(Icons.upload_file_outlined, size: 20),
          label: Text(
            waiting
                ? 'Ganti Bukti Pembayaran'
                : _uploading
                    ? 'Mengunggah…'
                    : 'Unggah Bukti Pembayaran',
          ),
        ),
      ),
      if (waiting) ...[
        const SizedBox(height: AppTheme.space8),
        Row(children: [
          Icon(Icons.schedule_outlined,
              size: 14, color: theme.colorScheme.onSurfaceVariant),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              'Bukti terkirim, menunggu verifikasi admin.',
              style: TextStyle(
                  fontSize: 12, color: theme.colorScheme.onSurfaceVariant),
            ),
          ),
        ]),
      ],
    ];
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
                  SizedBox(height: AppTheme.space12),
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
    return ErrorStateView(
      message: message,
      onRetry: () => context.read<DuesBloc>().add(const DuesLoadRequested()),
    );
  }
}