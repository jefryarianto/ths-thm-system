import 'package:flutter/material.dart';

import '../../core/app_theme.dart';
import '../../core/auth_controller.dart';
import '../../core/models.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({required this.auth, super.key});
  final AuthController auth;

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _identifier = TextEditingController();
  final _password = TextEditingController();
  bool _obscurePassword = true;
  bool _submitting = false;

  @override
  void dispose() {
    _identifier.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);
    try {
      await widget.auth.login(_identifier.text, _password.text);
    } on ApiException catch (error) {
      if (mounted) _showError(error.message);
    } catch (_) {
      if (mounted) _showError('Login gagal. Periksa koneksi dan data akun Anda.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _showError(String message) => ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message), backgroundColor: AppColors.danger),
      );

  @override
  Widget build(BuildContext context) => Scaffold(
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 440),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Icon(Icons.shield_outlined, color: AppColors.primary, size: 78),
                      const SizedBox(height: 20),
                      Text('THS-THM', textAlign: TextAlign.center, style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold, color: AppColors.text)),
                      const SizedBox(height: 6),
                      const Text('Sistem Manajemen Anggota', textAlign: TextAlign.center, style: TextStyle(color: AppColors.textMuted)),
                      const SizedBox(height: 32),
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Text('Masuk', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
                              const SizedBox(height: 20),
                              TextFormField(
                                controller: _identifier,
                                keyboardType: TextInputType.emailAddress,
                                decoration: const InputDecoration(labelText: 'Email atau No. HP', prefixIcon: Icon(Icons.person_outline)),
                                validator: (value) => value == null || value.trim().isEmpty ? 'Email atau No. HP harus diisi' : null,
                              ),
                              const SizedBox(height: 14),
                              TextFormField(
                                controller: _password,
                                obscureText: _obscurePassword,
                                decoration: InputDecoration(
                                  labelText: 'Password',
                                  prefixIcon: const Icon(Icons.lock_outline),
                                  suffixIcon: IconButton(icon: Icon(_obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined), onPressed: () => setState(() => _obscurePassword = !_obscurePassword)),
                                ),
                                validator: (value) => value == null || value.isEmpty ? 'Password harus diisi' : null,
                                onFieldSubmitted: (_) => _login(),
                              ),
                              const SizedBox(height: 20),
                              FilledButton(
                                onPressed: _submitting ? null : _login,
                                style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 15)),
                                child: _submitting ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Masuk'),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      );
}
