/// Konstanta aplikasi — base URL API & daftar endpoint.
///
/// Default disetel ke **produksi** (`https://ths-thm.cloud/api`) agar semua
/// build (termasuk `flutter run` tanpa argumen) langsung terhubung ke server
/// live. Untuk pengembangan lokal, override saat menjalankan:
/// ```sh
/// flutter run --dart-define=API_URL=http://10.0.2.2:3001/api
/// ```
///
/// PENTING: gunakan `https://ths-thm.cloud/api` (BUKAN `api.ths-thm.cloud`).
/// Sertifikat Let's Encrypt produksi hanya mencakup `ths-thm.cloud` dan
/// `www.ths-thm.cloud`; `api.ths-thm.cloud` tidak termasuk SAN sehingga semua
/// klien native (Flutter/Dart, curl, dsb.) gagal TLS dengan
/// `CERTIFICATE_VERIFY_FAILED: Hostname mismatch` — sebagaimana dilaporkan
/// apps/mobile_flutter (bug "Iuran Internal Server Error" versi Flutter).
/// Nginx produksi sudah mem-proxy `/api` ke container API (lihat
/// nginx/production.conf), dan aplikasi Expo memakai konvensi yang sama
/// (EXPO_PUBLIC_API_URL=https://ths-thm.cloud di .github/workflows/eas-build.yml).
class AppConstants {
  static const String baseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'https://ths-thm.cloud/api',
  );

  // Auth
  static const String authLogin = '$baseUrl/auth/login';
  static const String authRefresh = '$baseUrl/auth/refresh';
  static const String authForgot = '$baseUrl/auth/forgot';
  static const String authForceChangePassword =
      '$baseUrl/auth/force-change-password';
  static const String authChangePassword = '$baseUrl/auth/change-password';

  // Member
  static const String memberMe = '$baseUrl/members/me';
  static const String members = '$baseUrl/members';

  // Iuran
  static const String duesMe = '$baseUrl/dues/members/me';

  // Dokumen
  static String memberDocuments(String id) => '$baseUrl/members/$id/documents';
  static String documentFile(String id) => '$baseUrl/documents/$id/file';

  // Notifikasi
  static const String notifications = '$baseUrl/notifications';

  // Kegiatan (Scan QR)
  static const String graduationsMe = '$baseUrl/graduations/invitations/me';
  static String graduationCheckIn(String id) =>
      '$baseUrl/graduations/$id/checkin';

  // ── Pendadaran (Graduations) ──
  // Daftar & detail (admin + anggota; CBDA /api/graduations).
  static const String graduations = '$baseUrl/graduations';
  static String graduationById(String id) => '$baseUrl/graduations/$id';
  static String graduationParticipants(String id) =>
      '$baseUrl/graduations/$id/participants';
  static String graduationInvitations(String id) =>
      '$baseUrl/graduations/$id/invitations';
  static String graduationGenerateInvitations(String id) =>
      '$baseUrl/graduations/$id/invitations/generate';
  static String graduationConfirmInvitation(String id, String invitationId) =>
      '$baseUrl/graduations/$id/invitations/$invitationId/confirm';
  static String graduationExaminers(String id) =>
      '$baseUrl/graduations/$id/examiners';
  static String graduationExaminerCandidates(String id) =>
      '$baseUrl/graduations/$id/examiner-candidates';
  static String graduationReviewExaminer(String id, String penugasanId) =>
      '$baseUrl/graduations/$id/examiners/$penugasanId/review';
  static String graduationResults(String id) =>
      '$baseUrl/graduations/$id/results';
  static String graduationScores(String id) =>
      '$baseUrl/graduations/$id/scores';
  static String graduationScoreProgress(String id) =>
      '$baseUrl/graduations/$id/score-progress';
  static String graduationCheckInById(String id) =>
      '$baseUrl/graduations/$id/checkin';
  static String graduationQr(String id) => '$baseUrl/graduations/$id/qr';
  static String get assessmentsAspects => "$baseUrl/assessments/aspects";
  static String assessmentAspectById(String id) =>
      "$baseUrl/assessments/aspects/$id";

  static String get assessmentsItems => "$baseUrl/assessments/items";
  static String assessmentItemById(String id) => "$baseUrl/assessments/items/$id";
  static String get assessmentsScores => "$baseUrl/assessments/scores";
  static String assessmentScoresByGraduation(String id) => "$baseUrl/graduations/$id/scores";
}
