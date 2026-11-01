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

  /// Path file gambar terpilih (device) — diunggah ke `/forum/upload-image`
  /// sebelum balasan dikirim, URL hasilnya dikirim sebagai `images`.
  final List<String> imagePaths;

  const ForumCreatePostRequested({
    required this.threadId,
    required this.konten,
    this.imagePaths = const [],
  });

  @override
  List<Object> get props => [threadId, konten, imagePaths];
}

class ForumThreadReactRequested extends ForumEvent {
  final String threadId;
  final String emoji;

  const ForumThreadReactRequested({required this.threadId, required this.emoji});

  @override
  List<Object> get props => [threadId, emoji];
}

class ForumPostReactRequested extends ForumEvent {
  final String threadId;
  final String postId;
  final String emoji;

  const ForumPostReactRequested({
    required this.threadId,
    required this.postId,
    required this.emoji,
  });

  @override
  List<Object> get props => [threadId, postId, emoji];
}

class ForumLogoutRequested extends ForumEvent {
  const ForumLogoutRequested();
}

/// Event internal untuk update state dari event realtime (Socket.IO).
/// `transform` adalah fungsi murni: menerima state saat ini dan mengembalikan
/// state baru (atau state yang sama bila event tidak relevan).
class ForumRealtimeEvent extends ForumEvent {
  final ForumState Function(ForumState) transform;

  const ForumRealtimeEvent(this.transform);

  @override
  List<Object> get props => [transform];
}
