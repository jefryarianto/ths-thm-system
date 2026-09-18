import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../logic/gamification/gamification_bloc.dart';
import '../../logic/member/member_bloc.dart';
import '../widgets/app_bar_icon_title.dart';
import '../widgets/app_loading_spinner.dart';

class GamificationScreen extends StatefulWidget {
  const GamificationScreen({super.key});
  @override
  State<GamificationScreen> createState() => _GamificationScreenState();
}

class _GamificationScreenState extends State<GamificationScreen> {
  int _tab = 0;
  bool _loaded = false;

  /// Muat profil + leaderboard hanya sekali, setelah anggota tersedia.
  /// Dipanggil dari `initState` (anggota sudah dimuat) dan dari
  /// `BlocListener<MemberBloc>` bila layar dibuka sebelum `MemberLoaded`.
  void _startLoading() {
    if (_loaded) return;
    final member = context.read<MemberBloc>().state;
    if (member is! MemberLoaded) return;
    _loaded = true;
    context.read<GamificationBloc>().add(
          GamificationLoadRequested(anggotaId: member.member.id),
        );
    context.read<GamificationBloc>().add(
          const GamificationLeaderboardLoadRequested(),
        );
  }

  @override
  void initState() {
    super.initState();
    _startLoading();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const AppBarIconTitle(
          icon: Icons.emoji_events_outlined,
          title: 'Poin & Level',
        ),
      ),
      body: BlocListener<MemberBloc, MemberState>(
        listener: (context, state) {
          if (state is MemberLoaded) _startLoading();
        },
        child: BlocBuilder<GamificationBloc, GamificationState>(
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
      case 3:
        return const _GuideTab();
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
    final theme = Theme.of(context);
    final labels = ['Profil', 'Leaderboard', 'Riwayat', 'Petunjuk'];
    return Container(
      color: theme.colorScheme.surface,
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: theme.colorScheme.primaryContainer,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          children: List.generate(labels.length, (i) {
            final active = tab == i;
            return Expanded(
              child: GestureDetector(
                onTap: () => onChanged(i),
                behavior: HitTestBehavior.opaque,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: active ? theme.colorScheme.surface : Colors.transparent,
                    borderRadius: BorderRadius.circular(10),
                    boxShadow: active
                        ? [
                            BoxShadow(
                              color: theme.shadowColor,
                              blurRadius: 6,
                              offset: const Offset(0, 2),
                            ),
                          ]
                        : null,
                  ),
                  child: Text(
                    labels[i],
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: active ? FontWeight.w700 : FontWeight.w600,
                      color: active
                          ? theme.colorScheme.primary
                          : theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
              ),
            );
          }),
        ),
      ),
    );
  }
}

class _ProfileTab extends StatelessWidget {
  const _ProfileTab();
  @override
  Widget build(BuildContext context) {
    return BlocBuilder<GamificationBloc, GamificationState>(
      builder: (context, state) {
        if (state is! GamificationLoaded || state.profile == null) {
          return const AppLoadingSpinner();
        }
        final p = state.profile!;
        return ListView(padding: const EdgeInsets.all(16), children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                  colors: [AppTheme.primary, AppTheme.primaryLight]),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(children: [
              Text(p.level.icon, style: const TextStyle(fontSize: 40)),
              const SizedBox(height: 8),
              Text(p.level.name,
                  style: const TextStyle(
                      color: AppTheme.onPrimary,
                      fontSize: 16,
                      fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text('${p.points}',
                  style: const TextStyle(
                      color: AppTheme.onPrimary,
                      fontSize: 32,
                      fontWeight: FontWeight.w800)),
              Text('Poin',
                  style: TextStyle(
                      color: AppTheme.onPrimary.withValues(alpha: 0.7), fontSize: 14)),
            ]),
          ),
          const SizedBox(height: 16),
          if (p.badges.isNotEmpty) ...[
            const Text('Lencana',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppTheme.navy)),
            const SizedBox(height: 8),
            Wrap(
                spacing: 8,
                runSpacing: 8,
                children: p.badges
                    .map((b) => Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                              color: AppTheme.primaryContainer,
                              borderRadius: BorderRadius.circular(12)),
                          child: Row(mainAxisSize: MainAxisSize.min, children: [
                            Text(b.icon, style: const TextStyle(fontSize: 18)),
                            const SizedBox(width: 6),
                            Text(b.name,
                                style: const TextStyle(
                                    fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.navy)),
                          ]),
                        ))
                    .toList()),
          ],
        ]);
      },
    );
  }
}

class _LeaderboardTab extends StatefulWidget {
  const _LeaderboardTab();
  @override
  State<_LeaderboardTab> createState() => _LeaderboardTabState();
}

class _LeaderboardTabState extends State<_LeaderboardTab> {
  GamificationLeaderboardScope _scope = GamificationLeaderboardScope.global;

  void _applyScope(GamificationLeaderboardScope scope) {
    if (scope == _scope) return;
    setState(() => _scope = scope);
    final current = context.read<GamificationBloc>().state;
    String? search;
    if (current is GamificationLoaded) {
      /* leaderboard disimpan terpisah; kirim pencarian saat ini jika ada */
    }
    context
        .read<GamificationBloc>()
        .add(GamificationLeaderboardLoadRequested(scope: scope, search: search));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return BlocBuilder<GamificationBloc, GamificationState>(
      builder: (context, state) {
        if (state is! GamificationLoaded || state.leaderboard == null) {
          return const AppLoadingSpinner();
        }
        final entries = state.leaderboard!;
        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _ScopeChip(
                        label: 'Global',
                        scope: GamificationLeaderboardScope.global,
                        selected: _scope == GamificationLeaderboardScope.global,
                        onSelected: (s) => _applyScope(s)),
                    const SizedBox(width: 8),
                    _ScopeChip(
                        label: 'Distrik',
                        scope: GamificationLeaderboardScope.distrik,
                        selected: _scope == GamificationLeaderboardScope.distrik,
                        onSelected: (s) => _applyScope(s)),
                    const SizedBox(width: 8),
                    _ScopeChip(
                        label: 'Wilayah',
                        scope: GamificationLeaderboardScope.wilayah,
                        selected: _scope == GamificationLeaderboardScope.wilayah,
                        onSelected: (s) => _applyScope(s)),
                    const SizedBox(width: 8),
                    _ScopeChip(
                        label: 'Ranting',
                        scope: GamificationLeaderboardScope.ranting,
                        selected: _scope == GamificationLeaderboardScope.ranting,
                        onSelected: (s) => _applyScope(s)),
                  ],
                ),
              ),
            ),
            if (entries.isEmpty)
              const Expanded(
                child: Center(child: Text('Belum ada data leaderboard')),
              )
            else
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: entries.length,
                  itemBuilder: (context, i) {
                    final e = entries[i];
                    final medals = {
                      1: '\u{1F947}',
                      2: '\u{1F948}',
                      3: '\u{1F949}',
                    };
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor:
                              theme.colorScheme.primaryContainer,
                          child: Text(medals[e.rank] ?? '${e.rank}',
                              style: TextStyle(fontSize: 14, color: theme.colorScheme.onPrimaryContainer)),
                        ),
                        title: Text(e.namaLengkap,
                            style: const TextStyle(fontWeight: FontWeight.w600)),
                        subtitle: Text('${e.badges} lencana',
                            style: TextStyle(
                                fontSize: 12, color: theme.colorScheme.onSurfaceVariant)),
                        trailing: Text('${e.points}',
                            style: const TextStyle(
                                fontWeight: FontWeight.w700, fontSize: 15)),
                      ),
                    );
                  },
                ),
              ),
          ],
        );
      },
    );
  }
}

class _ScopeChip extends StatelessWidget {
  final String label;
  final GamificationLeaderboardScope scope;
  final bool selected;
  final ValueChanged<GamificationLeaderboardScope> onSelected;

  const _ScopeChip({
    required this.label,
    required this.scope,
    required this.selected,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      selectedColor: theme.colorScheme.primaryContainer,
      onSelected: (_) => onSelected(scope),
    );
  }
}

class _GuideSection {
  final IconData icon;
  final String title;
  final List<String> lines;
  const _GuideSection(this.icon, this.title, this.lines);
}

/// Tab Petunjuk — panduan cara mendapat poin, level, dan lencana sesuai aturan
/// backend (`gamification.service.ts`): latihan +10, iuran tepat waktu +20 /
/// terlambat +5, 5 level, dan 10 lencana.
class _GuideTab extends StatelessWidget {
  const _GuideTab();

  static const _sections = [
    _GuideSection(
      Icons.stars_outlined,
      'Cara Mendapatkan Poin',
      [
        'Hadir latihan rutin: +10 poin',
        'Bayar iuran tepat waktu: +20 poin',
        'Bayar iuran terlambat: +5 poin',
        'Poin tercatat otomatis saat admin meng-input presensi latihan / pembayaran iuran Anda.',
      ],
    ),
    _GuideSection(
      Icons.workspace_premium_outlined,
      'Level',
      [
        '🥉 Bronze — mulai 0 poin',
        '🥈 Silver — mulai 100 poin',
        '🥇 Gold — mulai 300 poin',
        '💎 Platinum — mulai 500 poin',
        '🔥 Diamond — mulai 1000 poin',
      ],
    ),
    _GuideSection(
      Icons.military_tech_outlined,
      'Lencana (10 Badge)',
      [
        '🥋 Pemula Latihan — 5 latihan',
        '💪 Aktif Latihan — 20 latihan',
        '🏆 Master Latihan — 50 latihan',
        '⏰ Tepat Waktu — iuran tepat 3 bulan berturut-turut',
        '⭐ Disiplin — iuran tepat 6 bulan berturut-turut',
        '👑 Setia — iuran tepat 12 bulan berturut-turut',
        '🎓 Berprestasi — 1 sertifikat',
        '🥇 Juara — 3 sertifikat',
        '😈 Angel Points — total 100 poin',
        '🔥 Legend — total 500 poin',
      ],
    ),
    _GuideSection(
      Icons.local_fire_department_outlined,
      'Streak',
      [
        'Streak = catatan beruntun aktivitas Anda (latihan & iuran).',
        'Rutin berlatih dan membayar iuran tanpa putus agar streak terus naik.',
      ],
    ),
    _GuideSection(
      Icons.emoji_events_outlined,
      'Papan Peringkat & Hadiah',
      [
        'Lihat peringkat poin anggota se-distrik Anda.',
        'Poin dapat ditukar hadiah / merchandise melalui admin — hubungi pengurus distrik Anda.',
      ],
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          'Petunjuk Poin & Level',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: theme.colorScheme.onSurface),
        ),
        const SizedBox(height: 4),
        Text(
          'Cara mengumpulkan poin, naik level, dan meraih lencana.',
          style: TextStyle(fontSize: 13, color: theme.colorScheme.onSurfaceVariant),
        ),
        const SizedBox(height: 12),
        ..._sections.map(
          (s) => Card(
            margin: const EdgeInsets.only(bottom: 10),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Icon(s.icon, size: 20, color: theme.colorScheme.primary),
                    const SizedBox(width: 8),
                    Text(
                      s.title,
                      style: TextStyle(
                          fontSize: 14, fontWeight: FontWeight.w700, color: theme.colorScheme.onSurface),
                    ),
                  ]),
                  const SizedBox(height: 8),
                  ...s.lines.map(
                    (l) => Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Text(
                        l,
                        style: TextStyle(fontSize: 13, height: 1.35, color: theme.colorScheme.onSurface),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _HistoryTab extends StatelessWidget {
  const _HistoryTab();
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return BlocBuilder<GamificationBloc, GamificationState>(
      builder: (context, state) {
        if (state is! GamificationLoaded) return const AppLoadingSpinner();
        final history = state.pointsHistory;
        final events = state.events;
        return ListView(padding: const EdgeInsets.all(16), children: [
          if (history.isNotEmpty) ...[
            Row(children: [
              Icon(Icons.calendar_month_outlined,
                  size: 18, color: theme.colorScheme.primary),
              const SizedBox(width: 6),
              Text('Poin per Bulan',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: theme.colorScheme.onSurface)),
            ]),
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
            Row(children: [
              Icon(Icons.history, size: 18, color: theme.colorScheme.primary),
              const SizedBox(width: 6),
              Text('Aktivitas Terbaru',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: theme.colorScheme.onSurface)),
            ]),
            const SizedBox(height: 8),
            ...events.map((e) => Card(
                  margin: const EdgeInsets.only(bottom: 6),
                  child: ListTile(
                    dense: true,
                    title: Text(e.description,
                        style: TextStyle(fontSize: 13, color: theme.colorScheme.onSurface)),
                    subtitle: Text(Formatters.relative(e.timestamp),
                        style: TextStyle(
                            fontSize: 11, color: theme.colorScheme.onSurfaceVariant)),
                    trailing: Text('+${e.points}',
                        style: TextStyle(
                            fontWeight: FontWeight.w700,
                            color: theme.colorScheme.secondary)),
                  ),
                )),
          ],
          if (history.isEmpty && events.isEmpty)
            Center(
                child: Padding(
              padding: const EdgeInsets.only(top: 60),
              child: Text('Belum ada riwayat poin', style: TextStyle(color: theme.colorScheme.onSurfaceVariant)),
            )),
        ]);
      },
    );
  }
}