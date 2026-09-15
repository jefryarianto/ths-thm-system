part of 'document_bloc.dart';

abstract class DocumentEvent extends Equatable {
  const DocumentEvent();

  @override
  List<Object> get props => [];
}

class DocumentLoadRequested extends DocumentEvent {
  const DocumentLoadRequested();

  @override
  List<Object> get props => [];
}

class DocumentLogoutRequested extends DocumentEvent {
  const DocumentLogoutRequested();

  @override
  List<Object> get props => [];
}
