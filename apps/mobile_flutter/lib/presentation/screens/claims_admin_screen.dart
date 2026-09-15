import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/theme/app_theme.dart';
import '../../data/models/claim.dart';
import '../../logic/claim/claim_bloc.dart';
import '../widgets/app_loading_spinner.dart';

class ClaimsAdminScreen extends StatefulWidget {
  const ClaimsAdminScreen({super.key});
  @override
  State<ClaimsAdminScreen> createState() => _ClaimsAdminScreenState();
}

class _ClaimsAdminScreenState extends State<ClaimsAdminScreen> {
  String? _statusFilter;

  @override
  void initState() {
    super.initState();
    context.read<ClaimBloc>().add(ClaimLoadRequested(status: _statusFilter));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Klaim Akun Anggota')),
      body: Column(children: [
        _buildFilterChips(),
        Expanded(child: BlocBuilder<ClaimBloc, ClaimState>(
          builder: (context, state) {
            if (state is ClaimLoading) return const AppLoadingSpinner();
            if (state is ClaimError) return Center(child: Text('Error: ${state.message}'));
            if (state is ClaimLoaded) {
              if (state.claims.isEmpty) return const Center(child: Text('Tidak ada data'));
              return RefreshIndicator(
                onRefresh: () async => context.read<ClaimBloc>().add(ClaimLoadRequested(status: _statusFilter)),
                child: ListView.separated(
                  padding: const EdgeInsets.all(12),
                  itemCount: state.claims.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (ctx, i) => _ClaimCard(claim: state.claims[i]),
                ),
              );
            }
            return const Center(child: Text('Tarik ke bawah untuk memuat'));
          },
        )),
      ]),
    );
  }

  Widget _buildFilterChips() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Row(children: [
        _chip('Semua', null),
        _chip('Menunggu', 'pending'),
        _chip('Diproses', 'diproses'),
        _chip('Disetujui', 'disetujui'),
        _chip('Ditolak', 'ditolak'),
      ]),
    );
  }

  Widget _chip(String label, String? value) {
    final selected = _statusFilter == value;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label, style: TextStyle(fontSize: 12, color: selected ? Colors.white : null)),
        selected: selected,
        selectedColor: AppTheme.primary,
        onSelected: (_) {
          setState(() => _statusFilter = value);
          context.read<ClaimBloc>().add(ClaimLoadRequested(status: value));
        },
      ),
    );
  }
}

class _ClaimCard extends StatelessWidget {
  final Claim claim;
  const _ClaimCard({required this.claim});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(child: Text(
              claim.tipe == 'keanggotaan' ? (claim.namaLengkap ?? 'Tanpa Nama') : (claim.anggota?.namaLengkap ?? claim.anggotaId ?? 'Tanpa Nama'),
              style: const TextStyle(fontWeight: FontWeight.w700))),
            _StatusBadge(status: claim.status),
          ]),
          const SizedBox(height: 4),
          Text('Tipe: ${claim.tipeLabel}', style: const TextStyle(fontSize: 12)),
          if (claim.ranting?.nama != null) Text('Ranting: ${claim.ranting!.nama}', style: const TextStyle(fontSize: 12)),
          if (claim.email != null && claim.email!.isNotEmpty) Text('Email: ${claim.email}', style: const TextStyle(fontSize: 12)),
          if (claim.status == 'pending') ...[
            const SizedBox(height: 10),
            Row(children: [
              FilledButton.tonalIcon(onPressed: () => context.read<ClaimBloc>().add(ClaimProcessRequested(claim.id)),
                icon: const Icon(Icons.play_arrow, size: 16), label: const Text('Proses')),
              const SizedBox(width: 8),
              FilledButton.tonalIcon(onPressed: () => _confirmApprove(context),
                icon: const Icon(Icons.check, size: 16), label: const Text('Setujui')),
              const SizedBox(width: 8),
              OutlinedButton.icon(onPressed: () => _confirmReject(context),
                icon: const Icon(Icons.close, size: 16), label: const Text('Tolak')),
            ]),
          ] else if (claim.status == 'diproses') ...[
            const SizedBox(height: 10),
            Row(children: [
              FilledButton.tonalIcon(onPressed: () => _confirmApprove(context),
                icon: const Icon(Icons.check, size: 16), label: const Text('Setujui')),
              const SizedBox(width: 8),
              OutlinedButton.icon(onPressed: () => _confirmReject(context),
                icon: const Icon(Icons.close, size: 16), label: const Text('Tolak')),
            ]),
          ],
        ]),
      ),
    );
  }

  void _confirmApprove(BuildContext context) {
    final name = claim.tipe == 'keanggotaan' ? claim.namaLengkap : claim.anggota?.namaLengkap;
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Setujui Klaim'),
        content: Text('Setujui klaim ${name ?? ''}? Akun akan dibuat otomatis.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
          FilledButton(onPressed: () { Navigator.pop(ctx); context.read<ClaimBloc>().add(ClaimApproveRequested(claim.id)); }, child: const Text('Setujui')),
        ],
      ),
    );
  }

  void _confirmReject(BuildContext context) {
    final reasonCtrl = TextEditingController();
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Tolak Klaim'),
        content: TextField(controller: reasonCtrl, decoration: const InputDecoration(labelText: 'Alasan')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
          FilledButton(onPressed: () {
            Navigator.pop(ctx);
            context.read<ClaimBloc>().add(ClaimRejectRequested(claim.id, reason: reasonCtrl.text.trim().isEmpty ? null : reasonCtrl.text.trim()));
          }, child: const Text('Tolak')),
        ],
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;
  const _StatusBadge({required this.status});
  @override
  Widget build(BuildContext context) {
    final color = switch (status) { 'disetujui' => Colors.green, 'ditolak' => Colors.red, 'diproses' => Colors.blue, _ => Colors.orange };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
      child: Text(status[0].toUpperCase() + status.substring(1), style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600)),
    );
  }
}
