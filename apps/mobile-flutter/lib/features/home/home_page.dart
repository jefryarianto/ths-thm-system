import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/app_theme.dart';
import '../../core/auth_controller.dart';

class HomePage extends StatefulWidget {
  const HomePage({required this.auth, required this.api, required this.onNavigate, super.key});
  final AuthController auth;
  final ApiClient api;
  final ValueChanged<int> onNavigate;

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  int _unread = 0;

  @override
  void initState() {
    super.initState();
    _loadUnread();
  }

  Future<void> _loadUnread() async {
    try {
      final data = await widget.api.get('/notifications/count');
      if (mounted) setState(() => _unread = data is Map<String, dynamic> ? (data['count'] as num? ?? 0).toInt() : 0);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) => RefreshIndicator(
        onRefresh: _loadUnread,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text('Selamat datang,', style: Theme.of(context).textTheme.titleMedium?.copyWith(color: AppColors.textSecondary)),
            Text(widget.auth.user?.name ?? 'Anggota', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 20),
            Card(
              color: AppColors.primary,
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Icon(Icons.credit_card_outlined, color: Colors.white, size: 36),
                  const SizedBox(height: 14),
                  const Text('Kartu Anggota Digital', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  const Text('Tampilkan identitas anggota Anda.', style: TextStyle(color: Color(0xFFDBEAFE))),
                  const SizedBox(height: 14),
                  OutlinedButton(onPressed: () => widget.onNavigate(1), style: OutlinedButton.styleFrom(foregroundColor: Colors.white, side: const BorderSide(color: Colors.white)), child: const Text('Lihat Kartu')),
                ]),
              ),
            ),
            const SizedBox(height: 18),
            Text('Akses Cepat', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            _QuickAction(icon: Icons.description_outlined, title: 'Dokumen', subtitle: 'Sertifikat dan piagam', onTap: () => Navigator.of(context).pushNamed('/documents')),
            _QuickAction(icon: Icons.account_balance_wallet_outlined, title: 'Iuran', subtitle: 'Status dan riwayat pembayaran', onTap: () => Navigator.of(context).pushNamed('/dues')),
            _QuickAction(icon: Icons.notifications_outlined, title: 'Notifikasi', subtitle: _unread == 0 ? 'Tidak ada notifikasi baru' : '$_unread notifikasi belum dibaca', badge: _unread, onTap: () => Navigator.of(context).pushNamed('/notifications')),
          ],
        ),
      );
}

class _QuickAction extends StatelessWidget {
  const _QuickAction({required this.icon, required this.title, required this.subtitle, required this.onTap, this.badge = 0});
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final int badge;

  @override
  Widget build(BuildContext context) => Card(
        child: ListTile(
          onTap: onTap,
          leading: CircleAvatar(backgroundColor: AppColors.primarySofter, child: Icon(icon, color: AppColors.primary)),
          title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
          subtitle: Text(subtitle),
          trailing: badge > 0 ? Badge(label: Text('$badge'), child: const Icon(Icons.chevron_right)) : const Icon(Icons.chevron_right),
        ),
      );
}
