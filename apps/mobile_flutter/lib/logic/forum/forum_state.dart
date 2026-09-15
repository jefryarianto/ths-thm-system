part of 'forum_bloc.dart';

abstract class ForumState extends Equatable {
  const ForumState();

  @override
  List<Object> get props => [];
}

class ForumInitial extends ForumState {}

class ForumLoading extends ForumState {}

class ForumCategoriesLoaded extends ForumState {
  final List<ForumCategory> categories;

  const ForumCategoriesLoaded({required this.categories});

  @override
  List<Object> get props => [categories];
}

class ForumThreadsLoaded extends ForumState {
  final List<ForumThread> threads;
  final String categoryId;
  final String search;

  const ForumThreadsLoaded({
    required this.threads,
    required this.categoryId,
    this.search = '',
  });

  @override
  List<Object> get props => [threads, categoryId, search];
}

class ForumThreadLoaded extends ForumState {
  final ForumThread thread;
  final List<ForumPost> posts;

  const ForumThreadLoaded({
    required this.thread,
    required this.posts,
  });

  @override
  List<Object> get props => [thread, posts];
}

class ForumError extends ForumState {
  final String message;

  const ForumError({required this.message});

  @override
  List<Object> get props => [message];
}
