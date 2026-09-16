import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/card_data.dart';
import '../../data/models/member.dart';
import '../../logic/member/member_bloc.dart';
import '../widgets/app_bar_icon_title.dart';
import '../widgets/app_loading_spinner.dart';
import '../widgets/kta_card_widget.dart';
import '../widgets/secure_kta_container.dart';

class KtaScreen extends StatefulWidget {
  const KtaScreen({super.key});

  @override
  State<KtaScreen> createState() => _KtaScreenState();
}

class _KtaScreenState extends State<KtaScreen> {
  @override
  void initState() {
    super.initState();
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
      body: SecureKtaContainer(
        // ── TEMPATKAN widget KTA lama Anda di parameter childKtaExisting ──
        // Desain internal `KtaFlipCard` / kartu TIDAK diubah/dirombak.
        // Yang dilakukan hanya membungkus dengan keamanan + jam verifikasi.
        childKtaExisting: BlocBuilder<MemberBloc, MemberState>(
          builder: (context, state) {
            if (state is MemberLoading) {
              return const AppLoadingSpinner();
            }
            if (state is MemberError) {
              return _Error(message: state.message);
            }
            if (state is! MemberLoaded) {
              return const Center(child: Text('Belum ada data anggota'));
            }
            // Fetch card data if not loaded yet
            if (state.cardData == null) {
              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (mounted) {
                  context
                      .read<MemberBloc>()
                      .add(const MemberCardDataRequested());
                }
              });
            }
            return _KtaCard(member: state.member, cardData: state.cardData);
          },
        ),
      ),
    );
  }
}

class _KtaCard extends StatelessWidget {
  final Member member;
  final CardData? cardData;
  const _KtaCard({required this.member, this.cardData});

  @override
  Widget build(BuildContext context) {
    final status = member.statusKeanggotaan;
    final validasi = member.statusValidasi;

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        // Kartu digital — desain Expo
        KtaFlipCard(member: member, cardData: cardData),
        const SizedBox(height: 12),
        FilledButton.tonalIcon(
          onPressed: () => context.push<void>('/kta/viewer'),
          icon: const Icon(Icons.zoom_in),
          label: const Text('Perbesar & Simpan'),
        ),
        if (cardData?.verificationUrl.isNotEmpty ?? false) ...[
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: () => launchUrl(
              Uri.parse(ApiClient.resolveAbsolute(cardData!.verificationUrl)),
              mode: LaunchMode.externalApplication,
            ),
            icon: const Icon(Icons.verified_outlined),
            label: const Text('Verifikasi Kartu'),
          ),
        ],
        const SizedBox(height: 20),
        // Status
        Wrap(
          spacing: 8,
          children: [
            if (status.isNotEmpty) _chip(status, AppTheme.statusColor(status)),
            if (validasi.isNotEmpty)
              _chip('Validasi: $validasi', AppTheme.statusColor(validasi)),
          ],
        ),
        const SizedBox(height: 20),
        const Text('Informasi Anggota',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
        const SizedBox(height: 12),
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
        leading: Icon(icon, color: AppTheme.primary, size: 22),
        title: Text(label,
            style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
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
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: AppTheme.danger),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () =>
                  context.read<MemberBloc>().add(const MemberLoadRequested()),
              child: const Text('Coba Lagi'),
            ),
          ],
        ),
      ),
    );
  }
}
