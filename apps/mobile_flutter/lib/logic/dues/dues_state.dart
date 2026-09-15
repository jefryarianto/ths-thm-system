part of 'dues_bloc.dart';

abstract class DuesState extends Equatable {
  const DuesState();

  @override
  List<Object> get props => [];
}

class DuesInitial extends DuesState {}

class DuesLoading extends DuesState {}

class DuesLoaded extends DuesState {
  final List<Due> dues;

  const DuesLoaded({required this.dues});

  @override
  List<Object> get props => [dues];
}

class DuesError extends DuesState {
  final String message;

  const DuesError({required this.message});

  @override
  List<Object> get props => [message];
}
