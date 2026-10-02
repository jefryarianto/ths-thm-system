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

  /// true bila data berasal dari cache offline (bukan server).
  final bool isStale;

  /// Pesan error non-blocking bila segarkan gagal tetapi cache tersedia.
  final String? errorMessage;

  const DuesLoaded({
    required this.dues,
    this.isStale = false,
    this.errorMessage,
  });

  @override
  List<Object> get props => [dues, isStale, errorMessage ?? ''];
}

class DuesError extends DuesState {
  final String message;

  const DuesError({required this.message});

  @override
  List<Object> get props => [message];
}
