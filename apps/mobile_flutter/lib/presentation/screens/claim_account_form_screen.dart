import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;

import '../../core/constants/app_constants.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/ranting.dart';
import '../../logic/claim/claim_bloc.dart';
import '../widgets/app_loading_spinner.dart';

/// Form publik klaim akun anggota lama.
class ClaimAccountFormScreen extends StatefulWidget {
  const ClaimAccountFormScreen({super.key});
  @override
  State<ClaimAccountFormScreen> createState() => _ClaimAccountFormScreenState();
}

class _ClaimAccountFormScreenState extends State<ClaimAccountFormScreen> {
  String _tipe = 'keanggotaan';
  final _anggotaIdCtrl = TextEditingController();
  final _catatanCtrl = TextEditingController();
  final _namaCtrl = TextEditingController();
  String _jenisKelamin = 'L';
  final _tempatLahirCtrl = TextEditingController();
  DateTime? _tanggalLahir;
  final _alamatCtrl = TextEditingController();
  final _noHpCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  String? _selectedRantingId;
  List<Ranting> _rantings = [];
  bool _rantingsLoading = true;

  @override
  void initState() { super.initState(); _loadRantings(); }

  @override
  void dispose() {
    _anggotaIdCtrl.dispose(); _catatanCtrl.dispose(); _namaCtrl.dispose();
    _tempatLahirCtrl.dispose(); _alamatCtrl.dispose();
    _noHpCtrl.dispose(); _emailCtrl.dispose(); super.dispose();
  }

  Future<void> _loadRantings() async {
    try {
      final res = await http.get(Uri.parse(AppConstants.publicRanting));
      final body = jsonDecode(res.body);
      final raw = body is Map ? body['data'] : body;
      final list = (raw is List ? raw : []).whereType<Map<String, dynamic>>();
      if (mounted) setState(() { _rantings = list.map(Ranting.fromJson).toList(); _rantingsLoading = false; });
    } catch (e) { if (mounted) setState(() => _rantingsLoading = false); }
  }

  String _fmtDate(DateTime d) => '${d.year}-${d.month.toString().padLeft(2,'0')}-${d.day.toString().padLeft(2,'0')}';

  Future<void> _pickDate() async {
    final p = await showDatePicker(context: context, initialDate: _tanggalLahir ?? DateTime(2000), firstDate: DateTime(1940), lastDate: DateTime.now());
    if (p != null) setState(() => _tanggalLahir = p);
  }

  void _submit() {
    if (_tipe == 'keanggotaan' && _namaCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Nama wajib diisi'))); return;
    }
    context.read<ClaimBloc>().add(ClaimCreateRequested(
      tipe: _tipe,
      anggotaId: _anggotaIdCtrl.text.trim().isEmpty ? null : _anggotaIdCtrl.text.trim(),
      catatan: _catatanCtrl.text.trim().isEmpty ? null : _catatanCtrl.text.trim(),
      namaLengkap: _tipe == 'keanggotaan' ? _namaCtrl.text.trim() : null,
      jenisKelamin: _tipe == 'keanggotaan' ? _jenisKelamin : null,
      tempatLahir: _tempatLahirCtrl.text.trim().isEmpty ? null : _tempatLahirCtrl.text.trim(),
      tanggalLahir: _tanggalLahir != null ? _fmtDate(_tanggalLahir!) : null,
      alamat: _alamatCtrl.text.trim().isEmpty ? null : _alamatCtrl.text.trim(),
      noHp: _noHpCtrl.text.trim().isEmpty ? null : _noHpCtrl.text.trim(),
      email: _emailCtrl.text.trim().isEmpty ? null : _emailCtrl.text.trim(),
      rantingId: _tipe == 'keanggotaan' ? _selectedRantingId : null,
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Klaim Akun Anggota')),
      body: BlocListener<ClaimBloc, ClaimState>(
        listener: _onStateChanged,
        child: BlocBuilder<ClaimBloc, ClaimState>(
          builder: (ctx, state) {
            final busy = state is ClaimSubmitting;
            return ListView(padding: const EdgeInsets.all(20), children: [
              const Icon(Icons.verified_user, size: 56, color: AppTheme.primary),
              const SizedBox(height: 12),
              const Text('Klaim Akun Anggota', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700), textAlign: TextAlign.center),
              const SizedBox(height: 24),
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'keanggotaan', label: Text('Keanggotaan'), icon: Icon(Icons.badge_outlined)),
                  ButtonSegment(value: 'dokumen', label: Text('Dokumen'), icon: Icon(Icons.description_outlined)),
                ],
                selected: {_tipe},
                onSelectionChanged: (s) => setState(() => _tipe = s.first),
              ),
              const SizedBox(height: 20),
              if (_tipe == 'dokumen') ..._dokumenFields(),
              if (_tipe == 'keanggotaan') ..._keanggotaanFields(),
              const SizedBox(height: 28),
              FilledButton(onPressed: busy ? null : _submit,
                child: busy ? const AppLoadingSpinner.small(color: Colors.white) : const Text('Kirim Klaim')),
            ]);
          },
        ),
      ),
    );
  }

  List<Widget> _dokumenFields() => [
    TextFormField(controller: _anggotaIdCtrl, decoration: const InputDecoration(labelText: 'ID / No. Anggota', prefixIcon: Icon(Icons.badge_outlined))),
    const SizedBox(height: 14),
    TextFormField(controller: _catatanCtrl, maxLines: 2, decoration: const InputDecoration(labelText: 'Catatan', prefixIcon: Icon(Icons.notes_outlined), alignLabelWithHint: true)),
  ];

  List<Widget> _keanggotaanFields() => [
    TextFormField(controller: _namaCtrl, decoration: const InputDecoration(labelText: 'Nama Lengkap *', prefixIcon: Icon(Icons.person_outline))),
    const SizedBox(height: 14),
    DropdownButtonFormField<String>(initialValue: _jenisKelamin,
      decoration: const InputDecoration(labelText: 'Jenis Kelamin *', prefixIcon: Icon(Icons.wc_outlined)),
      items: const [DropdownMenuItem(value: 'L', child: Text('Laki-laki')), DropdownMenuItem(value: 'P', child: Text('Perempuan'))],
      onChanged: (v) { if (v != null) setState(() => _jenisKelamin = v); }),
    const SizedBox(height: 14),
    _buildRantingDropdown(),
    const SizedBox(height: 14),
    TextFormField(controller: _tempatLahirCtrl, decoration: const InputDecoration(labelText: 'Tempat Lahir', prefixIcon: Icon(Icons.location_city_outlined))),
    const SizedBox(height: 14),
    InkWell(onTap: _pickDate, child: InputDecorator(
      decoration: const InputDecoration(labelText: 'Tanggal Lahir', prefixIcon: Icon(Icons.calendar_today_outlined)),
      child: Text(_tanggalLahir != null ? _fmtDate(_tanggalLahir!) : 'Pilih',
          style: TextStyle(color: _tanggalLahir != null ? null : Colors.grey.shade500)))),
    const SizedBox(height: 14),
    TextFormField(controller: _alamatCtrl, maxLines: 2, decoration: const InputDecoration(labelText: 'Alamat', prefixIcon: Icon(Icons.home_outlined), alignLabelWithHint: true)),
    const SizedBox(height: 14),
    TextFormField(controller: _noHpCtrl, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Nomor HP', prefixIcon: Icon(Icons.phone_outlined))),
    const SizedBox(height: 14),
    TextFormField(controller: _emailCtrl, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.email_outlined))),
  ];

  Widget _buildRantingDropdown() {
    if (_rantingsLoading) return const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: AppLoadingSpinner.small());
    return DropdownButtonFormField<String>(initialValue: _selectedRantingId,
      decoration: const InputDecoration(labelText: 'Ranting Asal *', prefixIcon: Icon(Icons.location_on_outlined)),
      items: _rantings.map((r) => DropdownMenuItem(value: r.id, child: Text(r.nama))).toList(),
      onChanged: (v) => setState(() => _selectedRantingId = v),
      validator: (v) => (v == null || v.isEmpty) ? 'Pilih ranting' : null);
  }

  void _onStateChanged(BuildContext context, ClaimState state) {
    if (state is ClaimCreateSuccess) {
      showDialog<void>(context: context, barrierDismissible: false,
        builder: (ctx) => AlertDialog(title: const Text('Klaim Terkirim'),
          content: const Text('Klaim berhasil dikirim. Admin akan memproses dan mengirimkan kredensial login ke email.'),
          actions: [TextButton(onPressed: () { Navigator.pop(ctx); context.go('/login'); }, child: const Text('OK'))]));
    } else if (state is ClaimError) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(state.message)));
    }
  }
}

