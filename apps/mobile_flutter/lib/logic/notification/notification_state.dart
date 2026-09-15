part of 'notification_bloc.dart';

abstract class NotificationState extends Equatable {
  const NotificationState();

  @override
  List<Object> get props => [];
}

class NotificationInitial extends NotificationState {}

class NotificationLoading extends NotificationState {}

class NotificationLoaded extends NotificationState {
  final List<NotificationItem> notifications;

  const NotificationLoaded({required this.notifications});

  int get unreadCount => notifications.where((n) => !n.isRead).length;

  @override
  List<Object> get props => [notifications];
}

class NotificationError extends NotificationState {
  final String message;

  const NotificationError({required this.message});

  @override
  List<Object> get props => [message];
}
