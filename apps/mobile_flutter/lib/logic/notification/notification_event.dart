part of 'notification_bloc.dart';

abstract class NotificationEvent extends Equatable {
  const NotificationEvent();

  @override
  List<Object> get props => [];
}

class NotificationLoadRequested extends NotificationEvent {
  const NotificationLoadRequested();

  @override
  List<Object> get props => [];
}

class NotificationMarkRead extends NotificationEvent {
  final String id;
  const NotificationMarkRead(this.id);

  @override
  List<Object> get props => [id];
}

class NotificationMarkAllRead extends NotificationEvent {
  const NotificationMarkAllRead();

  @override
  List<Object> get props => [];
}

class NotificationDelete extends NotificationEvent {
  final String id;
  const NotificationDelete(this.id);

  @override
  List<Object> get props => [id];
}

class NotificationLogoutRequested extends NotificationEvent {
  const NotificationLogoutRequested();

  @override
  List<Object> get props => [];
}
