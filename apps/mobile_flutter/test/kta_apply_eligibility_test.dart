import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_flutter/data/models/kta_application.dart';
import 'package:mobile_flutter/logic/kta_application/kta_application_bloc.dart';
import 'package:mobile_flutter/logic/kta_application/kta_apply_eligibility.dart';

import 'helpers/kta_apply_fixtures.dart';

void main() {
  test('menampilkan Ajukan KTA untuk state awal dan kartu belum terbit', () {
    expect(
      resolveKtaApplyVisibility(KtaApplicationInitial(), false),
      KtaApplyVisibility.apply,
    );
  });

  test('menyembunyikan banner saat KTA sedang dimuat', () {
    expect(
      resolveKtaApplyVisibility(KtaApplicationLoading(), false),
      KtaApplyVisibility.hidden,
    );
  });

  test('menyembunyikan banner saat muat KTA gagal', () {
    expect(
      resolveKtaApplyVisibility(
        const KtaApplicationError(message: 'x'),
        false,
      ),
      KtaApplyVisibility.hidden,
    );
  });

  test('menampilkan Lihat Status untuk pengajuan yang sedang berjalan', () {
    final runningStatuses = <KtaAppStatus>[
      KtaAppStatus.submitted,
      KtaAppStatus.rantingReview,
      KtaAppStatus.wilayahReview,
      KtaAppStatus.distrikReview,
      KtaAppStatus.nasionalReview,
      KtaAppStatus.paymentSetup,
      KtaAppStatus.paymentPending,
      KtaAppStatus.paymentVerified,
      KtaAppStatus.cardGenerating,
    ];

    for (final status in runningStatuses) {
      expect(
        resolveKtaApplyVisibility(
          KtaApplicationLoaded(application: ktaApplication(status: status)),
          false,
        ),
        KtaApplyVisibility.status,
        reason: status.name,
      );
    }
  });

  test('menampilkan Lihat Status untuk pengajuan baru saja dikirim', () {
    expect(
      resolveKtaApplyVisibility(
        KtaApplicationSubmitted(application: ktaApplication()),
        false,
      ),
      KtaApplyVisibility.status,
    );
  });

  test('menampilkan Ajukan KTA untuk pengajuan ditolak atau dibatalkan', () {
    for (final status in [KtaAppStatus.rejected, KtaAppStatus.cancelled]) {
      expect(
        resolveKtaApplyVisibility(
          KtaApplicationLoaded(application: ktaApplication(status: status)),
          false,
        ),
        KtaApplyVisibility.apply,
        reason: status.name,
      );
    }
  });

  test('menyembunyikan banner untuk pengajuan disetujui atau kartu terbit', () {
    for (final status in [KtaAppStatus.approved, KtaAppStatus.cardGenerated]) {
      expect(
        resolveKtaApplyVisibility(
          KtaApplicationLoaded(application: ktaApplication(status: status)),
          false,
        ),
        KtaApplyVisibility.hidden,
        reason: status.name,
      );
    }
  });

  test('menyembunyikan banner saat kartu sudah terbit', () {
    expect(
      resolveKtaApplyVisibility(KtaApplicationInitial(), true),
      KtaApplyVisibility.hidden,
    );
  });

  test('menyembunyikan banner saat data kartu belum tersedia', () {
    expect(
      resolveKtaApplyVisibility(KtaApplicationInitial(), null),
      KtaApplyVisibility.hidden,
    );
  });
}
