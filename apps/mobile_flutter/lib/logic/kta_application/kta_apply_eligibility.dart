import '../../data/models/kta_application.dart';
import 'kta_application_bloc.dart';

enum KtaApplyVisibility { hidden, apply, status }

KtaApplyVisibility resolveKtaApplyVisibility(
  KtaApplicationState state,
  bool? cardGenerated,
) {
  if (cardGenerated != false) {
    return KtaApplyVisibility.hidden;
  }

  if (state is KtaApplicationLoading || state is KtaApplicationError) {
    return KtaApplyVisibility.hidden;
  }

  if (state is KtaApplicationInitial) {
    return KtaApplyVisibility.apply;
  }

  final KtaApplication? application;
  if (state is KtaApplicationLoaded) {
    application = state.application;
  } else if (state is KtaApplicationSubmitted) {
    application = state.application;
  } else {
    application = null;
  }

  if (application == null) {
    return KtaApplyVisibility.hidden;
  }

  switch (application.status) {
    case KtaAppStatus.approved:
    case KtaAppStatus.cardGenerated:
      return KtaApplyVisibility.hidden;
    case KtaAppStatus.rejected:
    case KtaAppStatus.cancelled:
      return KtaApplyVisibility.apply;
    default:
      return KtaApplyVisibility.status;
  }
}
