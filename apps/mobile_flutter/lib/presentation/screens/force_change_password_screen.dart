import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../logic/auth/auth_bloc.dart';
import '../widgets/app_loading_spinner.dart';

class ForceChangePasswordScreen extends StatefulWidget {
  const ForceChangePasswordScreen({super.key});

  @override
  State<ForceChangePasswordScreen> createState() =>
      _ForceChangePasswordScreenState();
}

class _ForceChangePasswordScreenState extends State<ForceChangePasswordScreen> {
  final _newPassword = TextEditingController();
  final _confirmPassword = TextEditingController();
  bool _loading = false;

  String get _token => context.read<AuthBloc>().state is AuthMustChangePassword
      ? (context.read<AuthBloc>().state as AuthMustChangePassword).resetToken
      : '';

  @override
  void dispose() {
    _newPassword.dispose();
    _confirmPassword.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final newPassword = _newPassword.text;
    if (newPassword.length < 6) {
      _msg('Password minimal 6 karakter');
      return;
    }
    if (newPassword != _confirmPassword.text) {
      _msg('Konfirmasi password tidak cocok');
      return;
    }
    setState(() => _loading = true);
    try {
      final api = ApiClient();
      await api.dio.post('/auth/force-change-password', data: {
        'token': _token,
        'newPassword': newPassword,
      });
      if (!mounted) return;
      setState(() => _loading = false);
      await api.clearTokens();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Password berhasil diubah. Silakan login ulang.')),
      );
      context.go('/login');
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      final api = ApiClient();
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(api.messageFromError(e))));
    }
  }

  void _msg(String text) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Ubah Password')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(Icons.shield_outlined,
                size: 64, color: AppTheme.warning),
            const SizedBox(height: 16),
            const Text(
              'Untuk keamanan, Anda harus mengubah password sebelum melanjutkan.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, height: 1.4),
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _newPassword,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Password Baru'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _confirmPassword,
              obscureText: true,
              decoration:
                  const InputDecoration(labelText: 'Konfirmasi Password Baru'),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _loading ? null : _submit,
              child: _loading
                  ? const AppLoadingSpinner.small()
                  : const Text('Simpan Password Baru'),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () => context.go('/login'),
              child: const Text('Kembali ke Login'),
            ),
          ],
        ),
      ),
    );
  }
}
