import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../logic/auth/auth_bloc.dart';
import '../../logic/member/member_bloc.dart';
import '../widgets/app_bar_icon_title.dart';
import '../widgets/app_loading_spinner.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const AppBarIconTitle(
          icon: Icons.person_outline,
          title: 'Profil',
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            onPressed: () => context.push<void>('/profile/edit'),
            tooltip: 'Edit Profil',
          ),
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => context.push<void>('/settings'),
            tooltip: 'Pengaturan',
          ),
        ],
      ),
      body: BlocBuilder<MemberBloc, MemberState>(
        builder: (context, state) {
          if (state is MemberLoading) {
            return const AppLoadingSpinner();
          }
          if (state is MemberError) {
            return _Error(message: state.message);
          }
          if (state is! MemberLoaded) {
            return const Center(child: Text('Data belum dimuat'));
          }
          final member = state.member;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Center(
                child: CircleAvatar(
                  radius: 48,
                  backgroundColor: AppTheme.primary.withValues(alpha: 0.15),
                  backgroundImage: member.fotoUrl.isNotEmpty
                      ? NetworkImage(member.fotoUrl)
                      : null,
                  child: member.fotoUrl.isEmpty
                      ? const Icon(Icons.person,
                          size: 56, color: AppTheme.primary)
                      : null,
                ),
              ),
              const SizedBox(height: 12),
              Center(
                child: Text(
                  member.namaLengkap,
                  style: Theme.of(context).textTheme.headlineSmall,
                  textAlign: TextAlign.center,
                ),
              ),
              if (member.nomorAnggota.isNotEmpty) ...[
                const SizedBox(height: 4),
                Center(
                  child: Text(
                    'No. Anggota: ${member.nomorAnggota}',
                    style: TextStyle(color: Colors.grey.shade600),
                  ),
                ),
              ],
              const SizedBox(height: 8),
              Center(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Padding(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    child: Text(
                      member.status.isEmpty ? 'Anggota' : member.status,
                      style: const TextStyle(
                        color: AppTheme.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              _infoCard(context, Icons.badge_outlined, 'Nama Lengkap',
                  member.namaLengkap),
              if (member.nomorAnggota.isNotEmpty)
                _infoCard(context, Icons.numbers, 'Nomor Anggota',
                    member.nomorAnggota),
              if (member.email.isNotEmpty)
                _infoCard(context, Icons.email_outlined, 'Email', member.email),
              if (member.nomorTelepon.isNotEmpty)
                _infoCard(context, Icons.phone_outlined, 'No. Telepon',
                    member.nomorTelepon),
              if (member.jenisKelamin.isNotEmpty)
                _infoCard(context, Icons.wc_outlined, 'Jenis Kelamin',
                    member.jenisKelamin),
              if (member.tempatLahir.isNotEmpty ||
                  member.tanggalLahir.isNotEmpty)
                _infoCard(
                  context,
                  Icons.cake_outlined,
                  'Tempat/Tanggal Lahir',
                  [member.tempatLahir, Formatters.dateLong(member.tanggalLahir)]
                      .where((e) => e.isNotEmpty)
                      .join(', '),
                ),
              if (member.alamat.isNotEmpty)
                _infoCard(
                    context, Icons.home_outlined, 'Alamat', member.alamat),
              if (member.kabupaten.isNotEmpty || member.provinsi.isNotEmpty)
                _infoCard(
                  context,
                  Icons.map_outlined,
                  'Wilayah',
                  [member.kabupaten, member.provinsi]
                      .where((e) => e.isNotEmpty)
                      .join(', '),
                ),
              const SizedBox(height: 24),
              OutlinedButton.icon(
                icon: const Icon(Icons.logout, color: AppTheme.danger),
                label: const Text('Keluar',
                    style: TextStyle(color: AppTheme.danger)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppTheme.danger),
                  minimumSize: const Size.fromHeight(48),
                ),
                onPressed: () => _logout(context),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _infoCard(
      BuildContext context, IconData icon, String label, String value) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(icon, color: AppTheme.primary),
        title: Text(label,
            style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
        subtitle: Text(value,
            style: const TextStyle(
                fontWeight: FontWeight.w600, color: Colors.black87)),
      ),
    );
  }

  void _logout(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Keluar'),
        content: const Text('Yakin ingin keluar dari aplikasi?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Batal'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              context.read<AuthBloc>().add(const AuthLogoutRequested());
              context.go('/login');
            },
            child: const Text('Keluar'),
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
                  context.read<MemberBloc>().add(const MemberLoadRequested()),
              child: const Text('Coba Lagi'),
            ),
          ],
        ),
      ),
    );
  }
}
