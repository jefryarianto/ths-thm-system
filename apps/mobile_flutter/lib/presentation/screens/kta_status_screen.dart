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

enum _LevelStatus { pending, current, done }

class _WorkflowStep {
  final String label;
  final String description;
  final _LevelStatus status;
  final String? actor;
  final DateTime? timestamp;

  const _WorkflowStep({
    required this.label,
    required this.description,
    required this.status,
    this.actor,
    this.timestamp,
  });
}

class KtaStatusScreen extends StatefulWidget {
  const KtaStatusScreen({super.key});

  @override
  State<KtaStatusScreen> createState() => _KtaStatusScreenState();
}

class _KtaStatusScreenState extends State<KtaStatusScreen> {
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
          icon: Icons.timeline,
          title: 'Status Pengajuan KTA',
        ),
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
            return _StatusView(application: state.application);
          }
          if (state is KtaApplicationSubmitted) {
            return _StatusView(application: state.application);
          }
          return EmptyStateView(
            icon: Icons.timeline,
            title: 'Belum Ada Pengajuan',
            message: 'Ajukan KTA terlebih dahulu untuk melihat status proses.',
            actionLabel: 'Ajukan KTA',
            onAction: () => context.read<KtaApplicationBloc>().add(const KtaApplicationSubmitRequested()),
          );
        },
      ),
    );
  }
}

class _StatusView extends StatelessWidget {
  final KtaApplication application;

  const _StatusView({required this.application});

  List<_WorkflowStep> _buildSteps() {
    KtaAppHistory? histFor(KtaAppLevel level) {
      for (final h in application.histories) {
        if (h.level == level) return h;
      }
      return null;
    }

    final statusOrder = [
      KtaAppStatus.submitted,
      KtaAppStatus.rantingReview,
      KtaAppStatus.wilayahReview,
      KtaAppStatus.distrikReview,
      KtaAppStatus.nasionalReview,
      KtaAppStatus.approved,
      KtaAppStatus.paymentSetup,
      KtaAppStatus.paymentPending,
      KtaAppStatus.paymentVerified,
      KtaAppStatus.cardGenerating,
      KtaAppStatus.cardGenerated,
    ];
    final currentIndex = statusOrder.indexOf(application.status);
    final isTerminal = application.status == KtaAppStatus.rejected ||
        application.status == KtaAppStatus.cancelled;

    _LevelStatus statusAt(int idx) {
      if (isTerminal) return idx < currentIndex ? _LevelStatus.done : _LevelStatus.pending;
      if (currentIndex < 0) return _LevelStatus.pending;
      if (idx < currentIndex) return _LevelStatus.done;
      if (idx == currentIndex) return _LevelStatus.current;
      return _LevelStatus.pending;
    }

    String? actor(KtaAppLevel level) {
      final h = histFor(level);
      return h?.actorRole.replaceAll('_', ' ').toUpperCase();
    }

    DateTime? ts(KtaAppLevel level) => histFor(level)?.createdAt;

    return [
      _WorkflowStep(
        label: 'Anggota',
        description: 'Pengajuan diterima sistem',
        status: statusAt(0),
        actor: actor(KtaAppLevel.member) ?? 'Anda',
        timestamp: ts(KtaAppLevel.member) ?? application.createdAt,
      ),
      _WorkflowStep(
        label: 'Ranting',
        description: 'Review & persetujuan ranting',
        status: statusAt(1),
        actor: actor(KtaAppLevel.ranting),
        timestamp: ts(KtaAppLevel.ranting),
      ),
      _WorkflowStep(
        label: 'Wilayah',
        description: 'Review & persetujuan wilayah',
        status: statusAt(2),
        actor: actor(KtaAppLevel.wilayah),
        timestamp: ts(KtaAppLevel.wilayah),
      ),
      _WorkflowStep(
        label: 'Distrik',
        description: 'Review & persetujuan distrik',
        status: statusAt(3),
        actor: actor(KtaAppLevel.distrik),
        timestamp: ts(KtaAppLevel.distrik),
      ),
      _WorkflowStep(
        label: 'Nasional',
        description: 'Final approve & terbit nomor anggota',
        status: statusAt(4),
        actor: actor(KtaAppLevel.nasional),
        timestamp: ts(KtaAppLevel.nasional),
      ),
      _WorkflowStep(
        label: 'Distrik (Proses)',
        description: 'Biaya, pembayaran & generate kartu',
        status: statusAt(5),
        actor: application.diterbitkanOleh == null ? null : 'Admin Distrik',
        timestamp: application.diterbitkanAt,
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(int.parse('FF${application.statusColorHex}', radix: 16));
    final steps = _buildSteps();

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
              children: [
                Icon(Icons.credit_card, size: 40, color: color),
                const SizedBox(height: AppTheme.space8),
                Text(
                  application.statusLabel,
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: color),
                ),
                if (application.nomorAnggota != null) ...[
                  const SizedBox(height: AppTheme.space12),
                  Text(
                    application.nomorAnggota!,
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                  ),
                ],
              ],
            ),
          ),
        ),
        const SizedBox(height: AppTheme.space20),
        const Text('Alur Proses', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
        const SizedBox(height: AppTheme.space12),
        ...steps.asMap().entries.map((entry) => _StepTile(
              step: entry.value,
              isLast: entry.key == steps.length - 1,
            )),
        const SizedBox(height: AppTheme.space24),
        if (application.isCompleted)
          FilledButton.icon(
            onPressed: () => context.push('/kta/viewer'),
            icon: const Icon(Icons.credit_card),
            label: const Text('Lihat KTA Digital'),
          )
        else if (application.isRejected)
          FilledButton.icon(
            onPressed: () => context.read<KtaApplicationBloc>().add(const KtaApplicationSubmitRequested()),
            icon: const Icon(Icons.refresh),
            label: const Text('Ajukan Ulang'),
          )
        else if (application.status == KtaAppStatus.paymentPending ||
            application.status == KtaAppStatus.paymentSetup)
          const SizedBox.shrink(),
      ],
    );
  }
}

class _StepTile extends StatelessWidget {
  final _WorkflowStep step;
  final bool isLast;

  const _StepTile({required this.step, required this.isLast});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final (color, icon) = switch (step.status) {
      _LevelStatus.done => (Colors.green, Icons.check),
      _LevelStatus.current => (Colors.blue, Icons.hourglass_empty),
      _LevelStatus.pending => (Colors.grey, Icons.radio_button_unchecked),
    };

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              Container(
                width: 26,
                height: 26,
                decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                child: Icon(icon, size: 15, color: Colors.white),
              ),
              if (!isLast)
                Expanded(
                  child: Container(width: 2, color: scheme.outlineVariant),
                ),
            ],
          ),
          const SizedBox(width: AppTheme.space16),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: AppTheme.space20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        step.label,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: step.status == _LevelStatus.pending
                              ? scheme.onSurfaceVariant
                              : null,
                        ),
                      ),
                      const SizedBox(width: AppTheme.space8),
                      if (step.status == _LevelStatus.current)
                        Text('Sedang Diproses',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: color)),
                    ],
                  ),
                  Text(step.description,
                      style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant)),
                  if (step.timestamp != null)
                    Text(Formatters.dateLong(step.timestamp!.toIso8601String()),
                        style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant)),
                  if (step.actor != null && step.status != _LevelStatus.pending)
                    Text('Oleh: ${step.actor}',
                        style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
