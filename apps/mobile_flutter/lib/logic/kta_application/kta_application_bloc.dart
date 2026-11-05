import 'package:dio/dio.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/api/api_client.dart';
import '../../data/models/kta_application.dart';

part 'kta_application_event.dart';
part 'kta_application_state.dart';

class KtaApplicationBloc extends Bloc<KtaApplicationEvent, KtaApplicationState> {
  KtaApplicationBloc() : super(KtaApplicationInitial()) {
    on<KtaApplicationLoadRequested>(_onLoadRequested);
    on<KtaApplicationSubmitRequested>(_onSubmitRequested);
    on<KtaApplicationCancelRequested>(_onCancelRequested);
    on<KtaApplicationBulkSubmitRequested>(_onBulkSubmitRequested);
    on<KtaApplicationApproveRequested>(_onApproveRequested);
    on<KtaApplicationRejectRequested>(_onRejectRequested);
    on<KtaApplicationFetchDetailRequested>(_onFetchDetailRequested);
    on<KtaApplicationFetchListRequested>(_onFetchListRequested);
    on<KtaApplicationFetchBatchesRequested>(_onFetchBatchesRequested);
    on<KtaApplicationFetchBatchDetailRequested>(_onFetchBatchDetailRequested);
    on<KtaApplicationExportBatchRequested>(_onExportBatchRequested);
    on<KtaApplicationFetchAnalyticsFunnelRequested>(_onFetchFunnelRequested);
    on<KtaApplicationFetchAnalyticsProcessingTimeRequested>(_onFetchProcessingTimeRequested);
    on<KtaApplicationFetchAnalyticsTrendRequested>(_onFetchTrendRequested);
    on<KtaApplicationFetchSlaStatusRequested>(_onFetchSlaRequested);
  }

  final ApiClient _apiClient = ApiClient();

  Future<String?> _token() => _apiClient.getAccessToken();

  Future<void> _onLoadRequested(
    KtaApplicationLoadRequested event,
    Emitter<KtaApplicationState> emit,
  ) async {
    final token = await _token();
    if (token == null || token.isEmpty) {
      emit(KtaApplicationInitial());
      return;
    }

    emit(KtaApplicationLoading());
    try {
      final response = await _apiClient.dio.get('/kta-applications/me');
      final data = response.data['data'];
      if (data is Map<String, dynamic>) {
        emit(KtaApplicationLoaded(application: KtaApplication.fromJson(data)));
      } else {
        emit(KtaApplicationInitial());
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        emit(KtaApplicationInitial());
      } else {
        emit(KtaApplicationError(message: _apiClient.messageFromError(e)));
      }
    } catch (e) {
      emit(KtaApplicationError(message: e.toString()));
    }
  }

  Future<void> _onSubmitRequested(
    KtaApplicationSubmitRequested event,
    Emitter<KtaApplicationState> emit,
  ) async {
    final token = await _token();
    if (token == null || token.isEmpty) {
      emit(KtaApplicationInitial());
      return;
    }

    emit(KtaApplicationSubmitting());
    try {
      final response = await _apiClient.dio.post('/kta-applications/me');
      final data = response.data['data'];
      if (data is Map<String, dynamic>) {
        emit(KtaApplicationSubmitted(application: KtaApplication.fromJson(data)));
      } else {
        emit(const KtaApplicationError(message: 'Gagal mengajukan KTA'));
      }
    } on DioException catch (e) {
      emit(KtaApplicationError(message: _apiClient.messageFromError(e)));
    } catch (e) {
      emit(KtaApplicationError(message: e.toString()));
    }
  }

  Future<void> _onCancelRequested(
    KtaApplicationCancelRequested event,
    Emitter<KtaApplicationState> emit,
  ) async {
    final token = await _token();
    if (token == null || token.isEmpty) {
      emit(KtaApplicationInitial());
      return;
    }

    try {
      await _apiClient.dio.patch('/kta-applications/me/cancel', data: {'reason': event.reason});
      emit(const KtaApplicationActionSuccess(message: 'Pengajuan dibatalkan'));
      add(const KtaApplicationLoadRequested());
    } on DioException catch (e) {
      emit(KtaApplicationError(message: _apiClient.messageFromError(e)));
    } catch (e) {
      emit(KtaApplicationError(message: e.toString()));
    }
  }

  Future<void> _onBulkSubmitRequested(
    KtaApplicationBulkSubmitRequested event,
    Emitter<KtaApplicationState> emit,
  ) async {
    final token = await _token();
    if (token == null || token.isEmpty) {
      emit(KtaApplicationInitial());
      return;
    }

    emit(KtaApplicationSubmitting());
    try {
      final response = await _apiClient.dio.post(
        '/kta-applications/bulk',
        data: {
          'anggotaIds': event.anggotaIds,
          'batchName': event.batchName,
        },
      );
      final data = response.data['data'];
      if (data is Map<String, dynamic>) {
        emit(KtaApplicationBulkSubmitted(
          batchId: data['batchId']?.toString() ?? '',
          totalSubmitted: data['totalSubmitted'] as int? ?? 0,
          ineligible:
              (data['ineligible'] as List?)?.whereType<Map<String, dynamic>>().toList() ?? [],
        ));
      }
    } on DioException catch (e) {
      emit(KtaApplicationError(message: _apiClient.messageFromError(e)));
    } catch (e) {
      emit(KtaApplicationError(message: e.toString()));
    }
  }

  Future<void> _onApproveRequested(
    KtaApplicationApproveRequested event,
    Emitter<KtaApplicationState> emit,
  ) async {
    final token = await _token();
    if (token == null || token.isEmpty) {
      emit(KtaApplicationInitial());
      return;
    }

    try {
      await _apiClient.dio.patch(
        '/kta-applications/${event.applicationId}/approve',
        data: {'catatan': event.catatan},
      );
      emit(const KtaApplicationActionSuccess(message: 'Berhasil menyetujui'));
    } on DioException catch (e) {
      emit(KtaApplicationError(message: _apiClient.messageFromError(e)));
    } catch (e) {
      emit(KtaApplicationError(message: e.toString()));
    }
  }

  Future<void> _onRejectRequested(
    KtaApplicationRejectRequested event,
    Emitter<KtaApplicationState> emit,
  ) async {
    final token = await _token();
    if (token == null || token.isEmpty) {
      emit(KtaApplicationInitial());
      return;
    }

    try {
      await _apiClient.dio.patch(
        '/kta-applications/${event.applicationId}/reject',
        data: {'reason': event.reason},
      );
      emit(const KtaApplicationActionSuccess(message: 'Berhasil menolak'));
    } on DioException catch (e) {
      emit(KtaApplicationError(message: _apiClient.messageFromError(e)));
    } catch (e) {
      emit(KtaApplicationError(message: e.toString()));
    }
  }

  Future<void> _onFetchDetailRequested(
    KtaApplicationFetchDetailRequested event,
    Emitter<KtaApplicationState> emit,
  ) async {
    final token = await _token();
    if (token == null || token.isEmpty) {
      emit(KtaApplicationInitial());
      return;
    }

    emit(KtaApplicationLoading());
    try {
      final response = await _apiClient.dio.get('/kta-applications/${event.applicationId}');
      final data = response.data['data'];
      if (data is Map<String, dynamic>) {
        emit(KtaApplicationLoaded(application: KtaApplication.fromJson(data)));
      }
    } on DioException catch (e) {
      emit(KtaApplicationError(message: _apiClient.messageFromError(e)));
    } catch (e) {
      emit(KtaApplicationError(message: e.toString()));
    }
  }

  Future<void> _onFetchListRequested(
    KtaApplicationFetchListRequested event,
    Emitter<KtaApplicationState> emit,
  ) async {
    final token = await _token();
    if (token == null || token.isEmpty) {
      emit(KtaApplicationInitial());
      return;
    }

    emit(KtaApplicationLoading());
    try {
      final response = await _apiClient.dio.get(
        '/kta-applications',
        queryParameters: {
          if (event.status != null && event.status!.isNotEmpty) 'status': event.status,
          'page': event.page,
          'limit': 20,
        },
      );
      final data = response.data['data'];
      final meta = response.data['meta'] is Map<String, dynamic>
          ? response.data['meta'] as Map<String, dynamic>
          : <String, dynamic>{};
      if (data is List) {
        emit(KtaApplicationListLoaded(
          applications: data.whereType<Map<String, dynamic>>().map(KtaApplication.fromJson).toList(),
          total: meta['total'] as int? ?? 0,
          page: meta['page'] as int? ?? 1,
          limit: meta['limit'] as int? ?? 20,
          totalPages: meta['totalPages'] as int? ?? 1,
        ));
      }
    } on DioException catch (e) {
      emit(KtaApplicationError(message: _apiClient.messageFromError(e)));
    } catch (e) {
      emit(KtaApplicationError(message: e.toString()));
    }
  }

  Future<void> _onFetchBatchesRequested(
    KtaApplicationFetchBatchesRequested event,
    Emitter<KtaApplicationState> emit,
  ) async {
    final token = await _token();
    if (token == null || token.isEmpty) {
      emit(KtaApplicationInitial());
      return;
    }

    try {
      final response = await _apiClient.dio.get('/kta-applications/batches');
      final data = response.data['data'];
      if (data is List) {
        final batches = data
            .whereType<Map<String, dynamic>>()
            .map(KtaBatch.fromJson)
            .toList();
        emit(KtaApplicationBatchesLoaded(batches: batches));
      }
    } on DioException catch (e) {
      emit(KtaApplicationError(message: _apiClient.messageFromError(e)));
    } catch (e) {
      emit(KtaApplicationError(message: e.toString()));
    }
  }

  Future<void> _onFetchBatchDetailRequested(
    KtaApplicationFetchBatchDetailRequested event,
    Emitter<KtaApplicationState> emit,
  ) async {
    final token = await _token();
    if (token == null || token.isEmpty) {
      emit(KtaApplicationInitial());
      return;
    }

    emit(KtaApplicationLoading());
    try {
      final response = await _apiClient.dio.get('/kta-applications/batches/${event.batchId}');
      final data = response.data['data'];
      if (data is Map<String, dynamic>) {
        emit(KtaApplicationBatchDetailLoaded(batch: KtaBatch.fromJson(data)));
      }
    } on DioException catch (e) {
      emit(KtaApplicationError(message: _apiClient.messageFromError(e)));
    } catch (e) {
      emit(KtaApplicationError(message: e.toString()));
    }
  }

  Future<void> _onExportBatchRequested(
    KtaApplicationExportBatchRequested event,
    Emitter<KtaApplicationState> emit,
  ) async {
    final token = await _token();
    if (token == null || token.isEmpty) {
      emit(KtaApplicationInitial());
      return;
    }

    try {
      await _apiClient.dio.get(
        '/kta-applications/batches/${event.batchId}/export',
        queryParameters: {'format': event.format},
      );
      emit(KtaApplicationActionSuccess(message: 'Export ${event.format.toUpperCase()} berhasil dipicu'));
    } on DioException catch (e) {
      emit(KtaApplicationError(message: _apiClient.messageFromError(e)));
    } catch (e) {
      emit(KtaApplicationError(message: e.toString()));
    }
  }

  Future<void> _onFetchFunnelRequested(
    KtaApplicationFetchAnalyticsFunnelRequested event,
    Emitter<KtaApplicationState> emit,
  ) async {
    final token = await _token();
    if (token == null || token.isEmpty) return;

    try {
      final response = await _apiClient.dio.get('/kta-applications/analytics/funnel');
      final data = response.data['data'];
      if (data is Map<String, dynamic>) {
        emit(KtaApplicationAnalyticsFunnelLoaded(
          stages: (data['stages'] as List?)?.whereType<Map<String, dynamic>>().toList() ?? [],
          totalSubmitted: data['totalSubmitted'] as int? ?? 0,
        ));
      }
    } catch (_) {
      // Analytics gagal -> diam, jangan ganggu alur utama.
    }
  }

  Future<void> _onFetchProcessingTimeRequested(
    KtaApplicationFetchAnalyticsProcessingTimeRequested event,
    Emitter<KtaApplicationState> emit,
  ) async {
    final token = await _token();
    if (token == null || token.isEmpty) return;

    try {
      final response = await _apiClient.dio.get('/kta-applications/analytics/processing-time');
      final data = response.data['data'];
      if (data is List) {
        emit(KtaApplicationAnalyticsProcessingTimeLoaded(
          processingTimes: data.whereType<Map<String, dynamic>>().toList(),
        ));
      }
    } catch (_) {
      // Diam.
    }
  }

  Future<void> _onFetchTrendRequested(
    KtaApplicationFetchAnalyticsTrendRequested event,
    Emitter<KtaApplicationState> emit,
  ) async {
    final token = await _token();
    if (token == null || token.isEmpty) return;

    try {
      final response = await _apiClient.dio.get(
        '/kta-applications/analytics/trend',
        queryParameters: {'months': event.months},
      );
      final data = response.data['data'];
      if (data is List) {
        emit(KtaApplicationAnalyticsTrendLoaded(
          trend: data.whereType<Map<String, dynamic>>().toList(),
        ));
      }
    } catch (_) {
      // Diam.
    }
  }

  Future<void> _onFetchSlaRequested(
    KtaApplicationFetchSlaStatusRequested event,
    Emitter<KtaApplicationState> emit,
  ) async {
    final token = await _token();
    if (token == null || token.isEmpty) return;

    try {
      final response = await _apiClient.dio.get('/kta-applications/escalation/sla');
      final data = response.data['data'];
      if (data is Map<String, dynamic>) {
        emit(KtaApplicationSlaStatusLoaded(slaStatus: data));
      }
    } catch (_) {
      // Diam.
    }
  }
}
