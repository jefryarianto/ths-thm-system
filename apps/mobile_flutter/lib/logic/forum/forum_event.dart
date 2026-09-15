part of 'forum_bloc.dart';

abstract class ForumEvent extends Equatable {
  const ForumEvent();

  @override
  List<Object> get props => [];
}

class ForumCategoriesLoadRequested extends ForumEvent {
  const ForumCategoriesLoadRequested();
}

class ForumThreadsLoadRequested extends ForumEvent {
  final String categoryId;
  final String search;

  const ForumThreadsLoadRequested({
    required this.categoryId,
    this.search = '',
  });

  @override
  List<Object> get props => [categoryId, search];
}

class ForumThreadLoadRequested extends ForumEvent {
  final String id;

  const ForumThreadLoadRequested({required this.id});

  @override
  List<Object> get props => [id];
}

class ForumCreateThreadRequested extends ForumEvent {
  final String categoryId;
  final String judul;
  final String konten;

  const ForumCreateThreadRequested({
    required this.categoryId,
    required this.judul,
    required this.konten,
  });

  @override
  List<Object> get props => [categoryId, judul, konten];
}

class ForumCreatePostRequested extends ForumEvent {
  final String threadId;
  final String konten;

  const ForumCreatePostRequested({
    required this.threadId,
    required this.konten,
  });

  @override
  List<Object> get props => [threadId, konten];
}

class ForumLogoutRequested extends ForumEvent {
  const ForumLogoutRequested();
}
