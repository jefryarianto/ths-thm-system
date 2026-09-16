import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:path_provider/path_provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api/api_client.dart';
import '../../core/constants/app_constants.dart';
import '../../core/utils/snack_bar_helper.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/document.dart';
import '../widgets/app_loading_spinner.dart';

class DocumentDetailScreen extends StatefulWidget {
  final String id;
  const DocumentDetailScreen({super.key, required this.id});

  @override
  State<DocumentDetailScreen> createState() => _DocumentDetailScreenState();
}

class _DocumentDetailScreenState extends State<DocumentDetailScreen> {
  final ApiClient _api = ApiClient();
  Document? _doc;
  bool _loading = true;
  String? _error;
  bool _downloading = false;

  static const Map<String, String> _tipeLabels = {
    'kartu_anggota': 'Kartu Anggota (KTA)',
    'sertifikat_pendadaran': 'Sertifikat Pendadaran',
    'sertifikat_pelatihan': 'Sertifikat Pelatihan',
    'piagam_prestasi': 'Piagam Prestasi',
    'surat_keterangan': 'Surat Keterangan',
  };

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      // Endpoint /documents/:id bersifat branch-scope (admin). Anggota harus
      // membaca dokumennya lewat daftar self-scope /members/:id/documents.
      final meRes = await _api.dio.get('/members/me');
      final memberId = meRes.data['data']?['id']?.toString();
      if (memberId == null || memberId.isEmpty) {
        throw StateError('ID anggota tidak ditemukan');
      }
      final listRes =
          await _api.dio.get(AppConstants.memberDocuments(memberId));
      final dynamic raw = listRes.data['data'];
      Document? match;
      if (raw is List) {
        for (final e in raw) {
          if (e is Map<String, dynamic> && e['id']?.toString() == widget.id) {
            match = Document.fromJson(e);
            break;
          }
        }
      }
      if (!mounted) return;
      if (match == null) {
        setState(() {
          _error = 'Dokumen tidak ditemukan';
          _loading = false;
        });
        return;
      }
      setState(() {
        _doc = match;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Gagal memuat dokumen';
        _loading = false;
      });
    }
  }

  Future<void> _downloadAndOpen() async {
    final doc = _doc;
    if (doc == null || _downloading) return;
    setState(() => _downloading = true);
    try {
      final token = await _api.getAccessToken();
      final dir = await getTemporaryDirectory();
      final ext =
          (doc.filePath ?? '').toLowerCase().endsWith('.png') ? '.png' : '.pdf';
      final file =
          '${dir.path}/docs_${doc.nomorDokumen.replaceAll(RegExp(r'[^a-zA-Z0-9_-]'), '_')}$ext';
      await _api.dio.download(
        AppConstants.documentFile(doc.id),
        file,
        options: Options(
          headers: token == null ? {} : {'Authorization': 'Bearer $token'},
        ),
      );
      if (!mounted) return;
      setState(() => _downloading = false);
      await launchUrl(Uri.file(file), mode: LaunchMode.externalApplication);
    } catch (e) {
      if (!mounted) return;
      setState(() => _downloading = false);
      showCenteredSnackBar(context, 'Tidak bisa membuka dokumen');
    }
  }

  Future<void> _openRemote() async {
    final doc = _doc;
    if (doc == null) return;
    final url = AppConstants.documentFile(doc.id);
    if (await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication)) {
      return;
    }
    await _downloadAndOpen();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Detail Dokumen')),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const AppLoadingSpinner();
    }
    if (_error != null || _doc == null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: AppTheme.danger),
            const SizedBox(height: 12),
            Text(_error ?? 'Dokumen tidak ditemukan'),
            const SizedBox(height: 16),
            FilledButton(onPressed: _load, child: const Text('Coba Lagi')),
          ],
        ),
      );
    }
    final doc = _doc!;
    final status = doc.status;
    final color = AppTheme.statusColor(status);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _row('Tipe', _tipeLabels[doc.tipe] ?? doc.tipe),
                _row('Nomor Dokumen', doc.nomorDokumen),
                if (doc.anggotaNamaLengkap != null)
                  _row('Anggota', doc.anggotaNamaLengkap!),
                _row('Tanggal Generate', Formatters.dateLong(doc.createdAt)),
                const Divider(height: 24),
                Row(
                  children: [
                    Icon(Icons.flag_outlined,
                        size: 16, color: Colors.grey.shade600),
                    const SizedBox(width: 8),
                    const Expanded(child: Text('Status')),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        status.toUpperCase(),
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: color,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        if (doc.filePath != null) ...[
          const SizedBox(height: 12),
          FilledButton.icon(
            icon: _downloading
                ? const AppLoadingSpinner.small(color: AppTheme.onPrimary)
                : const Icon(Icons.download),
            label: Text(
                _downloading ? 'Mengunduh...' : 'Download / Lihat Dokumen'),
            onPressed: _downloading ? null : _openRemote,
          ),
        ],
        if (doc.qrCode != null || doc.verificationUrl != null) ...[
          const SizedBox(height: 20),
          const Text('QR Code',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Center(child: _buildQr(doc)),
            ),
          ),
        ],
        if (doc.verificationUrl != null) ...[
          const SizedBox(height: 8),
          FilledButton.icon(
            onPressed: () {
              final token = Formatters.extractQrToken(doc.verificationUrl!);
              context.push<void>('/kta/verify/$token');
            },
            icon: const Icon(Icons.verified_outlined),
            label: const Text('Cek Keaslian Dokumen'),
          ),
          // Fallback opsional: hasil verifikasi juga dapat dilihat via browser
          // (berguna untuk dibagikan ke pihak luar yang tidak memakai aplikasi).
          const SizedBox(height: 4),
          Center(
            child: TextButton.icon(
              onPressed: () => launchUrl(
                Uri.parse(ApiClient.resolveAbsolute(doc.verificationUrl!)),
                mode: LaunchMode.externalApplication,
              ),
              icon: const Icon(Icons.open_in_new, size: 16),
              label: const Text('Buka di Browser'),
              style: TextButton.styleFrom(
                visualDensity: VisualDensity.compact,
                textStyle: const TextStyle(fontSize: 12),
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildQr(Document doc) {
    final qrCode = doc.qrCode;
    if (qrCode != null &&
        (qrCode.startsWith('http://') || qrCode.startsWith('https://'))) {
      return SizedBox(width: 220, height: 220, child: Image.network(qrCode));
    }
    final data = doc.verificationUrl ??
        doc.qrCode ??
        Formatters.extractQrToken(doc.verificationUrl ?? doc.id);
    return QrImageView(
      data: data,
      version: QrVersions.auto,
      size: 220,
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 130,
            child: Text(label,
                style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
          ),
          Expanded(
            child: Text(value,
                style:
                    const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }
}
