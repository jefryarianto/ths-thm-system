part of 'registration_bloc.dart';

abstract class RegistrationEvent extends Equatable {
  const RegistrationEvent();
  @override
  List<Object?> get props => <Object?>[];
}

class RegistrationLoadRequested extends RegistrationEvent {
  final String? status;
  const RegistrationLoadRequested({this.status});
  @override
  List<Object?> get props => [status];
}

class RegistrationCreateRequested extends RegistrationEvent {
  final String namaLengkap;
  final String jenisKelamin;
  final String rantingId;
  final String? tempatLahir;
  final String? tanggalLahir;
  final String? alamat;
  final String? noHp;
  final String? email;
  final String? sumberInfo;
  const RegistrationCreateRequested({
    required this.namaLengkap,
    required this.jenisKelamin,
    required this.rantingId,
    this.tempatLahir,
    this.tanggalLahir,
    this.alamat,
    this.noHp,
    this.email,
    this.sumberInfo,
  });
  @override
  List<Object?> get props => [namaLengkap, jenisKelamin, rantingId];
}

class RegistrationApproveRequested extends RegistrationEvent {
  final String id;
  const RegistrationApproveRequested(this.id);
  @override
  List<Object?> get props => [id];
}

class RegistrationRejectRequested extends RegistrationEvent {
  final String id;
  final String? reason;
  const RegistrationRejectRequested(this.id, {this.reason});
  @override
  List<Object?> get props => [id, reason];
}
