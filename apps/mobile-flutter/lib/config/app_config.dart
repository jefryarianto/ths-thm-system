class AppConfig {
  const AppConfig._();

  /// Override with --dart-define=API_URL=https://your-api-host.
  static const apiUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'https://ths-thm.cloud',
  );

  static String get apiBaseUrl => '${apiUrl.replaceFirst(RegExp(r'/$'), '')}/api';
}
