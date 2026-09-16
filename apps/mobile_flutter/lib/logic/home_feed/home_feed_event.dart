part of 'home_feed_bloc.dart';

/// Base event untuk HomeFeedBloc.
sealed class HomeFeedEvent extends Equatable {
  const HomeFeedEvent();

  @override
  List<Object?> get props => [];
}

/// Muat agenda + berita beranda sekaligus.
class HomeFeedLoadRequested extends HomeFeedEvent {
  const HomeFeedLoadRequested();
}
