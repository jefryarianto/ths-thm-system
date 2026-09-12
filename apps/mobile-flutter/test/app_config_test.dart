import 'package:flutter_test/flutter_test.dart';
import 'package:ths_thm_flutter/config/app_config.dart';

void main() {
  test('API base URL always ends with /api', () {
    expect(AppConfig.apiBaseUrl, endsWith('/api'));
  });
}
