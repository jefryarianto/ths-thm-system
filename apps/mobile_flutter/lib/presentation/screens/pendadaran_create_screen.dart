import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../logic/pendadaran/pendadaran_bloc.dart';
import '../widgets/app_loading_spinner.dart';

/// Layar pembuatan pendadaran (wisuda/graduations) baru.
///
/// Hanya untuk admin distrik & admin kegiatan. Mengisi nama, lokasi,
/// rentang tanggal, dan (opsional) admin kegiatan. Kirim lewat
/// `PendadaranCreateRequested` pada `PendadaranBloc`.
class PendadaranCreateScreen extends StatefulWidget {
  const PendadaranCreateScreen({super.key});

  @override
  State<PendadaranCreateScreen> createState() => _PendadaranCreateScreenState();
}

class _PendadaranCreateScreenState extends State<PendadaranCreateScreen> {
  final _namaCtrl = TextEditingController();
  final _lokasiCtrl = TextEditingController();
  DateTime? _tanggalMulai;
  DateTime? _tanggalSelesai;
  bool _submitting = false;

  @override
  void dispose() {
    _namaCtrl.dispose();
    _lokasiCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickMulai() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _tanggalMulai ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime(2035),
    );
    if (picked != null) {
      setState(() => _tanggalMulai = picked);
      if (_tanggalSelesai != null &&
          _tanggalSelesai!.isBefore(picked)) {
        setState(() => _tanggalSelesai = null);
      }
    }
  }

  Future<void> _pickSelesai() async {
    final awal = _tanggalMulai ?? DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _tanggalSelesai ?? awal,
      firstDate: awal,
      lastDate: DateTime(2035),
    );
    if (picked != null) {
      setState(() => _tanggalSelesai = picked);
    }
  }

  void _submit() {
    final nama = _namaCtrl.text.trim();
    if (nama.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Nama pendadaran wajib diisi')));
      return;
    }
    if (_tanggalMulai == null) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Tanggal mulai wajib diisi')));
      return;
    }
    setState(() => _submitting = true);
    context.read<PendadaranBloc>().add(PendadaranCreateRequested(
          nama: nama,
          lokasi: _lokasiCtrl.text.trim().isEmpty
              ? null
              : _lokasiCtrl.text.trim(),
          tanggalMulai: _fmt(_tanggalMulai!),
          tanggalSelesai:
              _tanggalSelesai == null ? null : _fmt(_tanggalSelesai!),
        ));
  }

  String _fmt(DateTime d) {
    final mm = d.month.toString().padLeft(2, '0');
    final dd = d.day.toString().padLeft(2, '0');
    return '${d.year}-$mm-$dd';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Buat Pendadaran')),
      body: BlocConsumer<PendadaranBloc, PendadaranState>(
        listener: (context, state) {
          if (state is PendadaranError) {
            setState(() => _submitting = false);
            ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text(state.message)));
          } else if (state is PendadaranLoaded && state.justCreated) {
            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                content: Text('Pendadaran berhasil dibuat')));
            context.pop();
          }
        },
        builder: (context, state) {
          final busy = state is PendadaranSubmitting;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              TextField(
                controller: _namaCtrl,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'Nama Pendadaran',
                  hintText: 'contoh: Pendadaran Distrik 2025',
                  prefixIcon: Icon(Icons.school_outlined),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _lokasiCtrl,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'Lokasi (opsional)',
                  hintText: 'contoh: Aula Distrik',
                  prefixIcon: Icon(Icons.place_outlined),
                ),
              ),
              const SizedBox(height: 16),
              _DateField(
                label: 'Tanggal Mulai *',
                value: _tanggalMulai == null
                    ? 'Pilih tanggal'
                    : _fmt(_tanggalMulai!),
                icon: Icons.event,
                onTap: _pickMulai,
              ),
              const SizedBox(height: 10),
              _DateField(
                label: 'Tanggal Selesai (opsional)',
                value: _tanggalSelesai == null
                    ? 'Pilih tanggal'
                    : _fmt(_tanggalSelesai!),
                icon: Icons.event_available,
                onTap: _pickSelesai,
              ),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: busy ? null : _submit,
                icon: busy
                    ? const AppLoadingSpinner.small(color: Colors.white)
                    : const Icon(Icons.check),
                label: const Text('Simpan Pendadaran'),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _DateField extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final VoidCallback onTap;
  const _DateField({
    required this.label,
    required this.value,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: Icon(icon, size: 20, color: AppTheme.primary),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        child: Text(
          value,
          style: TextStyle(
            fontSize: 14,
            color: AppTheme.primary,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}
