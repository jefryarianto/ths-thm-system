import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/api/api_client.dart';
import '../../core/constants/app_constants.dart';
import '../../data/models/user.dart';

part 'auth_event.dart';
part 'auth_state.dart';

const int _secureStorageTimeoutSeconds = 10;

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  AuthBloc() : super(AuthInitial()) {
    on<AuthLoginRequested>(_onAuthLoginRequested);
    on<AuthLogoutRequested>(_onAuthLogoutRequested);
    on<AuthLoadUserRequested>(_onAuthLoadUserRequested);
    on<AuthProfileSynced>(_onAuthProfileSynced);
  }

  final ApiClient _apiClient = ApiClient();

  Future<void> _onAuthLoginRequested(
    AuthLoginRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      final response = await _apiClient.dio.post(
        '${AppConstants.baseUrl}/auth/login',
        data: {
          'identifier': event.identifier,
          'password': event.password,
        },
      );
      final data = response.data['data'];
      if (data['mustChangePassword'] == true) {
        final resetToken = data['resetToken'] as String? ?? '';
        emit(AuthMustChangePassword(resetToken: resetToken));
        return;
      }

      final user = User.fromJson(data['user']);
      final accessToken = data['accessToken'] as String;
      final refreshToken = data['refreshToken'] as String;

      await _apiClient.saveTokens(
        accessToken: accessToken,
        refreshToken: refreshToken,
      );
      await _apiClient.saveUser(user.toJson());

      emit(AuthAuthenticated(user: user));
    } catch (e) {
      emit(AuthError(message: _apiClient.messageFromError(e)));
    }
  }

  Future<void> _onAuthLogoutRequested(
    AuthLogoutRequested event,
    Emitter<AuthState> emit,
  ) async {
    await _apiClient.clearTokens();
    await _apiClient.clearUser();
    emit(AuthUnauthenticated());
  }

  /// Perbarui nama user pada state `AuthAuthenticated` + persist ke
  /// penyimpanan aman, sehingga header Beranda langsung menampilkan nama
  /// baru tanpa perlu login ulang. Diabaikan bila nama tidak berubah.
  Future<void> _onAuthProfileSynced(
    AuthProfileSynced event,
    Emitter<AuthState> emit,
  ) async {
    final current = state;
    if (current is! AuthAuthenticated) return;
    final newName = event.namaLengkap.trim();
    if (newName.isEmpty || newName == current.user.namaLengkap) return;

    final updated = User(
      id: current.user.id,
      email: current.user.email,
      namaLengkap: newName,
      role: current.user.role,
    );
    await _apiClient.saveUser(updated.toJson());
    emit(AuthAuthenticated(user: updated));
  }

  Future<void> _onAuthLoadUserRequested(
    AuthLoadUserRequested event,
    Emitter<AuthState> emit,
  ) async {
    final token = await _withTimeout(
      _apiClient.getAccessToken(),
      const Duration(seconds: _secureStorageTimeoutSeconds),
    );

    if (token == null) {
      emit(AuthUnauthenticated());
      return;
    }

    final userJson = await _withTimeout(
      _apiClient.loadUser(),
      const Duration(seconds: _secureStorageTimeoutSeconds),
    );

    if (userJson == null) {
      emit(AuthUnauthenticated());
      return;
    }

    try {
      final user = User.fromJson(userJson);
      emit(AuthAuthenticated(user: user));
    } catch (e) {
      emit(AuthUnauthenticated());
    }
  }

  Future<T?> _withTimeout<T>(Future<T?> future, Duration timeout) {
    final completer = Completer<T?>();
    final timer = Timer(timeout, () {
      if (!completer.isCompleted) {
        completer.complete(null);
      }
    });
    future.then(
      (value) {
        if (!completer.isCompleted) completer.complete(value);
      },
      onError: (error) {
        if (!completer.isCompleted) completer.complete(null);
      },
    ).whenComplete(() => timer.cancel());
    return completer.future;
  }
}
