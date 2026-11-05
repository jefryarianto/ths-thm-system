part of 'kta_application_bloc.dart';

abstract class KtaApplicationState extends Equatable {
  const KtaApplicationState();

  @override
  List<Object?> get props => [];
}

class KtaApplicationInitial extends KtaApplicationState {}

class KtaApplicationLoading extends KtaApplicationState {}

class KtaApplicationLoaded extends KtaApplicationState {
  final KtaApplication application;

  const KtaApplicationLoaded({required this.application});

  @override
  List<Object?> get props => [application];
}

class KtaApplicationListLoaded extends KtaApplicationState {
  final List<KtaApplication> applications;
  final int total;
  final int page;
  final int limit;
  final int totalPages;

  const KtaApplicationListLoaded({
    required this.applications,
    required this.total,
    required this.page,
    required this.limit,
    required this.totalPages,
  });

  @override
  List<Object?> get props => [applications, total, page, limit, totalPages];
}

class KtaApplicationSubmitting extends KtaApplicationState {}

class KtaApplicationSubmitted extends KtaApplicationState {
  final KtaApplication application;

  const KtaApplicationSubmitted({required this.application});

  @override
  List<Object?> get props => [application];
}

class KtaApplicationBulkSubmitted extends KtaApplicationState {
  final String batchId;
  final int totalSubmitted;
  final List<Map<String, dynamic>> ineligible;

  const KtaApplicationBulkSubmitted({
    required this.batchId,
    required this.totalSubmitted,
    required this.ineligible,
  });

  @override
  List<Object?> get props => [batchId, totalSubmitted, ineligible];
}

class KtaApplicationActionSuccess extends KtaApplicationState {
  final String message;

  const KtaApplicationActionSuccess({required this.message});

  @override
  List<Object?> get props => [message];
}

class KtaApplicationBatchesLoaded extends KtaApplicationState {
  final List<KtaBatch> batches;

  const KtaApplicationBatchesLoaded({required this.batches});

  @override
  List<Object?> get props => [batches];
}

class KtaApplicationBatchDetailLoaded extends KtaApplicationState {
  final KtaBatch batch;

  const KtaApplicationBatchDetailLoaded({required this.batch});

  @override
  List<Object?> get props => [batch];
}

class KtaApplicationAnalyticsFunnelLoaded extends KtaApplicationState {
  final List<Map<String, dynamic>> stages;
  final int totalSubmitted;

  const KtaApplicationAnalyticsFunnelLoaded({
    required this.stages,
    required this.totalSubmitted,
  });

  @override
  List<Object?> get props => [stages, totalSubmitted];
}

class KtaApplicationAnalyticsProcessingTimeLoaded extends KtaApplicationState {
  final List<Map<String, dynamic>> processingTimes;

  const KtaApplicationAnalyticsProcessingTimeLoaded({required this.processingTimes});

  @override
  List<Object?> get props => [processingTimes];
}

class KtaApplicationAnalyticsTrendLoaded extends KtaApplicationState {
  final List<Map<String, dynamic>> trend;

  const KtaApplicationAnalyticsTrendLoaded({required this.trend});

  @override
  List<Object?> get props => [trend];
}

class KtaApplicationSlaStatusLoaded extends KtaApplicationState {
  final Map<String, dynamic> slaStatus;

  const KtaApplicationSlaStatusLoaded({required this.slaStatus});

  @override
  List<Object?> get props => [slaStatus];
}

class KtaApplicationError extends KtaApplicationState {
  final String message;

  const KtaApplicationError({required this.message});

  @override
  List<Object?> get props => [message];
}
