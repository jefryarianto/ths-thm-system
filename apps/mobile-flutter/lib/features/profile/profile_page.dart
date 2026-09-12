import 'package:flutter/material.dart';

import '../../core/app_theme.dart';
import '../../core/auth_controller.dart';

class ProfilePage extends StatelessWidget {
  const ProfilePage({required this.auth, super.key});
  final AuthController auth;

  @override
  Widget build(BuildContext context) {
    final user = auth.user;
    return ListView(padding: const EdgeInsets.all(16), children: [
      Text('Profil', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
      const SizedBox(height: 18),
      Card(child: Padding(padding: const EdgeInsets.all(18), child: Row(children: [
        CircleAvatar(radius: 30, backgroundColor: AppColors.primarySofter, child: Text((user?.name.isNotEmpty ?? false) ? user!.name.substring(0, 1).toUpperCase() : 'A', style: const TextStyle(color: AppColors.primary, fontSize: 24, fontWeight: FontWeight.bold))),
        const SizedBox(width: 14), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(user?.name ?? 'Anggota', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17)), const SizedBox(height: 3), Text(user?.email ?? '-', style: const TextStyle(color: AppColors.textSecondary)), const SizedBox(height: 5), Text((user?.role ?? 'anggota').replaceAll('_', ' '), style: const TextStyle(color: AppColors.primary, fontSize: 12))]))
      ]))),
      const SizedBox(height: 14),
      Card(child: ListTile(leading: const Icon(Icons.info_outline), title: const Text('Tentang aplikasi'), subtitle: const Text('Flutter migration foundation v0.1.0'))),
      const SizedBox(height: 20),
      OutlinedButton.icon(onPressed: auth.logout, icon: const Icon(Icons.logout, color: AppColors.danger), label: const Text('Keluar', style: TextStyle(color: AppColors.danger)), style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14), side: const BorderSide(color: AppColors.danger))),
    ]);
  }
}
