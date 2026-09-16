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

  const HomeFeedLoaded({required this.berita, required this.kegiatan});

  @override
  List<Object?> get props => [berita, kegiatan];
}

class HomeFeedError extends HomeFeedState {
  final String message;

  const HomeFeedError(this.message);

  @override
  List<Object?> get props => [message];
}
