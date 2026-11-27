import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/snack_bar_helper.dart';
import '../../logic/claim/claim_bloc.dart';
import '../widgets/app_loading_spinner.dart';
import '../widgets/org_structure_fields.dart';

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
  final _pekerjaanCtrl = TextEditingController();
  final _pelantikanCtrl = TextEditingController();
  final _tempatDadarCtrl = TextEditingController();
  final _tahunDadarCtrl = TextEditingController();
  final _alamatCtrl = TextEditingController();
  final _noHpCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  String? _selectedRantingId;
  String _modeBukti = 'unggah';
  final _ceritaCtrl = TextEditingController();
  List<String> _buktiPaths = const [];

  static final RegExp _emailRegex = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
  static final RegExp _noHpRegex = RegExp(r'^(\+?62|0)\d{8,13}$');
  static final RegExp _noHpStripRegex = RegExp(r'[\s-]');

  @override
  void dispose() {
    _anggotaIdCtrl.dispose();
    _catatanCtrl.dispose();
    _namaCtrl.dispose();
    _tempatLahirCtrl.dispose();
    _pekerjaanCtrl.dispose();
    _pelantikanCtrl.dispose();
    _tempatDadarCtrl.dispose();
    _tahunDadarCtrl.dispose();
    _alamatCtrl.dispose();
    _noHpCtrl.dispose();
    _emailCtrl.dispose();
    _ceritaCtrl.dispose();
    super.dispose();
  }

  String _fmtDateDisplay(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  /// ISO-8601 DateTime string for API — Prisma DateTime requires full
  /// ISO-8601 format (with time component), not date-only `yyyy-MM-dd`.
  String _fmtDateIso(DateTime d) => d.toUtc().toIso8601String();

  Future<void> _pickDate() async {
    final p = await showDatePicker(
        context: context,
        initialDate: _tanggalLahir ?? DateTime(2000),
        firstDate: DateTime(1940),
        lastDate: DateTime.now());
    if (p != null) setState(() => _tanggalLahir = p);
  }

  Future<void> _pickBukti() async {
    final pickedFiles = await FilePicker.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
    );
    if (!mounted) return;
    final picked = pickedFiles.map((f) => f.path).whereType<String>().toList();
    if (picked.isEmpty) return;
    if (picked.any((path) => File(path).lengthSync() > 5 * 1024 * 1024)) {
      showCenteredSnackBar(context, 'Setiap berkas maksimal 5MB');
      return;
    }
    final merged = <String>[..._buktiPaths];
    for (final path in picked) {
      if (!merged.contains(path)) merged.add(path);
    }
    if (merged.length > 3) {
      showCenteredSnackBar(context, 'Maksimal 3 berkas bukti');
      return;
    }
    setState(() => _buktiPaths = merged);
  }

  void _submit() {
    if (_tipe == 'keanggotaan') {
      final nama = _namaCtrl.text.trim();
      final tempatLahir = _tempatLahirCtrl.text.trim();
      final tempatDadar = _tempatDadarCtrl.text.trim();
      final tahunDadar = _tahunDadarCtrl.text.trim();
      final alamat = _alamatCtrl.text.trim();
      final noHp = _noHpCtrl.text.trim();
      final email = _emailCtrl.text.trim();
      final cerita = _ceritaCtrl.text.trim();
      String? error;
      if (nama.length < 3) {
        error = 'Nama lengkap minimal 3 karakter';
      } else if (_selectedRantingId == null || _selectedRantingId!.isEmpty) {
        error = 'Pilih ranting';
      } else if (tempatLahir.isEmpty) {
        error = 'Tempat lahir wajib diisi';
      } else if (_tanggalLahir == null) {
        error = 'Tanggal lahir wajib diisi';
      } else if (tempatDadar.isEmpty) {
        error = 'Tempat pendadaran wajib diisi';
      } else if (tahunDadar.isEmpty) {
        error = 'Tahun pendadaran wajib diisi';
      } else if (alamat.isEmpty) {
        error = 'Alamat wajib diisi';
      } else if (email.isEmpty) {
        error = 'Email wajib diisi';
      } else if (!_emailRegex.hasMatch(email)) {
        error = 'Format email tidak valid';
      } else if (noHp.isNotEmpty &&
          !_noHpRegex.hasMatch(noHp.replaceAll(_noHpStripRegex, ''))) {
        error = 'Format No. HP tidak valid (mulai 0 atau +62, 9-14 digit)';
      } else if (_modeBukti == 'unggah' && _buktiPaths.isEmpty) {
        error = 'Unggah minimal satu berkas bukti';
      } else if (_modeBukti == 'cerita' &&
          (cerita.length < 20 || cerita.length > 1000)) {
        error = 'Cerita histori harus antara 20 sampai 1000 karakter';
      }
      if (error != null) {
        showCenteredSnackBar(context, error);
        return;
      }
    }
    context.read<ClaimBloc>().add(ClaimCreateRequested(
          tipe: _tipe,
          anggotaId: _anggotaIdCtrl.text.trim().isEmpty
              ? null
              : _anggotaIdCtrl.text.trim(),
          catatan: _catatanCtrl.text.trim().isEmpty
              ? null
              : _catatanCtrl.text.trim(),
          namaLengkap: _tipe == 'keanggotaan' ? _namaCtrl.text.trim() : null,
          jenisKelamin: _tipe == 'keanggotaan' ? _jenisKelamin : null,
          tempatLahir: _tempatLahirCtrl.text.trim().isEmpty
              ? null
              : _tempatLahirCtrl.text.trim(),
          tanggalLahir:
              _tanggalLahir != null ? _fmtDateIso(_tanggalLahir!) : null,
          pekerjaan: _tipe == 'keanggotaan' &&
                  _pekerjaanCtrl.text.trim().isNotEmpty
              ? _pekerjaanCtrl.text.trim()
              : null,
          pelantikan: _tipe == 'keanggotaan' &&
                  _pelantikanCtrl.text.trim().isNotEmpty
              ? _pelantikanCtrl.text.trim()
              : null,
          tempatDadar: _tempatDadarCtrl.text.trim().isEmpty
              ? null
              : _tempatDadarCtrl.text.trim(),
          tahunDadar: _tahunDadarCtrl.text.trim().isEmpty
              ? null
              : _tahunDadarCtrl.text.trim(),
          alamat:
              _alamatCtrl.text.trim().isEmpty ? null : _alamatCtrl.text.trim(),
          noHp: _noHpCtrl.text.trim().isEmpty ? null : _noHpCtrl.text.trim(),
          email: _emailCtrl.text.trim().isEmpty ? null : _emailCtrl.text.trim(),
          rantingId: _tipe == 'keanggotaan' ? _selectedRantingId : null,
          modeBukti: _modeBukti,
          ceritaHistori:
              _modeBukti == 'cerita' ? _ceritaCtrl.text.trim() : null,
          buktiFilePaths: _modeBukti == 'unggah'
              ? List<String>.from(_buktiPaths)
              : const [],
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
            return ListView(
                padding: const EdgeInsets.all(AppTheme.space20),
                children: [
                  Icon(Icons.verified_user,
                      size: 56, color: Theme.of(ctx).colorScheme.primary),
                  const SizedBox(height: AppTheme.space12),
                  const Text('Klaim Akun Anggota',
                      style:
                          TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
                      textAlign: TextAlign.center),
                  const SizedBox(height: AppTheme.space24),
                  SegmentedButton<String>(
                    segments: const [
                      ButtonSegment(
                          value: 'keanggotaan',
                          label: Text('Keanggotaan'),
                          icon: Icon(Icons.badge_outlined)),
                      ButtonSegment(
                          value: 'dokumen',
                          label: Text('Dokumen'),
                          icon: Icon(Icons.description_outlined)),
                    ],
                    selected: {_tipe},
                    onSelectionChanged: (s) => setState(() => _tipe = s.first),
                  ),
                  const SizedBox(height: AppTheme.space20),
                  if (_tipe == 'dokumen') ..._dokumenFields(),
                  if (_tipe == 'keanggotaan') ..._keanggotaanFields(),
                  const SizedBox(height: 28),
                  FilledButton(
                      onPressed: busy ? null : _submit,
                      child: busy
                          ? const AppLoadingSpinner.small(
                              color: AppTheme.onPrimary)
                          : const Text('Kirim Klaim')),
                ]);
          },
        ),
      ),
    );
  }

  List<Widget> _dokumenFields() => [
        TextFormField(
            controller: _anggotaIdCtrl,
            decoration: const InputDecoration(
                labelText: 'ID / No. Anggota',
                prefixIcon: Icon(Icons.badge_outlined))),
        const SizedBox(height: 14),
        TextFormField(
            controller: _catatanCtrl,
            maxLines: 2,
            decoration: const InputDecoration(
                labelText: 'Catatan',
                prefixIcon: Icon(Icons.notes_outlined),
                alignLabelWithHint: true)),
      ];

  List<Widget> _keanggotaanFields() => [
        TextFormField(
            controller: _namaCtrl,
            decoration: const InputDecoration(
                labelText: 'Nama Lengkap *',
                hintText: 'Masukkan nama lengkap',
                prefixIcon: Icon(Icons.person_outline))),
        const SizedBox(height: 14),
        DropdownButtonFormField<String>(
            initialValue: _jenisKelamin,
            decoration: const InputDecoration(
                labelText: 'Jenis Kelamin *',
                prefixIcon: Icon(Icons.wc_outlined)),
            items: const [
              DropdownMenuItem(value: 'L', child: Text('Laki-laki')),
              DropdownMenuItem(value: 'P', child: Text('Perempuan'))
            ],
            onChanged: (v) {
              if (v != null) setState(() => _jenisKelamin = v);
            }),
        const SizedBox(height: 14),
        TextFormField(
            controller: _tempatLahirCtrl,
            decoration: const InputDecoration(
                labelText: 'Tempat Lahir *',
                hintText: 'Kota lahir',
                prefixIcon: Icon(Icons.location_city_outlined))),
        const SizedBox(height: 14),
        InkWell(
            onTap: _pickDate,
            child: InputDecorator(
                decoration: const InputDecoration(
                    labelText: 'Tanggal Lahir *',
                    prefixIcon: Icon(Icons.calendar_today_outlined)),
                child: Text(
                    _tanggalLahir != null
                        ? _fmtDateDisplay(_tanggalLahir!)
                        : 'Pilih',
                    style: TextStyle(
                        color: _tanggalLahir != null
                            ? null
                            : Theme.of(context)
                                .colorScheme
                                .onSurfaceVariant)))),
        const SizedBox(height: 14),
        TextFormField(
            controller: _tempatDadarCtrl,
            decoration: const InputDecoration(
                labelText: 'Tempat Pendadaran (Dadar) *',
                hintText: 'Kota pendadaran',
                prefixIcon: Icon(Icons.location_city_outlined))),
        const SizedBox(height: 14),
        TextFormField(
            controller: _tahunDadarCtrl,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
                labelText: 'Tahun Pendadaran (Dadar) *',
                hintText: '2024',
                prefixIcon: Icon(Icons.calendar_today_outlined))),
        const SizedBox(height: 14),
        TextFormField(
            controller: _pekerjaanCtrl,
            maxLength: 120,
            decoration: const InputDecoration(
                labelText: 'Pekerjaan',
                hintText: 'contoh: Guru',
                prefixIcon: Icon(Icons.work_outline))),
        const SizedBox(height: 14),
        TextFormField(
            controller: _pelantikanCtrl,
            maxLength: 160,
            decoration: const InputDecoration(
                labelText: 'Pelantikan',
                hintText: 'contoh: 12 JULI 2020',
                prefixIcon: Icon(Icons.event_outlined))),
        const SizedBox(height: 14),
        TextFormField(
            controller: _noHpCtrl,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
                labelText: 'No. HP',
                hintText: '08123456789',
                prefixIcon: Icon(Icons.phone_outlined))),
        const SizedBox(height: 14),
        TextFormField(
            controller: _emailCtrl,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(
                labelText: 'Email *',
                hintText: 'email@contoh.com',
                prefixIcon: Icon(Icons.email_outlined))),
        const SizedBox(height: 14),
        TextFormField(
            controller: _alamatCtrl,
            maxLines: 2,
            decoration: const InputDecoration(
                labelText: 'Alamat *',
                hintText: 'Alamat lengkap',
                prefixIcon: Icon(Icons.home_outlined),
                alignLabelWithHint: true)),
        const SizedBox(height: 14),
        OrgStructureFields(
          onRantingChanged: (v) => setState(() => _selectedRantingId = v),
        ),
        const SizedBox(height: 14),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Cara Pembuktian Keanggotaan *',
                style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: AppTheme.space12),
            RadioGroup<String>(
              groupValue: _modeBukti,
              onChanged: (v) {
                if (v != null) setState(() => _modeBukti = v);
              },
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _proofCard(
                    value: 'unggah',
                    title: 'Unggah bukti',
                    helper: 'Sertifikat, kartu anggota, KTP, atau surat keterangan',
                  ),
                  const SizedBox(width: AppTheme.space12),
                  _proofCard(
                    value: 'cerita',
                    title: 'Ceritakan histori',
                    helper: 'Tulis riwayat keanggotaan Anda (20–1000 karakter)',
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppTheme.space12),
            if (_modeBukti == 'unggah') ...[
              const Text(
                  'Bukti Keanggotaan & Dokumen Pendukung (Sertifikat, Kartu Anggota, KTP, Surat Keterangan, dll)'),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: _pickBukti,
                icon: const Icon(Icons.attach_file),
                label: const Text('Pilih Berkas Bukti'),
              ),
              ..._buktiPaths.map(
                (path) => Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(path.split(Platform.pathSeparator).last),
                ),
              ),
            ],
            if (_modeBukti == 'cerita')
              TextFormField(
                controller: _ceritaCtrl,
                maxLines: 5,
                maxLength: 1000,
                decoration: const InputDecoration(
                  labelText: 'Cerita Histori Keanggotaan *',
                  hintText:
                      'Ceritakan secara singkat mulai awal berlatih hingga di dadar dan informasi minimal 2 orang yang mendadarnya',
                  helperText: 'Minimal 20 karakter, maksimal 1000 karakter',
                  prefixIcon: Icon(Icons.history),
                  alignLabelWithHint: true,
                ),
              ),
          ],
        ),
        const SizedBox(height: 14),
        TextFormField(
            controller: _catatanCtrl,
            maxLines: 2,
            decoration: const InputDecoration(
                labelText: 'Catatan',
                hintText: 'Catatan tambahan (opsional)',
                prefixIcon: Icon(Icons.notes_outlined),
                alignLabelWithHint: true)),
      ];

  Widget _proofCard({
    required String value,
    required String title,
    required String helper,
  }) {
    final selected = _modeBukti == value;
    final colors = Theme.of(context).colorScheme;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _modeBukti = value),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selected ? colors.primary : colors.outlineVariant,
              width: selected ? 2 : 1,
            ),
            color: selected ? colors.primaryContainer : colors.surface,
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Radio<String>(value: value),
              const SizedBox(width: 2),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        style: const TextStyle(
                            fontSize: 13, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 4),
                    Text(helper,
                        style: TextStyle(
                            fontSize: 11, color: colors.onSurfaceVariant)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _onStateChanged(BuildContext context, ClaimState state) {
    if (state is ClaimCreateSuccess) {
      showDialog<void>(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
                  title: const Text('Klaim Terkirim'),
                  content: const Text(
                      'Klaim berhasil dikirim. Admin akan memproses dan mengirimkan kredensial login ke email.'),
                  actions: [
                    TextButton(
                        onPressed: () {
                          Navigator.pop(ctx);
                          context.go('/login');
                        },
                        child: const Text('OK'))
                  ]));
    } else if (state is ClaimError) {
      showCenteredSnackBar(context, state.message);
    }
  }
}
