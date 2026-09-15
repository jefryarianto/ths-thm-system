part of 'auth_bloc.dart';

abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object> get props => [];
}

class AuthLoginRequested extends AuthEvent {
  final String identifier;
  final String password;

  const AuthLoginRequested({
    required this.identifier,
    required this.password,
  });

  @override
  List<Object> get props => [identifier, password];
}

class AuthLogoutRequested extends AuthEvent {
  const AuthLogoutRequested();

  @override
  List<Object> get props => [];
}

class AuthLoadUserRequested extends AuthEvent {
  const AuthLoadUserRequested();

  @override
  List<Object> get props => [];
}

/// Sinkronkan nama yang diubah di layar Edit Profil ke state + penyimpanan
/// user (header Beranda membaca nama dari AuthBloc, bukan MemberBloc).
class AuthProfileSynced extends AuthEvent {
  final String namaLengkap;

  const AuthProfileSynced({required this.namaLengkap});

  @override
  List<Object> get props => [namaLengkap];
}
