import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/services/app_update_service.dart';
import '../../core/services/fcm_service.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/snack_bar_helper.dart';
import '../../logic/auth/auth_bloc.dart';
import '../widgets/app_loading_spinner.dart';
import '../widgets/app_update_banner.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _identifier = TextEditingController();
  final _password = TextEditingController();
  bool _obscure = true;
  bool _rememberMe = false;

  @override
  void dispose() {
    _identifier.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _restoreRememberedIdentifier() async {
    if (const bool.fromEnvironment('E2E_LOGIN')) return;
    final saved = await ApiClient().loadRememberedIdentifier();
    if (!mounted || saved == null || saved.isEmpty) return;
    setState(() {
      _identifier.text = saved;
      _rememberMe = true;
    });
  }

  Future<void> _persistRemember() async {
    final api = ApiClient();
    if (_rememberMe) {
      final id = _identifier.text.trim();
      if (id.isNotEmpty) {
        await api.saveRememberedIdentifier(id);
        return;
      }
    }
    await api.clearRememberedIdentifier();
  }

  @override
  void initState() {
    super.initState();
    _restoreRememberedIdentifier();
    AppUpdateService.instance.checkNow();
    FcmService.instance.registerAfterLogin();

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
              const AuthLoginRequested(
                  identifier: identifier, password: password),
            );
      });
    }
  }

  void _submit() {
    final id = _identifier.text.trim();
    if (id.isEmpty || _password.text.isEmpty) {
      showCenteredSnackBar(context, 'Masukkan email/nomor anggota & password');
      return;
    }
    context.read<AuthBloc>().add(
          AuthLoginRequested(identifier: id, password: _password.text),
        );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      body: BlocBuilder<AuthBloc, AuthState>(
        builder: (context, state) {
          return Stack(
            children: [
              SafeArea(
                child: BlocListener<AuthBloc, AuthState>(
                  listener: (context, state) {
                    if (state is AuthAuthenticated) {
                      _persistRemember();
                      FcmService.instance.registerAfterLogin();
                      context.go('/home');
                    } else if (state is AuthMustChangePassword) {
                      _persistRemember();
                      context.go('/force-change-password');
                    } else if (state is AuthError) {
                      showCenteredSnackBar(context, state.message);
                    }
                  },
                  child: Center(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 440),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const AppUpdateBanner(),
                            // ── LOGO ──────────────────────────────────────
                            Center(
                              child: Image.asset(
                                'assets/images/logo.png',
                                width: 80,
                                height: 80,
                                fit: BoxFit.contain,
                              ),
                            ),
                            const SizedBox(height: 20),
                            // ── SLOGAN ───────────────────────────────────
                            Text(
                              'Fortiter in Re, Suaviter in Modo',
                              textAlign: TextAlign.center,
                              style: theme.textTheme.headlineSmall?.copyWith(
                                fontWeight: FontWeight.w700,
                                color: isDark ? colorScheme.onSurface : AppTheme.navy,
                                height: 1.3,
                              ),
                            ),
                            const SizedBox(height: 36),
                            // ── FORM LOGIN ───────────────────────────────
                            _EmailField(
                              controller: _identifier,
                              theme: theme,
                            ),
                            const SizedBox(height: 16),
                            _PasswordField(
                              controller: _password,
                              obscure: _obscure,
                              onToggle: () => setState(() => _obscure = !_obscure),
                              onSubmitted: (_) => _submit(),
                              theme: theme,
                            ),
                            const SizedBox(height: 16),
                            // ── INGAT SAYA + LUPA PASSWORD (SAME ROW) ────────
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                _RememberMeCheckbox(
                                  value: _rememberMe,
                                  onChanged: (v) => setState(() => _rememberMe = v ?? false),
                                  theme: theme,
                                ),
                                TextButton(
                                  onPressed: () => context.go('/forgot-password'),
                                  style: TextButton.styleFrom(
                                    foregroundColor: colorScheme.primary,
                                    padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
                                    minimumSize: const Size(0, 48),
                                    textStyle: const TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  child: const Text('Lupa Password?'),
                                ),
                              ],
                            ),
                            const SizedBox(height: 24),
                            // ── TOMBOL MASUK (PRIMARY CTA) ────────────────
                            BlocBuilder<AuthBloc, AuthState>(
                              builder: (context, state) {
                                final loading = state is AuthLoading;
                                return FilledButton(
                                  onPressed: loading ? null : _submit,
                                  style: FilledButton.styleFrom(
                                    minimumSize: const Size.fromHeight(56),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(16),
                                    ),
                                    backgroundColor: colorScheme.primary,
                                    foregroundColor: colorScheme.onPrimary,
                                    textStyle: const TextStyle(
                                      fontSize: 17,
                                      fontWeight: FontWeight.w700,
                                    ),
                                    padding: const EdgeInsets.symmetric(vertical: 16),
                                  ),
                                  child: loading
                                      ? const AppLoadingSpinner.small(
                                          color: Colors.white)
                                      : const Text('Masuk'),
                                );
                              },
                            ),
                            const SizedBox(height: 28),
                            // ── SECONDARY ACTIONS ────────────────────────
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Tooltip(
                                  message: 'Daftar menjadi calon anggota THS-THM',
                                  child: TextButton.icon(
                                    onPressed: () => context.push('/register'),
                                    icon: Icon(
                                      Icons.person_add_outlined,
                                      size: 18,
                                      color: colorScheme.primary,
                                    ),
                                    label: Text(
                                      'Daftar',
                                      style: TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w500,
                                        color: colorScheme.primary,
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 24),
                                Tooltip(
                                  message: 'Buka halaman Klaim keanggotaan',
                                  child: TextButton.icon(
                                    onPressed: () => context.push('/claim-account'),
                                    icon: Icon(
                                      Icons.how_to_reg_outlined,
                                      size: 18,
                                      color: colorScheme.primary,
                                    ),
                                    label: Text(
                                      'Klaim',
                                      style: TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w500,
                                        color: colorScheme.primary,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 28),
                            // ── FOOTER ────────────────────────────────────
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                // Baris 1: Motto institusional
                                Text(
                                  'Koordinatorat Nasional 2026-2029',
                                  textAlign: TextAlign.center,
                                  style: theme.textTheme.bodySmall?.copyWith(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w600,
                                    letterSpacing: 0.3,
                                    color: isDark
                                        ? colorScheme.primaryContainer
                                        : AppTheme.navy,
                                  ),
                                ),
                                const SizedBox(height: 3),
                                // Baris 2: Copyright
                                Text(
                                  '(c)2026-2029 komisi litbang',
                                  textAlign: TextAlign.center,
                                  style: theme.textTheme.bodySmall?.copyWith(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w400,
                                    color: isDark
                                        ? colorScheme.primaryContainer
                                        : const Color(0xFF667085),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              if (state is AuthLoading) const _LoginLoadingOverlay(),
              const ForceUpdateOverlay(),
            ],
          );
        },
      ),
    );
  }
}

class _EmailField extends StatelessWidget {
  final TextEditingController controller;
  final ThemeData theme;

  const _EmailField({required this.controller, required this.theme});

  @override
  Widget build(BuildContext context) {
    final colorScheme = theme.colorScheme;
    return TextField(
      controller: controller,
      keyboardType: TextInputType.emailAddress,
      textInputAction: TextInputAction.next,
      style: theme.textTheme.bodyLarge,
      decoration: InputDecoration(
        labelText: 'Email / Nomor Anggota',
        prefixIcon: Icon(
          Icons.person_outline,
          size: 22,
          color: colorScheme.onSurfaceVariant,
        ),
        filled: true,
        fillColor: colorScheme.surface,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: colorScheme.outlineVariant),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: colorScheme.outlineVariant),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: colorScheme.primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: colorScheme.error),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: colorScheme.error, width: 2),
        ),
        labelStyle: TextStyle(color: colorScheme.onSurfaceVariant),
        floatingLabelStyle: TextStyle(
          color: colorScheme.primary,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _PasswordField extends StatelessWidget {
  final TextEditingController controller;
  final bool obscure;
  final VoidCallback onToggle;
  final ValueChanged<String> onSubmitted;
  final ThemeData theme;

  const _PasswordField({
    required this.controller,
    required this.obscure,
    required this.onToggle,
    required this.onSubmitted,
    required this.theme,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = theme.colorScheme;
    return TextField(
      controller: controller,
      obscureText: obscure,
      textInputAction: TextInputAction.done,
      style: theme.textTheme.bodyLarge,
      onSubmitted: onSubmitted,
      decoration: InputDecoration(
        labelText: 'Password',
        prefixIcon: Icon(
          Icons.lock_outline,
          size: 22,
          color: colorScheme.onSurfaceVariant,
        ),
        filled: true,
        fillColor: colorScheme.surface,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: colorScheme.outlineVariant),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: colorScheme.outlineVariant),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: colorScheme.primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: colorScheme.error),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: colorScheme.error, width: 2),
        ),
        labelStyle: TextStyle(color: colorScheme.onSurfaceVariant),
        floatingLabelStyle: TextStyle(
          color: colorScheme.primary,
          fontWeight: FontWeight.w600,
        ),
        suffixIcon: IconButton(
          icon: Icon(
            obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
            size: 22,
            color: colorScheme.onSurfaceVariant,
          ),
          onPressed: onToggle,
          tooltip: obscure ? 'Tampilkan password' : 'Sembunyikan password',
        ),
      ),
    );
  }
}

class _RememberMeCheckbox extends StatelessWidget {
  final bool value;
  final ValueChanged<bool?> onChanged;
  final ThemeData theme;

  const _RememberMeCheckbox({
    required this.value,
    required this.onChanged,
    required this.theme,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = theme.colorScheme;
    return Row(
      children: [
        SizedBox(
          width: 48,
          height: 48,
          child: Checkbox(
            value: value,
            activeColor: colorScheme.primary,
            checkColor: colorScheme.onPrimary,
            side: BorderSide(color: colorScheme.outline, width: 2),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(6),
            ),
            onChanged: onChanged,
            materialTapTargetSize: MaterialTapTargetSize.padded,
          ),
        ),
        const SizedBox(width: 8),
        Text(
          'Ingat Saya',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: colorScheme.onSurface,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

class _LoginLoadingOverlay extends StatelessWidget {
  const _LoginLoadingOverlay();

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return ColoredBox(
      color: colorScheme.surface.withValues(alpha: 0.96),
      child: const Center(
        child: AppLoadingSpinner(message: 'Memverifikasi kredensial...'),
      ),
    );
  }
}