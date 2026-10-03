import '../../../core/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../core/api/api_client.dart';
import '../../widgets/app_bar_icon_title.dart';
import '../../widgets/app_loading_spinner.dart';
import '../../widgets/state_views.dart';

class BeritaStatusScreen extends StatefulWidget {
  const BeritaStatusScreen({super.key});

  @override
  State<BeritaStatusScreen> createState() => _BeritaStatusScreenState();
}

class _BeritaStatusScreenState extends State<BeritaStatusScreen> {
  List<dynamic> _submissions = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadSubmissions();
  }

  Future<void> _loadSubmissions() async {
    setState(() => _isLoading = true);
    try {
      final api = ApiClient();
      final resp = await api.dio.get('/content/berita/mine');
      setState(() {
        _submissions = resp.data['data'] ?? [];
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  /// Warna status sadar tema — varian gelap lolos WCAG di atas surface gelap.
  Color _statusColor(BuildContext context, String status) {
    if (status == 'approved') return AppTheme.successOf(context);
    if (status == 'rejected') return AppTheme.errorOf(context);
    return AppTheme.warningOf(context);
  }

  String _statusLabel(String status) {
    if (status == 'approved') return 'Disetujui';
    if (status == 'rejected') return 'Ditolak';
    return 'Menunggu Persetujuan';
  }

  /// Format tanggal ISO dari API menjadi "dd MMM yyyy HH:mm".
  /// Nilai null/kosong/invalid tampil sebagai "-" agar tidak menyesatkan.
  String _formatDate(Object? value) {
    if (value == null || value.toString().isEmpty) return '-';
    final parsed = DateTime.tryParse(value.toString());
    if (parsed == null) return value.toString();
    return DateFormat('dd MMM yyyy HH:mm').format(parsed.toLocal());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const AppBarIconTitle(icon: Icons.list_alt, title: 'Status Pengajuan Berita'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadSubmissions,
            tooltip: 'Muat ulang',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: AppLoadingSpinner())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(AppTheme.space24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.error_outline,
                            size: 40, color: Theme.of(context).colorScheme.error),
                        const SizedBox(height: AppTheme.space8),
                        Text('Gagal memuat pengajuan: $_error', textAlign: TextAlign.center),
                        const SizedBox(height: AppTheme.space16),
                        ElevatedButton(onPressed: _loadSubmissions, child: const Text('Coba Lagi')),
                      ],
                    ),
                  ),
                )
              : _submissions.isEmpty
                    ? const EmptyStateView(
                        icon: Icons.article_outlined,
                        title: 'Belum ada pengajuan berita',
                        message: 'Pengajuan berita Anda akan muncul di sini.',
                      )
                  : RefreshIndicator(
                      onRefresh: _loadSubmissions,
                      child: ListView.builder(
                        itemCount: _submissions.length,
                        itemBuilder: (context, index) {
                          final s = _submissions[index];
                          final status = (s['status'] ?? 'unknown').toString();
                          final berita = s['berita'];
                          final note = s['note'];
                          return Card(
                            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            child: ListTile(
                              title: Text(berita != null ? (berita['judul'] ?? '').toString() : 'Berita tidak ditemukan'),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  if (berita != null && (berita['ringkasan'] ?? '').toString().isNotEmpty)
                                    Text((berita['ringkasan'] ?? '').toString()),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Status: ${_statusLabel(status)}',
                                    style: TextStyle(
                                        color: _statusColor(context, status)),
                                  ),
                                  Text('Diajukan: ${_formatDate(s['submittedAt'])}'),
                                  if (s['completedAt'] != null)
                                    Text('Selesai: ${_formatDate(s['completedAt'])}'),
                                  if (note != null && note.toString().isNotEmpty)
                                    Text('Catatan admin: $note'),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}
