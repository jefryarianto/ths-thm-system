import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../data/models/graduation.dart';
import '../../logic/pendadaran/pendadaran_bloc.dart';
import '../widgets/app_loading_spinner.dart';

/// Detail pendadaran (graduation) — ringkasan jadwal, lokasi, undangan,
/// dan tombol menuju pengelolaan kriteria penilaian (F2).
class PendadaranDetailScreen extends StatelessWidget {
  final String graduationId;
  const PendadaranDetailScreen({super.key, required this.graduationId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Detail Pendadaran')),
      body: BlocBuilder<PendadaranBloc, PendadaranState>(
        builder: (context, state) {
          if (state is PendadaranLoading || state is PendadaranSubmitting) {
            return const AppLoadingSpinner();
          }
          if (state is PendadaranError) {
            return _CenterRetry(message: state.message);
          }
          final graduations = state is PendadaranLoaded
              ? state.graduations
              : const <Graduation>[];
          if (state is! PendadaranLoaded || graduations.isEmpty) {
            return const _CenterRetry(message: 'Pendadaran tidak ditemukan');
          }
          final graduation = graduations.firstWhere(
            (g) => g.id == graduationId,
            orElse: () => graduations.first,
          );
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _DetailHeader(graduation: graduation),
              const SizedBox(height: 20),
              _InfoTile(
                icon: Icons.calendar_month_outlined,
                label: 'Rentang Tanggal',
                value: _range(graduation),
              ),
              _InfoTile(
                icon: Icons.place_outlined,
                label: 'Lokasi',
                value: graduation.lokasi ?? '—',
              ),
              _InfoTile(
                icon: Icons.event_available_outlined,
                label: 'Undangan',
                value: '${graduation.jumlahUndangan} undangan',
              ),
              _InfoTile(
                icon: Icons.how_to_reg_outlined,
                label: 'Konfirmasi Hadir',
                value: '${graduation.jumlahHadir} peserta',
              ),
              _InfoTile(
                icon: Icons.groups_outlined,
                label: 'Peserta',
                value: '${graduation.jumlahPeserta} orang',
              ),
              const SizedBox(height: 20),
              FilledButton.icon(
                onPressed: () => context.push(
                    '/pendadaran/$graduationId/kriteria'),
                icon: const Icon(Icons.checklist_outlined),
                label: const Text('Kelola Kriteria Penilaian'),
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: () => context.pop(),
                icon: const Icon(Icons.arrow_back),
                label: const Text('Kembali ke Daftar'),
              ),
            ],
          );
        },
      ),
    );
  }

  String _range(Graduation g) {
    final mulai = _short(g.tanggalMulai);
    final selesai = g.tanggalSelesai;
    if (selesai.isEmpty) return mulai;
    return '$mulai — ${_short(selesai)}';
  }

  String _short(String raw) =>
      raw.length >= 10 ? raw.substring(0, 10) : raw;
}

class _DetailHeader extends StatelessWidget {
  final Graduation graduation;
  const _DetailHeader({required this.graduation});

  @override
  Widget build(BuildContext context) {
    final color = AppTheme.statusColor(graduation.status);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                graduation.nama,
                style: const TextStyle(
                    fontSize: 20, fontWeight: FontWeight.w700),
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                graduation.status,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: color,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          'Detail & pengelolaan kriteria penilaian pendadaran.',
          style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
        ),
      ],
    );
  }
}

class _InfoTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _InfoTile(
      {required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppTheme.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, size: 20, color: AppTheme.primary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: TextStyle(
                        fontSize: 12, color: Colors.grey.shade600)),
                const SizedBox(height: 2),
                Text(value,
                    style: const TextStyle(
                        fontSize: 15, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CenterRetry extends StatelessWidget {
  final String message;
  const _CenterRetry({required this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline,
              size: 48, color: AppTheme.danger),
          const SizedBox(height: 12),
          Text(message, style: const TextStyle(color: Colors.grey)),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: () => context
                .read<PendadaranBloc>()
                .add(const PendadaranLoadRequested()),
            icon: const Icon(Icons.refresh),
            label: const Text('Coba lagi'),
          ),
        ],
      ),
    );
  }
}
