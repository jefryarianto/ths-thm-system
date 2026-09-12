import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/api_client.dart';
import '../../core/app_theme.dart';

class NotificationsPage extends StatefulWidget { const NotificationsPage({required this.api, super.key}); final ApiClient api; @override State<NotificationsPage> createState() => _NotificationsPageState(); }
class _NotificationsPageState extends State<NotificationsPage> {
  late Future<List<dynamic>> _notifications;
  @override void initState() { super.initState(); _notifications = _load(); }
  Future<List<dynamic>> _load() async { final data = await widget.api.get('/notifications'); return data is List ? data : (data is Map<String, dynamic> && data['data'] is List ? data['data'] as List<dynamic> : <dynamic>[]); }
  Future<void> _refresh() async => setState(() => _notifications = _load());
  Future<void> _markAllRead() async { try { await widget.api.patch('/notifications/read-all'); await _refresh(); } catch (_) {} }
  Future<void> _markRead(Map<String, dynamic> item) async { if (item['isRead'] == true) return; try { await widget.api.patch('/notifications/${item['id']}/read'); await _refresh(); } catch (_) {} }
  @override Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('Notifikasi'), actions: [TextButton(onPressed: _markAllRead, child: const Text('Tandai dibaca', style: TextStyle(color: Colors.white)))]), body: FutureBuilder<List<dynamic>>(future: _notifications, builder: (context, snapshot) {
    if (snapshot.connectionState != ConnectionState.done) return const Center(child: CircularProgressIndicator());
    if (snapshot.hasError) return Center(child: OutlinedButton(onPressed: _refresh, child: const Text('Coba lagi')));
    final notifications = snapshot.data!;
    return RefreshIndicator(onRefresh: _refresh, child: notifications.isEmpty ? ListView(children: const [SizedBox(height: 180), Icon(Icons.notifications_none, size: 52, color: AppColors.textMuted), SizedBox(height: 12), Center(child: Text('Belum ada notifikasi'))]) : ListView.builder(padding: const EdgeInsets.all(16), itemCount: notifications.length, itemBuilder: (context, index) { final item = notifications[index] as Map<String, dynamic>; final isRead = item['isRead'] == true; final date = DateTime.tryParse('${item['createdAt'] ?? ''}'); return Card(child: ListTile(onTap: () => _markRead(item), leading: CircleAvatar(backgroundColor: isRead ? AppColors.surfaceMuted : AppColors.primarySofter, child: Icon(Icons.notifications_outlined, color: isRead ? AppColors.textMuted : AppColors.primary)), title: Text('${item['judul'] ?? item['title'] ?? 'Notifikasi'}', style: TextStyle(fontWeight: isRead ? FontWeight.normal : FontWeight.bold)), subtitle: Text('${item['pesan'] ?? item['message'] ?? ''}\n${date == null ? '' : DateFormat('dd MMM yyyy, HH:mm', 'id_ID').format(date)}'), isThreeLine: true, trailing: isRead ? null : const Icon(Icons.circle, color: AppColors.primary, size: 10))); }));
  }));
}
