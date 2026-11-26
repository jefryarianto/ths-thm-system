import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../core/utils/snack_bar_helper.dart';
import '../../data/models/card_data.dart';
import '../../data/models/member.dart';
import '../../logic/kta_application/kta_application_bloc.dart';
import '../../logic/member/member_bloc.dart';
import '../widgets/app_bar_icon_title.dart';
import '../widgets/app_loading_spinner.dart';
import '../widgets/kta_card_widget.dart';
import '../widgets/secure_kta_container.dart';
import '../widgets/state_views.dart';

class KtaScreen extends StatefulWidget {
  const KtaScreen({super.key});

  @override
  State<KtaScreen> createState() => _KtaScreenState();
}

class _KtaScreenState extends State<KtaScreen> {
  MemberLoaded? _lastLoaded;

  @override
  void initState() {
    super.initState();
    context.read<KtaApplicationBloc>().add(const KtaApplicationLoadRequested());
    final state = context.read<MemberBloc>().state;
    if (state is! MemberLoaded) {
      context.read<MemberBloc>().add(const MemberLoadRequested());
    }
    // Ambil data kartu digital (penandatangan, stempel)
    if (state is MemberLoaded && state.cardData == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          context.read<MemberBloc>().add(const MemberCardDataRequested());
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const AppBarIconTitle(
          icon: Icons.credit_card_outlined,
          title: 'KTA Digital',
        ),
      ),
      body: BlocListener<MemberBloc, MemberState>(
        listenWhen: (previous, current) =>
            current is MemberLoaded || current is MemberError,
        listener: (context, state) {
          if (state is MemberLoaded) _lastLoaded = state;
          if (state is MemberError && _lastLoaded != null) {
            showCenteredSnackBar(context, state.message);
          }
        },
        child: SecureKtaContainer(
          childKtaExisting: BlocBuilder<KtaApplicationBloc, KtaApplicationState>(
            builder: (context, ktaState) {
              if (ktaState is KtaApplicationError) {
                return ErrorStateView(
                  message: ktaState.message,
                  onRetry: () => context
                      .read<KtaApplicationBloc>()
                      .add(const KtaApplicationLoadRequested()),
                );
              }
              return BlocBuilder<MemberBloc, MemberState>(
                builder: (context, state) {
                  if (state is MemberLoading) {
                    return const AppLoadingSpinner();
                  }
                  if (state is MemberLoaded) _lastLoaded = state;
                  if (state is MemberError) {
                    final lastLoaded = _lastLoaded;
                    if (lastLoaded != null) {
                      return _KtaCard(
                        member: lastLoaded.member,
                        cardData: lastLoaded.cardData,
                      );
                    }
                    return _Error(message: state.message);
                  }
                  if (state is! MemberLoaded) {
                    return const EmptyStateView(
                      icon: Icons.badge_outlined,
                      title: 'Belum ada data anggota',
                      message: 'Data anggota Anda akan muncul setelah dimuat.',
                    );
                  }
                  if (state.cardData == null) {
                    WidgetsBinding.instance.addPostFrameCallback((_) {
                      if (mounted) {
                        context
                            .read<MemberBloc>()
                            .add(const MemberCardDataRequested());
                      }
                    });
                  }
                  return _KtaCard(
                    member: state.member,
                    cardData: state.cardData,
                  );
                },
              );
            },
          ),
        ),
      ),
    );
  }
}

class _KtaCard extends StatelessWidget {
  final Member member;
  final CardData? cardData;
  const _KtaCard({
    required this.member,
    this.cardData,
  });

  @override
  Widget build(BuildContext context) {
    final status = member.statusKeanggotaan;
    final validasi = member.statusValidasi;
    final data = cardData;
    final ready = data != null && data.generated && data.adminIssued;

    return ListView(
      padding: const EdgeInsets.all(AppTheme.space20),
      children: [
        if (!ready) ...[
          const _KtaNotReadyCard(),
          const SizedBox(height: AppTheme.space12),
        ] else ...[
          // Kartu digital — desain Expo
          KtaFlipCard(member: member, cardData: cardData),
          const SizedBox(height: AppTheme.space12),
          FilledButton.tonalIcon(
            onPressed: () => context.push<void>('/kta/viewer'),
            icon: const Icon(Icons.zoom_in),
            label: const Text('Perbesar & Simpan'),
          ),
          if (cardData?.verificationUrl.isNotEmpty ?? false) ...[
            const SizedBox(height: AppTheme.space8),
            FilledButton.icon(
              onPressed: () {
                final token =
                    Formatters.extractQrToken(cardData!.verificationUrl);
                context.push<void>('/kta/verify/$token');
              },
              icon: const Icon(Icons.verified_outlined),
              label: const Text('Verifikasi Kartu'),
            ),
            // Fallback opsional: hasil verifikasi juga dapat dilihat via browser
            // (berguna untuk dibagikan ke pihak luar yang tidak memakai aplikasi).
            const SizedBox(height: 4),
            Center(
              child: TextButton.icon(
                onPressed: () => launchUrl(
                  Uri.parse(
                      ApiClient.resolveAbsolute(cardData!.verificationUrl)),
                  mode: LaunchMode.externalApplication,
                ),
                icon: const Icon(Icons.open_in_new, size: 16),
                label: const Text('Buka di Browser'),
                style: TextButton.styleFrom(
                  // Target sentuh minimum 44 dp (a11y) — padding alih-alih compact.
                  minimumSize: const Size.fromHeight(
                      AppTheme.touchTargetCompact),
                  padding: const EdgeInsets.symmetric(
                      horizontal: 12, vertical: AppTheme.touchTargetCompact / 4),
                  textStyle: const TextStyle(fontSize: 12),
                ),
              ),
            ),
          ],
        ],
        const SizedBox(height: AppTheme.space20),
        // Status
        Wrap(
          spacing: 8,
          children: [
            if (status.isNotEmpty)
              _chip(status, AppTheme.statusColorFor(context, status)),
            if (validasi.isNotEmpty)
              _chip('Validasi: $validasi',
                  AppTheme.statusColorFor(context, validasi)),
          ],
        ),
        const SizedBox(height: AppTheme.space20),
        const Text('Informasi Anggota',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
        const SizedBox(height: AppTheme.space12),
        _info(context, Icons.email_outlined, 'Email', member.email),
        _info(context, Icons.phone_outlined, 'No. Telepon', member.noHp),
        _info(context, Icons.wc_outlined, 'Jenis Kelamin', member.jenisKelamin),
        _info(context, Icons.cake_outlined, 'Tempat/Tanggal Lahir',
            combinedBirth(member)),
        _info(context, Icons.home_outlined, 'Alamat', member.alamat),
        _info(context, Icons.map_outlined, 'Wilayah', wilayah(member)),
      ],
    );
  }

  String combinedBirth(Member m) {
    final t = m.tempatLahir;
    final tl = Formatters.dateLong(m.tanggalLahir);
    return [t, tl].where((e) => e.isNotEmpty && e != '-').join(', ');
  }

  String wilayah(Member m) {
    return [m.kabupaten, m.provinsi].where((e) => e.isNotEmpty).join(', ');
  }

  Widget _chip(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(label,
          style:
              TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: color)),
    );
  }

  Widget _info(
      BuildContext context, IconData icon, String label, String value) {
    if (value.isEmpty) return const SizedBox.shrink();
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        dense: true,
        leading: Icon(icon, color: Theme.of(context).colorScheme.primary, size: 22),
        title: Text(label,
            style: TextStyle(
                fontSize: 12,
                color: Theme.of(context).colorScheme.onSurfaceVariant)),
        subtitle:
            Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
      ),
    );
  }
}

class _Error extends StatelessWidget {
  final String message;
  const _Error({required this.message});

  @override
  Widget build(BuildContext context) {
    return ErrorStateView(
      message: message,
      onRetry: () =>
          context.read<MemberBloc>().add(const MemberLoadRequested()),
    );
  }
}

class _KtaNotReadyCard extends StatelessWidget {
  const _KtaNotReadyCard();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      elevation: 0,
      color: scheme.surfaceContainerHighest.withValues(alpha: 0.4),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(AppTheme.space20),
        child: Column(
          children: [
            Icon(Icons.hourglass_empty, size: 48, color: scheme.primary),
            const SizedBox(height: 12),
            const Text(
              'Menunggu penerbitan admin',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            Text(
              'Setelah pembayaran terverifikasi, kartu digital diterbitkan oleh admin.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant),
            ),
          ],
        ),
      ),
    );
  }
}
