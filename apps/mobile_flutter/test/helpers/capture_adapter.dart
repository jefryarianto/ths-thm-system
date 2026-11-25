import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';

class CaptureAdapter implements HttpClientAdapter {
  final List<RequestOptions> requests = <RequestOptions>[];

  Map<String, dynamic> get lastBody => requestBody(requests.last);

  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    return ResponseBody.fromString(
      jsonEncode(
          <String, dynamic>{'success': true, 'data': <String, dynamic>{}}),
      200,
      headers: <String, List<String>>{
        Headers.contentTypeHeader: <String>[Headers.jsonContentType],
      },
    );
  }
}

Map<String, dynamic> requestBody(RequestOptions options) {
  final Object? data = options.data;
  if (data is String) return jsonDecode(data) as Map<String, dynamic>;
  if (data is Map) return data.cast<String, dynamic>();
  return <String, dynamic>{};
}
