import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/snack_bar_helper.dart';
import '../../logic/auth/auth_bloc.dart';
import '../../logic/dues/dues_bloc.dart';
import '../../logic/gamification/gamification_bloc.dart';
import '../../logic/home_feed/home_feed_bloc.dart';
import '../../data/models/card_data.dart';
import '../../logic/member/member_bloc.dart';
import '../../logic/notification/notification_bloc.dart';
import '../widgets/app_loading_spinner.dart';
import '../widgets/home_app_bar.dart';
import '../widgets/home_feed_sections.dart';
import '../widgets/kta_card_widget.dart';
import '../widgets/secure_kta_container.dart';
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
      context.read<HomeFeedBloc>().add(const HomeFeedLoadRequested());
    }
    // Muat jumlah notifikasi belum dibaca untuk badge lonceng (aman no-op
    // bila sesi belum valid — handler memeriksa token sendiri).
    context.read<NotificationBloc>().add(const NotificationCountRequested());
  }

  Future<void> _refresh() async {
    final authState = context.read<AuthBloc>().state;
    if (authState is AuthAuthenticated) {
      context.read<MemberBloc>().add(const MemberLoadRequested());
      context.read<DuesBloc>().add(const DuesLoadRequested());
      context.read<HomeFeedBloc>().add(const HomeFeedLoadRequested());
      _gamificationAsked = false;
      if (mounted) {
        showCenteredSnackBar(context, 'Data diperbarui');
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
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverToBoxAdapter(child: _ShortcutChips()),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 20)),
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverToBoxAdapter(child: _KtaSection()),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 16)),
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverToBoxAdapter(child: _GamificationTip()),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 8)),
              const SliverToBoxAdapter(child: AgendaSection()),
              const SliverToBoxAdapter(child: SizedBox(height: 20)),
              const SliverToBoxAdapter(child: BeritaFeedSection()),
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
        const _ChipItem(
            Icons.how_to_reg_outlined, 'Pendaftaran', '/admin/registrations'),
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
          // Semua chip tampil seragam sebagai kapsul krem solid + teks gelap.
          return ActionChip(
            avatar: Icon(item.icon, size: 18, color: const Color(0xFF3E2F1D)),
            label: Text(item.label,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF3E2F1D),
                )),
            backgroundColor: const Color(0xFFF4EAD9),
            side: BorderSide(
                color: const Color(0xFFD9C7A3).withValues(alpha: 0.6)),
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
                  context
                      .read<MemberBloc>()
                      .add(const MemberCardDataRequested());
                }
              });
            }
            return _KtaSectionCard(
                member: state.member, cardData: state.cardData);
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
    // Kartu digambar persis seperti layar /kta: tanpa frame, gutter total 20
    // (16 sliver + 4) agar ukuran kartu identik dengan halaman KTA Digital.
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      // Kartu KTA lama dibungkus `SecureKtaContainer`: tata letak kartu TIDAK
      // diubah — proteksi FLAG_SECURE aktif selama Halaman Beranda berada di
      // layar (lihat `secure_window_channel.dart` — reference counting
      // melindungi wrapper bertingkat dengan layar /kta maupun /kta/viewer).
      // Banner jam verifikasi live disembunyikan (default showLiveClock false).
      child: SecureKtaContainer(
        childKtaExisting: KtaFlipCard(member: member, cardData: cardData),
      ),
    );
  }
}

class _GamificationTip extends StatelessWidget {
  // Bronzespalette — dipakai kartu "Level: Bronze" ala tampilan beranda.
  static const Color _bronze = Color(0xFF8C6A3E);
  static const Color _bronzeLight = Color(0xFFD7B98C);
  static const Color _bronzeBg = Color(0xFFFBF4E8);

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<GamificationBloc, GamificationState>(
      builder: (context, state) {
        if (state is! GamificationLoaded || state.profile == null) {
          return const SizedBox.shrink();
        }
        final p = state.profile!;
        // Medali diambil dari data level (icon bisa emoji pangkat, mis. 🥉/🥈/🥇)
        final medal = p.level.icon.isEmpty ? '🎖️' : p.level.icon;
        return Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(20),
            onTap: () => context.push<void>('/gamification'),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: _bronzeBg,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                    color: _bronze.withValues(alpha: 0.28), width: 1.2),
              ),
              child: Row(children: [
                Container(
                  width: 54,
                  height: 54,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [_bronzeLight, _bronze],
                    ),
                    border: Border.all(color: Colors.white, width: 2),
                    boxShadow: [
                      BoxShadow(
                          color: _bronze.withValues(alpha: 0.35),
                          blurRadius: 10,
                          offset: const Offset(0, 3)),
                    ],
                  ),
                  child: Text(medal,
                      style: const TextStyle(
                          fontSize: 26, color: Color(0xFF3E2F1D))),
                ),
                const SizedBox(width: 12),
                Expanded(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                      Text('Level: ${p.level.name}',
                          style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF3E2F1D))),
                      const SizedBox(height: 2),
                      Text('${p.points} poin • ${p.level.name} member',
                          style: const TextStyle(
                              fontSize: 13, color: Color(0xFF6F5330))),
                      const SizedBox(height: 8),
                      // Progress sederhana menuju level berikutnya (bronze→silver)
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: LinearProgressIndicator(
                          value: p.points >= 500
                              ? 1
                              : (p.points / 500).clamp(0.0, 1.0),
                          minHeight: 6,
                          backgroundColor: Colors.white,
                          valueColor: const AlwaysStoppedAnimation(_bronze),
                        ),
                      ),
                    ])),
              ]),
            ),
          ),
        );
      },
    );
  }
}
