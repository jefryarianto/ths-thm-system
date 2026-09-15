import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../data/models/graduation.dart';
import '../../logic/pendadaran/pendadaran_bloc.dart';
import '../widgets/app_loading_spinner.dart';

/// Daftar pendadaran (wisuda/graduations) — admin distrik & admin kegiatan.
///
/// Menampilkan kartu pendadaran dengan status, rentang tanggal, lokasi, dan
/// ringkasan undangan/hadir/peserta. Tombol fab untuk membuat pendadaran baru.
class PendadaranScreen extends StatefulWidget {
  const PendadaranScreen({super.key});

  @override
  State<PendadaranScreen> createState() => _PendadaranScreenState();
}

class _PendadaranScreenState extends State<PendadaranScreen> {
  @override
  void initState() {
    super.initState();
    context.read<PendadaranBloc>().add(const PendadaranLoadRequested());
  }

  Future<void> _refresh() async {
    context.read<PendadaranBloc>().add(const PendadaranLoadRequested());
  }

  void _goCreate() {
    context.push('/pendadaran/create');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Pendadaran'),
        actions: [
          IconButton(
            onPressed: _refresh,
            icon: const Icon(Icons.refresh),
            tooltip: 'Segarkan',
          ),
        ],
      ),
      body: BlocBuilder<PendadaranBloc, PendadaranState>(
        builder: (context, state) {
          if (state is PendadaranLoading || state is PendadaranSubmitting) {
            return const AppLoadingSpinner();
          }
          if (state is PendadaranError) {
            return _ErrorView(
              message: state.message,
              onRetry: _refresh,
            );
          }
          if (state is PendadaranLoaded && state.graduations.isEmpty) {
            return _EmptyView(onCreate: _goCreate);
          }
          final graduations = state.graduations;
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              itemCount: graduations.length,
              separatorBuilder: (context, index) =>
                  const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final graduation = graduations[index];
                return _GraduationCard(
                  graduation: graduation,
                  onTap: () => context.push(
                    '/pendadaran/${graduation.id}',
                    extra: graduation,
                  ),
                );
              },
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _goCreate,
        icon: const Icon(Icons.add),
        label: const Text('Buat Pendadaran'),
      ),
    );
  }
}

class _GraduationCard extends StatelessWidget {
  final Graduation graduation;
  final VoidCallback onTap     ;
  const _GraduationCard({required this.graduation, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final color = AppTheme.statusColor(graduation.status);
    return Card(
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      graduation.nama,
                      style: const TextStyle(
                          fontSize: 16, fontWeight: FontWeight.w700),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      graduation.status,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: color,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
Icon(Icons.event, //fix-const-grey
                      size: 15, color: Colors.grey.shade600),
                  const SizedBox(width: 6),
                  Text(
                    _range(graduation),
                    style: TextStyle(
                        fontSize: 13, color: Colors.grey.shade600),
                  ),
                ],
              ),
              if (graduation.lokasi != null &&
                  graduation.lokasi!.isNotEmpty) ...[
                const SizedBox(height: 4),
                Row(
                  children: [
Icon(Icons.place_outlined, //fix-const-grey
                        size: 15, color: Colors.grey.shade600),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        graduation.lokasi!,
                        style: TextStyle(
                            fontSize: 13, color: Colors.grey.shade600),
                      ),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 10),
              Row(
                children: [
                  _MiniStat(label: 'Undangan', value: graduation.jumlahUndangan),
                  const SizedBox(width: 18),
                  _MiniStat(label: 'Hadir', value: graduation.jumlahHadir),
                  const SizedBox(width: 18),
                  _MiniStat(label: 'Peserta', value: graduation.jumlahPeserta),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _range(Graduation g) {
    final mulai = _short(g.tanggalMulai);
    final selesai = g.tanggalSelesai;
    if (selesai == null || selesai.isEmpty) return mulai;
    return '$mulai - ${_short(selesai)}';
  }

  String _short(String raw) {
    return raw.length >= 10 ? raw.substring(0, 10) : raw;
  }
}

class _MiniStat extends StatelessWidget {
  final String label;
  final int value;
  const _MiniStat({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '$value',
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
        ),
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: Colors.grey),
        ),
      ],
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline,
                size: 48, color: AppTheme.danger),
            const SizedBox(height: 12),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Coba lagi'),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyView extends StatelessWidget {
  final VoidCallback onCreate;
  const _EmptyView({required this.onCreate});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.school_outlined,
                size: 56, color: AppTheme.primary),
            const SizedBox(height: 12),
            const Text(
              'Belum ada pendadaran.',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 4),
            const Text(
              'Buat pendadaran baru untuk mulai mengelola undangan, '
              'penguji, dan penilaian.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: onCreate,
              icon: const Icon(Icons.add),
              label: const Text('Buat Pendadaran'),
            ),
          ],
        ),
      ),
    );
  }
}
