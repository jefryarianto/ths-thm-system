import '../../core/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../core/utils/name_initials.dart';

import '../../logic/auth/auth_bloc.dart';
import '../../logic/member/member_bloc.dart';
import '../../logic/notification/notification_bloc.dart';
import 'member_avatar.dart';

/// AppBar Beranda ala aplikasi Expo — sapaan 3 baris dinamis:
/// baris 1: `Gloria, selamat pagi` (pagi/siang/sore/malam — mengikuti jam).
/// baris 2: `Kak <nama lengkap>`.
/// baris 3: badge role primary container kecil (jika role ada).
class HomeAppBar extends StatelessWidget implements PreferredSizeWidget {
  const HomeAppBar({super.key});

  @override
  Size get preferredSize => const Size.fromHeight(78);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppBar(
      toolbarHeight: 78,
      titleSpacing: 16,
      // Header Beranda memakai gradien aksen Nordy (teal → ungu). Teks dan
      // ikon putih kontras di kedua ujung gradien (4,78:1 dan 7,30:1).
      backgroundColor: Colors.transparent,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      foregroundColor: Colors.white,
      iconTheme: const IconThemeData(color: Colors.white),
      actionsIconTheme: const IconThemeData(color: Colors.white),
      systemOverlayStyle: SystemUiOverlayStyle.light,
      // `SizedBox.expand` wajib: tanpa child, DecoratedBox di dalam area
      // flexibleSpace AppBar mendapat tinggi 0 sehingga gradien tidak tercat.
      flexibleSpace: DecoratedBox(
        decoration: BoxDecoration(
          gradient: AppTheme.accentGradient(theme.brightness),
        ),
        child: const SizedBox.expand(),
      ),
      title: Row(
        children: [
          const _Avatar(),
          const SizedBox(width: AppTheme.space12),
          Expanded(
            child: BlocBuilder<AuthBloc, AuthState>(
              builder: (context, state) {
                final namaLengkap = state is AuthAuthenticated
                    ? state.user.namaLengkap
                    : '';
                final role = state is AuthAuthenticated ? state.user.role : '';

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'Gloria, selamat ${_kataWaktu(DateTime.now())}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Kak $namaLengkap',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                    if (role.isNotEmpty) const SizedBox(height: 2),
                    if (role.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 1),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(5),
                        ),
                        child: Text(
                          _labelRole(role),
                          style: const TextStyle(
                            color: AppTheme.accentInk,
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                          ),
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
                        color: theme.colorScheme.error,
                        borderRadius: BorderRadius.circular(9),
                        border: Border.all(color: Colors.white, width: 1),
                      ),
                      constraints: const BoxConstraints(minWidth: 16),
                      child: Text(
                        count > 99 ? '99+' : '$count',
                        style: TextStyle(
                          color: theme.colorScheme.onError,
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
        const SizedBox(width: AppTheme.space4),
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
    return BlocBuilder<MemberBloc, MemberState>(
      builder: (context, state) {
        if (state is MemberLoaded) {
          final fotoUrl = state.member.fotoUrl;
          return MemberAvatar(
            size: 48,
            imageUrl: fotoUrl,
            initials: nameInitials(state.member.namaLengkap),
          );
        }
        final auth = context.read<AuthBloc>().state;
        final nama = auth is AuthAuthenticated ? auth.user.namaLengkap : '';
        return MemberAvatar(size: 48, initials: nameInitials(nama));
      },
    );
  }
}

String _kataWaktu(DateTime now) {
  final jam = now.hour;
  if (jam < 11) return 'pagi';
  if (jam < 15) return 'siang';
  if (jam < 18) return 'sore';
  return 'malam';
}

String _labelRole(String role) {
  final r = role.trim().toUpperCase();
  if (r.contains('BENDAHARA')) return 'BENDAHARA';
  if (r.contains('SEKRETARIS')) return 'SEKRETARIS';
  if (r.contains('KETUA')) return 'KETUA I';
  if (r.contains('PENDAFTAR') || r.contains('DOKUMENTASI')) return 'ANGGOTA';
  if (r.isNotEmpty) return r.replaceAll(RegExp(r'\s+'), '');
  return 'ANGGOTA';
}