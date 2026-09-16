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

  /// Muat ulang seluruh data gamification dari awal (untuk tombol "Coba Lagi").
  void _reload() {
    setState(() => _loaded = false);
    _startLoading();
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
              return _GamificationErrorView(
                message: state.message,
                onRetry: _reload,
              );
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
    final labels = ['Profil', 'Leaderboard', 'Riwayat', 'Petunjuk'];
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: const Color(0xFFF0F6FE),
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
                    color: active ? Colors.white : Colors.transparent,
                    borderRadius: BorderRadius.circular(10),
                    boxShadow: active
                        ? const [
                            BoxShadow(
                              color: Color(0x142B5AA6),
                              blurRadius: 6,
                              offset: Offset(0, 2),
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
                      color:
                          active ? AppTheme.primaryDark : Colors.grey.shade600,
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
              const Text('Poin',
                  style: TextStyle(
                      color: Color(0xB31E1800), fontSize: 14)),
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

  static const _medals = {1: '\u{1F947}', 2: '\u{1F948}', 3: '\u{1F949}'};

  void _reload(BuildContext context) {
    context.read<GamificationBloc>().add(
          const GamificationLeaderboardLoadRequested(),
        );
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<GamificationBloc, GamificationState>(
      builder: (context, state) {
        if (state is! GamificationLoaded || state.leaderboard == null) {
          return const AppLoadingSpinner(message: 'Memuat leaderboard...');
        }
        final entries = state.leaderboard!;
        if (entries.isEmpty) {
          return _EmptyLeaderboard(onRetry: () => _reload(context));
        }
        return RefreshIndicator(
          onRefresh: () async => _reload(context),
          child: ListView.builder(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            itemCount: entries.length,
            itemBuilder: (context, i) {
              final e = entries[i];
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: AppTheme.primary.withValues(alpha: 0.1),
                    child: Text(_medals[e.rank] ?? '${e.rank}',
                        style: const TextStyle(fontSize: 14)),
                  ),
                  title: Text(e.namaLengkap,
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Text('${e.badges} lencana',
                      style: TextStyle(
                          fontSize: 12, color: Colors.grey.shade600)),
                  trailing: Text('${e.points}',
                      style: const TextStyle(
                          fontWeight: FontWeight.w700, fontSize: 15)),
                ),
              );
            },
          ),
        );
      },
    );
  }
}

/// State kosong leaderboard — info + tombol muat ulang, bukan teks polos.
class _EmptyLeaderboard extends StatelessWidget {
  final VoidCallback onRetry;
  const _EmptyLeaderboard({required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(24),
      children: [
        const SizedBox(height: 64),
        Icon(Icons.leaderboard_outlined,
            size: 56, color: AppTheme.primary.withValues(alpha: 0.6)),
        const SizedBox(height: 12),
        const Text(
          'Belum ada data leaderboard',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 6),
        const Text(
          'Poin anggota akan muncul di sini setelah presensi latihan\n'
          'dan pembayaran iuran dicatat oleh pengurus.',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 12.5, color: Colors.grey),
        ),
        const SizedBox(height: 20),
        Center(
          child: FilledButton.tonalIcon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh),
            label: const Text('Segarkan'),
          ),
        ),
      ],
    );
  }
}

/// Error state pada layar gamification — pesan kesalahan + tombol "Coba Lagi".
class _GamificationErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _GamificationErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(24),
      children: [
        const SizedBox(height: 80),
        const Icon(Icons.error_outline, size: 52, color: AppTheme.danger),
        const SizedBox(height: 12),
        const Text(
          'Gagal memuat data',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 8),
        Text(
          message,
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
        ),
        const SizedBox(height: 20),
        Center(
          child: FilledButton.tonalIcon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh),
            label: const Text('Coba Lagi'),
          ),
        ),
      ],
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
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Petunjuk Poin & Level',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 4),
        Text(
          'Cara mengumpulkan poin, naik level, dan meraih lencana.',
          style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
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
                    Icon(s.icon, size: 20, color: AppTheme.primaryDark),
                    const SizedBox(width: 8),
                    Text(
                      s.title,
                      style: const TextStyle(
                          fontSize: 14, fontWeight: FontWeight.w700),
                    ),
                  ]),
                  const SizedBox(height: 8),
                  ...s.lines.map(
                    (l) => Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Text(
                        l,
                        style: const TextStyle(fontSize: 13, height: 1.35),
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
    return BlocBuilder<GamificationBloc, GamificationState>(
      builder: (context, state) {
        if (state is! GamificationLoaded) return const AppLoadingSpinner();
        final history = state.pointsHistory;
        final events = state.events;
        return ListView(padding: const EdgeInsets.all(16), children: [
          if (history.isNotEmpty) ...[
            const Row(children: [
              Icon(Icons.calendar_month_outlined,
                  size: 18, color: AppTheme.primaryDark),
              SizedBox(width: 6),
              Text('Poin per Bulan',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
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
            const Row(children: [
              Icon(Icons.history, size: 18, color: AppTheme.primaryDark),
              SizedBox(width: 6),
              Text('Aktivitas Terbaru',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
            ]),
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
