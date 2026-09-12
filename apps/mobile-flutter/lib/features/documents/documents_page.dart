import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/api_client.dart';
import '../../core/app_theme.dart';

class DocumentsPage extends StatefulWidget {
  const DocumentsPage({required this.api, super.key});
  final ApiClient api;

  @override
  State<DocumentsPage> createState() => _DocumentsPageState();
}

class _DocumentsPageState extends State<DocumentsPage> {
  late Future<List<dynamic>> _documents;

  @override
  void initState() { super.initState(); _documents = _load(); }
  Future<List<dynamic>> _load() async { final data = await widget.api.get('/documents'); return data is List ? data : <dynamic>[]; }
  Future<void> _refresh() async => setState(() => _documents = _load());

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Dokumen')),
    body: FutureBuilder<List<dynamic>>(
      future: _documents,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) return const Center(child: CircularProgressIndicator());
        if (snapshot.hasError) return _ErrorView(onRetry: _refresh);
        final documents = snapshot.data!;
        return RefreshIndicator(onRefresh: _refresh, child: documents.isEmpty ? const _EmptyView(icon: Icons.description_outlined, message: 'Belum ada dokumen') : ListView.builder(
          padding: const EdgeInsets.all(16), itemCount: documents.length,
          itemBuilder: (context, index) { final item = documents[index] as Map<String, dynamic>; final date = DateTime.tryParse('${item['createdAt'] ?? ''}'); return Card(child: ListTile(
            leading: const CircleAvatar(backgroundColor: AppColors.primarySofter, child: Icon(Icons.description_outlined, color: AppColors.primary)),
            title: Text('${item['tipe'] ?? 'Dokumen'}'.replaceAll('_', ' ')),
            subtitle: Text(date == null ? '${item['status'] ?? '-'}' : DateFormat('dd MMMM yyyy', 'id_ID').format(date)),
            trailing: const Icon(Icons.chevron_right),
          )); },
        ));
      },
    ),
  );
}

class _EmptyView extends StatelessWidget { const _EmptyView({required this.icon, required this.message}); final IconData icon; final String message; @override Widget build(BuildContext context) => ListView(children: [SizedBox(height: 180), Icon(icon, size: 52, color: AppColors.textMuted), const SizedBox(height: 12), Center(child: Text(message, style: const TextStyle(color: AppColors.textMuted)))]); }
class _ErrorView extends StatelessWidget { const _ErrorView({required this.onRetry}); final VoidCallback onRetry; @override Widget build(BuildContext context) => Center(child: Column(mainAxisSize: MainAxisSize.min, children: [const Text('Gagal memuat data.'), const SizedBox(height: 12), OutlinedButton(onPressed: onRetry, child: const Text('Coba lagi'))])); }
