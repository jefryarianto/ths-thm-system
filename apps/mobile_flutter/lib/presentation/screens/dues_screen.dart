import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';

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

  /// Pencarian daftar iuran.
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  /// Status accordion panel ringkasan & rekening.
  bool _summaryExpanded = true;
  bool _bankExpanded = true;

  /// Status visibilitas nomor rekening (eye icon).
  bool _obscureAccountNumbers = true;

  @override
  void initState() {
    super.initState();
    final state = context.read<DuesBloc>().state;
    if (state is! DuesLoaded && state is! DuesLoading) {
      context.read<DuesBloc>().add(const DuesLoadRequested());
    }
    _fetchBankInfo();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
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
      final unpaid = dues.where((d) => !_isPaid(d.status)).length;
      final paidSum = dues.where((d) => _isPaid(d.status)).fold<double>(0, (s, d) => s + d.jumlah);
      final unpaidSum = dues.where((d) => !_isPaid(d.status)).fold<double>(0, (s, d) => s + d.jumlah);
      final hasUnpaid = unpaid > 0;
      final filteredDues = _searchQuery.isEmpty
          ? dues
          : dues.where((d) {
              final q = _searchQuery.toLowerCase();
              return d.periode.toLowerCase().contains(q) ||
                  d.status.toLowerCase().contains(q) ||
                  d.jumlah.toString().contains(q) ||
                  (d.tanggalBayar ?? '').toLowerCase().contains(q) ||
                  (d.tanggalJatuhTempo ?? '').toLowerCase().contains(q);
            }).toList();
      return Column(
        children: [
          // ── Notifikasi tunggakan persistent ──────────────────────
          if (hasUnpaid) _TunggakanBanner(
            unpaidCount: unpaid,
            unpaidSum: unpaidSum,
            onTap: () {
              final firstUnpaid = dues.firstWhere((d) => !_isPaid(d.status));
              _showDueDetail(context, firstUnpaid);
            },
          ),
          _SummaryBar(
            total: dues.length,
            lunas: lunas,
            paidSum: paidSum,
            unpaidSum: unpaidSum,
            expanded: _summaryExpanded,
            onToggle: () => setState(() => _summaryExpanded = !_summaryExpanded),
          ),
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
                _BankInfoPanel(
                  bankInfos: _bankInfos!,
                  expanded: _bankExpanded,
                  obscureAccount: _obscureAccountNumbers,
                  onToggleExpand: () =>
                      setState(() => _bankExpanded = !_bankExpanded),
                  onToggleObscure: () => setState(
                      () => _obscureAccountNumbers = !_obscureAccountNumbers),
                )
              else if (_bankInfosError != null)
                _BankInfoError(message: _bankInfosError!)
              else
                const SizedBox.shrink(),
              // ── Pencarian daftar iuran ───────────────────────────
              Padding(
                padding: const EdgeInsets.fromLTRB(
                    AppTheme.space12, 0, AppTheme.space12, AppTheme.space4),
                child: TextField(
                  controller: _searchController,
                  onChanged: (v) => setState(() => _searchQuery = v.trim()),
                  decoration: InputDecoration(
                    hintText: 'Cari iuran (periode, status, nominal)...',
                    hintStyle: const TextStyle(fontSize: 13),
                    prefixIcon: const Icon(Icons.search, size: 18),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () {
                              _searchController.clear();
                              setState(() => _searchQuery = '');
                            },
                          )
                        : null,
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  style: const TextStyle(fontSize: 13),
                ),
              ),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: () async =>
                      context.read<DuesBloc>().add(const DuesLoadRequested()),
                  child: filteredDues.isEmpty
                      ? ListView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          children: [
                            const SizedBox(height: 80),
                            EmptyStateView(
                              icon: _searchQuery.isNotEmpty
                                  ? Icons.search_off
                                  : Icons.receipt_long_outlined,
                              title: _searchQuery.isNotEmpty
                                  ? 'Tidak ditemukan'
                                  : 'Tidak ada data iuran',
                              message: _searchQuery.isNotEmpty
                                  ? 'Coba kata kunci lain.'
                                  : 'Belum ada riwayat iuran pada periode ini.',
                            ),
                          ],
                        )
                      : ListView.builder(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.all(AppTheme.space12),
                          itemCount: filteredDues.length,
                          itemBuilder: (context, i) => DueItemCard(
                            due: filteredDues[i],
                            onTap: () => _showDueDetail(context, filteredDues[i]),
                            onUpload: _dueCanUpload(filteredDues[i])
                                ? () => _showDueDetail(context, filteredDues[i])
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

/// Banner notifikasi tunggakan — persistent, tidak bisa di-dismiss selama
/// masih ada iuran belum lunas. Ketuk → buka detail iuran pertama yang belum
/// dibayar.
class _TunggakanBanner extends StatelessWidget {
  final int unpaidCount;
  final double unpaidSum;
  final VoidCallback onTap;

  const _TunggakanBanner({
    required this.unpaidCount,
    required this.unpaidSum,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        margin: const EdgeInsets.fromLTRB(
            AppTheme.space12, AppTheme.space8, AppTheme.space12, 0),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
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
    );
  }
}

class _SummaryBar extends StatelessWidget {
  final int total;
  final int lunas;
  final double paidSum;
  final double unpaidSum;
  final bool expanded;
  final VoidCallback onToggle;

  const _SummaryBar({
    required this.total,
    required this.lunas,
    required this.paidSum,
    required this.unpaidSum,
    required this.expanded,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      margin: const EdgeInsets.all(AppTheme.space12),
      padding: const EdgeInsets.all(AppTheme.space16),
      decoration: BoxDecoration(
        gradient: AppTheme.statGradient(theme.brightness),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          GestureDetector(
            onTap: onToggle,
            behavior: HitTestBehavior.opaque,
            child: Row(
              children: [
                const Icon(Icons.summarize_outlined,
                    color: AppTheme.onStatGradient, size: 20),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    'Ringkasan Iuran',
                    style: TextStyle(
                      color: AppTheme.onStatGradient,
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                AnimatedRotation(
                  turns: expanded ? 0 : 0.5,
                  duration: const Duration(milliseconds: 200),
                  child: const Icon(Icons.expand_more,
                      color: AppTheme.onStatGradient, size: 26),
                ),
              ],
            ),
          ),
          AnimatedSize(
            duration: const Duration(milliseconds: 250),
            curve: Curves.easeInOut,
            alignment: Alignment.topCenter,
            child: expanded
                ? Column(
                    children: [
                      const SizedBox(height: AppTheme.space12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _stat(theme, 'Total Iuran', '$total'),
                          _stat(theme, 'Lunas', '$lunas'),
                          _stat(theme, 'Belum Lunas', '${total - lunas}'),
                        ],
                      ),
                      const SizedBox(height: AppTheme.space8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _stat(theme, 'Terbayar',
                              'Rp ${paidSum.toStringAsFixed(0)}'),
                          _stat(theme, 'Belum Bayar',
                              'Rp ${unpaidSum.toStringAsFixed(0)}'),
                        ],
                      ),
                    ],
                  )
                : const SizedBox(height: 4),
          ),
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
/// Mendukung accordion (expand/collapse) dan penyembunyian nomor rekening
/// via icon mata (eye toggle).
class _BankInfoPanel extends StatelessWidget {
  final List<BankInfo> bankInfos;
  final bool expanded;
  final bool obscureAccount;
  final VoidCallback onToggleExpand;
  final VoidCallback onToggleObscure;

  const _BankInfoPanel({
    required this.bankInfos,
    required this.expanded,
    required this.obscureAccount,
    required this.onToggleExpand,
    required this.onToggleObscure,
  });

  /// Sembunyikan nomor rekening: tampilkan titik-titik sesuai panjang asli.
  String _maskedAccount(String account) {
    if (account.length <= 4) return '••••';
    return '•••• •••• ${account.substring(account.length - 4)}';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: AppTheme.space12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: theme.colorScheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Header accordion ───────────────────────────────────
          GestureDetector(
            onTap: onToggleExpand,
            behavior: HitTestBehavior.opaque,
            child: Padding(
              padding: const EdgeInsets.all(AppTheme.space16),
              child: Row(
                children: [
                  Icon(Icons.account_balance_wallet_outlined,
                      size: 18, color: theme.colorScheme.primary),
                  const SizedBox(width: AppTheme.space8),
                  Expanded(
                    child: Text(
                      'Rekening Tujuan Pembayaran',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: theme.colorScheme.onSurface,
                      ),
                    ),
                  ),
                  // Eye toggle: sembunyikan/tampilkan nomor rekening.
                  IconButton(
                    icon: Icon(
                      obscureAccount
                          ? Icons.visibility_off_outlined
                          : Icons.visibility_outlined,
                      size: 18,
                    ),
                    onPressed: onToggleObscure,
                    tooltip: obscureAccount
                        ? 'Tampilkan nomor rekening'
                        : 'Sembunyikan nomor rekening',
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(
                        minWidth: 36, minHeight: 36),
                  ),
                  AnimatedRotation(
                    turns: expanded ? 0 : 0.5,
                    duration: const Duration(milliseconds: 200),
                    child: Icon(Icons.expand_more,
                        size: 24, color: theme.colorScheme.outline),
                  ),
                ],
              ),
            ),
          ),
          // ── Konten accordion ───────────────────────────────────
          AnimatedSize(
            duration: const Duration(milliseconds: 250),
            curve: Curves.easeInOut,
            alignment: Alignment.topCenter,
            child: expanded
                ? Padding(
                    padding: const EdgeInsets.fromLTRB(
                        AppTheme.space16, 0, AppTheme.space16, AppTheme.space16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Divider(height: 1),
                        const SizedBox(height: AppTheme.space12),
                        ...bankInfos.map((info) => Container(
                              margin:
                                  const EdgeInsets.only(bottom: AppTheme.space8),
                              padding: const EdgeInsets.all(AppTheme.space12),
                              decoration: BoxDecoration(
                                color: theme.colorScheme.surface,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                    color: theme.colorScheme.outlineVariant
                                        .withValues(alpha: 0.5)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    info.bankName,
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                      color: theme.colorScheme.onSurface,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          obscureAccount
                                              ? _maskedAccount(
                                                  info.accountNumber)
                                              : info.accountNumber,
                                          style: TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w600,
                                            color: theme.colorScheme.onSurface,
                                            letterSpacing:
                                                obscureAccount ? 1.5 : 0,
                                          ),
                                        ),
                                      ),
                                      IconButton(
                                        icon: Icon(
                                          obscureAccount
                                              ? Icons.visibility_off_outlined
                                              : Icons.visibility_outlined,
                                          size: 16,
                                        ),
                                        onPressed: onToggleObscure,
                                        tooltip: obscureAccount
                                            ? 'Tampilkan'
                                            : 'Sembunyikan',
                                        padding: EdgeInsets.zero,
                                        constraints: const BoxConstraints(
                                            minWidth: 32, minHeight: 32),
                                      ),
                                      TextButton(
                                        onPressed: () {
                                          // Copy functionality
                                        },
                                        child: const Text('Copy'),
                                      ),
                                    ],
                                  ),
                                  if (info.accountName.isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 4),
                                      child: Text(
                                        'a.n ${info.accountName}',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: theme
                                              .colorScheme.onSurfaceVariant,
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            )),
                      ],
                    ),
                  )
                : const SizedBox(height: 0),
          ),
        ],
      ),
    );
  }
}

/// Tadapan ringan bila endpoint rekening tujuan tidak tersedia.

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

    if (source == ImageSource.camera) {
      final camStatus = await Permission.camera.request();
      if (!camStatus.isGranted && mounted) {
        showCenteredSnackBar(context, 'Izin kamera diperlukan untuk mengambil foto');
        return;
      }
    }

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