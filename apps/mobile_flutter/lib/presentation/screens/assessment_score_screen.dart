import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../logic/assessments/assessment_bloc.dart';
import '../../logic/assessments/assessment_event.dart';
import 'assessment_score_body.dart';

/// F3 - Layar input nilai pendadaran oleh penguji.
///
/// Wrapper di sekitar [AssessmentScoreBody] yang memicu pemuatan
/// peserta, aspek, dan sesi ujian praktek saat layar pertama kali
/// dibangun.
class AssessmentScoreScreen extends StatefulWidget {
  final String kegiatanId;
  const AssessmentScoreScreen({super.key, required this.kegiatanId});

  @override
  State<AssessmentScoreScreen> createState() => _AssessmentScoreScreenState();
}

class _AssessmentScoreScreenState extends State<AssessmentScoreScreen> {
  @override
  void initState() {
    super.initState();
    // Satu request agregat: ujian aktif + aspek/item + peserta + skor
    // milik penguji (endpoint my-score-card).
    context.read<AssessmentBloc>().add(
          AssessmentScoreCardRequested(widget.kegiatanId, force: true),
        );
  }

  Future<void> _refresh() async {
    // force: data/sesi bisa berubah — selalu ambil ulang dari server.
    context.read<AssessmentBloc>().add(
          AssessmentScoreCardRequested(widget.kegiatanId, force: true),
        );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Input Nilai Pendadaran')),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: AssessmentScoreBody(kegiatanId: widget.kegiatanId),
      ),
    );
  }
}
