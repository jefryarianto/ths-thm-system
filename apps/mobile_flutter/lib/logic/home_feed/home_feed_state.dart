part of 'home_feed_bloc.dart';

sealed class HomeFeedState extends Equatable {
  const HomeFeedState();

  @override
  List<Object?> get props => [];
}

class HomeFeedInitial extends HomeFeedState {
  const HomeFeedInitial();
}

class HomeFeedLoading extends HomeFeedState {
  const HomeFeedLoading();
}

class HomeFeedLoaded extends HomeFeedState {
  final List<Berita> berita;
  final List<Kegiatan> kegiatan;

  /// true bila data berasal dari cache offline (bukan server).
  final bool isStale;

  /// Pesan error non-blocking bila segarkan gagal tetapi cache tersedia.
  final String? errorMessage;

  const HomeFeedLoaded({
    required this.berita,
    required this.kegiatan,
    this.isStale = false,
    this.errorMessage,
  });

  @override
  List<Object?> get props => [berita, kegiatan, isStale, errorMessage];
}

class HomeFeedError extends HomeFeedState {
  final String message;

  const HomeFeedError(this.message);

  @override
  List<Object?> get props => [message];
}
