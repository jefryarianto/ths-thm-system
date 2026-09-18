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
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: AppTheme.danger),
            const SizedBox(height: 12),
            Text(message, style: const TextStyle(color: Colors.grey)),
            const SizedBox(height: 12),
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

  const _ScoringReadyView({
    required this.kegiatanId,
    required this.ujianPraktekId,
    required this.ujianStatus,
    required this.aspects,
    required this.participants,
    required this.skorByItem,
  });

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async {
        // force: data/sesi bisa berubah — ambil ulang semua dari server.
        context.read<AssessmentBloc>().add(
              AssessmentScoreCardRequested(kegiatanId, force: true),
            );
      },
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: participants.length + 1,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          if (index == participants.length) {
            return _buildSessionInfo();
          }
          return _buildParticipantCard(context, participants[index]);
        },
      ),
    );
  }

  Widget _buildSessionInfo() {
    return Card(
      margin: EdgeInsets.zero,
      color: AppTheme.primaryContainer.withValues(alpha: 0.4),
      child: ListTile(
        leading: const Icon(
            Icons.calendar_today_outlined, color: AppTheme.primary),
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

  Widget _buildParticipantCard(BuildContext context, GraduationParticipant p) {
    final hasSession = ujianPraktekId != null;
    return Card(
      margin: EdgeInsets.zero,
      child: ListTile(
        leading: CircleAvatar(
          radius: 20,
          child: Text(
            p.namaLengkap.isNotEmpty ? p.namaLengkap[0].toUpperCase() : '?',
          ),
        ),
        title: Text(p.namaLengkap),
        subtitle: Text(
          '${p.nomorAnggota.isEmpty ? '—' : p.nomorAnggota} · ${aspects.length} aspek penilaian',
          style: const TextStyle(fontSize: 12),
        ),
        trailing: Icon(
          Icons.edit_note_outlined,
          color: hasSession ? AppTheme.primary : Colors.grey,
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
