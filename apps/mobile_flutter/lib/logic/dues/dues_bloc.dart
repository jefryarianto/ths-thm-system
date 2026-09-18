import 'package:dio/dio.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/api/api_client.dart';
import '../../core/constants/app_constants.dart';
import '../../data/models/due.dart';

part 'dues_event.dart';
part 'dues_state.dart';

class DuesBloc extends Bloc<DuesEvent, DuesState> {
  DuesBloc() : super(DuesInitial()) {
    on<DuesLoadRequested>(_onDuesLoadRequested);
    on<DuesLogoutRequested>(_onDuesLogoutRequested);
  }

  final ApiClient _apiClient = ApiClient();

  Future<void> _onDuesLoadRequested(
    DuesLoadRequested event,
    Emitter<DuesState> emit,
  ) async {
    final token = await _apiClient.getAccessToken();
    if (token == null || token.isEmpty) {
      emit(DuesInitial());
      return;
    }

    emit(DuesLoading());
    try {
      final response = await _apiClient.dio.get(AppConstants.duesMe);
      final dynamic raw = response.data['data'];
      final List<dynamic> data = raw is List ? raw : [];
      final dues = data.map((json) => Due.fromJson(json)).toList();
      emit(DuesLoaded(dues: dues));
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        emit(DuesInitial());
      } else {
        emit(DuesError(message: _messageFromError(e)));
      }
    } catch (e) {
      emit(DuesError(message: e.toString()));
    }
  }

  Future<void> _onDuesLogoutRequested(
    DuesLogoutRequested event,
    Emitter<DuesState> emit,
  ) async {
    emit(DuesInitial());
  }

  String _messageFromError(DioException error) =>
      _apiClient.messageFromError(error);
}
