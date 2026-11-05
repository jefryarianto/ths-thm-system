import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/kta_application.dart';
import '../widgets/app_bar_icon_title.dart';
import '../widgets/app_loading_spinner.dart';
import '../widgets/state_views.dart';

class KtaBatchDetailScreen extends StatefulWidget {
  final String batchId;

  const KtaBatchDetailScreen({super.key, required this.batchId});

  @override
  State<KtaBatchDetailScreen> createState() => _KtaBatchDetailScreenState();
}

class _KtaBatchDetailScreenState extends State<KtaBatchDetailScreen> {
  final ApiClient _api = ApiClient();
  KtaBatch? _batch;
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
      final response = await _api.dio.get('/kta-applications/batches/${widget.batchId}');
      final data = response.data['data'];
      if (data is Map<String, dynamic>) {
        if (mounted) setState(() => _batch = KtaBatch.fromJson(data));
      }
    } on DioException catch (e) {
      if (mounted) setState(() => _error = _api.messageFromError(e));
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _export(String format) async {
    try {
      await _api.dio.get('/kta-applications/batches/${widget.batchId}/export',
          queryParameters: {'format': format});
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Export $format dipicu dari server')),
      );
    } on DioException catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(_api.messageFromError(e))));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const AppBarIconTitle(icon: Icons.folder, title: 'Detail Batch KTA'),
        actions: [
          PopupMenuButton<String>(
            onSelected: _export,
            itemBuilder: (context) => const [
              PopupMenuItem(value: 'csv', child: Text('Export CSV')),
              PopupMenuItem(value: 'excel', child: Text('Export Excel')),
              PopupMenuItem(value: 'pdf', child: Text('Export PDF')),
            ],
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) return const Center(child: AppLoadingSpinner());
    if (_error != null) return ErrorStateView(message: _error!, onRetry: _load);
    final batch = _batch;
    if (batch == null) return const EmptyStateView(title: 'Batch tidak ditemukan');

    final progress = batch.progress;
    return ListView(
      padding: const EdgeInsets.all(AppTheme.space20),
      children: [
        Card(
          elevation: 0,
          color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(AppTheme.space20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        batch.name ?? 'Batch KTA',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                      ),
                    ),
                    Text(
                      batch.statusLabel,
                      style: const TextStyle(fontWeight: FontWeight.w700, color: Colors.blue),
                    ),
                  ],
                ),
                const SizedBox(height: AppTheme.space12),
                LinearProgressIndicator(
                  value: progress,
                  backgroundColor: Colors.grey.withValues(alpha: 0.2),
                  minHeight: 8,
                  borderRadius: BorderRadius.circular(4),
                ),
                const SizedBox(height: AppTheme.space8),
                Text(
                  'Progress: ${(progress * 100).toStringAsFixed(1)}%',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: AppTheme.space16),
                Row(
                  children: [
                    _Stat(label: 'Total', value: batch.totalSubmitted),
                    _Stat(label: 'Disetujui', value: batch.totalApproved),
                    _Stat(label: 'Ditolak', value: batch.totalRejected),
                    _Stat(label: 'Digenerate', value: batch.totalGenerated),
                  ],
                ),
                Text(
                  'Dibuat ${Formatters.dateLong(batch.createdAt.toIso8601String())} oleh ${batch.submittedByRole.replaceAll('_', ' ').toUpperCase()}',
                  style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: AppTheme.space20),
        Text('Daftar Aplikasi (${batch.applications?.length ?? 0})',
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
        const SizedBox(height: AppTheme.space12),
        if (batch.applications == null || batch.applications!.isEmpty)
          const EmptyStateView(title: 'Belum Ada Aplikasi', message: 'Batch ini belum memiliki aplikasi.')
        else
          ...batch.applications!.map((app) => _AppTile(application: app)),
      ],
    );
  }
}

class _Stat extends StatelessWidget {
  final String label;
  final int value;

  const _Stat({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text('$value', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
          Text(label, style: const TextStyle(fontSize: 11)),
        ],
      ),
    );
  }
}

class _AppTile extends StatelessWidget {
  final KtaApplication application;

  const _AppTile({required this.application});

  @override
  Widget build(BuildContext context) {
    final color = Color(int.parse('FF${application.statusColorHex}', radix: 16));
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text('Anggota: ${application.anggotaId.substring(0, 8)}...'),
        subtitle: Text(
          application.nomorAnggota ?? '-',
          style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            application.statusLabel,
            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: color),
          ),
        ),
      ),
    );
  }
}
