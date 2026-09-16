import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../widgets/app_loading_spinner.dart';
import '../widgets/secure_kta_container.dart';

/// Layar verifikasi KTA — menampilkan hasil verifikasi dokumen sebagai kartu
/// di dalam aplikasi alih-alih membuka browser eksternal.
///
/// Dipanggil dari tombol "Verifikasi Kartu" pada [KtaDigitalScreen] atau dari
/// deep link `/kta/verify/:token`.
class VerificationResultScreen extends StatefulWidget {
  /// Token verifikasi dari URL QR (`.../verify/<token>`).
  final String token;

  /// Fetcher opsional untuk testing — `null` menggunakan `ApiClient` asli.
  final Future<Response> Function(String token)? fetch;

  const VerificationResultScreen({
    super.key,
    required this.token,
    this.fetch,
  });

  @override
  State<VerificationResultScreen> createState() =>
      _VerificationResultScreenState();
}

class _VerificationResultScreenState extends State<VerificationResultScreen> {
  bool _loading = true;
  String? _error;

  // Document fields
  bool _valid = false;
  String _tipe = '';
  String _nomorDokumen = '';
  String _status = '';
  String _createdAt = '';
  String _nomorAnggota = '';
  String _namaAnggota = '';
  bool _firstScanned = false;
  int _scanCount = 0;
  String? _lastScannedAt;
  int _scanLimit = 25;
  int _scanLeft = 0;

  // Member fields
  String _namaLengkap = '';
  String _jenisKelamin = '';
  String _tempatLahir = '';
  String _tanggalLahir = '';
  String _statusKeanggotaan = '';
  String _ranting = '';
  String _wilayah = '';
  String _distrik = '';

  @override
  void initState() {
    super.initState();
    _verify();
  }

  Future<void> _verify() async {
    if (!mounted) return;
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final res = await (widget.fetch != null
          ? widget.fetch!(widget.token)
          : ApiClient()
              .dio
              .get('/documents/verify/${Uri.encodeComponent(widget.token)}'));
      final doc = res.data['data'];
      if (!mounted) return;

      if (doc == null) {
        setState(() {
          _loading = false;
          _error = 'Dokumen tidak ditemukan';
        });
        return;
      }

      final m = doc['member'] is Map<String, dynamic>
          ? doc['member'] as Map<String, dynamic>
          : null;

      setState(() {
        _loading = false;
        _valid = doc['valid'] == true;
        _tipe = doc['tipe']?.toString() ?? '';
        _nomorDokumen = doc['nomorDokumen']?.toString() ?? '';
        _status = doc['status']?.toString() ?? '';
        _createdAt = doc['createdAt']?.toString() ?? '';
        _nomorAnggota = doc['nomorAnggota']?.toString() ?? '';
        _namaAnggota = doc['namaAnggota']?.toString() ?? '';
        _firstScanned = doc['firstScanned'] == true;
        _scanCount = doc['scanCount'] is int
            ? doc['scanCount']
            : int.tryParse(doc['scanCount']?.toString() ?? '') ?? 0;
        _lastScannedAt = doc['lastScannedAt']?.toString();
        _scanLimit = doc['scanLimit'] is int
            ? doc['scanLimit']
            : int.tryParse(doc['scanLimit']?.toString() ?? '') ?? 25;
        _scanLeft = doc['scanLeft'] is int
            ? doc['scanLeft']
            : int.tryParse(doc['scanLeft']?.toString() ?? '') ?? 0;
        _namaLengkap = m?['namaLengkap']?.toString() ?? _namaAnggota;
        _jenisKelamin = m?['jenisKelamin']?.toString() ?? '';
        _tempatLahir = m?['tempatLahir']?.toString() ?? '';
        _tanggalLahir = m?['tanggalLahir']?.toString() ?? '';
        _statusKeanggotaan = m?['statusKeanggotaan']?.toString() ?? '';
        _ranting = m?['ranting']?.toString() ?? '';
        _wilayah = m?['wilayah']?.toString() ?? '';
        _distrik = m?['distrik']?.toString() ?? '';
      });
    } on DioException catch (e) {
      if (!mounted) return;
      final status = e.response?.statusCode;
      final msg = e.response?.data?['message'];
      final detail = msg is String
          ? msg
          : msg is List && msg.isNotEmpty
              ? msg.first.toString()
              : 'Token tidak dikenal atau dokumen tidak berlaku';
      setState(() {
        _loading = false;
        _error = status == 404 ? detail : 'Verifikasi gagal: $detail';
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Terjadi kesalahan: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Verifikasi KTA')),
      body: SecureKtaContainer(
        showLiveClock: false,
        childKtaExisting: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(40),
          child: AppLoadingSpinner(),
        ),
      );
    }
    if (_error != null) return _buildErrorCard();
    return _valid ? _buildValidCard() : _buildInvalidCard();
  }

  // ── Valid Card ──────────────────────────────────────────────────────

  Widget _buildValidCard() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        _statusHeader(
          icon: Icons.verified,
          title: _tipe == 'kartu_anggota'
              ? 'Kartu Anggota Valid'
              : 'Dokumen Valid',
          badge: '✓ TERVERIFIKASI',
          color: AppTheme.success,
        ),
        const SizedBox(height: 16),
        _sectionTitle(Icons.description_outlined, 'Informasi Dokumen'),
        const SizedBox(height: 8),
        _infoCard(children: [
          _infoRow('Seri Dokumen', _nomorDokumen),
          _infoRow('Tipe', _documentLabel(_tipe)),
          _infoRow('Status', _status),
          _infoRow('Tanggal Diterbitkan', Formatters.dateLong(_createdAt)),
        ]),
        const SizedBox(height: 16),
        if (_tipe == 'kartu_anggota' && _namaLengkap.isNotEmpty) ...[
          _sectionTitle(Icons.person_outline, 'Informasi Anggota'),
          const SizedBox(height: 8),
          _infoCard(children: [
            _infoRow('Nomor Anggota', _nomorAnggota),
            _infoRow('Nama Lengkap', _namaLengkap),
            _infoRow('Jenis Kelamin', _jenisKelamin),
            _infoRow(
              'Tempat, Tanggal Lahir',
              [_tempatLahir, Formatters.dateLong(_tanggalLahir)]
                  .where((e) => e.isNotEmpty && e != '-')
                  .join(', '),
            ),
            if (_statusKeanggotaan.isNotEmpty)
              _infoRow('Status Keanggotaan', _statusLabel()),
            if (_ranting.isNotEmpty ||
                _wilayah.isNotEmpty ||
                _distrik.isNotEmpty)
              _infoRow(
                'Lokasi',
                [_ranting, _wilayah, _distrik]
                    .where((e) => e.isNotEmpty)
                    .join(' · '),
              ),
          ]),
          const SizedBox(height: 16),
        ],
        _sectionTitle(Icons.history, 'Riwayat Pemindaian'),
        const SizedBox(height: 8),
        _infoCard(children: [
          _infoRow('Jumlah Pemindaian', '$_scanCount kali'),
          _infoRow('Sisa Pemindaian', '$_scanLeft dari $_scanLimit'),
          if (_lastScannedAt != null)
            _infoRow('Terakhir Dipindai', Formatters.relative(_lastScannedAt!)),
          if (_firstScanned)
            const Text(
              'Pemindaian pertama — kartu baru saja diverifikasi.',
              style: TextStyle(
                color: AppTheme.primary,
                fontWeight: FontWeight.w600,
                fontSize: 13,
              ),
            ),
        ]),
        if (_scanLeft > 0 && _scanLeft <= 5) ...[
          const SizedBox(height: 12),
          _warningBanner(
            'Sisa pemindaian tinggal $_scanLeft. Jika habis, kartu '
            'akan otomatis dinonaktifkan untuk mencegah pemalsuan.',
          ),
        ],
        const SizedBox(height: 24),
      ],
    );
  }

  // ── Invalid Card ────────────────────────────────────────────────────

  Widget _buildInvalidCard() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        _statusHeader(
          icon: Icons.shield,
          title: 'Dokumen Tidak Valid',
          badge: '✗ TIDAK VALID',
          color: AppTheme.danger,
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.danger.withValues(alpha: 0.06),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppTheme.danger.withValues(alpha: 0.2)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.info_outline, color: AppTheme.danger, size: 18),
                  SizedBox(width: 8),
                  Text(
                    'Peringatan',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: AppTheme.danger,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Kartu atau dokumen dengan token ini tidak tercatat, '
                'sudah dicabut, atau tidak berlaku.\n\n'
                'Hati-hati terhadap kemungkinan pemalsuan. '
                'Jika Anda yakin ini adalah kesalahan, silakan hubungi pengurus.',
                style: TextStyle(
                  fontSize: 13,
                  height: 1.5,
                  color: Theme.of(context).colorScheme.onSurface,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        FilledButton.icon(
          onPressed: _verify,
          icon: const Icon(Icons.refresh),
          label: const Text('Verifikasi Ulang'),
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  // ── Error Card ──────────────────────────────────────────────────────

  Widget _buildErrorCard() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const SizedBox(height: 40),
        const Icon(Icons.error_outline, color: AppTheme.danger, size: 56),
        const SizedBox(height: 16),
        Text(
          _error!,
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 15, color: AppTheme.textSlate),
        ),
        const SizedBox(height: 20),
        FilledButton.icon(
          onPressed: _verify,
          icon: const Icon(Icons.refresh),
          label: const Text('Coba Lagi'),
        ),
        const SizedBox(height: 40),
      ],
    );
  }

  // ── Shared Widgets ──────────────────────────────────────────────────

  Widget _statusHeader({
    required IconData icon,
    required String title,
    required String badge,
    required Color color,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [color, color.withValues(alpha: 0.8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.25),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Icon(icon, color: Colors.white, size: 42),
          ),
          const SizedBox(height: 14),
          Text(
            title,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              badge,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w700,
                letterSpacing: 1.2,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _warningBanner(String message) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.warning.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.warning.withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          const Icon(Icons.warning_amber_rounded,
              color: AppTheme.warning, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                fontSize: 12,
                color: AppTheme.warning,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Info Helpers ─────────────────────────────────────────────────────

  Widget _sectionTitle(IconData icon, String title) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppTheme.navy),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: AppTheme.navy,
          ),
        ),
      ],
    );
  }

  Widget _infoCard({required List<Widget> children}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(14),
        boxShadow: AppTheme.softShadow(),
        border: Border.all(
          color: Theme.of(context)
              .colorScheme
              .outlineVariant
              .withValues(alpha: 0.18),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: _interleave(children, const SizedBox(height: 10)),
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 130,
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: AppTheme.textMuted,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
              fontSize: 13,
              color: AppTheme.textSlate,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }

  String _documentLabel(String tipe) {
    const labels = {
      'kartu_anggota': 'Kartu Tanda Anggota (KTA)',
      'sertifikat_pendadaran': 'Sertifikat Pendadaran',
      'sertifikat_pelatihan': 'Sertifikat Pelatihan',
      'piagam_prestasi': 'Piagam Prestasi',
    };
    return labels[tipe] ?? tipe;
  }

  String _statusLabel() {
    const labels = {
      'aktif': 'Anggota Aktif',
      'nonaktif': 'Nonaktif',
      'pindah': 'Pindah',
      'keluar': 'Keluar',
      'meninggal': 'Meninggal',
    };
    return labels[_statusKeanggotaan] ?? _statusKeanggotaan;
  }

  static List<T> _interleave<T>(List<T> list, T separator) {
    if (list.length <= 1) return list;
    final result = <T>[];
    for (var i = 0; i < list.length; i++) {
      result.add(list[i]);
      if (i < list.length - 1) result.add(separator);
    }
    return result;
  }
}

