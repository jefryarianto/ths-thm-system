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

  /// true bila data berasal dari cache offline (bukan server).
  final bool isStale;

  /// Pesan error non-blocking bila segarkan gagal tetapi cache tersedia.
  final String? errorMessage;

  const DocumentLoaded({
    required this.documents,
    this.isStale = false,
    this.errorMessage,
  });

  @override
  List<Object> get props => [documents, isStale, errorMessage ?? ''];
}

class DocumentError extends DocumentState {
  final String message;

  const DocumentError({required this.message});

  @override
  List<Object> get props => [message];
}
