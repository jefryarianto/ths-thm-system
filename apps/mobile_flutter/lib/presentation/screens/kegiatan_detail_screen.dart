import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';
import '../../core/constants/app_constants.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../widgets/app_loading_spinner.dart';

/// Detail kegiatan (agenda) — mengambil data lengkap dari `GET /activities/:id`
/// (butuh login) dan menampilkan nama, tipe, lokasi, tanggal, status, serta
/// ringkasan peserta/penyelenggara dengan ringkas.
class KegiatanDetailScreen extends StatefulWidget {
  final String id;

  /// Fetcher opsional untuk testing — `null` menggunakan [ApiClient] asli.
  final Future<Response> Function(String id)? fetch;

  const KegiatanDetailScreen({super.key, required this.id, this.fetch});

  @override
  State<KegiatanDetailScreen> createState() => _KegiatanDetailScreenState();
}

class _KegiatanDetailScreenState extends State<KegiatanDetailScreen> {
  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _data;

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
      final res = await (widget.fetch != null
          ? widget.fetch!(widget.id)
          : ApiClient().dio.get('${AppConstants.activities}/${widget.id}'));
      final data = res.data is Map<String, dynamic>
          ? (res.data as Map<String, dynamic>)['data']
          : null;
      if (data == null || data is! Map) {
        throw Exception('Kegiatan tidak ditemukan');
      }
      setState(() {
        _data = data as Map<String, dynamic>;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = ApiClient().messageFromError(e);
      });
    }
  }

  String get _status => _data?['status']?.toString() ?? '';

  List<dynamic> get _peserta {
    final raw = _data?['peserta'];
    return raw is List ? raw : const [];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Detail Kegiatan')),
      body: _loading
          ? const AppLoadingSpinner()
          : _error != null
              ? _CenterRetry(message: _error!, onRetry: _load)
              : _body(),
    );
  }

  Widget _body() {
    final color = AppTheme.statusColor(_status);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Text(
                _data?['nama']?.toString() ?? 'Kegiatan',
                style: const TextStyle(
                    fontSize: 20, fontWeight: FontWeight.w700, height: 1.3),
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                _status,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: color,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),
        _InfoTile(
          icon: Icons.category_outlined,
          label: 'Tipe Kegiatan',
          value: _data?['tipe']?.toString() ?? '—',
        ),
        _InfoTile(
          icon: Icons.place_outlined,
          label: 'Lokasi',
          value: _data?['lokasi']?.toString() ?? '—',
        ),
        _InfoTile(
          icon: Icons.calendar_month_outlined,
          label: 'Tanggal Mulai',
          value: Formatters.dateLong(_data?['tanggalMulai']?.toString()),
        ),
        if (_data?['tanggalSelesai'] != null)
          _InfoTile(
            icon: Icons.event_outlined,
            label: 'Tanggal Selesai',
            value: Formatters.dateLong(_data?['tanggalSelesai']?.toString()),
          ),
        if (_data?['creator'] is Map)
          _InfoTile(
            icon: Icons.person_outline,
            label: 'Penyelenggara',
            value: (_data?['creator'] as Map)['namaLengkap']?.toString() ?? '—',
          ),
        if (_peserta.isNotEmpty) ...[
          _InfoTile(
            icon: Icons.groups_outlined,
            label: 'Peserta',
            value: '${_peserta.length} orang',
          ),
          const SizedBox(height: 8),
          ..._peserta.map((p) {
            final anggota = p is Map ? p['anggota'] : null;
            final nama =
                anggota is Map ? anggota['namaLengkap']?.toString() : null;
            return ListTile(
              dense: true,
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.person, size: 20),
              title:
                  Text(nama ?? 'Peserta', style: const TextStyle(fontSize: 14)),
            );
          }),
        ],
      ],
    );
  }
}

class _InfoTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _InfoTile(
      {required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppTheme.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, size: 20, color: AppTheme.primary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style:
                        TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                const SizedBox(height: 2),
                Text(value,
                    style: const TextStyle(
                        fontSize: 15, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CenterRetry extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _CenterRetry({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline, size: 48, color: AppTheme.danger),
          const SizedBox(height: 12),
          Text(message, style: const TextStyle(color: Colors.grey)),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh),
            label: const Text('Coba lagi'),
          ),
        ],
      ),
    );
  }
}
