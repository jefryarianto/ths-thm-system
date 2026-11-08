import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/kta_application.dart';
import '../../logic/kta_application/kta_application_bloc.dart';
import '../widgets/app_bar_icon_title.dart';
import '../widgets/app_loading_spinner.dart';
import '../widgets/state_views.dart';

class KtaAdminQueueScreen extends StatefulWidget {
  const KtaAdminQueueScreen({super.key});

  @override
  State<KtaAdminQueueScreen> createState() => _KtaAdminQueueScreenState();
}

class _KtaAdminQueueScreenState extends State<KtaAdminQueueScreen> {
  KtaAppStatus? _statusFilter;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    context.read<KtaApplicationBloc>().add(
          KtaApplicationFetchListRequested(status: _statusFilter?.name ?? ''),
        );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const AppBarIconTitle(icon: Icons.queue, title: 'Antrian KTA'),
        actions: [
          IconButton(
            icon: const Icon(Icons.assignment_add),
            tooltip: 'Bulk Pengajuan',
            onPressed: () => context.push('/admin/kta/bulk'),
          ),
          IconButton(
            icon: const Icon(Icons.analytics),
            tooltip: 'Analytics',
            onPressed: () => context.push('/admin/kta/analytics'),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(AppTheme.space16),
            child: DropdownButtonFormField<KtaAppStatus?>(
              initialValue: _statusFilter,
              decoration: InputDecoration(
                labelText: 'Filter Status',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              ),
              items: [
                const DropdownMenuItem<KtaAppStatus?>(value: null, child: Text('Semua Status')),
                ...KtaAppStatus.values.map(
                  (s) => DropdownMenuItem<KtaAppStatus?>(value: s, child: Text(s.name.replaceAll('_', ' ').toUpperCase())),
                ),
              ],
              onChanged: (v) {
                setState(() => _statusFilter = v);
                _load();
              },
            ),
          ),
          Expanded(
            child: BlocBuilder<KtaApplicationBloc, KtaApplicationState>(
              builder: (context, state) {
                if (state is KtaApplicationLoading) {
                  return const Center(child: AppLoadingSpinner());
                }
                if (state is KtaApplicationError) {
                  return ErrorStateView(message: state.message, onRetry: _load);
                }
                if (state is KtaApplicationListLoaded) {
                  if (state.applications.isEmpty) {
                    return const EmptyStateView(
                      icon: Icons.inbox_outlined,
                      title: 'Tidak Ada Aplikasi',
                      message: 'Belum ada pengajuan KTA pada filter ini.',
                    );
                  }
                  return RefreshIndicator(
                    onRefresh: () async => _load(),
                    child: ListView.separated(
                      padding: const EdgeInsets.all(AppTheme.space16),
                      itemCount: state.applications.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, index) =>
                          _QueueCard(application: state.applications[index]),
                    ),
                  );
                }
                return const EmptyStateView(title: 'Memuat', message: 'Antrian KTA akan muncul di sini.');
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _QueueCard extends StatelessWidget {
  final KtaApplication application;

  const _QueueCard({required this.application});

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
                Text(
                  'Oleh: ${application.submittedByRole.replaceAll('_', ' ').toUpperCase()}',
                  style: TextStyle(fontSize: 10, color: scheme.onSurfaceVariant),
                ),
              ],
            ),
            const SizedBox(height: AppTheme.space12),
            Text(
              'Anggota: ${application.anggotaId.substring(0, 8)}...',
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
            ),
            Text(
              'Diajukan: ${Formatters.dateLong(application.createdAt.toIso8601String())}',
              style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant),
            ),
            if (application.catatanAdmin != null && application.catatanAdmin!.isNotEmpty) ...[
              const SizedBox(height: AppTheme.space8),
              Text(
                application.catatanAdmin!,
                style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant),
              ),
            ],
            const SizedBox(height: AppTheme.space12),
            if (application.isInProgress)
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => context.read<KtaApplicationBloc>().add(
                            KtaApplicationApproveRequested(applicationId: application.id),
                          ),
                      icon: const Icon(Icons.check, size: 16),
                      label: const Text('Setujui'),
                      style: OutlinedButton.styleFrom(foregroundColor: Colors.green),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _showRejectDialog(context),
                      icon: const Icon(Icons.close, size: 16),
                      label: const Text('Tolak'),
                      style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                    ),
                  ),
                ],
              )
            else
              OutlinedButton.icon(
                onPressed: () => context.push('/admin/kta/distrik-process'),
                icon: const Icon(Icons.settings, size: 16),
                label: const Text('Proses di Distrik'),
              ),
          ],
        ),
      ),
    );
  }

  void _showRejectDialog(BuildContext context) {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Tolak Aplikasi'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(labelText: 'Alasan penolakan'),
          maxLines: 3,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Batal')),
          FilledButton(
            onPressed: () {
              final reason = controller.text.trim();
              if (reason.isEmpty) return;
              Navigator.pop(context);
              context.read<KtaApplicationBloc>().add(
                    KtaApplicationRejectRequested(applicationId: application.id, reason: reason),
                  );
            },
            child: const Text('Tolak'),
          ),
        ],
      ),
    );
  }
}
