import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/snack_bar_helper.dart';
import '../../logic/registration/registration_bloc.dart';
import '../widgets/app_loading_spinner.dart';
import '../widgets/org_structure_fields.dart';

/// Form publik pendaftaran calon anggota baru.
class RegistrationFormScreen extends StatefulWidget {
  const RegistrationFormScreen({super.key});

  @override
  State<RegistrationFormScreen> createState() => _RegistrationFormScreenState();
}

class _RegistrationFormScreenState extends State<RegistrationFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _namaCtrl = TextEditingController();
  String _jenisKelamin = 'L';
  final _tempatLahirCtrl = TextEditingController();
  DateTime? _tanggalLahir;
  final _alamatCtrl = TextEditingController();
  final _noHpCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _sumberInfoCtrl = TextEditingController();
  String? _selectedRantingId;

  @override
  void dispose() {
    _namaCtrl.dispose();
    _tempatLahirCtrl.dispose();
    _alamatCtrl.dispose();
    _noHpCtrl.dispose();
    _emailCtrl.dispose();
    _sumberInfoCtrl.dispose();
    super.dispose();
  }

  String _fmtDateDisplay(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  /// ISO-8601 DateTime string for API — Prisma DateTime requires full
  /// ISO-8601 format (with time component), not date-only `yyyy-MM-dd`.
  String _fmtDateIso(DateTime d) => d.toUtc().toIso8601String();

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _tanggalLahir ?? DateTime(2000),
      firstDate: DateTime(1940),
      lastDate: DateTime.now(),
    );
    if (picked != null) setState(() => _tanggalLahir = picked);
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedRantingId == null || _selectedRantingId!.isEmpty) {
      showCenteredSnackBar(context, 'Silakan pilih ranting asal');
      return;
    }
    context.read<RegistrationBloc>().add(RegistrationCreateRequested(
          namaLengkap: _namaCtrl.text.trim(),
          jenisKelamin: _jenisKelamin,
          rantingId: _selectedRantingId!,
          tempatLahir: _tempatLahirCtrl.text.trim().isEmpty
              ? null
              : _tempatLahirCtrl.text.trim(),
          tanggalLahir:
              _tanggalLahir != null ? _fmtDateIso(_tanggalLahir!) : null,
          alamat:
              _alamatCtrl.text.trim().isEmpty ? null : _alamatCtrl.text.trim(),
          noHp: _noHpCtrl.text.trim().isEmpty ? null : _noHpCtrl.text.trim(),
          email: _emailCtrl.text.trim().isEmpty ? null : _emailCtrl.text.trim(),
          sumberInfo: _sumberInfoCtrl.text.trim().isEmpty
              ? null
              : _sumberInfoCtrl.text.trim(),
        ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Daftar Calon Anggota')),
      body: BlocListener<RegistrationBloc, RegistrationState>(
        listener: _onStateChanged,
        child: BlocBuilder<RegistrationBloc, RegistrationState>(
          builder: (context, state) {
            final busy = state is RegistrationSubmitting;
            return Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: _formChildren(context, busy),
              ),
            );
          },
        ),
      ),
    );
  }

  List<Widget> _formChildren(BuildContext context, bool busy) {
    return [
      const Icon(Icons.app_registration, size: 56, color: AppTheme.primary),
      const SizedBox(height: 12),
      const Text('Formulir Pendaftaran Calon Anggota',
          style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
          textAlign: TextAlign.center),
      const SizedBox(height: 24),
      TextFormField(
        controller: _namaCtrl,
        decoration: const InputDecoration(
            labelText: 'Nama Lengkap *',
            prefixIcon: Icon(Icons.person_outline)),
        validator: (v) =>
            (v == null || v.trim().isEmpty) ? 'Wajib diisi' : null,
      ),
      const SizedBox(height: 14),
      DropdownButtonFormField<String>(
        initialValue: _jenisKelamin,
        decoration: const InputDecoration(
            labelText: 'Jenis Kelamin *', prefixIcon: Icon(Icons.wc_outlined)),
        items: const [
          DropdownMenuItem(value: 'L', child: Text('Laki-laki')),
          DropdownMenuItem(value: 'P', child: Text('Perempuan')),
        ],
        onChanged: (v) {
          if (v != null) setState(() => _jenisKelamin = v);
        },
      ),
      const SizedBox(height: 14),
      OrgStructureFields(
        onRantingChanged: (v) => setState(() => _selectedRantingId = v),
      ),
      const SizedBox(height: 14),
      TextFormField(
          controller: _tempatLahirCtrl,
          decoration: const InputDecoration(
              labelText: 'Tempat Lahir',
              prefixIcon: Icon(Icons.location_city_outlined))),
      const SizedBox(height: 14),
      InkWell(
        onTap: _pickDate,
        child: InputDecorator(
          decoration: const InputDecoration(
              labelText: 'Tanggal Lahir',
              prefixIcon: Icon(Icons.calendar_today_outlined)),
          child: Text(
              _tanggalLahir != null ? _fmtDateDisplay(_tanggalLahir!) : 'Pilih',
              style: TextStyle(
                  color: _tanggalLahir != null ? null : Colors.grey.shade500)),
        ),
      ),
      const SizedBox(height: 14),
      TextFormField(
          controller: _alamatCtrl,
          maxLines: 2,
          decoration: const InputDecoration(
              labelText: 'Alamat',
              prefixIcon: Icon(Icons.home_outlined),
              alignLabelWithHint: true)),
      const SizedBox(height: 14),
      TextFormField(
          controller: _noHpCtrl,
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(
              labelText: 'Nomor HP',
              prefixIcon: Icon(Icons.phone_outlined),
              hintText: '+62 8xx xxxx xxxx')),
      const SizedBox(height: 14),
      TextFormField(
          controller: _emailCtrl,
          keyboardType: TextInputType.emailAddress,
          decoration: const InputDecoration(
              labelText: 'Email', prefixIcon: Icon(Icons.email_outlined))),
      const SizedBox(height: 14),
      TextFormField(
          controller: _sumberInfoCtrl,
          decoration: const InputDecoration(
              labelText: 'Sumber Informasi',
              prefixIcon: Icon(Icons.info_outline),
              hintText: 'contoh: Media sosial, teman')),
      const SizedBox(height: 28),
      FilledButton(
        onPressed: busy ? null : _submit,
        child: busy
            ? const AppLoadingSpinner.small(color: AppTheme.onPrimary)
            : const Text('Kirim Pendaftaran'),
      ),
    ];
  }

  void _onStateChanged(BuildContext context, RegistrationState state) {
    if (state is RegistrationCreateSuccess) {
      showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          title: const Text('Pendaftaran Terkirim'),
          content: const Text(
            'Data pendaftaran berhasil dikirim. '
            'Tim kami akan memverifikasi. '
            'Setelah disetujui, Anda terdaftar sebagai calon anggota.',
          ),
          actions: [
            TextButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  context.go('/login');
                },
                child: const Text('OK')),
          ],
        ),
      );
    } else if (state is RegistrationError) {
      showCenteredSnackBar(context, state.message);
    }
  }
}
