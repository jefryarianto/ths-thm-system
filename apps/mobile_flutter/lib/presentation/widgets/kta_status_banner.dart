import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../data/models/kta_application.dart';
import '../../logic/kta_application/kta_application_bloc.dart';
import '../../logic/kta_application/kta_apply_eligibility.dart';
import '../../logic/member/member_bloc.dart';

/// Banner persisten di halaman utama yang mengingatkan anggota tentang status KTA.
///
/// - Tidak punya KTA sama sekali → ajakan mengajukan
/// - Pengajuan berjalan → status proses berjenjang
/// - Sudah terbit (approved/cardGenerated) → banner disembunyikan
class KtaStatusBanner extends StatefulWidget {
  const KtaStatusBanner({super.key});

  @override
  State<KtaStatusBanner> createState() => _KtaStatusBannerState();
}

class _KtaStatusBannerState extends State<KtaStatusBanner> {
  @override
  void initState() {
    super.initState();
    context.read<KtaApplicationBloc>().add(const KtaApplicationLoadRequested());
  }

  String _message(KtaAppStatus? status) {
    switch (status) {
      case KtaAppStatus.submitted:
        return 'Pengajuan KTA diterima, menunggu validasi Admin Ranting';
      case KtaAppStatus.rantingReview:
        return 'Pengajuan KTA sedang divalidasi Admin Ranting';
      case KtaAppStatus.wilayahReview:
        return 'Disetujui Ranting, menunggu review Admin Wilayah';
      case KtaAppStatus.distrikReview:
        return 'Disetujui Wilayah, menunggu penetapan biaya Admin Distrik';
      case KtaAppStatus.nasionalReview:
        return 'Disetujui Distrik, menunggu penerbitan nomor e-KTA';
      case KtaAppStatus.paymentSetup:
        return 'Silakan lakukan pembayaran biaya KTA';
      case KtaAppStatus.paymentPending:
        return 'Menunggu konfirmasi pembayaran KTA';
      case KtaAppStatus.paymentVerified:
        return 'Pembayaran terverifikasi, menunggu e-KTA diterbitkan';
      case KtaAppStatus.cardGenerating:
        return 'KTA sedang dibuat';
      case KtaAppStatus.cardGenerated:
        return 'KTA Anda sudah siap';
      case KtaAppStatus.approved:
        return 'Pengajuan KTA disetujui';
      case KtaAppStatus.rejected:
        return 'Pengajuan KTA ditolak, silakan ajukan kembali';
      case KtaAppStatus.cancelled:
        return 'Pengajuan KTA dibatalkan';
      case null:
        return 'Anda belum memiliki KTA, silahkan melakukan pengajuan';
    }
  }

  Color _color(KtaAppStatus? status) {
    switch (status) {
      case KtaAppStatus.approved:
      case KtaAppStatus.cardGenerated:
        return Colors.green;
      case KtaAppStatus.rejected:
      case KtaAppStatus.cancelled:
        return Colors.grey;
      case KtaAppStatus.paymentSetup:
      case KtaAppStatus.paymentPending:
      case KtaAppStatus.paymentVerified:
        return Colors.orange;
      case null:
        return Colors.redAccent;
      default:
        return Colors.blue;
    }
  }

  IconData _icon(KtaAppStatus? status) {
    switch (status) {
      case KtaAppStatus.approved:
      case KtaAppStatus.cardGenerated:
        return Icons.check_circle;
      case KtaAppStatus.rejected:
      case KtaAppStatus.cancelled:
        return Icons.cancel;
      case KtaAppStatus.paymentSetup:
      case KtaAppStatus.paymentPending:
      case KtaAppStatus.paymentVerified:
        return Icons.payment;
      case null:
        return Icons.warning_amber_rounded;
      default:
        return Icons.hourglass_top;
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<KtaApplicationBloc, KtaApplicationState>(
      builder: (context, state) {
        final memberState = context.read<MemberBloc>().state;
        final cardGenerated = memberState is MemberLoaded
            ? memberState.cardData?.generated
            : null;
        final visibility = resolveKtaApplyVisibility(state, cardGenerated);

        if (visibility == KtaApplyVisibility.hidden) {
          return const SizedBox.shrink();
        }

        KtaAppStatus? status;
        if (state is KtaApplicationLoaded) {
          status = state.application.status;
        } else if (state is KtaApplicationSubmitted) {
          status = state.application.status;
        }

        final color = _color(status);
        final isApply = visibility == KtaApplyVisibility.apply;
        final actionLabel = isApply ? 'Ajukan KTA' : 'Lihat Status';
        final route = isApply ? '/kta/apply' : '/kta/status';

        return Material(
          color: color,
          child: InkWell(
            onTap: () => context.push(route),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              child: Row(
                children: [
                  Icon(_icon(status), color: Colors.white, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _message(status),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    actionLabel,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12.5,
                      fontWeight: FontWeight.w800,
                      decoration: TextDecoration.underline,
                      decorationColor: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
