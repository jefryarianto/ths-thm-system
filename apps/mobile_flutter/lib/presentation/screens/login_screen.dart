import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../logic/auth/auth_bloc.dart';
import '../widgets/app_loading_spinner.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _identifier = TextEditingController();
  final _password = TextEditingController();
  bool _obscure = true;

  @override
  void dispose() {
    _identifier.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    // Hook E2E sementara: isi kredensial test + auto-submit.
    // Gate lewat dart-define --dart-define=E2E_LOGIN=true (lihat run_run.bat).
    // Kredensial bisa dioverride via:
    //   --dart-define=E2E_LOGIN_IDENTIFIER=<email> --dart-define=E2E_LOGIN_PASSWORD=<password>
    if (const bool.fromEnvironment('E2E_LOGIN')) {
      const identifier = String.fromEnvironment(
        'E2E_LOGIN_IDENTIFIER',
        defaultValue: 'superadmin@ths-thm.org',
      );
      const password = String.fromEnvironment(
        'E2E_LOGIN_PASSWORD',
        defaultValue: 'admin123',
      );
      _identifier.text = identifier;
      _password.text = password;
      WidgetsBinding.instance.addPostFrameCallback((_) async {
        if (!mounted) return;
        context.read<AuthBloc>().add(
              const AuthLoginRequested(identifier: identifier, password: password),
            );
      });
    }
  }

  void _submit() {
    final id = _identifier.text.trim();
    if (id.isEmpty || _password.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Masukkan email/nomor anggota & password')),
      );
      return;
    }
    context.read<AuthBloc>().add(
          AuthLoginRequested(identifier: id, password: _password.text),
        );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: BlocBuilder<AuthBloc, AuthState>(
        builder: (context, state) {
          return Stack(
            children: [
              SafeArea(
                child: BlocListener<AuthBloc, AuthState>(
                  listener: (context, state) {
                    if (state is AuthAuthenticated) {
                      context.go('/home');
                    } else if (state is AuthMustChangePassword) {
                      context.go('/force-change-password');
                    } else if (state is AuthError) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(state.message)),
                      );
                    }
                  },
                  child: Center(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(24),
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 420),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Image.asset(
                              'assets/images/logo.png',
                              width: 88,
                              height: 88,
                              fit: BoxFit.contain,
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'THS-THM',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 30,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 2,
                                color: AppTheme.primary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Masuk untuk melanjutkan',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                  fontSize: 14, color: Colors.grey.shade600),
                            ),
                            const SizedBox(height: 36),
                            TextField(
                              controller: _identifier,
                              decoration: const InputDecoration(
                                labelText: 'Email / Nomor Anggota',
                                prefixIcon: Icon(Icons.person_outline),
                              ),
                            ),
                            const SizedBox(height: 16),
                            TextField(
                              controller: _password,
                              obscureText: _obscure,
                              decoration: InputDecoration(
                                labelText: 'Password',
                                prefixIcon: const Icon(Icons.lock_outline),
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    _obscure
                                        ? Icons.visibility_outlined
                                        : Icons.visibility_off_outlined,
                                  ),
                                  onPressed: () =>
                                      setState(() => _obscure = !_obscure),
                                ),
                              ),
                              onSubmitted: (_) => _submit(),
                            ),
                            const SizedBox(height: 24),
                            BlocBuilder<AuthBloc, AuthState>(
                              builder: (context, state) {
                                final loading = state is AuthLoading;
                                return FilledButton(
                                  onPressed: loading ? null : _submit,
                                  child: loading
                                      ? const AppLoadingSpinner.small(
                                          color: Colors.white)
                                      : const Text('Masuk'),
                                );
                              },
                            ),
                            const SizedBox(height: 8),
                            TextButton(
                              onPressed: () =>
                                  context.go('/forgot-password'),
                              child: const Text('Lupa Password?'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              if (state is AuthLoading) const _LoginLoadingOverlay(),
            ],
          );
        },
      ),
    );
  }
}

class _LoginLoadingOverlay extends StatelessWidget {
  const _LoginLoadingOverlay();

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: Colors.white.withValues(alpha: 0.96),
      child: const Center(
        child: AppLoadingSpinner(size: 88, message: 'Memverifikasi kredensial...'),
      ),
    );
  }
}
