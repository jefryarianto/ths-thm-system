part of 'auth_bloc.dart';

abstract class AuthState extends Equatable {
  const AuthState();

  @override
  List<Object> get props => [];
}

class AuthInitial extends AuthState {}

class AuthLoading extends AuthState {}

class AuthAuthenticated extends AuthState {
  final User user;

  const AuthAuthenticated({required this.user});

  @override
  List<Object> get props => [user];
}

class AuthUnauthenticated extends AuthState {}

class AuthError extends AuthState {
  final String message;

  const AuthError({required this.message});

  @override
  List<Object> get props => [message];
}

class AuthMustChangePassword extends AuthState {
  final String resetToken;

  const AuthMustChangePassword({required this.resetToken});

  @override
  List<Object> get props => [resetToken];
}

/// Biometric lock screen is shown (app in background, returning)
class AuthBiometricLock extends AuthState {
  final bool isAuthenticating;

  const AuthBiometricLock({this.isAuthenticating = false});

  @override
  List<Object> get props => [isAuthenticating];
}

/// Biometric authentication result
class AuthBiometricResult extends AuthState {
  final bool success;
  final String? errorMessage;

  const AuthBiometricResult({required this.success, this.errorMessage});

  @override
  List<Object> get props => [success, errorMessage ?? ''];
}
