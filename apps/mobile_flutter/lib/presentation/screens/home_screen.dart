import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../logic/auth/auth_bloc.dart';
import '../../logic/dues/dues_bloc.dart';
import '../../logic/gamification/gamification_bloc.dart';
import '../../data/models/card_data.dart';
import '../../logic/member/member_bloc.dart';
import '../widgets/app_loading_spinner.dart';
import '../widgets/home_app_bar.dart';
import '../widgets/kta_card_widget.dart';
import '../../data/models/member.dart';

/// Beranda utama — chip shortcut scroll horizontal,
/// kartu KTA flip 3D, dan gamification tip.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _gamificationAsked = false;

  @override
  void initState() {
    super.initState();
    final authState = context.read<AuthBloc>().state;
    if (authState is AuthAuthenticated) {
      context.read<MemberBloc>().add(const MemberLoadRequested());
      context.read<DuesBloc>().add(const DuesLoadRequested());
    }
  }

  Future<void> _refresh() async {
    final authState = context.read<AuthBloc>().state;
    if (authState is AuthAuthenticated) {
      context.read<MemberBloc>().add(const MemberLoadRequested());
      context.read<DuesBloc>().add(const DuesLoadRequested());
      _gamificationAsked = false;
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Data diperbarui')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const HomeAppBar(),
      body: BlocListener<MemberBloc, MemberState>(
        listenWhen: (prev, curr) => curr is MemberLoaded,
        listener: (context, state) {
          if (!_gamificationAsked && state is MemberLoaded) {
            _gamificationAsked = true;
            context.read<GamificationBloc>().add(
                  GamificationLoadRequested(anggotaId: state.member.id),
                );
          }
        },
        child: RefreshIndicator(
          onRefresh: _refresh,
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              const SliverToBoxAdapter(child: SizedBox(height: 12)),
              // Konten beranda diberi padding horizontal 16 agar chip, judul
              // section (mis. "Kartu Anggota (KTA)") dan kartu tidak menempel
              // ke tepi layar.
              const SliverPadding(
                padding: EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverToBoxAdapter(child: _ShortcutChips()),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 20)),
              const SliverPadding(
                padding: EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverToBoxAdapter(child: _KtaSection()),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 16)),
              const SliverPadding(
                padding: EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverToBoxAdapter(child: _GamificationTip()),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 24)),
            ],
          ),
        ),
      ),
    );
  }
}

class _ChipItem {
  final IconData icon;
  final String label;
  final String route;
  const _ChipItem(this.icon, this.label, this.route);
}

class _ShortcutChips extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final authState = context.watch<AuthBloc>().state;
    final role = authState is AuthAuthenticated ? authState.user.role : null;
    final items = [
      const _ChipItem(Icons.account_balance_wallet_outlined, 'Iuran', '/dues'),
      const _ChipItem(Icons.credit_card, 'KTA Digital', '/kta'),
      const _ChipItem(Icons.folder_outlined, 'Dokumen', '/documents'),
      const _ChipItem(Icons.qr_code_scanner, 'Scan QR', '/qr-scan'),
      const _ChipItem(Icons.forum_outlined, 'Forum', '/forum'),
      const _ChipItem(Icons.emoji_events_outlined, 'Poin', '/gamification'),
      if (role == 'penguji' ||
          role == 'admin_kegiatan' ||
          role == 'admin_ranting' ||
          role == 'admin_wilayah' ||
          role == 'admin_distrik' ||
          role == 'superadmin')
        const _ChipItem(Icons.school_outlined, 'Pendadaran', '/pendadaran'),
      if (role == 'admin_ranting' ||
          role == 'admin_wilayah' ||
          role == 'admin_distrik' ||
          role == 'superadmin') ...[
        const _ChipItem(Icons.how_to_reg_outlined, 'Pendaftaran', '/admin/registrations'),
        const _ChipItem(Icons.verified_user_outlined, 'Klaim', '/admin/claims'),
      ],
    ];
    return SizedBox(
      height: 44,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          final item = items[i];
          return ActionChip(
            avatar: Icon(item.icon, size: 18, color: AppTheme.primary),
            label: Text(item.label,
                style:
                    const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            backgroundColor: AppTheme.primary.withValues(alpha: 0.06),
            side: BorderSide(color: AppTheme.primary.withValues(alpha: 0.2)),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
            onPressed: () => context.push<void>(item.route),
          );
        },
      ),
    );
  }
}

class _KtaSection extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Row(children: [
              Icon(Icons.credit_card_outlined,
                  size: 18, color: AppTheme.primaryDark),
              SizedBox(width: 6),
              Text('Kartu Anggota (KTA)',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
            ]),
            TextButton(
              onPressed: () => context.push<void>('/kta'),
              child: const Text('Lihat Detail'),
            ),
          ],
        ),
        BlocBuilder<MemberBloc, MemberState>(
          builder: (context, state) {
            if (state is MemberLoading) {
              return const AppLoadingSpinner();
            }
            if (state is! MemberLoaded) {
              return Card(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Center(
                    child: Text('Data kartu belum tersedia.',
                        style: TextStyle(color: Colors.grey.shade500)),
                  ),
                ),
              );
            }
            // Ambil data kartu digital (penandatangan, stempel) sekali saja
            if (state.cardData == null) {
              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (context.mounted) {
                  context.read<MemberBloc>().add(const MemberCardDataRequested());
                }
              });
            }
            return _KtaSectionCard(member: state.member, cardData: state.cardData);
          },
        ),
      ],
    );
  }
}

class _KtaSectionCard extends StatelessWidget {
  final Member member;
  final CardData? cardData;
  const _KtaSectionCard({required this.member, this.cardData});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      clipBehavior: Clip.antiAlias,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: KtaFlipCard(member: member, cardData: cardData),
      ),
    );
  }
}

class _GamificationTip extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return BlocBuilder<GamificationBloc, GamificationState>(
      builder: (context, state) {
        if (state is! GamificationLoaded || state.profile == null) {
          return const SizedBox.shrink();
        }
        final p = state.profile!;
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(children: [
              Text(p.level.icon, style: const TextStyle(fontSize: 28)),
              const SizedBox(width: 14),
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Text('Level: ${p.level.name}',
                        style: const TextStyle(
                            fontSize: 14, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 2),
                    Text('${p.points} poin',
                        style: TextStyle(
                            fontSize: 13, color: Colors.grey.shade600)),
                  ])),
              TextButton(
                  onPressed: () => context.push<void>('/gamification'),
                  child: const Text('Lihat Semua')),
            ]),
          ),
        );
      },
    );
  }
}
