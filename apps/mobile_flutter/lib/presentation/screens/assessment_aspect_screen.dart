import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/snack_bar_helper.dart';
import '../../data/models/graduation.dart';
import '../../logic/assessments/assessment_bloc.dart';
import '../../logic/assessments/assessment_event.dart';
import '../../logic/assessments/assessment_state.dart';
import '../widgets/app_loading_spinner.dart';

/// F2 - Kelola kriteria penilaian pendadaran: daftar **aspek**, dengan
/// tambah/edit/hapus. Ketuk aspek untuk kelola item-nya.
class AssessmentAspectScreen extends StatefulWidget {
  final String kegiatanId;
  const AssessmentAspectScreen({super.key, required this.kegiatanId});

  @override
  State<AssessmentAspectScreen> createState() => _AssessmentAspectScreenState();
}

class _AssessmentAspectScreenState extends State<AssessmentAspectScreen> {
  @override
  void initState() {
    super.initState();
    context
        .read<AssessmentBloc>()
        .add(AssessmentAspectsRequested(widget.kegiatanId));
  }

  Future<void> _refresh() async {
    context
        .read<AssessmentBloc>()
        .add(AssessmentAspectsRequested(widget.kegiatanId));
  }

  void _openCreate() {
    _showFormDialog(context, null);
  }

  void _showFormDialog(BuildContext context, AssessmentAspect? aspek) {
    final isEdit = aspek != null;
    final kodeCtrl = TextEditingController(text: aspek?.kodeAspek ?? '');
    final namaCtrl = TextEditingController(text: aspek?.namaAspek ?? '');
    final deskripsiCtrl = TextEditingController(text: aspek?.deskripsi ?? '');
    final bobotCtrl =
        TextEditingController(text: aspek?.bobot.toStringAsFixed(2) ?? '0');
    showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: Text(isEdit ? 'Ubah Aspek' : 'Tambah Aspek'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: kodeCtrl,
                  autocorrect: false,
                  textCapitalization: TextCapitalization.characters,
                  decoration: const InputDecoration(
                    labelText: 'Kode Aspek *',
                    hintText: 'contoh: A1',
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: namaCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Nama Aspek *',
                    hintText: 'contoh: Penulisan Karya Ilmiah',
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: deskripsiCtrl,
                  maxLines: 2,
                  decoration: const InputDecoration(
                    labelText: 'Deskripsi',
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: bobotCtrl,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]')),
                  ],
                  decoration: const InputDecoration(
                    labelText: 'Bobot (%)',
                    suffixText: '%',
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('Batal'),
            ),
            FilledButton(
              onPressed: () => _submit(
                  context,
                  isEdit,
                  aspek,
                  kodeCtrl.text,
                  namaCtrl.text,
                  deskripsiCtrl.text,
                  _parseBobot(bobotCtrl.text)),
              child: Text(isEdit ? 'Simpan' : 'Tambah'),
            ),
          ],
        );
      },
    );
  }

  double _parseBobot(String raw) {
    final cleaned = raw.trim().replaceAll(',', '.');
    final v = double.tryParse(cleaned);
    return v ?? 0;
  }

  void _submit(BuildContext dialogContext, bool isEdit, AssessmentAspect? aspek,
      String kode, String nama, String deskripsi, double bobot) {
    if (kode.isEmpty || nama.isEmpty) {
      showCenteredSnackBar(dialogContext, 'Kode dan nama aspek wajib diisi');
      return;
    }
    final bloc = context.read<AssessmentBloc>();
    if (isEdit && aspek != null) {
      bloc.add(AssessmentAspectUpdateRequested(
        aspekId: aspek.id,
        namaAspek: nama,
        deskripsi: deskripsi.isEmpty ? null : deskripsi,
        bobot: bobot,
      ));
    } else {
      bloc.add(AssessmentAspectCreateRequested(
        kegiatanId: widget.kegiatanId,
        kodeAspek: kode,
        namaAspek: nama,
        deskripsi: deskripsi.isEmpty ? null : deskripsi,
        bobot: bobot,
      ));
    }
    Navigator.of(dialogContext).pop(); // tutup dialog; hasil lewat listener
  }

  void _confirmDelete(AssessmentAspect aspek) {
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Hapus Aspek'),
        content:
            Text('Hapus aspek "${aspek.namaAspek}" beserta seluruh itemnya?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Batal'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: AppTheme.danger,
            ),
            onPressed: () {
              context
                  .read<AssessmentBloc>()
                  .add(AssessmentAspectDeleteRequested(aspek.id));
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
      appBar: AppBar(
        title: const Text('Kriteria Penilaian'),
        actions: [
          IconButton(
            onPressed: _refresh,
            icon: const Icon(Icons.refresh),
            tooltip: 'Segarkan',
          ),
        ],
      ),
      body: BlocConsumer<AssessmentBloc, AssessmentState>(
        listener: (context, state) {
          if (state is AssessmentError) {
            showCenteredSnackBar(context, state.message);
          } else if (state is AssessmentAspectSaved) {
            showCenteredSnackBar(context, state.message);
          }
        },
        builder: (context, state) {
          if (state is AssessmentLoading) {
            return const AppLoadingSpinner();
          }
          if (state is AssessmentLoaded) {
            final aspects = state.aspects;
            if (aspects.isEmpty) {
              return _EmptyAspects(onCreate: _openCreate);
            }
            return RefreshIndicator(
              onRefresh: _refresh,
              child: ListView.separated(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                itemCount: aspects.length + 1,
                separatorBuilder: (context, index) =>
                    (index == aspects.length - 1)
                        ? const SizedBox(height: 16)
                        : const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  if (index == aspects.length) {
                    return OutlinedButton.icon(
                      onPressed: _openCreate,
                      icon: const Icon(Icons.add),
                      label: const Text('Tambah Aspek'),
                    );
                  }
                  final aspek = aspects[index];
                  return _AspectCard(
                    aspek: aspek,
                    onTap: () => context.push(
                        '/pendadaran/${widget.kegiatanId}/kriteria/${aspek.id}'
                        '?nama=${Uri.encodeComponent(aspek.namaAspek)}'),
                    onEdit: () => _showFormDialog(context, aspek),
                    onDelete: () => _confirmDelete(aspek),
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
}

class _AspectCard extends StatelessWidget {
  final AssessmentAspect aspek;
  final VoidCallback onTap;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  const _AspectCard({
    required this.aspek,
    required this.onTap,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppTheme.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.category_outlined,
                    color: AppTheme.primary, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      aspek.namaAspek,
                      style: const TextStyle(
                          fontSize: 15, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${aspek.kodeAspek}  ·  Bobot ${aspek.bobot.toStringAsFixed(1)}%'
                      '${aspek.items.isNotEmpty ? '  ·  ${aspek.items.length} item' : ''}',
                      style:
                          TextStyle(fontSize: 12, color: Colors.grey.shade600),
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: onEdit,
                icon: const Icon(Icons.edit_outlined, size: 20),
                tooltip: 'Ubah',
              ),
              IconButton(
                onPressed: onDelete,
                icon: const Icon(Icons.delete_outline,
                    size: 20, color: AppTheme.danger),
                tooltip: 'Hapus',
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _EmptyAspects extends StatelessWidget {
  final VoidCallback onCreate;
  const _EmptyAspects({required this.onCreate});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.category_outlined,
                size: 56, color: AppTheme.primary),
            const SizedBox(height: 12),
            const Text(
              'Belum ada aspek penilaian.',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 4),
            const Text(
              'Tambahkan aspek seperti "Penulisan Karya Ilmiah" untuk '
              'mulai menyusun kriteria penilaian.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: onCreate,
              icon: const Icon(Icons.add),
              label: const Text('Tambah Aspek'),
            ),
          ],
        ),
      ),
    );
  }
}
