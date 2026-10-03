import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/theme/app_theme.dart';
import '../../data/models/graduation.dart';
import '../../logic/assessments/assessment_bloc.dart';
import '../../logic/assessments/assessment_event.dart';
import '../../logic/assessments/assessment_state.dart';
import '../../core/utils/snack_bar_helper.dart';
import '../widgets/app_loading_spinner.dart';
import 'assessment_score_dialog.dart';

/// F3+ - Body layar input nilai penguji (bulk per peserta via ujian praktek).
///
/// Semua data datang dari SATU state [AssessmentScoreCardReady] (hasil
/// endpoint agregat my-score-card): ujian praktek aktif, aspek+item,
/// daftar peserta, dan skor milik penguji yang sudah tersimpan.
///
/// Penanganan state:
///  - [AssessmentScoreCardReady]: tampilkan daftar peserta (ujianPraktekId
///    boleh null → kartu peserta nonaktif dengan pesan "belum ada sesi").
///  - [AssessmentError]: pesan error + tombol coba lagi.
///  - Selain itu (Initial/Loading): spinner.
class AssessmentScoreBody extends StatefulWidget {
  final String kegiatanId;

  const AssessmentScoreBody({super.key, required this.kegiatanId});

  @override
  State<AssessmentScoreBody> createState() => _AssessmentScoreBodyState();
}

class _AssessmentScoreBodyState extends State<AssessmentScoreBody> {
  @override
  Widget build(BuildContext context) {
    return BlocConsumer<AssessmentBloc, AssessmentState>(
      listener: (context, state) {
        if (state is AssessmentError) {
          showCenteredSnackBar(context, state.message);
        } else if (state is AssessmentScoreSaved) {
          showCenteredSnackBar(context, state.message);
        }
      },
      builder: (context, state) {
        if (state is AssessmentScoreCardReady) {
          return _ScoringReadyView(
            kegiatanId: widget.kegiatanId,
            ujianPraktekId: state.ujianPraktekId,
            ujianStatus: state.ujianStatus,
            aspects: state.aspects,
            participants: state.participants,
            skorByItem: state.skorByItem,
            pendingOutboxCount: state.pendingOutboxCount,
            pendingCandidateIds: state.pendingCandidateIds,
            isOfflineMode: state.isOfflineMode,
          );
        }
        if (state is AssessmentError) {
          return _buildError(state.message, context);
        }
        // AssessmentInitial, AssessmentLoading, AssessmentScoreSaved, dll.
        return const AppLoadingSpinner();
      },
    );
  }

  Widget _buildError(String message, BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppTheme.space24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline,
                size: 48, color: Theme.of(context).colorScheme.error),
            const SizedBox(height: AppTheme.space12),
            Text(message,
                style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurfaceVariant)),
            const SizedBox(height: AppTheme.space12),
            FilledButton.icon(
              onPressed: () {
                context.read<AssessmentBloc>().add(
                      AssessmentScoreCardRequested(widget.kegiatanId,
                          force: true),
                    );
              },
              icon: const Icon(Icons.refresh),
              label: const Text('Coba lagi'),
            ),
          ],
        ),
      ),
    );
  }
}

/// Widget yang menampilkan daftar peserta dari state agregat
/// [AssessmentScoreCardReady].
class _ScoringReadyView extends StatelessWidget {
  final String kegiatanId;
  final String? ujianPraktekId;
  final String? ujianStatus;
  final List<AssessmentAspect> aspects;
  final List<GraduationParticipant> participants;
  final Map<String, ({double skor, String? komentar})> skorByItem;
  final int pendingOutboxCount;
  final Set<String> pendingCandidateIds;
  final bool isOfflineMode;

  const _ScoringReadyView({
    required this.kegiatanId,
    required this.ujianPraktekId,
    required this.ujianStatus,
    required this.aspects,
    required this.participants,
    required this.skorByItem,
    this.pendingOutboxCount = 0,
    this.pendingCandidateIds = const {},
    this.isOfflineMode = false,
  });

  @override
  Widget build(BuildContext context) {
    final hasOutbox = pendingOutboxCount > 0;
    final extraHeaderCount = (isOfflineMode || hasOutbox) ? 1 : 0;
    final totalItems = participants.length + 1 + extraHeaderCount;

    return RefreshIndicator(
      onRefresh: () async {
        context.read<AssessmentBloc>().add(
              AssessmentScoreCardRequested(kegiatanId, force: true),
            );
      },
      child: ListView.separated(
        padding: const EdgeInsets.all(AppTheme.space16),
        itemCount: totalItems,
        separatorBuilder: (_, __) => const SizedBox(height: AppTheme.space12),
        itemBuilder: (context, index) {
          if (extraHeaderCount > 0 && index == 0) {
            return _buildOfflineBanner(context);
          }
          final adjustedIndex = index - extraHeaderCount;
          if (adjustedIndex == participants.length) {
            return _buildSessionInfo(context);
          }
          final participant = participants[adjustedIndex];
          final isPendingSync = pendingCandidateIds.contains(participant.id);
          return _buildParticipantCard(context, participant, isPendingSync: isPendingSync);
        },
      ),
    );
  }

  Widget _buildOfflineBanner(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppTheme.space12),
      decoration: BoxDecoration(
        color: isOfflineMode
            ? AppTheme.warningOf(context).withValues(alpha: 0.15)
            : Theme.of(context).colorScheme.primaryContainer.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isOfflineMode
              ? AppTheme.warningOf(context)
              : Theme.of(context).colorScheme.primary,
          width: 1,
        ),
      ),
      child: Row(
        children: [
          Icon(
            isOfflineMode ? Icons.cloud_off : Icons.cloud_upload_outlined,
            color: isOfflineMode
                ? AppTheme.warningOf(context)
                : Theme.of(context).colorScheme.primary,
          ),
          const SizedBox(width: AppTheme.space12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isOfflineMode ? 'Mode Offline' : 'Antrean Outbox',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                ),
                Text(
                  pendingOutboxCount > 0
                      ? '$pendingOutboxCount nilai tersimpan lokal dan siap disinkronkan'
                      : 'Data diambil dari cache lokal',
                  style: TextStyle(
                      fontSize: 12,
                      color: Theme.of(context).colorScheme.onSurfaceVariant),
                ),
              ],
            ),
          ),
          if (pendingOutboxCount > 0)
            FilledButton.tonal(
              onPressed: () {
                context.read<AssessmentBloc>().add(
                      AssessmentOutboxSyncRequested(kegiatanId: kegiatanId),
                    );
              },
              child: const Text('Sinkron', style: TextStyle(fontSize: 12)),
            ),
        ],
      ),
    );
  }

  Widget _buildSessionInfo(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      color: Theme.of(context).colorScheme.primaryContainer.withValues(alpha: 0.4),
      child: ListTile(
        leading: Icon(Icons.calendar_today_outlined,
            color: Theme.of(context).colorScheme.primary),
        title: const Text('Sesi Ujian Praktek'),
        subtitle: Text(
          ujianPraktekId != null
              ? 'ID: $ujianPraktekId${ujianStatus != null ? ' · status: $ujianStatus' : ''} — aktif untuk semua peserta'
              : 'Belum ada sesi ujian praktek aktif — hubungi admin kegiatan',
          style: const TextStyle(fontSize: 12),
        ),
        isThreeLine: true,
      ),
    );
  }

  Widget _buildParticipantCard(BuildContext context, GraduationParticipant p, {bool isPendingSync = false}) {
    final hasSession = ujianPraktekId != null;
    return Card(
      margin: EdgeInsets.zero,
      child: ListTile(
        leading: Stack(
          children: [
            CircleAvatar(
              radius: 20,
              child: Text(
                p.namaLengkap.isNotEmpty ? p.namaLengkap[0].toUpperCase() : '?',
              ),
            ),
            if (isPendingSync)
              Positioned(
                right: 0,
                bottom: 0,
                child: CircleAvatar(
                  radius: 6,
                  backgroundColor: Theme.of(context).colorScheme.surface,
                  child: CircleAvatar(
                    radius: 5,
                    backgroundColor: AppTheme.warningOf(context),
                  ),
                ),
              ),
          ],
        ),
        title: Row(
          children: [
            Expanded(child: Text(p.namaLengkap)),
            if (isPendingSync)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: AppTheme.warningOf(context).withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  'Offline Draft',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.warningOf(context),
                  ),
                ),
              ),
          ],
        ),
        subtitle: Text(
          '${p.nomorAnggota.isEmpty ? '—' : p.nomorAnggota} · ${aspects.length} aspek penilaian',
          style: const TextStyle(fontSize: 12),
        ),
        trailing: Icon(
          Icons.edit_note_outlined,
          color: hasSession
              ? Theme.of(context).colorScheme.primary
              : Theme.of(context).colorScheme.outline,
        ),
        enabled: hasSession,
        onTap: hasSession ? () => _openScoreDialog(context, p) : null,
      ),
    );
  }

  Future<void> _openScoreDialog(BuildContext context, GraduationParticipant p) async {
    final bloc = context.read<AssessmentBloc>();
    final currentState = bloc.state;
    final ready = currentState is AssessmentScoreCardReady ? currentState : null;
    // Gunakan aspek & skor dari state saat ini; fallback parameter.
    final currentAspects = ready?.aspects ?? aspects;
    final existing = ready?.skorByItem ?? skorByItem;

    await showDialog<void>(
      context: context,
      builder: (dialogCtx) {
        return AssessmentScoreDialog(
          pesertaNama: p.namaLengkap,
          aspekList: currentAspects,
          kegiatanId: kegiatanId,
          calonAnggotaId: p.id,
          ujianPraktekId: ujianPraktekId ?? '',
          existingScores: existing,
        );
      },
    );
    // Setelah dialog ditutup (nilai mungkin sudah dikirim), muat ulang
    // skor milik penguji agar progres kartu & prefill berikutnya akurat.
    bloc.add(AssessmentScoreCardRequested(kegiatanId, force: true));
  }
}
