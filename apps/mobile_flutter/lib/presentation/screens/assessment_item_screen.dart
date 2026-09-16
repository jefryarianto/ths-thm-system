import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/snack_bar_helper.dart';
import '../../data/models/graduation.dart';
import '../../logic/assessments/assessment_bloc.dart';
import '../../logic/assessments/assessment_event.dart';
import '../../logic/assessments/assessment_state.dart';
import '../widgets/app_loading_spinner.dart';

/// F2 - Kelola **item penilaian** milik satu aspek: daftar, tambah, ubah,
/// & hapus. Juga menampilkan skor maksimal & urutan tiap item.
class AssessmentItemScreen extends StatefulWidget {
  final String kegiatanId;
  final String aspekId;
  final String namaAspek;
  const AssessmentItemScreen({
    super.key,
    required this.kegiatanId,
    required this.aspekId,
    required this.namaAspek,
  });

  @override
  State<AssessmentItemScreen> createState() => _AssessmentItemScreenState();
}

class _AssessmentItemScreenState extends State<AssessmentItemScreen> {
  @override
  void initState() {
    super.initState();
    context
        .read<AssessmentBloc>()
        .add(AssessmentItemsRequested(widget.aspekId));
  }

  Future<void> _refresh() async {
    if (!mounted) return;
    context
        .read<AssessmentBloc>()
        .add(AssessmentItemsRequested(widget.aspekId));
  }

  void _openCreate() {
    final kodeCtrl = TextEditingController();
    final namaCtrl = TextEditingController();
    final skorCtrl = TextEditingController(text: '100');
    final bobotCtrl = TextEditingController(text: '100');
    final urutanCtrl = TextEditingController(text: '1');
    final formKey = GlobalKey<FormState>();

    showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Tambah Item'),
          content: SingleChildScrollView(
            child: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    controller: kodeCtrl,
                    textCapitalization: TextCapitalization.characters,
                    decoration: const InputDecoration(
                      labelText: 'Kode Item *',
                      hintText: 'contoh: I-01',
                    ),
                    validator: (v) =>
                        (v == null || v.trim().isEmpty) ? 'Wajib diisi' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: namaCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Nama Item *',
                      hintText: 'contoh: Kesesuaian Isi & Bab',
                    ),
                    validator: (v) =>
                        (v == null || v.trim().isEmpty) ? 'Wajib diisi' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: skorCtrl,
                    keyboardType:
                        const TextInputType.numberWithOptions(decimal: true),
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
                    ],
                    decoration: const InputDecoration(
                      labelText: 'Skor Maksimal *',
                    ),
                    validator: (v) =>
                        (v == null || v.trim().isEmpty) ? 'Wajib diisi' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: bobotCtrl,
                    keyboardType:
                        const TextInputType.numberWithOptions(decimal: true),
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
                    ],
                    decoration: const InputDecoration(
                      labelText: 'Bobot (poin)',
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: urutanCtrl,
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    decoration: const InputDecoration(
                      labelText: 'Urutan (opsional)',
                    ),
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
                context.read<AssessmentBloc>().add(
                      AssessmentItemCreateRequested(
                        aspekId: widget.aspekId,
                        kodeItem: kodeCtrl.text.trim(),
                        namaItem: namaCtrl.text.trim(),
                        skorMaksimal:
                            double.tryParse(skorCtrl.text.trim()) ?? 0,
                        bobot: double.tryParse(bobotCtrl.text.trim()) ?? 0,
                        urutan: int.tryParse(urutanCtrl.text.trim()),
                      ),
                    );
                Navigator.of(dialogContext).pop();
              },
              child: const Text('Simpan'),
            ),
          ],
        );
      },
    );
  }

  void _openEdit(AssessmentItem item) {
    final kodeCtrl = TextEditingController(text: item.kodeItem);
    final namaCtrl = TextEditingController(text: item.namaItem);
    final skorCtrl =
        TextEditingController(text: item.skorMaksimal.toStringAsFixed(0));
    final bobotCtrl = TextEditingController(text: '100');
    final urutanCtrl = TextEditingController(text: '${item.urutan}');
    final formKey = GlobalKey<FormState>();

    showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Ubah Item'),
          content: SingleChildScrollView(
            child: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    controller: kodeCtrl,
                    textCapitalization: TextCapitalization.characters,
                    decoration: const InputDecoration(
                      labelText: 'Kode Item *',
                    ),
                    validator: (v) =>
                        (v == null || v.trim().isEmpty) ? 'Wajib diisi' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: namaCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Nama Item *',
                    ),
                    validator: (v) =>
                        (v == null || v.trim().isEmpty) ? 'Wajib diisi' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: skorCtrl,
                    keyboardType:
                        const TextInputType.numberWithOptions(decimal: true),
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
                    ],
                    decoration: const InputDecoration(
                      labelText: 'Skor Maksimal *',
                    ),
                    validator: (v) =>
                        (v == null || v.trim().isEmpty) ? 'Wajib diisi' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: bobotCtrl,
                    keyboardType:
                        const TextInputType.numberWithOptions(decimal: true),
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
                    ],
                    decoration: const InputDecoration(
                      labelText: 'Bobot (poin)',
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: urutanCtrl,
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    decoration: const InputDecoration(
                      labelText: 'Urutan (opsional)',
                    ),
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
                context.read<AssessmentBloc>().add(
                      AssessmentItemUpdateRequested(
                        aspekId: widget.aspekId,
                        itemId: item.id,
                        namaItem: namaCtrl.text.trim(),
                        skorMaksimal:
                            double.tryParse(skorCtrl.text.trim()) ?? 0,
                        bobot: double.tryParse(bobotCtrl.text.trim()) ?? 0,
                      ),
                    );
                Navigator.of(dialogContext).pop();
              },
              child: const Text('Simpan'),
            ),
          ],
        );
      },
    );
  }

  void _confirmDelete(AssessmentItem item) {
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Hapus Item'),
        content: Text('Hapus item "${item.namaItem}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Batal'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppTheme.danger),
            onPressed: () {
              context.read<AssessmentBloc>().add(
                    AssessmentItemDeleteRequested(
                      aspekId: widget.aspekId,
                      itemId: item.id,
                    ),
                  );
              Navigator.of(dialogContext).pop();
            },
            child: const Text('Hapus'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Item ${widget.namaAspek}')),
      body: BlocConsumer<AssessmentBloc, AssessmentState>(
        listener: (context, state) {
          if (state is AssessmentError) {
            showCenteredSnackBar(context, state.message);
          } else if (state is AssessmentItemSaved) {
            showCenteredSnackBar(context, state.message);
          } else if (state is AssessmentAspectSaved) {
            showCenteredSnackBar(context, state.message);
          }
        },
        builder: (context, state) {
          if (state is AssessmentLoading) {
            return const AppLoadingSpinner();
          }
          if (state is AssessmentError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.error_outline,
                        size: 48, color: AppTheme.danger),
                    const SizedBox(height: 12),
                    Text(state.message,
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.grey)),
                    const SizedBox(height: 12),
                    FilledButton.icon(
                      onPressed: _refresh,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Coba lagi'),
                    ),
                  ],
                ),
              ),
            );
          }
          final items = state is AssessmentLoaded
              ? state.items
              : const <AssessmentItem>[];
          if (items.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.notes_outlined,
                        size: 56, color: AppTheme.primary),
                    const SizedBox(height: 12),
                    const Text(
                      'Belum ada item penilaian.',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Tambahkan komponen yang dinilai, misalnya '
                      '"Kesesuaian Isi" atau "Penyajian".',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.grey),
                    ),
                    const SizedBox(height: 16),
                    FilledButton.icon(
                      onPressed: _openCreate,
                      icon: const Icon(Icons.add),
                      label: const Text('Tambah Item'),
                    ),
                  ],
                ),
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: items.length + 1,
              separatorBuilder: (context, index) => (index == items.length - 1)
                  ? const SizedBox(height: 16)
                  : const SizedBox(height: 12),
              itemBuilder: (context, index) {
                if (index == items.length) {
                  return OutlinedButton.icon(
                    onPressed: _openCreate,
                    icon: const Icon(Icons.add),
                    label: const Text('Tambah Item'),
                  );
                }
                final item = items[index];
                return Card(
                  margin: EdgeInsets.zero,
                  child: ListTile(
                    leading: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      alignment: Alignment.center,
                      child: const Icon(Icons.rule_outlined,
                          size: 20, color: AppTheme.primary),
                    ),
                    title: Text(item.namaItem,
                        style: const TextStyle(
                            fontSize: 15, fontWeight: FontWeight.w600)),
                    subtitle: Text(
                        '${item.kodeItem}  ·  skor maks: ${item.skorMaksimal.toStringAsFixed(0)}'
                        "${item.kodeItem} · skor maks: ${item.skorMaksimal.toStringAsFixed(0)}"
                        " · urutan: ${item.urutan}"),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          onPressed: () => _openEdit(item),
                          icon: const Icon(Icons.edit_outlined, size: 20),
                          tooltip: 'Ubah',
                        ),
                        IconButton(
                          onPressed: () => _confirmDelete(item),
                          icon: const Icon(Icons.delete_outline,
                              size: 20, color: AppTheme.danger),
                          tooltip: 'Hapus',
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
