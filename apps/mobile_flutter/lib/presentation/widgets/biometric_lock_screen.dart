import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:local_auth/local_auth.dart';

import '../../core/security/biometric_auth_service.dart';
import '../../logic/auth/auth_bloc.dart';
import '../../logic/auth/auth_event.dart';
import '../../logic/auth/auth_state.dart';

/// Wrapper widget that shows biometric lock screen when app resumes
/// and biometric authentication is enabled.
class BiometricLockScreen extends StatefulWidget {
  final Widget child;
  final Duration? timeout;

  const BiometricLockScreen({
    super.key,
    required this.child,
    this.timeout,
  });

  @override
  State<BiometricLockScreen> createState() => _BiometricLockScreenState();
}

class _BiometricLockScreenState extends State<BiometricLockScreen>
    with WidgetsBindingObserver {
  final BiometricAuthService _biometricAuth = BiometricAuthService();
  DateTime? _pausedAt;
  static const Duration _lockDelay = Duration(seconds: 5); // Lock after 5s in background

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);

    switch (state) {
      case AppLifecycleState.paused:
      case AppLifecycleState.inactive:
      case AppLifecycleState.detached:
        _pausedAt = DateTime.now();
        break;
      case AppLifecycleState.resumed:
        _onAppResumed();
        break;
      case AppLifecycleState.hidden:
        // iOS specific - treat as paused
        _pausedAt = DateTime.now();
        break;
    }
  }

  Future<void> _onAppResumed() async {
    final authBloc = context.read<AuthBloc>();
    final authState = authBloc.state;

    // Only trigger if authenticated and biometric enabled
    if (authState is! AuthAuthenticated) return;

    final enabled = await _biometricAuth.isBiometricEnabled();
    if (!enabled) return;

    final pausedAt = _pausedAt;
    if (pausedAt == null) return;

    final timeInBackground = DateTime.now().difference(pausedAt);
    // Only lock if app was in background longer than threshold
    if (timeInBackground < _lockDelay) return;

    // Emit biometric lock state
    authBloc.add(const AuthBiometricAuthenticated(success: false)); // Trigger lock
    await _authenticate(authBloc);
  }

  Future<void> _authenticate(AuthBloc authBloc) async {
    final success = await _biometricAuth.quickAuth();

    if (!mounted) return;

    authBloc.add(AuthBiometricAuthenticated(success: success));

    if (!success) {
      // Auth failed or cancelled - show lock screen again after delay
      await Future.delayed(const Duration(seconds: 2));
      if (mounted) {
        await _authenticate(authBloc);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      buildWhen: (previous, current) =>
          current is AuthBiometricLock || current is AuthBiometricResult,
      builder: (context, state) {
        final isLocked = state is AuthBiometricLock;
        final isAuthenticating = state is AuthBiometricLock &&
            state.isAuthenticating;

        return Stack(
          children: [
            widget.child,
            if (isLocked)
              _LockOverlay(
                isAuthenticating: isAuthenticating,
                onCancel: () {
                  // Allow user to cancel and go to login
                  context.read<AuthBloc>().add(const AuthLogoutRequested());
                },
              ),
          ],
        );
      },
    );
  }
}

/// Overlay shown during biometric authentication
class _LockOverlay extends StatelessWidget {
  final bool isAuthenticating;
  final VoidCallback onCancel;

  const _LockOverlay({
    required this.isAuthenticating,
    required this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final biometricAuth = BiometricAuthService();

    return FutureBuilder<List<BiometricType>>(
      future: biometricAuth.getAvailableBiometrics(),
      builder: (context, snapshot) {
        final biometricTypes = snapshot.data ?? [];
        final biometricName = biometricTypes.isNotEmpty
            ? biometricAuth.getBiometricName(biometricTypes.first)
            : 'Biometrik';

        return Container(
          color: theme.colorScheme.surface.withValues(alpha: 0.95),
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(32.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // App logo/icon
                  Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: Icon(
                      Icons.shield_outlined,
                      size: 50,
                      color: theme.colorScheme.onPrimaryContainer,
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Title
                  Text(
                    'Buka Aplikasi',
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Subtitle with biometric type
                  Text(
                    'Verifikasi dengan $biometricName',
                    style: theme.textTheme.bodyLarge?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 32),

                  // Biometric animation / indicator
                  if (isAuthenticating)
                    SizedBox(
                      width: 80,
                      height: 80,
                      child: CircularProgressIndicator(
                        strokeWidth: 4,
                        valueColor: AlwaysStoppedAnimation<Color>(
                          theme.colorScheme.primary,
                        ),
                      ),
                    )
                  else
                    Icon(
                      _getBiometricIcon(biometricTypes),
                      size: 80,
                      color: theme.colorScheme.primary,
                    ),
                  const SizedBox(height: 32),

                  // Cancel button (go to login)
                  TextButton.icon(
                    onPressed: onCancel,
                    icon: const Icon(Icons.logout),
                    label: const Text('Gunakan Password / Keluar'),
                    style: TextButton.styleFrom(
                      foregroundColor: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  IconData _getBiometricIcon(List<BiometricType> types) {
    if (types.contains(BiometricType.face)) {
      return Icons.face;
    }
    if (types.contains(BiometricType.fingerprint)) {
      return Icons.fingerprint;
    }
    if (types.contains(BiometricType.iris)) {
      return Icons.remove_red_eye;
    }
    return Icons.security;
  }
}