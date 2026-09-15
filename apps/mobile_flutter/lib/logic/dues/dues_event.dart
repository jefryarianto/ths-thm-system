part of 'dues_bloc.dart';

abstract class DuesEvent extends Equatable {
  const DuesEvent();

  @override
  List<Object> get props => [];
}

class DuesLoadRequested extends DuesEvent {
  const DuesLoadRequested();

  @override
  List<Object> get props => [];
}

class DuesLogoutRequested extends DuesEvent {
  const DuesLogoutRequested();

  @override
  List<Object> get props => [];
}
