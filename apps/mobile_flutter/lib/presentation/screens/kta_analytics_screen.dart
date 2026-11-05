import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/theme/app_theme.dart';
import '../../logic/kta_application/kta_application_bloc.dart';
import '../widgets/app_bar_icon_title.dart';
import '../widgets/app_loading_spinner.dart';

class KtaAnalyticsScreen extends StatefulWidget {
  const KtaAnalyticsScreen({super.key});

  @override
  State<KtaAnalyticsScreen> createState() => _KtaAnalyticsScreenState();
}

class _KtaAnalyticsScreenState extends State<KtaAnalyticsScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _load() {
    context.read<KtaApplicationBloc>().add(const KtaApplicationFetchAnalyticsFunnelRequested());
    context.read<KtaApplicationBloc>().add(const KtaApplicationFetchAnalyticsProcessingTimeRequested());
    context.read<KtaApplicationBloc>().add(const KtaApplicationFetchAnalyticsTrendRequested());
    context.read<KtaApplicationBloc>().add(const KtaApplicationFetchSlaStatusRequested());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const AppBarIconTitle(icon: Icons.analytics, title: 'Analytics KTA'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
            onPressed: _load,
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: const [
            Tab(text: 'Funnel'),
            Tab(text: 'Waktu Proses'),
            Tab(text: 'Tren'),
            Tab(text: 'SLA'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: const [
          _FunnelTab(),
          _ProcessingTimeTab(),
          _TrendTab(),
          _SlaTab(),
        ],
      ),
    );
  }
}

class _FunnelTab extends StatelessWidget {
  const _FunnelTab();

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<KtaApplicationBloc, KtaApplicationState>(
      builder: (context, state) {
        if (state is KtaApplicationAnalyticsFunnelLoaded) {
          if (state.stages.isEmpty) {
            return const Center(child: Text('Belum ada data funnel'));
          }
          return ListView(
            padding: const EdgeInsets.all(AppTheme.space20),
            children: state.stages
                .map((stage) => _FunnelRow(
                      label: stage['stage']?.toString() ?? '',
                      count: stage['count'] as int? ?? 0,
                      rate: stage['rate']?.toString() ?? '0',
                    ))
                .toList(),
          );
        }
        return const Center(child: AppLoadingSpinner());
      },
    );
  }
}

class _FunnelRow extends StatelessWidget {
  final String label;
  final int count;
  final String rate;

  const _FunnelRow({required this.label, required this.count, required this.rate});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppTheme.space12),
      child: Row(
        children: [
          Expanded(
            flex: 3,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                Text('$count aplikasi', style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant)),
              ],
            ),
          ),
          Expanded(
            flex: 2,
            child: Text(
              '$rate%',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProcessingTimeTab extends StatelessWidget {
  const _ProcessingTimeTab();

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<KtaApplicationBloc, KtaApplicationState>(
      builder: (context, state) {
        if (state is KtaApplicationAnalyticsProcessingTimeLoaded) {
          if (state.processingTimes.isEmpty) {
            return const Center(child: Text('Belum ada data waktu proses'));
          }
          return ListView(
            padding: const EdgeInsets.all(AppTheme.space20),
            children: state.processingTimes
                .map((t) => _TimeCard(
                      level: t['level']?.toString() ?? '',
                      avgDays: (t['avgDays'] as num?)?.toDouble() ?? 0,
                      count: t['count'] as int? ?? 0,
                    ))
                .toList(),
          );
        }
        return const Center(child: AppLoadingSpinner());
      },
    );
  }
}

class _TimeCard extends StatelessWidget {
  final String level;
  final double avgDays;
  final int count;

  const _TimeCard({required this.level, required this.avgDays, required this.count});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: AppTheme.space8),
      child: ListTile(
        title: Text(level),
        subtitle: Text('$count aplikasi'),
        trailing: Text(
          '${avgDays.toStringAsFixed(1)} hari',
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
        ),
      ),
    );
  }
}

class _TrendTab extends StatelessWidget {
  const _TrendTab();

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<KtaApplicationBloc, KtaApplicationState>(
      builder: (context, state) {
        if (state is KtaApplicationAnalyticsTrendLoaded) {
          if (state.trend.isEmpty) {
            return const Center(child: Text('Belum ada data tren'));
          }
          return ListView(
            padding: const EdgeInsets.all(AppTheme.space20),
            children: state.trend
                .map((t) => Card(
                      margin: const EdgeInsets.only(bottom: AppTheme.space8),
                      child: ListTile(
                        title: Text(t['month']?.toString() ?? ''),
                        subtitle: Text(
                          'Diajukan: ${t['submitted']} • Disetujui: ${t['approved']} • Digenerate: ${t['generated']} • Ditolak: ${t['rejected']}',
                          style: const TextStyle(fontSize: 12),
                        ),
                      ),
                    ))
                .toList(),
          );
        }
        return const Center(child: AppLoadingSpinner());
      },
    );
  }
}

class _SlaTab extends StatelessWidget {
  const _SlaTab();

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<KtaApplicationBloc, KtaApplicationState>(
      builder: (context, state) {
        if (state is KtaApplicationSlaStatusLoaded) {
          if (state.slaStatus.isEmpty) {
            return const Center(child: Text('Belum ada data SLA'));
          }
          return ListView(
            padding: const EdgeInsets.all(AppTheme.space20),
            children: state.slaStatus.entries.map((entry) {
              final data = entry.value is Map<String, dynamic>
                  ? entry.value as Map<String, dynamic>
                  : <String, dynamic>{};
              return Card(
                margin: const EdgeInsets.only(bottom: AppTheme.space8),
                child: ListTile(
                  title: Text(entry.key.replaceAll('_', ' ')),
                  subtitle: Text(
                    'Jumlah: ${data['count']} • Rata-rata: ${data['avgHoursStuck']} jam • Terlama: ${data['oldestHours']} jam',
                    style: const TextStyle(fontSize: 12),
                  ),
                ),
              );
            }).toList(),
          );
        }
        return const Center(child: AppLoadingSpinner());
      },
    );
  }
}
