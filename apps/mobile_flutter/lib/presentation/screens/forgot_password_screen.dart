import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/snack_bar_helper.dart';
import '../widgets/app_loading_spinner.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _email = TextEditingController();
  bool _loading = false;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final email = _email.text.trim();
    if (email.isEmpty) {
      showCenteredSnackBar(context, 'Masukkan email terlebih dahulu');
      return;
    }
    setState(() => _loading = true);
    try {
      final api = ApiClient();
      await api.dio.post('/auth/forgot', data: {'email': email});
      if (!mounted) return;
      setState(() => _loading = false);
      showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Email Terkirim'),
          content: const Text(
              'Silakan cek email Anda untuk mendapatkan tautan reset password.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('OK'),
            ),
          ],
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      final api = ApiClient();
      showCenteredSnackBar(context, api.messageFromError(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Lupa Password')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(Icons.lock_reset, size: 64, color: AppTheme.primary),
            const SizedBox(height: 20),
            const Text(
              'Masukkan email terdaftar Anda. Kami akan mengirimkan tautan untuk mereset password.',
              style: TextStyle(fontSize: 14, height: 1.4),
            ),
            const SizedBox(height: 20),
            TextField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                labelText: 'Email',
                prefixIcon: Icon(Icons.email_outlined),
              ),
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: _loading ? null : _submit,
              child: _loading
                  ? const AppLoadingSpinner.small()
                  : const Text('Kirim Tautan Reset'),
            ),
          ],
        ),
      ),
    );
  }
}
