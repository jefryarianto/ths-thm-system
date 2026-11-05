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

class KtaApplicationScreen extends StatefulWidget {
  const KtaApplicationScreen({super.key});

  @override
  State<KtaApplicationScreen> createState() => _KtaApplicationScreenState();
}

class _KtaApplicationScreenState extends State<KtaApplicationScreen> {
  @override
  void initState() {
    super.initState();
    context.read<KtaApplicationBloc>().add(const KtaApplicationLoadRequested());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const AppBarIconTitle(
          icon: Icons.credit_card_outlined,
          title: 'KTA Digital',
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.timeline),
            tooltip: 'Riwayat Status',
            onPressed: () => context.push('/kta/status'),
          ),
        ],
      ),
      body: BlocBuilder<KtaApplicationBloc, KtaApplicationState>(
        builder: (context, state) {
          if (state is KtaApplicationLoading) {
            return const Center(child: AppLoadingSpinner());
          }
          if (state is KtaApplicationError) {
            return ErrorStateView(
              message: state.message,
              onRetry: () => context.read<KtaApplicationBloc>().add(const KtaApplicationLoadRequested()),
            );
          }
          if (state is KtaApplicationLoaded) {
            return _ApplicationView(application: state.application);
          }
          if (state is KtaApplicationSubmitted) {
            return _ApplicationView(application: state.application);
          }
          return _EmptyState(
            onApply: () => context.read<KtaApplicationBloc>().add(const KtaApplicationSubmitRequested()),
          );
        },
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final VoidCallback onApply;

  const _EmptyState({required this.onApply});

  @override
  Widget build(BuildContext context) {
    return EmptyStateView(
      icon: Icons.badge_outlined,
      title: 'Belum Ada Pengajuan KTA',
      message: 'Ajukan KTA Digital sekarang. Proses persetujuan melalui Ranting → Wilayah → Distrik → Nasional.',
      actionLabel: 'Ajukan KTA Sekarang',
      onAction: onApply,
    );
  }
}

class _ApplicationView extends StatelessWidget {
  final KtaApplication application;

  const _ApplicationView({required this.application});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final color = Color(int.parse('FF${application.statusColorHex}', radix: 16));

    return ListView(
      padding: const EdgeInsets.all(AppTheme.space20),
      children: [
        Card(
          elevation: 0,
          color: color.withValues(alpha: 0.12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(AppTheme.space20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 22,
                      backgroundColor: color,
                      child: const Icon(Icons.badge, color: Colors.white, size: 26),
                    ),
                    const SizedBox(width: AppTheme.space16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            application.statusLabel,
                            style: TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w700,
                              color: color,
                            ),
                          ),
                          Text(
                            'Diajukan ${Formatters.dateLong(application.createdAt.toIso8601String())}',
                            style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                if (application.nomorAnggota != null) ...[
                  const SizedBox(height: AppTheme.space16),
                  Text('Nomor Anggota', style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant)),
                  Text(
                    application.nomorAnggota!,
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                  ),
                ],
                if (application.catatanAdmin != null && application.catatanAdmin!.isNotEmpty) ...[
                  const SizedBox(height: AppTheme.space16),
                  Text(
                    'Catatan Admin: ${application.catatanAdmin}',
                    style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant),
                  ),
                ],
              ],
            ),
          ),
        ),
        const SizedBox(height: AppTheme.space20),
        const Text('Riwayat Proses', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
        const SizedBox(height: AppTheme.space12),
        if (application.histories.isEmpty)
          const EmptyStateView(title: 'Belum ada riwayat', message: 'Riwayat proses akan muncul di sini.')
        else
          ...application.histories.map((h) => _HistoryTile(history: h)),
        const SizedBox(height: AppTheme.space24),
        if (application.isRejected)
          FilledButton.icon(
            onPressed: () => context.read<KtaApplicationBloc>().add(const KtaApplicationSubmitRequested()),
            icon: const Icon(Icons.refresh),
            label: const Text('Ajukan Ulang'),
          )
        else if (application.isCompleted)
          FilledButton.icon(
            onPressed: () => context.push('/kta/viewer'),
            icon: const Icon(Icons.credit_card),
            label: const Text('Lihat KTA Digital'),
          )
        else if (application.status == KtaAppStatus.paymentPending ||
            application.status == KtaAppStatus.paymentSetup)
          const SizedBox.shrink(),
      ],
    );
  }
}

class _HistoryTile extends StatelessWidget {
  final KtaAppHistory history;

  const _HistoryTile({required this.history});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppTheme.space12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.circle, size: 10),
          const SizedBox(width: AppTheme.space12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      history.levelLabel,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(width: AppTheme.space8),
                    Text(
                      history.actionLabel,
                      style: TextStyle(fontSize: 12, color: scheme.primary),
                    ),
                  ],
                ),
                Text(
                  Formatters.dateLong(history.createdAt.toIso8601String()),
                  style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant),
                ),
                if (history.catatan != null && history.catatan!.isNotEmpty)
                  Text(history.catatan!, style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant)),
                if (history.isSkipped)
                  Text(
                    'Di-skip: ${history.skippedReason ?? 'Auto-skip'}',
                    style: const TextStyle(fontSize: 11, color: Colors.orange),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
