part of 'document_bloc.dart';

abstract class DocumentState extends Equatable {
  const DocumentState();

  @override
  List<Object> get props => [];
}

class DocumentInitial extends DocumentState {}

class DocumentLoading extends DocumentState {}

class DocumentLoaded extends DocumentState {
  final List<Document> documents;

  const DocumentLoaded({required this.documents});

  @override
  List<Object> get props => [documents];
}

class DocumentError extends DocumentState {
  final String message;

  const DocumentError({required this.message});

  @override
  List<Object> get props => [message];
}
