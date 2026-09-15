import 'package:dio/dio.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/api/api_client.dart';
import '../../core/constants/app_constants.dart';
import '../../data/models/document.dart';

part 'document_event.dart';
part 'document_state.dart';

class DocumentBloc extends Bloc<DocumentEvent, DocumentState> {
  DocumentBloc() : super(DocumentInitial()) {
    on<DocumentLoadRequested>(_onDocumentLoadRequested);
    on<DocumentLogoutRequested>(_onDocumentLogoutRequested);
  }

  final ApiClient _apiClient = ApiClient();

  Future<void> _onDocumentLoadRequested(
    DocumentLoadRequested event,
    Emitter<DocumentState> emit,
  ) async {
    final token = await _apiClient.getAccessToken();
    if (token == null || token.isEmpty) {
      emit(DocumentInitial());
      return;
    }

    emit(DocumentLoading());
    try {
      // Endpoint /documents (list) bersifat branch-scope (admin). Anggota
      // mengakses dokumennya lewat daftar self-scope /members/:id/documents.
      final memberRes = await _apiClient.dio.get('/members/me');
      final memberId = memberRes.data['data']?['id']?.toString();
      if (memberId == null || memberId.isEmpty) {
        emit(const DocumentError(message: 'Data anggota tidak ditemukan'));
        return;
      }

      final response =
          await _apiClient.dio.get(AppConstants.memberDocuments(memberId));
      final dynamic raw = response.data['data'];
      final List<dynamic> data = raw is List ? raw : [];
      final documents = data.map((json) => Document.fromJson(json)).toList();
      emit(DocumentLoaded(documents: documents));
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        emit(DocumentInitial());
      } else {
        emit(DocumentError(message: _messageFromError(e)));
      }
    } catch (e) {
      emit(DocumentError(message: e.toString()));
    }
  }

  Future<void> _onDocumentLogoutRequested(
    DocumentLogoutRequested event,
    Emitter<DocumentState> emit,
  ) async {
    emit(DocumentInitial());
  }

  String _messageFromError(DioException error) {
    final data = error.response?.data;
    if (data is Map && data['message'] != null) {
      return data['message'].toString();
    }
    return error.message ?? error.toString();
  }
}
