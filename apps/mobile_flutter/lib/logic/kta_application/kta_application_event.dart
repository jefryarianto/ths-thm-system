part of 'kta_application_bloc.dart';

abstract class KtaApplicationEvent extends Equatable {
  const KtaApplicationEvent();

  @override
  List<Object> get props => [];
}

class KtaApplicationLoadRequested extends KtaApplicationEvent {
  const KtaApplicationLoadRequested();
}

class KtaApplicationSubmitRequested extends KtaApplicationEvent {
  const KtaApplicationSubmitRequested();
}

class KtaApplicationCancelRequested extends KtaApplicationEvent {
  final String reason;

  const KtaApplicationCancelRequested({required this.reason});

  @override
  List<Object> get props => [reason];
}

class KtaApplicationBulkSubmitRequested extends KtaApplicationEvent {
  final List<String> anggotaIds;
  final String? batchName;

  const KtaApplicationBulkSubmitRequested({
    required this.anggotaIds,
    this.batchName,
  });

  @override
  List<Object> get props => [anggotaIds, batchName ?? ''];
}

class KtaApplicationApproveRequested extends KtaApplicationEvent {
  final String applicationId;
  final String? catatan;

  const KtaApplicationApproveRequested({
    required this.applicationId,
    this.catatan,
  });

  @override
  List<Object> get props => [applicationId, catatan ?? ''];
}

class KtaApplicationRejectRequested extends KtaApplicationEvent {
  final String applicationId;
  final String reason;

  const KtaApplicationRejectRequested({
    required this.applicationId,
    required this.reason,
  });

  @override
  List<Object> get props => [applicationId, reason];
}

class KtaApplicationFetchDetailRequested extends KtaApplicationEvent {
  final String applicationId;

  const KtaApplicationFetchDetailRequested({required this.applicationId});

  @override
  List<Object> get props => [applicationId];
}

class KtaApplicationFetchListRequested extends KtaApplicationEvent {
  final String? status;
  final int page;

  const KtaApplicationFetchListRequested({this.status, this.page = 1});

  @override
  List<Object> get props => [status ?? '', page];
}

class KtaApplicationFetchBatchesRequested extends KtaApplicationEvent {
  const KtaApplicationFetchBatchesRequested();
}

class KtaApplicationFetchBatchDetailRequested extends KtaApplicationEvent {
  final String batchId;

  const KtaApplicationFetchBatchDetailRequested({required this.batchId});

  @override
  List<Object> get props => [batchId];
}

class KtaApplicationExportBatchRequested extends KtaApplicationEvent {
  final String batchId;
  final String format;

  const KtaApplicationExportBatchRequested({
    required this.batchId,
    required this.format,
  });

  @override
  List<Object> get props => [batchId, format];
}

class KtaApplicationFetchAnalyticsFunnelRequested extends KtaApplicationEvent {
  const KtaApplicationFetchAnalyticsFunnelRequested();
}

class KtaApplicationFetchAnalyticsProcessingTimeRequested extends KtaApplicationEvent {
  const KtaApplicationFetchAnalyticsProcessingTimeRequested();
}

class KtaApplicationFetchAnalyticsTrendRequested extends KtaApplicationEvent {
  final int months;

  const KtaApplicationFetchAnalyticsTrendRequested({this.months = 6});

  @override
  List<Object> get props => [months];
}

class KtaApplicationFetchSlaStatusRequested extends KtaApplicationEvent {
  const KtaApplicationFetchSlaStatusRequested();
}
