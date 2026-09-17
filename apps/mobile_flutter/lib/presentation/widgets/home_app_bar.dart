import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../logic/auth/auth_bloc.dart';
import '../../logic/member/member_bloc.dart';
import '../../logic/notification/notification_bloc.dart';

/// AppBar Beranda dengan avatar anggota + sapaan 2 baris ala aplikasi Expo:
/// baris 1: `Gloria, selamat datang Kak` (sapaan brand statis, bukan nama depan user)
/// baris 2: nama lengkap.
class HomeAppBar extends StatelessWidget implements PreferredSizeWidget {
  const HomeAppBar({super.key});

  @override
  Size get preferredSize => const Size.fromHeight(76);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return AppBar(
      toolbarHeight: 76,
      titleSpacing: 16,
      title: Row(
        children: [
          const _Avatar(),
          const SizedBox(width: 12),
          Expanded(
            child: BlocBuilder<AuthBloc, AuthState>(
              builder: (context, state) {
                final namaLengkap = state is AuthAuthenticated
                    ? state.user.namaLengkap
                    : 'Anggota';
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'Gloria, selamat datang Kak',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: isDark
                            ? const Color(0xB3FFFFFF)
                            : const Color(0xB31E1800),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      namaLengkap,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: isDark ? Colors.white : AppTheme.onPrimary,
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
      actions: [
        BlocBuilder<NotificationBloc, NotificationState>(
          buildWhen: (previous, current) =>
              _notificationBadge(previous) != _notificationBadge(current),
          builder: (context, state) {
            final count = _notificationBadge(state);
            return Stack(
              clipBehavior: Clip.none,
              children: [
                IconButton(
                  icon: const Icon(Icons.notifications_outlined),
                  tooltip: 'Notifikasi',
                  onPressed: () => context.push<void>('/notifications'),
                ),
                if (count > 0)
                  Positioned(
                    right: 2,
                    top: 6,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 5, vertical: 1),
                      decoration: BoxDecoration(
                        color: AppTheme.danger,
                        borderRadius: BorderRadius.circular(9),
                        border: Border.all(color: Colors.white, width: 1),
                      ),
                      constraints: const BoxConstraints(minWidth: 16),
                      child: Text(
                        count > 99 ? '99+' : '$count',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
        IconButton(
          icon: const Icon(Icons.settings_outlined),
          tooltip: 'Pengaturan',
          onPressed: () => context.push<void>('/settings'),
        ),
        const SizedBox(width: 4),
      ],
    );
  }

  int _notificationBadge(NotificationState state) {
    if (state is NotificationLoaded) return state.unreadCount;
    if (state is NotificationUnreadState) return state.unreadCount;
    return 0;
  }
}

class _Avatar extends StatelessWidget {
  const _Avatar();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final fg = isDark ? Colors.white : AppTheme.onPrimary;
    final bg = (isDark ? Colors.white : AppTheme.onPrimary)
        .withValues(alpha: 0.14);
    return GestureDetector(
      onTap: () => context.push<void>('/profile'),
      child: BlocBuilder<MemberBloc, MemberState>(
        builder: (context, state) {
          if (state is MemberLoaded && state.member.fotoUrl.isNotEmpty) {
            return CircleAvatar(
              radius: 24,
              backgroundColor: bg,
              child: ClipOval(
                child: CachedNetworkImage(
                  imageUrl: state.member.fotoUrl,
                  width: 46,
                  height: 46,
                  fit: BoxFit.cover,
                  errorWidget: (_, __, ___) => Icon(
                    Icons.person,
                    color: fg,
                    size: 28,
                  ),
                ),
              ),
            );
          }
          // Fallback: inisial nama dari AuthBloc
          final auth = context.read<AuthBloc>().state;
          final nama = auth is AuthAuthenticated ? auth.user.namaLengkap : '';
          final inisial = nama.trim().isEmpty
              ? 'A'
              : nama
                  .trim()
                  .split(RegExp(r'\s+'))
                  .take(2)
                  .map((e) => e[0])
                  .join();
          return CircleAvatar(
            radius: 24,
            backgroundColor: bg,
            child: Text(
              inisial.toUpperCase(),
              style: TextStyle(
                color: fg,
                fontWeight: FontWeight.w700,
                fontSize: 16,
              ),
            ),
          );
        },
      ),
    );
  }
}
