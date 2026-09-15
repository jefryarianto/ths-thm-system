part of 'registration_bloc.dart';

abstract class RegistrationState extends Equatable {
  const RegistrationState();
  @override
  List<Object?> get props => <Object?>[];
}

class RegistrationInitial extends RegistrationState {
  const RegistrationInitial();
}

class RegistrationLoading extends RegistrationState {
  const RegistrationLoading();
}

class RegistrationSubmitting extends RegistrationState {
  const RegistrationSubmitting();
}

class RegistrationActionInProgress extends RegistrationState {
  const RegistrationActionInProgress();
}

class RegistrationLoaded extends RegistrationState {
  final List<Registration> registrations;
  const RegistrationLoaded({required this.registrations});
  @override
  List<Object?> get props => [registrations];
}

class RegistrationCreateSuccess extends RegistrationState {
  const RegistrationCreateSuccess();
}

class RegistrationError extends RegistrationState {
  final String message;
  const RegistrationError({required this.message});
  @override
  List<Object?> get props => [message];
}
