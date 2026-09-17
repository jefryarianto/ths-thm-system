part of 'notification_bloc.dart';

abstract class NotificationState extends Equatable {
  const NotificationState();

  @override
  List<Object> get props => [];
}

class NotificationInitial extends NotificationState {}

class NotificationLoading extends NotificationState {}

/// Jumlah belum-dibaca (dari `GET /notifications/count`) sebelum daftar di-load
/// — dipakai badge di Beranda.
class NotificationUnreadState extends NotificationState {
  final int unreadCount;

  const NotificationUnreadState({required this.unreadCount});

  @override
  List<Object> get props => [unreadCount];
}

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
