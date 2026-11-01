part of 'forum_bloc.dart';

abstract class ForumState extends Equatable {
  final List<ForumCategory> cachedCategories;
  final List<ForumThread> cachedThreads;

  const ForumState({
    this.cachedCategories = const [],
    this.cachedThreads = const [],
  });

  @override
  List<Object> get props => [cachedCategories, cachedThreads];
}

class ForumInitial extends ForumState {
  const ForumInitial();
}

class ForumLoading extends ForumState {
  const ForumLoading({
    super.cachedCategories,
    super.cachedThreads,
  });
}

class ForumCategoriesLoaded extends ForumState {
  final List<ForumCategory> categories;
  final bool isStale;
  final String? errorMessage;

  const ForumCategoriesLoaded({
    required this.categories,
    this.isStale = false,
    this.errorMessage,
    super.cachedThreads,
  }) : super(cachedCategories: categories);

  @override
  List<Object> get props => [categories, isStale, errorMessage ?? '', cachedThreads];
}

class ForumThreadsLoaded extends ForumState {
  final List<ForumThread> threads;
  final String categoryId;
  final String search;
  final bool isStale;
  final String? errorMessage;

  const ForumThreadsLoaded({
    required this.threads,
    required this.categoryId,
    this.search = '',
    this.isStale = false,
    this.errorMessage,
    super.cachedCategories,
  }) : super(cachedThreads: threads);

  @override
  List<Object> get props => [
        threads,
        categoryId,
        search,
        isStale,
        errorMessage ?? '',
        cachedCategories,
      ];
}

class ForumThreadLoaded extends ForumState {
  final ForumThread thread;
  final List<ForumPost> posts;
  final bool isStale;

  const ForumThreadLoaded({
    required this.thread,
    required this.posts,
    this.isStale = false,
    super.cachedCategories,
    super.cachedThreads,
  });

  @override
  List<Object> get props => [thread, posts, isStale, cachedCategories, cachedThreads];
}

class ForumError extends ForumState {
  final String message;

  const ForumError({
    required this.message,
    super.cachedCategories,
    super.cachedThreads,
  });

  @override
  List<Object> get props => [message, cachedCategories, cachedThreads];
}
