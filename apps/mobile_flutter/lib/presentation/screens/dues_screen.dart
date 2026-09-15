import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/due.dart';
import '../../logic/dues/dues_bloc.dart';
import '../widgets/app_loading_spinner.dart';

class DuesScreen extends StatefulWidget {
  const DuesScreen({super.key});

  @override
  State<DuesScreen> createState() => _DuesScreenState();
}

class _DuesScreenState extends State<DuesScreen> {
  @override
  void initState() {
    super.initState();
    final state = context.read<DuesBloc>().state;
    if (state is! DuesLoaded && state is! DuesLoading) {
      context.read<DuesBloc>().add(const DuesLoadRequested());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Status Iuran')),
      body: BlocBuilder<DuesBloc, DuesState>(
        builder: (context, state) {
          if (state is DuesLoading) {
            return const AppLoadingSpinner();
          }
          if (state is DuesError) {
            return _Error(message: state.message);
          }
          if (state is! DuesLoaded) {
            return const Center(child: Text('Belum ada data iuran'));
          }
          final dues = state.dues;
          final lunas = dues.where((d) => _isPaid(d.status)).length;
          return Column(
            children: [
              _SummaryBar(total: dues.length, lunas: lunas),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: () async =>
                      context.read<DuesBloc>().add(const DuesLoadRequested()),
                  child: dues.isEmpty
                      ? ListView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          children: const [
                            SizedBox(height: 120),
                            Center(child: Text('Tidak ada data iuran')),
                          ],
                        )
                      : ListView.builder(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.all(12),
                          itemCount: dues.length,
                          itemBuilder: (context, i) => _DueCard(due: dues[i]),
                        ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  bool _isPaid(String status) {
    return status.toLowerCase().contains('lunas') ||
        status.toLowerCase() == 'paid';
  }
}

class _SummaryBar extends StatelessWidget {
  final int total;
  final int lunas;
  const _SummaryBar({required this.total, required this.lunas});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppTheme.primaryDark, AppTheme.primary],
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _stat('Total Iuran', '$total'),
          _stat('Lunas', '$lunas'),
          _stat('Belum Lunas', '${total - lunas}'),
        ],
      ),
    );
  }

  Widget _stat(String label, String value) {
    return Column(
      children: [
        Text(value,
            style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: Colors.white)),
        Text(label,
            style: TextStyle(
                fontSize: 11, color: Colors.white.withValues(alpha: 0.8))),
      ],
    );
  }
}

class _DueCard extends StatelessWidget {
  final Due due;
  const _DueCard({required this.due});

  @override
  Widget build(BuildContext context) {
    final paid = due.status.toLowerCase().contains('lunas') ||
        due.status.toLowerCase() == 'paid';
    final color = AppTheme.statusColor(due.status);
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        leading: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(
            paid ? Icons.check_circle : Icons.schedule,
            color: color,
          ),
        ),
        title: Text(
          'Iuran ${due.periode}',
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Jumlah: ${Formatters.rupiah(due.jumlah)}'),
            const SizedBox(height: 2),
            Text(
              due.status,
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
            ),
            if (due.tanggalJatuhTempo != null)
              Text(
                'Jatuh tempo: ${Formatters.dateLong(due.tanggalJatuhTempo)}',
                style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
              ),
            if (due.tanggalBayar != null)
              Text(
                'Dibayar: ${Formatters.dateLong(due.tanggalBayar)}',
                style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
              ),
          ],
        ),
        isThreeLine: true,
        trailing: const Icon(Icons.chevron_right),
        onTap: () => _showDetail(context),
      ),
    );
  }

  void _showDetail(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Detail Iuran ${due.periode}',
                style:
                    const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            _row('Status', due.status),
            _row('Jumlah', Formatters.rupiah(due.jumlah)),
            _row('Tanggal Jatuh Tempo',
                Formatters.dateLong(due.tanggalJatuhTempo)),
            _row(
                'Tanggal Bayar',
                due.tanggalBayar != null
                    ? Formatters.dateLong(due.tanggalBayar)
                    : '-'),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
              width: 140,
              child: Text(label,
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade600))),
          Expanded(
            child: Text(value,
                style:
                    const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }
}

class _Error extends StatelessWidget {
  final String message;
  const _Error({required this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: AppTheme.danger),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () =>
                  context.read<DuesBloc>().add(const DuesLoadRequested()),
              child: const Text('Coba Lagi'),
            ),
          ],
        ),
      ),
    );
  }
}
