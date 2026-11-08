import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/kta_application.dart';
import '../widgets/app_bar_icon_title.dart';
import '../widgets/app_loading_spinner.dart';
import '../widgets/state_views.dart';

class KtaDistrikProcessScreen extends StatefulWidget {
  const KtaDistrikProcessScreen({super.key});

  @override
  State<KtaDistrikProcessScreen> createState() => _KtaDistrikProcessScreenState();
}

class _KtaDistrikProcessScreenState extends State<KtaDistrikProcessScreen> {
  final ApiClient _api = ApiClient();
  List<KtaApplication> _applications = [];
  bool _loading = true;
  String? _error;

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
      final response = await _api.dio.get('/kta-applications/distrik-queue');
      final data = response.data['data'];
      final apps = data is List
          ? data.whereType<Map<String, dynamic>>().map(KtaApplication.fromJson).toList()
          : <KtaApplication>[];
      if (mounted) setState(() => _applications = apps);
    } on DioException catch (e) {
      if (mounted) setState(() => _error = _api.messageFromError(e));
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _setupFee(KtaApplication app) async {
    final biayaCtrl = TextEditingController();
    final rekeningCtrl = TextEditingController();
    final catatanCtrl = TextEditingController();
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Atur Biaya & Rekening'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: biayaCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Biaya (Rp)', prefixText: 'Rp '),
              ),
              const SizedBox(height: AppTheme.space12),
              TextField(
                controller: rekeningCtrl,
                decoration: const InputDecoration(labelText: 'Rekening Tujuan'),
              ),
              const SizedBox(height: AppTheme.space12),
              TextField(
                controller: catatanCtrl,
                decoration: const InputDecoration(labelText: 'Catatan (opsional)'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Simpan')),
        ],
      ),
    );
    if (result != true) return;
    if (!mounted) return;
    final biaya = double.tryParse(biayaCtrl.text);
    if (biaya == null || biaya <= 0 || rekeningCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Biaya dan rekening wajib diisi')),
      );
      return;
    }
    try {
      await _api.dio.post('/kta-applications/${app.id}/setup-fee', data: {
        'biaya': biaya,
        'rekeningTujuan': rekeningCtrl.text.trim(),
        'catatan': catatanCtrl.text.trim(),
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Biaya & rekening disimpan')));
      _load();
    } on DioException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(_api.messageFromError(e))));
    }
  }

  Future<void> _verifyPayment(KtaApplication app) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Verifikasi Pembayaran'),
        content: const Text('Pastikan bukti pembayaran sudah sesuai. Verifikasi pembayaran KTA ini?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Verifikasi')),
        ],
      ),
    );
    if (ok != true) return;
    if (!mounted) return;
    try {
      await _api.dio.post('/kta-applications/${app.id}/verify-payment', data: {'buktiPath': ''});
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Pembayaran diverifikasi')));
      _load();
    } on DioException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(_api.messageFromError(e))));
    }
  }

  Future<void> _generateCard(KtaApplication app) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Generate KTA'),
        content: const Text('Generate KTA digital untuk anggota ini?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Generate')),
        ],
      ),
    );
    if (ok != true) return;
    if (!mounted) return;
    try {
      await _api.dio.post('/kta-applications/${app.id}/generate-card', data: {'reason': 'baru'});
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('KTA berhasil digenerate')));
      _load();
    } on DioException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(_api.messageFromError(e))));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const AppBarIconTitle(icon: Icons.settings, title: 'Proses KTA Distrik'),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) return const Center(child: AppLoadingSpinner());
    if (_error != null) return ErrorStateView(message: _error!, onRetry: _load);
    if (_applications.isEmpty) {
      return const EmptyStateView(
        icon: Icons.inbox_outlined,
        title: 'Tidak Ada Aplikasi',
        message: 'Belum ada aplikasi yang disetujui nasional untuk diproses.',
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(AppTheme.space16),
        itemCount: _applications.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (context, index) => _ProcessCard(
          application: _applications[index],
          onSetupFee: () => _setupFee(_applications[index]),
          onVerifyPayment: () => _verifyPayment(_applications[index]),
          onGenerateCard: () => _generateCard(_applications[index]),
        ),
      ),
    );
  }
}

class _ProcessCard extends StatelessWidget {
  final KtaApplication application;
  final VoidCallback onSetupFee;
  final VoidCallback onVerifyPayment;
  final VoidCallback onGenerateCard;

  const _ProcessCard({
    required this.application,
    required this.onSetupFee,
    required this.onVerifyPayment,
    required this.onGenerateCard,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final color = Color(int.parse('FF${application.statusColorHex}', radix: 16));

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(AppTheme.space16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    application.statusLabel,
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: color),
                  ),
                ),
                const Spacer(),
                if (application.nomorAnggota != null)
                  Text(
                    application.nomorAnggota!,
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: scheme.primary),
                  ),
              ],
            ),
            const SizedBox(height: AppTheme.space12),
            Text('Anggota: ${application.anggotaId.substring(0, 8)}...'),
            if (application.biaya != null)
              Text('Biaya: Rp ${application.biaya!.toStringAsFixed(0)}',
                  style: const TextStyle(fontWeight: FontWeight.w600)),
            if (application.rekeningTujuan != null)
              Text('Rekening: ${application.rekeningTujuan}',
                  style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant)),
            const SizedBox(height: AppTheme.space12),
            _actionFor(application.status),
          ],
        ),
      ),
    );
  }

  Widget _actionFor(KtaAppStatus status) {
    switch (status) {
      case KtaAppStatus.approved:
      case KtaAppStatus.paymentSetup:
        return SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            onPressed: onSetupFee,
            icon: const Icon(Icons.settings),
            label: const Text('Atur Biaya & Rekening'),
          ),
        );
      case KtaAppStatus.paymentPending:
        return SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            onPressed: onVerifyPayment,
            icon: const Icon(Icons.verified),
            label: const Text('Verifikasi Pembayaran'),
          ),
        );
      case KtaAppStatus.paymentVerified:
        return SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            onPressed: onGenerateCard,
            icon: const Icon(Icons.credit_card),
            label: const Text('Generate KTA'),
          ),
        );
      case KtaAppStatus.cardGenerated:
        return const Text('KTA sudah digenerate',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.green));
      default:
        return const SizedBox.shrink();
    }
  }
}
