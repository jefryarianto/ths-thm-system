import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../logic/gamification/gamification_bloc.dart';
import '../../logic/member/member_bloc.dart';
import '../widgets/app_loading_spinner.dart';

class GamificationScreen extends StatefulWidget {
  const GamificationScreen({super.key});
  @override
  State<GamificationScreen> createState() => _GamificationScreenState();
}

class _GamificationScreenState extends State<GamificationScreen> {
  int _tab = 0;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    final member = context.read<MemberBloc>().state;
    if (member is MemberLoaded && !_loaded) {
      _loaded = true;
      context.read<GamificationBloc>().add(
            GamificationLoadRequested(anggotaId: member.member.id),
          );
      context.read<GamificationBloc>().add(
            const GamificationLeaderboardLoadRequested(),
          );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Poin & Level')),
      body: BlocBuilder<GamificationBloc, GamificationState>(
        builder: (context, state) {
          if (state is GamificationLoading) {
            return const AppLoadingSpinner(message: 'Memuat data...');
          }
          if (state is GamificationError) {
            return Center(child: Text(state.message));
          }
          return Column(children: [
            _TabBar(tab: _tab, onChanged: (i) => setState(() => _tab = i)),
            Expanded(child: _buildTab()),
          ]);
        },
      ),
    );
  }

  Widget _buildTab() {
    switch (_tab) {
      case 0:
        return const _ProfileTab();
      case 1:
        return const _LeaderboardTab();
      case 2:
        return const _HistoryTab();
      default:
        return const SizedBox.shrink();
    }
  }
}

class _TabBar extends StatelessWidget {
  final int tab;
  final ValueChanged<int> onChanged;
  const _TabBar({required this.tab, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final labels = ['Profil', 'Leaderboard', 'Riwayat'];
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
      ),
      child: Row(
          children: List.generate(labels.length, (i) {
        final active = tab == i;
        return Expanded(
          child: GestureDetector(
            onTap: () => onChanged(i),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 14),
              decoration: BoxDecoration(
                  border: Border(
                bottom: BorderSide(
                    color: active ? AppTheme.primary : Colors.transparent,
                    width: 2.5),
              )),
              child: Text(labels[i],
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      fontSize: 13,
                      fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                      color: active ? AppTheme.primary : Colors.grey.shade600)),
            ),
          ),
        );
      })),
    );
  }
}

class _ProfileTab extends StatelessWidget {
  const _ProfileTab();
  @override
  Widget build(BuildContext context) {
    return BlocBuilder<GamificationBloc, GamificationState>(
      builder: (context, state) {
        if (state is! GamificationLoaded) return const AppLoadingSpinner();
        final p = state.profile;
        return ListView(padding: const EdgeInsets.all(16), children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                  colors: [AppTheme.primaryDark, AppTheme.primary]),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(children: [
              Text(p.level.icon, style: const TextStyle(fontSize: 40)),
              const SizedBox(height: 8),
              Text(p.level.name,
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text('${p.points}',
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 32,
                      fontWeight: FontWeight.w800)),
              const Text('Poin',
                  style: TextStyle(color: Colors.white70, fontSize: 14)),
            ]),
          ),
          const SizedBox(height: 16),
          if (p.badges.isNotEmpty) ...[
            const Text('Lencana',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Wrap(
                spacing: 8,
                runSpacing: 8,
                children: p.badges
                    .map((b) => Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                              color: AppTheme.primary.withValues(alpha: 0.06),
                              borderRadius: BorderRadius.circular(12)),
                          child: Row(mainAxisSize: MainAxisSize.min, children: [
                            Text(b.icon, style: const TextStyle(fontSize: 18)),
                            const SizedBox(width: 6),
                            Text(b.name,
                                style: const TextStyle(
                                    fontSize: 13, fontWeight: FontWeight.w600)),
                          ]),
                        ))
                    .toList()),
          ],
        ]);
      },
    );
  }
}

class _LeaderboardTab extends StatelessWidget {
  const _LeaderboardTab();
  @override
  Widget build(BuildContext context) {
    return BlocBuilder<GamificationBloc, GamificationState>(
      builder: (context, state) {
        if (state is! GamificationLeaderboardLoaded) {
          return const AppLoadingSpinner();
        }
        final entries = state.entries;
        if (entries.isEmpty) {
          return const Center(child: Text('Belum ada data leaderboard'));
        }
        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: entries.length,
          itemBuilder: (context, i) {
            final e = entries[i];
            final medals = {1: '\u{1F947}', 2: '\u{1F948}', 3: '\u{1F949}'};
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: AppTheme.primary.withValues(alpha: 0.1),
                  child: Text(medals[e.rank] ?? '${e.rank}',
                      style: const TextStyle(fontSize: 14)),
                ),
                title: Text(e.namaLengkap,
                    style: const TextStyle(fontWeight: FontWeight.w600)),
                subtitle: Text('${e.badges} lencana',
                    style:
                        TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                trailing: Text('${e.points}',
                    style: const TextStyle(
                        fontWeight: FontWeight.w700, fontSize: 15)),
              ),
            );
          },
        );
      },
    );
  }
}

class _HistoryTab extends StatelessWidget {
  const _HistoryTab();
  @override
  Widget build(BuildContext context) {
    return BlocBuilder<GamificationBloc, GamificationState>(
      builder: (context, state) {
        if (state is! GamificationLoaded) return const AppLoadingSpinner();
        final history = state.pointsHistory;
        final events = state.events;
        return ListView(padding: const EdgeInsets.all(16), children: [
          if (history.isNotEmpty) ...[
            const Text('Poin per Bulan',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            ...history.map((h) => Card(
                  margin: const EdgeInsets.only(bottom: 6),
                  child: ListTile(
                    dense: true,
                    title: Text(h.month,
                        style: const TextStyle(fontWeight: FontWeight.w600)),
                    trailing: Text('${h.cumulative} poin',
                        style: const TextStyle(fontWeight: FontWeight.w700)),
                  ),
                )),
            const SizedBox(height: 16),
          ],
          if (events.isNotEmpty) ...[
            const Text('Aktivitas Terbaru',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            ...events.map((e) => Card(
                  margin: const EdgeInsets.only(bottom: 6),
                  child: ListTile(
                    dense: true,
                    title: Text(e.description,
                        style: const TextStyle(fontSize: 13)),
                    subtitle: Text(Formatters.relative(e.timestamp),
                        style: TextStyle(
                            fontSize: 11, color: Colors.grey.shade600)),
                    trailing: Text('+${e.points}',
                        style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            color: AppTheme.success)),
                  ),
                )),
          ],
          if (history.isEmpty && events.isEmpty)
            const Center(
                child: Padding(
              padding: EdgeInsets.only(top: 60),
              child: Text('Belum ada riwayat poin'),
            )),
        ]);
      },
    );
  }
}
