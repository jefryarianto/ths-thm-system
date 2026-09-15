
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../data/models/graduation.dart';
import '../../logic/assessments/assessment_bloc.dart';
import '../../logic/assessments/assessment_event.dart';
import '../../logic/assessments/assessment_state.dart';
import '../../logic/auth/auth_bloc.dart';
import '../widgets/app_loading_spinner.dart';

/// F3 - Input nilai pendadaran oleh penguji: pilih peserta (calon anggota),
/// lalu isi skor per item penilaian. Status "sudah dinilai" dicegah duplikat.
class AssessmentScoreScreen extends StatefulWidget {
  final String kegiatanId;
  const AssessmentScoreScreen({super.key, required this.kegiatanId});

  @override
  State<AssessmentScoreScreen> createState() => _AssessmentScoreScreenState();
}

class _AssessmentScoreScreenState extends State<AssessmentScoreScreen> {
  String? get _pengujiUserId {
    final auth = context.read<AuthBloc>().state;
    return auth is AuthAuthenticated ? auth.user.id : null;
  }

  @override
  void initState() {
    super.initState();
    context
        .read<AssessmentBloc>()
        .add(AssessmentParticipantsRequested(widget.kegiatanId));
  }

  Future<void> _refresh() async {
    context
        .read<AssessmentBloc>()
        .add(AssessmentParticipantsRequested(widget.kegiatanId));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Input Nilai Pendadaran')),
      body: BlocConsumer<AssessmentBloc, AssessmentState>(
        listener: (context, state) {
          if (state is AssessmentError) {
            ScaffoldMessenger.of(context)
                .showSnackBar(SnackBar(content: Text(state.message)));
          } else if (state is AssessmentScoreSaved) {
            ScaffoldMessenger.of(context)
                .showSnackBar(SnackBar(content: Text(state.message)));
          }
        },
        builder: (context, state) {
          if (state is AssessmentLoading) {
            return const AppLoadingSpinner();
          }
          if (state is AssessmentParticipantsLoaded) {
            final participants = state.participants;
            if (participants.isEmpty) {
              return const Center(child: Text('Belum ada peserta'));
            }
            return RefreshIndicator(
              onRefresh: _refresh,
              child: ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: participants.length,
                separatorBuilder: (context, index) =>
                    const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final p = participants[index];
                  return Card(
                    margin: EdgeInsets.zero,
                    child: ListTile(
                      leading: CircleAvatar(
                        radius: 20,
                        child: Text(p.namaLengkap.isNotEmpty
                            ? p.namaLengkap[0].toUpperCase()
                            : '?'),
                      ),
                      title: Text(p.namaLengkap),
                      subtitle: Text(p.nomorAnggota),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => _showScoreForm(p),
                    ),
                  );
                },
              ),
            );
          }
          return const AppLoadingSpinner();
        },
      ),
    );
  }

  void _showScoreForm(GraduationParticipant peserta) {
    final formKey = GlobalKey<FormState>();
    // Gunakan aspek & item yg disediakan bloc (F2) utk mengisi nilai.
    final aspekDariState = context.read<AssessmentBloc>().state;
    List<AssessmentAspect> aspekList = const <AssessmentAspect>[];
    List<AssessmentItem> itemList = const <AssessmentItem>[];
    if (aspekDariState is AssessmentLoaded) {
      aspekList = aspekDariState.aspects;
      itemList = aspekDariState.items;
    }
    // Jika daftar aspek belum ada, minta muat aspek utk kegiatan ini.
    if (aspekList.isEmpty) {
      context
          .read<AssessmentBloc>()
          .add(AssessmentAspectsRequested(widget.kegiatanId));
    }

    String? aspekId;
    String? itemId;
    final skorCtrl = TextEditingController();
    final catatanCtrl = TextEditingController();
    final pengujiId = _pengujiUserId;

    if (pengujiId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sesi pengguna berakhir. Silakan login')),
      );
      return;
    }
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text('Nilai — ${peserta.namaLengkap}'),
        content: SingleChildScrollView(
          child: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                const Text('Pilih aspek & item, lalu isi skornya.'),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: aspekId,
                  decoration: const InputDecoration(labelText: 'Aspek *'),
                  items: aspekList
                      .map((a) => DropdownMenuItem<String>(
                            value: a.id,
                            child: Text(a.namaAspek),
                          ))
                      .toList(),
                  onChanged: (v) => aspekId = v,
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: itemId,
                  decoration: const InputDecoration(labelText: 'Item *'),
                  items: itemList
                      .map((i) => DropdownMenuItem<String>(
                            value: i.id,
                            child: Text(
                                '${i.namaItem} (maks ${i.skorMaksimal.toStringAsFixed(0)})'),
                          ))
                      .toList(),
                  onChanged: (v) => itemId = v,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: skorCtrl,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
                  ],
                  decoration: const InputDecoration(labelText: 'Skor *'),
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Wajib diisi' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: catatanCtrl,
                  decoration:
                      const InputDecoration(labelText: 'Catatan (opsional)'),
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () {
              if (!formKey.currentState!.validate()) return;
              if (aspekId == null || itemId == null) {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                    content: Text('Pilih aspek & item penilaian')));
                return;
              }
              context.read<AssessmentBloc>().add(
                    AssessmentScoreSubmitRequested(
                      kegiatanId: widget.kegiatanId,
                      calonAnggotaId: peserta.id,
                      itemPenilaianId: itemId!,
                      pengujiUserId: pengujiId,
                      skor: double.tryParse(skorCtrl.text.trim()) ?? 0,
                      catatan: catatanCtrl.text.trim().isEmpty
                          ? null
                          : catatanCtrl.text.trim(),
                    ),
                  );
              Navigator.of(dialogContext).pop();
            },
            child: const Text('Simpan'),
          ),
        ],
      ),
    );
  }
}
