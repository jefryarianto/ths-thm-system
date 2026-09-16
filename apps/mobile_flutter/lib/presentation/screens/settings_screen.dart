import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/theme_controller.dart';
import '../../logic/auth/auth_bloc.dart';
import '../../logic/member/member_bloc.dart';
import '../widgets/app_bar_icon_title.dart';
import '../widgets/app_loading_spinner.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const AppBarIconTitle(
          icon: Icons.settings_outlined,
          title: 'Pengaturan',
        ),
      ),
      body: ListView(
        children: [
          BlocBuilder<AuthBloc, AuthState>(
            builder: (context, state) {
              final email = state is AuthAuthenticated ? state.user.email : '-';
              return ListTile(
                leading: const CircleAvatar(
                  child: Icon(Icons.person),
                ),
                title: Text(state is AuthAuthenticated
                    ? state.user.namaLengkap
                    : 'Pengguna'),
                subtitle: Text(email),
              );
            },
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.folder_outlined, color: AppTheme.primary),
            title: const Text('Dokumen'),
            subtitle: const Text('Dokumen resmi keanggotaan Anda'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push<void>('/documents'),
          ),
          ListTile(
            leading: const Icon(Icons.key_outlined, color: AppTheme.primary),
            title: const Text('Ubah Password'),
            subtitle: const Text('Perbarui kata sandi akun Anda'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => _openChangePassword(context),
          ),
          ListTile(
            leading: const Icon(Icons.credit_card, color: AppTheme.primary),
            title: const Text('KTA Digital'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push<void>('/kta'),
          ),
          ListTile(
            leading: const Icon(Icons.notifications_outlined,
                color: AppTheme.primary),
            title: const Text('Notifikasi'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push<void>('/notifications'),
          ),
          const Divider(),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Text('Tampilan',
                style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: Colors.grey.shade600)),
          ),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: _ThemeSelector(),
          ),
          const Divider(),
          const ListTile(
            leading: Icon(Icons.info_outline, color: AppTheme.primary),
            title: Text('Tentang Aplikasi'),
            subtitle: Text('THS-THM Mobile Flutter v1.0.0'),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: OutlinedButton.icon(
              icon: const Icon(Icons.logout, color: AppTheme.danger),
              label: const Text('Keluar',
                  style: TextStyle(color: AppTheme.danger)),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppTheme.danger),
                minimumSize: const Size.fromHeight(48),
              ),
              onPressed: () {
                context.read<AuthBloc>().add(const AuthLogoutRequested());
                context.read<MemberBloc>().add(const MemberLogoutRequested());
                context.go('/login');
              },
            ),
          ),
        ],
      ),
    );
  }

  void _openChangePassword(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => const _ChangePasswordSheet(),
    );
  }
}

class _ThemeSelector extends StatelessWidget {
  const _ThemeSelector();

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<ThemeController>();
    return SegmentedButton<ThemeMode>(
      segments: const [
        ButtonSegment(
          value: ThemeMode.light,
          icon: Icon(Icons.light_mode_outlined),
          label: Text('Terang'),
        ),
        ButtonSegment(
          value: ThemeMode.dark,
          icon: Icon(Icons.dark_mode_outlined),
          label: Text('Gelap'),
        ),
        ButtonSegment(
          value: ThemeMode.system,
          icon: Icon(Icons.brightness_auto_outlined),
          label: Text('Sistem'),
        ),
      ],
      selected: {controller.mode},
      showSelectedIcon: false,
      onSelectionChanged: (selection) =>
          controller.mode = selection.first,
    );
  }
}

class _ChangePasswordSheet extends StatefulWidget {
  const _ChangePasswordSheet();

  @override
  State<_ChangePasswordSheet> createState() => _ChangePasswordSheetState();
}

class _ChangePasswordSheetState extends State<_ChangePasswordSheet> {
  final _current = TextEditingController();
  final _new = TextEditingController();
  final _confirm = TextEditingController();
  bool _loading = false;
  final bool _obscure = true;

  @override
  void dispose() {
    _current.dispose();
    _new.dispose();
    _confirm.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 20, 20, bottom + 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Ubah Password',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: 16),
          TextField(
            controller: _current,
            obscureText: _obscure,
            decoration: const InputDecoration(labelText: 'Password Saat Ini'),
          ),
          const SizedBox(height: 12),
          TextField(
              controller: _new,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Password Baru')),
          const SizedBox(height: 12),
          TextField(
              controller: _confirm,
              obscureText: true,
              decoration:
                  const InputDecoration(labelText: 'Konfirmasi Password Baru')),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _loading ? null : _submit,
            child: _loading
                ? const AppLoadingSpinner.small()
                : const Text('Simpan'),
          ),
        ],
      ),
    );
  }

  Future<void> _submit() async {
    if (_current.text.isEmpty || _new.text.isEmpty || _new.text.length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Password baru minimal 6 karakter dan wajib diisi')),
      );
      return;
    }
    if (_new.text != _confirm.text) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Konfirmasi password tidak cocok')),
      );
      return;
    }
    setState(() => _loading = true);
    try {
      final api = ApiClient();
      await api.dio.patch('/auth/change-password', data: {
        'currentPassword': _current.text,
        'newPassword': _new.text,
      });
      if (!mounted) return;
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Password berhasil diubah')),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      final api = ApiClient();
      final msg = api.messageFromError(e);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
    }
  }
}
