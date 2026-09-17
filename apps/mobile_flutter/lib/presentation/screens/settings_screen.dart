import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../../core/api/api_client.dart';
import '../../core/services/app_update_service.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/theme_controller.dart';
import '../../core/utils/snack_bar_helper.dart';
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
          ListTile(
            leading: const Icon(Icons.info_outline, color: AppTheme.primary),
            title: const Text('Tentang Aplikasi'),
            subtitle: const Text('Versi, pembaruan, dan info aplikasi'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => _showAboutDialog(context),
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

  void _showAboutDialog(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (_) => const _AboutAppDialog(),
    );
  }
}

/// Dialog "Tentang Aplikasi": versi terpasang (package_info_plus), info versi
/// server (`/api/public/mobile-app-info` via AppUpdateService), changelog, dan
/// tombol periksa pembaruan / instal update.
class _AboutAppDialog extends StatefulWidget {
  const _AboutAppDialog();

  @override
  State<_AboutAppDialog> createState() => _AboutAppDialogState();
}

class _AboutAppDialogState extends State<_AboutAppDialog> {
  PackageInfo? _package;
  String? _packageError;

  @override
  void initState() {
    super.initState();
    // Muat info versi server segar saat dialog dibuka.
    AppUpdateService.instance.checkNow(force: true);
    _loadPackageInfo();
  }

  Future<void> _loadPackageInfo() async {
    try {
      final package = await PackageInfo.fromPlatform();
      if (mounted) setState(() => _package = package);
    } catch (error) {
      if (mounted) setState(() => _packageError = error.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Row(
        children: [
          Icon(Icons.info_outline, color: AppTheme.primary),
          SizedBox(width: 8),
          Text('Tentang Aplikasi'),
        ],
      ),
      content: SingleChildScrollView(
        child: ValueListenableBuilder<AppUpdateState>(
          valueListenable: AppUpdateService.instance.notifier,
          builder: (context, updateState, _) {
            final info = updateState.info;
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                _InfoRow(
                  label: 'Versi Terpasang',
                  value: _package == null
                      ? (_packageError == null
                          ? 'Memuat…'
                          : 'Tidak diketahui')
                      : 'v${_package!.version} (${_package!.buildNumber})',
                ),
                const SizedBox(height: 8),
                _InfoRow(
                  label: 'Versi Server',
                  value: info == null
                      ? '—'
                      : 'v${info.versionName} (build ${info.versionCode})',
                ),
                const SizedBox(height: 12),
                _statusLine(updateState),
                if (info != null && info.changelog.trim().isNotEmpty) ...[
                  const SizedBox(height: 10),
                  const Text(
                    'Catatan Pembaruan',
                    style: TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    info.changelog,
                    style: TextStyle(
                        fontSize: 13,
                        height: 1.4,
                        color: Colors.grey.shade700),
                  ),
                ],
              ],
            );
          },
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => AppUpdateService.instance.checkNow(force: true),
          child: const Text('Periksa Pembaruan'),
        ),
        ValueListenableBuilder<AppUpdateState>(
          valueListenable: AppUpdateService.instance.notifier,
          builder: (context, updateState, _) {
            final info = updateState.info;
            final canUpdate = info != null &&
                updateState.status == AppUpdateStatus.updateAvailable ||
                updateState.status == AppUpdateStatus.forceUpdate;
            return TextButton(
              onPressed: canUpdate
                  ? () => AppUpdateService.instance.downloadAndInstall(info!)
                  : null,
              child: const Text('Update'),
            );
          },
        ),
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Tutup'),
        ),
      ],
    );
  }

  Widget _statusLine(AppUpdateState state) {
    final (icon, text, color) = switch (state.status) {
      AppUpdateStatus.checking => (Icons.hourglass_top, 'Memeriksa…', Colors.grey),
      AppUpdateStatus.upToDate => (
          Icons.check_circle_outline,
          'Aplikasi sudah versi terbaru',
          AppTheme.success,
        ),
      AppUpdateStatus.updateAvailable => (
          Icons.system_update_alt,
          'Versi baru tersedia',
          AppTheme.warning,
        ),
      AppUpdateStatus.forceUpdate => (
          Icons.error_outline,
          'Pembaruan wajib untuk melanjutkan',
          AppTheme.danger,
        ),
      AppUpdateStatus.downloading => (
          Icons.downloading,
          'Mengunduh…',
          AppTheme.primary,
        ),
      AppUpdateStatus.error => (
          Icons.error_outline,
          state.error ?? 'Gagal memeriksa pembaruan',
          AppTheme.danger,
        ),
    };
    return Row(
      children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            text,
            style: TextStyle(fontSize: 13, color: color),
          ),
        ),
      ],
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 110,
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: Colors.grey.shade600,
            ),
          ),
        ),
        Expanded(
          child: Text(value, style: const TextStyle(fontSize: 13)),
        ),
      ],
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
      onSelectionChanged: (selection) => controller.mode = selection.first,
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
      showCenteredSnackBar(
          context, 'Password baru minimal 6 karakter dan wajib diisi');
      return;
    }
    if (_new.text != _confirm.text) {
      showCenteredSnackBar(context, 'Konfirmasi password tidak cocok');
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
      showCenteredSnackBar(context, 'Password berhasil diubah');
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      final api = ApiClient();
      final msg = api.messageFromError(e);
      showCenteredSnackBar(context, msg);
    }
  }
}
