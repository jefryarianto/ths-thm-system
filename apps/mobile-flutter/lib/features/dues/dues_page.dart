import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/api_client.dart';
import '../../core/app_theme.dart';

class DuesPage extends StatefulWidget { const DuesPage({required this.api, super.key}); final ApiClient api; @override State<DuesPage> createState() => _DuesPageState(); }
class _DuesPageState extends State<DuesPage> {
  late Future<List<dynamic>> _dues;
  @override void initState() { super.initState(); _dues = _load(); }
  Future<List<dynamic>> _load() async { final data = await widget.api.get('/dues/members/me'); return data is List ? data : <dynamic>[]; }
  Future<void> _refresh() async => setState(() => _dues = _load());
  @override Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('Iuran')), body: FutureBuilder<List<dynamic>>(future: _dues, builder: (context, snapshot) {
    if (snapshot.connectionState != ConnectionState.done) return const Center(child: CircularProgressIndicator());
    if (snapshot.hasError) return Center(child: OutlinedButton(onPressed: _refresh, child: const Text('Coba lagi')));
    final dues = snapshot.data!;
    final total = dues.whereType<Map<String, dynamic>>().where((item) => item['status'] == 'lunas').fold<num>(0, (sum, item) => sum + (item['jumlah'] as num? ?? 0));
    return RefreshIndicator(onRefresh: _refresh, child: ListView(padding: const EdgeInsets.all(16), children: [
      Card(color: AppColors.primary, child: Padding(padding: const EdgeInsets.all(20), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const Text('Total pembayaran lunas', style: TextStyle(color: Color(0xFFDBEAFE))), const SizedBox(height: 6), Text(NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0).format(total), style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.bold))]))),
      const SizedBox(height: 12),
      if (dues.isEmpty) const Padding(padding: EdgeInsets.only(top: 72), child: Center(child: Text('Belum ada data iuran'))),
      ...dues.whereType<Map<String, dynamic>>().map((item) { final paid = item['status'] == 'lunas'; return Card(child: ListTile(title: Text('${item['periode'] ?? '-'}'), subtitle: Text('${item['status'] ?? '-'}'.replaceAll('_', ' ')), trailing: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [Text(NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0).format(item['jumlah'] ?? 0), style: const TextStyle(fontWeight: FontWeight.bold)), Text(paid ? 'Lunas' : 'Belum lunas', style: TextStyle(fontSize: 11, color: paid ? AppColors.success : AppColors.warning))])); }),
    ]));
  }));
}
