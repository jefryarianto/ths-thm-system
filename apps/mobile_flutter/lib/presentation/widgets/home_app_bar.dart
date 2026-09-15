import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../logic/auth/auth_bloc.dart';
import '../../logic/member/member_bloc.dart';

/// AppBar Beranda dengan avatar anggota + sapaan 2 baris ala aplikasi Expo:
/// baris 1: `Gloria, selamat datang Kak` (sapaan brand statis, bukan nama depan user)
/// baris 2: nama lengkap.
class HomeAppBar extends StatelessWidget implements PreferredSizeWidget {
  const HomeAppBar({super.key});

  @override
  Size get preferredSize => const Size.fromHeight(76);

  @override
  Widget build(BuildContext context) {
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
                    const Text(
                      'Gloria, selamat datang Kak',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: Colors.white70,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      namaLengkap,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
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
        IconButton(
          icon: const Icon(Icons.notifications_outlined),
          tooltip: 'Notifikasi',
          onPressed: () => context.push<void>('/notifications'),
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
}

class _Avatar extends StatelessWidget {
  const _Avatar();

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push<void>('/profile'),
      child: BlocBuilder<MemberBloc, MemberState>(
        builder: (context, state) {
          if (state is MemberLoaded && state.member.fotoUrl.isNotEmpty) {
            return CircleAvatar(
              radius: 24,
              backgroundColor: Colors.white.withValues(alpha: 0.25),
              child: ClipOval(
                child: CachedNetworkImage(
                  imageUrl: state.member.fotoUrl,
                  width: 46,
                  height: 46,
                  fit: BoxFit.cover,
                  errorWidget: (_, __, ___) => const Icon(
                    Icons.person,
                    color: Colors.white,
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
            backgroundColor: Colors.white.withValues(alpha: 0.25),
            child: Text(
              inisial.toUpperCase(),
              style: const TextStyle(
                color: Colors.white,
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
