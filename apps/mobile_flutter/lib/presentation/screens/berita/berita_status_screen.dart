import 'package:flutter/material.dart';
import '../../../core/api/api_client.dart';
import '../../widgets/app_bar_icon_title.dart';
import '../../widgets/app_loading_spinner.dart';

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

  Color _statusColor(String status) {
    if (status == 'approved') return Colors.green;
    if (status == 'rejected') return Colors.red;
    return Colors.orange;
  }

  String _statusLabel(String status) {
    if (status == 'approved') return 'Disetujui';
    if (status == 'rejected') return 'Ditolak';
    return 'Menunggu Persetujuan';
  }
  // ignore: unused_element

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const AppBarIconTitle(icon: Icons.list_alt, title: 'Status Pengajuan Berita'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadSubmissions,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: AppLoadingSpinner())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('Error: '),
                      const SizedBox(height: 8),
                      ElevatedButton(onPressed: _loadSubmissions, child: const Text('Coba Lagi')),
                    ],
                  ),
                )
              : _submissions.isEmpty
                  ? const Center(child: Text('Belum ada pengajuan berita.'))
                  : RefreshIndicator(
                      onRefresh: _loadSubmissions,
                      child: ListView.builder(
                        itemCount: _submissions.length,
                        itemBuilder: (context, index) {
                          final s = _submissions[index];
                          final status = (s['status'] ?? 'unknown').toString();
                          final berita = s['berita'];
                          // ignore: unused_local_variable
                          final submittedAt = (s['submittedAt'] ?? '').toString();
                          final completedAt = s['completedAt'];
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
                                    style: TextStyle(color: _statusColor(status)),
                                  ),
                                  if (note != null && note.toString().isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 4),
                                      child: Text(
                                        'Catatan admin: ',
                                        style: const TextStyle(fontSize: 12, color: Colors.grey),
                                      ),
                                    ),
                                  Text('Diajukan: ', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                                  if (completedAt != null)
                                    Text('Selesai: ', style: const TextStyle(fontSize: 12, color: Colors.grey)),
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






