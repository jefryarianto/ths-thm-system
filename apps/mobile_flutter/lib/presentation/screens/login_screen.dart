import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:package_info_plus/package_info_plus.dart';

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
  bool _rememberMe = false; // state real-time "Ingat Saya" (checkbox)
  String _description = 'Member login'; // deskripsi login untuk pembaruan
  String _appVersion = ''; // versi aplikasi terpasang (footer login)

  @override
  void dispose() {
    _identifier.dispose();
    _password.dispose();
    super.dispose();
  }

  /// Isi otomatis identifier yang pernah disimpan ("Ingat Saya") dari secure
  /// storage. Password TIDAK pernah dipersist.
  Future<void> _restoreRememberedIdentifier() async {
    if (const bool.fromEnvironment('E2E_LOGIN')) return;
    final saved = await ApiClient().loadRememberedIdentifier();
    if (!mounted || saved == null || saved.isEmpty) return;
    setState(() {
      _identifier.text = saved;
      _rememberMe = true;
    });
  }

  /// Persist identifier bila "Ingat Saya" dicentang, hapus bila tidak.
  /// Dipanggil hanya saat login berhasil.
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

  /// Ambil versi terpasang (footer login) via package_info_plus.
  Future<void> _loadAppVersion() async {
    try {
      final info = await PackageInfo.fromPlatform();
      if (!mounted) return;
      setState(() {
        _appVersion = info.version;
        _description = 'Member login';
      });
    } catch (_) {
      // Footer versi bersifat opsional; abaikan bila gagal.
    }
  }

  @override
  void initState() {
    super.initState();
    _restoreRememberedIdentifier();
    _loadAppVersion();
    // Jalankan pengecekan pembaruan + registrasi FCM tanpa blokir render.
    // Pengecekan update diperbarui setiap kali halaman login dibuka (berkat
    // cache 1 jam di AppUpdateService, request hanya melesat saat lewat TTL).
    AppUpdateService.instance.checkNow();
    FcmService.instance.registerAfterLogin();

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
    return Scaffold(
      body: BlocBuilder<AuthBloc, AuthState>(
        builder: (context, state) {
          return Stack(
            children: [
              const Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [AppTheme.primary, AppTheme.primaryLight],
                    ),
                  ),
                ),
              ),
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
                      padding: const EdgeInsets.all(24),
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 420),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const AppUpdateBanner(),
                            Image.asset(
                              'assets/images/logo.png',
                              width: 120,
                              height: 120,
                              fit: BoxFit.contain,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Fortiter in Re, Suaviter in Modo',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.onPrimary.withValues(alpha: 0.92),
                              ),
                            ),
                            const SizedBox(height: 36),
                            TextField(
                              controller: _identifier,
                              decoration: InputDecoration(
                                labelText: 'Email / Nomor Anggota',
                                prefixIcon: const Icon(Icons.person_outline),
                                filled: true,
                                fillColor: Colors.white,
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                ),
                              ),
                            ),
                            const SizedBox(height: 16),
                            TextField(
                              controller: _password,
                              obscureText: _obscure,
                              decoration: InputDecoration(
                                labelText: 'Password',
                                prefixIcon: const Icon(Icons.lock_outline),
                                filled: true,
                                fillColor: Colors.white,
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                ),
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
                            // "Ingat Saya" — simpan identifier (email/nomor
                            // anggota) saja; password tidak pernah disimpan.
                            Row(
                              children: [
                                SizedBox(
                                  width: 48,
                                  height: 40,
                                  child: Checkbox(
                                    value: _rememberMe,
                                    activeColor: AppTheme.primary,
                                    onChanged: (v) => setState(
                                        () => _rememberMe = v ?? false),
                                  ),
                                ),
                                const Text(
                                  'Ingat Saya',
                                  style: TextStyle(fontSize: 14),
                                ),
                              ],
                            ),
                            const SizedBox(height: 24),
                            BlocBuilder<AuthBloc, AuthState>(
                              builder: (context, state) {
                                final loading = state is AuthLoading;
                                return FilledButton(
                                  onPressed: loading ? null : _submit,
                                  child: loading
                                      ? const AppLoadingSpinner.small(
                                          color: AppTheme.onPrimary)
                                      : const Text('Masuk'),
                                );
                              },
                            ),
                            const SizedBox(height: 8),
                            TextButton(
                              onPressed: () => context.go('/forgot-password'),
                              child: const Text('Lupa Password?'),
                            ),
                            const SizedBox(height: 8),
                            const SizedBox(height: 6),
                            Wrap(
                              alignment: WrapAlignment.center,
                              spacing: 8,
                              children: [
                                TextButton.icon(
                                  onPressed: () => context.push('/register'),
                                  icon: const Icon(Icons.person_add_outlined,
                                      size: 16),
                                  label: const Text('Daftar Calon Anggota',
                                      style: TextStyle(fontSize: 12)),
                                ),
                                TextButton.icon(
                                  onPressed: () =>
                                      context.push('/claim-account'),
                                  icon: const Icon(Icons.how_to_reg_outlined,
                                      size: 16),
                                  label: const Text('Klaim Akun Anggota',
                                      style: TextStyle(fontSize: 12)),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              '$_description · v$_appVersion',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                  fontSize: 11, color: Colors.grey.shade600),
                            ),
                            const SizedBox(height: 24),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              if (state is AuthLoading) const _LoginLoadingOverlay(),
              // Overlay update WAJIB diletakkan paling atas agar menutupi
              // seluruh halaman (termasuk overlay loading login).
              const ForceUpdateOverlay(),
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
        child: AppLoadingSpinner(message: 'Memverifikasi kredensial...'),
      ),
    );
  }
}
