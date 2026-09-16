import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/snack_bar_helper.dart';
import '../../logic/auth/auth_bloc.dart';
import '../../logic/pendadaran/pendadaran_bloc.dart';
import '../widgets/app_bar_icon_title.dart';
import '../widgets/app_loading_spinner.dart';

/// Layar pembuatan pendadaran (wisuda/graduations) baru.
///
/// HANYA untuk admin distrik & superadmin. Pengguna lain (termasuk admin
/// kegiatan) yang membuka layar ini langsung dialihkan kembali dengan
/// pemberitahuan. Mengisi nama, lokasi, rentang tanggal, dan (opsional)
/// admin kegiatan; kirim lewat `PendadaranCreateRequested` pada
/// `PendadaranBloc`.
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

  @override
  void initState() {
    super.initState();
    final authState = context.read<AuthBloc>().state;
    final role = authState is AuthAuthenticated ? authState.user.role : null;
    if (role != 'admin_distrik' && role != 'superadmin') {
      // Guard frontend: layar ini hanya bisa dibuka admin distrik/superadmin.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        showCenteredSnackBar(context,
            'Hanya admin distrik & superadmin yang dapat membuat pendadaran');
        context.pop();
      });
    }
  }

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
      if (_tanggalSelesai != null && _tanggalSelesai!.isBefore(picked)) {
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
      showCenteredSnackBar(context, 'Nama pendadaran wajib diisi');
      return;
    }
    if (_tanggalMulai == null) {
      showCenteredSnackBar(context, 'Tanggal mulai wajib diisi');
      return;
    }
    context.read<PendadaranBloc>().add(PendadaranCreateRequested(
          nama: nama,
          lokasi:
              _lokasiCtrl.text.trim().isEmpty ? null : _lokasiCtrl.text.trim(),
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
      appBar: AppBar(
        title: const AppBarIconTitle(
          icon: Icons.school_outlined,
          title: 'Buat Pendadaran',
        ),
      ),
      body: BlocConsumer<PendadaranBloc, PendadaranState>(
        listener: (context, state) {
          if (state is PendadaranError) {
            showCenteredSnackBar(context, state.message);
          } else if (state is PendadaranLoaded && state.justCreated) {
            showCenteredSnackBar(context, 'Pendadaran berhasil dibuat');
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
                    ? const AppLoadingSpinner.small(color: AppTheme.onPrimary)
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
          style: const TextStyle(
            fontSize: 14,
            color: AppTheme.primary,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}
