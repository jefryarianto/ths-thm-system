import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/theme/app_theme.dart';
import '../../data/models/registration.dart';
import '../../logic/registration/registration_bloc.dart';
import '../widgets/app_loading_spinner.dart';

class RegistrationsAdminScreen extends StatefulWidget {
  const RegistrationsAdminScreen({super.key});
  @override
  State<RegistrationsAdminScreen> createState() => _RegistrationsAdminScreenState();
}

class _RegistrationsAdminScreenState extends State<RegistrationsAdminScreen> {
  String? _statusFilter;

  @override
  void initState() {
    super.initState();
    context.read<RegistrationBloc>().add(RegistrationLoadRequested(status: _statusFilter));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Pendaftaran Calon Anggota')),
      body: Column(children: [
        _buildFilterChips(),
        Expanded(child: BlocBuilder<RegistrationBloc, RegistrationState>(
          builder: (context, state) {
            if (state is RegistrationLoading) return const AppLoadingSpinner();
            if (state is RegistrationError) return Center(child: Text('Error: ${state.message}'));
            if (state is RegistrationLoaded) {
              if (state.registrations.isEmpty) return const Center(child: Text('Tidak ada data'));
              return RefreshIndicator(
                onRefresh: () async => context.read<RegistrationBloc>().add(RegistrationLoadRequested(status: _statusFilter)),
                child: ListView.separated(
                  padding: const EdgeInsets.all(12),
                  itemCount: state.registrations.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (ctx, i) => _RegistrationCard(reg: state.registrations[i]),
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
        _chip('Disetujui', 'approved'),
        _chip('Ditolak', 'rejected'),
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
          context.read<RegistrationBloc>().add(RegistrationLoadRequested(status: value));
        },
      ),
    );
  }
}

class _RegistrationCard extends StatelessWidget {
  final Registration reg;
  const _RegistrationCard({required this.reg});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(child: Text(reg.namaLengkap, style: const TextStyle(fontWeight: FontWeight.w700))),
            _StatusBadge(status: reg.status),
          ]),
          const SizedBox(height: 6),
          Text('JK: ${reg.jenisKelamin == "L" ? "Laki-laki" : "Perempuan"}${reg.ranting?.nama != null ? ' · Ranting: ${reg.ranting!.nama}' : ''}', style: const TextStyle(fontSize: 12)),
          if (reg.email != null && reg.email!.isNotEmpty) Text('Email: ${reg.email}', style: const TextStyle(fontSize: 12)),
          if (reg.noHp != null && reg.noHp!.isNotEmpty) Text('HP: ${reg.noHp}', style: const TextStyle(fontSize: 12)),
          if (reg.status == 'pending') ...[
            const SizedBox(height: 10),
            Row(children: [
              FilledButton.tonalIcon(
                onPressed: () => _confirmApprove(context),
                icon: const Icon(Icons.check, size: 16),
                label: const Text('Setujui'),
              ),
              const SizedBox(width: 8),
              OutlinedButton.icon(
                onPressed: () => _confirmReject(context),
                icon: const Icon(Icons.close, size: 16),
                label: const Text('Tolak'),
              ),
            ]),
          ],
        ]),
      ),
    );
  }

  void _confirmApprove(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Setujui Pendaftaran'),
        content: Text('Setujui pendaftaran ${reg.namaLengkap}?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
          FilledButton(
            onPressed: () {
              Navigator.pop(ctx);
              context.read<RegistrationBloc>().add(RegistrationApproveRequested(reg.id));
            },
            child: const Text('Setujui'),
          ),
        ],
      ),
    );
  }

  void _confirmReject(BuildContext context) {
    final reasonCtrl = TextEditingController();
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Tolak Pendaftaran'),
        content: TextField(controller: reasonCtrl, decoration: const InputDecoration(labelText: 'Alasan (opsional)')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
          FilledButton(
            onPressed: () {
              Navigator.pop(ctx);
              context.read<RegistrationBloc>().add(RegistrationRejectRequested(
                    reg.id, reason: reasonCtrl.text.trim().isEmpty ? null : reasonCtrl.text.trim()));
            },
            child: const Text('Tolak'),
          ),
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
    final color = switch (status) { 'approved' => Colors.green, 'rejected' => Colors.red, _ => Colors.orange };
    final label = switch (status) { 'approved' => 'Disetujui', 'rejected' => 'Ditolak', _ => 'Menunggu' };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
      child: Text(label, style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600)),
    );
  }
}
