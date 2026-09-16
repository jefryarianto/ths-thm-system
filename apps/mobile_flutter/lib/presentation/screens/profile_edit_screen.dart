import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'profile_camera_capture_screen.dart';

import '../../core/theme/app_theme.dart';
import '../../data/models/member.dart';
import '../../logic/auth/auth_bloc.dart';
import '../../logic/member/member_bloc.dart';
import '../widgets/app_loading_spinner.dart';

/// Layar edit profil anggota -- paritas dengan
/// `apps/mobile/src/screens/profile/edit.tsx` (aplikasi Expo).
///
/// Email sengaja read-only: perubahan email harus melalui admin (info box
/// ditampilkan di bawah field). Endpoint: `PATCH /auth/me` (namaLengkap,
/// noHp, alamat, tempatLahir, tanggalLahir). Upload foto: `POST /auth/me/photo`.
/// Ubah password tetap di layar Pengaturan.
class ProfileEditScreen extends StatefulWidget {
  const ProfileEditScreen({super.key});

  @override
  State<ProfileEditScreen> createState() => _ProfileEditScreenState();
}

class _ProfileEditScreenState extends State<ProfileEditScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nama = TextEditingController();
  final _email = TextEditingController();
  final _noHp = TextEditingController();
  final _alamat = TextEditingController();
  final _tempatLahir = TextEditingController();
  bool _prefilled = false;
  DateTime? _tanggalLahir;

  // -- Photo picker --
  final _imagePicker = ImagePicker();
  String? _localPhotoUri;
  bool _photoUploading = false;

  static const List<String> _bulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  @override
  void initState() {
    super.initState();
    final state = context.read<MemberBloc>().state;
    if (state is MemberLoaded) {
      _fillControllers(state.member);
    } else {
      context.read<MemberBloc>().add(const MemberLoadRequested());
    }
  }

  @override
  void dispose() {
    _nama.dispose();
    _email.dispose();
    _noHp.dispose();
    _alamat.dispose();
    _tempatLahir.dispose();
    super.dispose();
  }

  void _fillControllers(Member member) {
    if (_prefilled) return;
    setState(() {
      _nama.text = member.namaLengkap;
      _email.text = member.email;
      _noHp.text = member.noHp;
      _alamat.text = member.alamat;
      _tempatLahir.text = member.tempatLahir;
      _tanggalLahir = _parseIsoDate(member.tanggalLahir);
      _prefilled = true;
    });
  }

  /// Parse ISO 8601 date string from API (handles "1998-05-12T00:00:00.000Z",
  /// "1998-05-12", and strings with whitespace).
  DateTime? _parseIsoDate(String iso) {
    final trimmed = iso.trim();
    if (trimmed.isEmpty) return null;
    return DateTime.tryParse(trimmed);
  }

  String _formatDate(DateTime d) {
    final m = d.month.toString().padLeft(2, '0');
    final day = d.day.toString().padLeft(2, '0');
    return '${d.year}-$m-$day';
  }

  String _displayDate(DateTime d) =>
      '${d.day} ${_bulan[d.month - 1]} ${d.year}';

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _tanggalLahir ?? DateTime(2000, 1, 1),
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
      helpText: 'Pilih Tanggal Lahir',
    );
    if (picked != null && mounted) {
      setState(() =>
          _tanggalLahir = DateTime(picked.year, picked.month, picked.day));
    }
  }

  // -- Foto Profil --

  Future<void> _pickAndUploadPhoto() async {
    // Tawarkan dua opsi: ambil langsung dari kamera (dengan frame panduan)
    // atau pilih dari galeri penyimpanan internal.
    final source = await showModalBottomSheet<String>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            const Text('Ubah Foto Profil',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined, color: AppTheme.info),
              title: const Text('Ambil Foto (Kamera)',
                  style: TextStyle(fontWeight: FontWeight.w600)),
              subtitle: const Text('Dengan bingkai panduan posisi wajah'),
              onTap: () => Navigator.of(context).pop('camera'),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined, color: AppTheme.info),
              title: const Text('Pilih dari Galeri',
                  style: TextStyle(fontWeight: FontWeight.w600)),
              subtitle: const Text('Penyimpanan internal perangkat'),
              onTap: () => Navigator.of(context).pop('gallery'),
            ),
          ],
        ),
      ),
    );

    if (source == null || !mounted) return;

    String? path;
    if (source == 'camera') {
      path = await Navigator.of(context).push<String>(
        MaterialPageRoute(
            builder: (_) => const ProfileCameraCaptureScreen()),
      );
    } else {
      try {
        final result = await _imagePicker.pickImage(
          source: ImageSource.gallery,
          maxWidth: 1024,
          maxHeight: 1024,
          imageQuality: 85,
        );
        path = result?.path;
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Gagal memilih foto: $e')),
          );
        }
        return;
      }
    }

    if (path == null || !mounted) return;
    setState(() {
      _localPhotoUri = path;
      _photoUploading = true;
    });
    context.read<MemberBloc>().add(
          MemberPhotoUploadRequested(filePath: path),
        );
  }

  // -- Form Submit --

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    context.read<MemberBloc>().add(MemberUpdateRequested(
          namaLengkap: _nama.text.trim(),
          noHp: _noHp.text.trim(),
          alamat: _alamat.text.trim(),
          tempatLahir: _tempatLahir.text.trim(),
          tanggalLahir:
              _tanggalLahir != null ? _formatDate(_tanggalLahir!) : '',
        ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Edit Profil')),
      body: BlocListener<MemberBloc, MemberState>(
        listener: (context, state) {
          if (state is MemberLoaded && !_prefilled) {
            _fillControllers(state.member);
          }
          if (state is MemberUpdateSuccess) {
            context.read<AuthBloc>().add(
                  AuthProfileSynced(namaLengkap: state.member.namaLengkap),
                );
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message)),
            );
            context.pop();
          } else if (state is MemberPhotoUploadSuccess) {
            setState(() => _photoUploading = false);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message)),
            );
          } else if (state is MemberError) {
            setState(() => _photoUploading = false);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message)),
            );
          }
        },
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _buildPhotoSection(),
              const SizedBox(height: 24),
              _field(
                label: 'Nama Lengkap',
                controller: _nama,
                validator: (v) => (v == null || v.trim().isEmpty)
                    ? 'Nama lengkap wajib diisi'
                    : null,
                textCapitalization: TextCapitalization.words,
              ),
              const SizedBox(height: 16),
              _field(label: 'No. HP', controller: _noHp, keyboardType: TextInputType.phone),
              const SizedBox(height: 16),
              _field(label: 'Alamat', controller: _alamat, maxLines: 3),
              const SizedBox(height: 16),
              _field(label: 'Tempat Lahir', controller: _tempatLahir, textCapitalization: TextCapitalization.words),
              const SizedBox(height: 16),
              GestureDetector(
                onTap: _pickDate,
                child: InputDecorator(
                  decoration: const InputDecoration(
                    labelText: 'Tanggal Lahir',
                    border: OutlineInputBorder(),
                    suffixIcon: Icon(Icons.calendar_today_outlined),
                  ),
                  child: Text(
                    _tanggalLahir != null ? _displayDate(_tanggalLahir!) : '-',
                    style: TextStyle(fontSize: 15, color: _tanggalLahir != null ? Colors.black87 : Colors.grey.shade600),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              _field(label: 'Email', controller: _email, enabled: false, keyboardType: TextInputType.emailAddress),
              Container(
                margin: const EdgeInsets.only(top: 10),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppTheme.primary.withValues(alpha: 0.25)),
                ),
                child: const Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.info_outline, size: 18, color: AppTheme.primary),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text('Email hanya dapat dibaca. Hubungi admin untuk perubahan email.',
                        style: TextStyle(fontSize: 12, color: AppTheme.primaryDark, height: 1.4)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              BlocBuilder<MemberBloc, MemberState>(
                builder: (context, state) {
                  final saving = state is MemberUpdating;
                  return FilledButton(
                    onPressed: saving ? null : _submit,
                    style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                    child: saving
                        ? const AppLoadingSpinner.small(color: AppTheme.onPrimary)
                        : const Text('Simpan Perubahan'),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPhotoSection() {
    return BlocBuilder<MemberBloc, MemberState>(
      builder: (context, state) {
        final member = state is MemberLoaded ? state.member : null;
        final fotoUrl = member?.fotoUrl ?? '';
        ImageProvider? backgroundImage;
        if (_localPhotoUri != null && _localPhotoUri!.isNotEmpty) {
          backgroundImage = FileImage(File(_localPhotoUri!));
        } else if (fotoUrl.isNotEmpty) {
          backgroundImage = NetworkImage(fotoUrl);
        }
        return Center(
          child: Column(children: [
            Stack(alignment: Alignment.bottomRight, children: [
              CircleAvatar(
                radius: 56,
                backgroundColor: AppTheme.primary.withValues(alpha: 0.15),
                backgroundImage: backgroundImage,
                child: backgroundImage == null ? const Icon(Icons.person, size: 64, color: AppTheme.primary) : null,
              ),
              if (_photoUploading)
                const Positioned.fill(child: CircleAvatar(radius: 56, backgroundColor: Colors.black45, child: AppLoadingSpinner.small(color: Colors.white))),
              Positioned(bottom: 0, right: 0, child: GestureDetector(
                onTap: _photoUploading ? null : _pickAndUploadPhoto,
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: const BoxDecoration(color: AppTheme.primary, shape: BoxShape.circle),
                  child: const Icon(Icons.camera_alt, size: 18, color: Colors.white),
                ),
              )),
            ]),
            const SizedBox(height: 8),
            GestureDetector(
              onTap: _photoUploading ? null : _pickAndUploadPhoto,
              child: Text(_photoUploading ? 'Mengunggah...' : 'Ganti Foto',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: _photoUploading ? Colors.grey : AppTheme.primary)),
            ),
          ]),
        );
      },
    );
  }

  Widget _field({
    required String label,
    required TextEditingController controller,
    String? Function(String?)? validator,
    TextInputType? keyboardType,
    int maxLines = 1,
    bool enabled = true,
    TextCapitalization textCapitalization = TextCapitalization.none,
  }) {
    return TextFormField(
      controller: controller,
      validator: validator,
      keyboardType: keyboardType,
      maxLines: maxLines,
      enabled: enabled,
      textCapitalization: textCapitalization,
      decoration: InputDecoration(
        labelText: label,
        border: const OutlineInputBorder(),
        filled: !enabled,
        fillColor: enabled ? null : Colors.grey.shade100,
      ),
    );
  }
}
