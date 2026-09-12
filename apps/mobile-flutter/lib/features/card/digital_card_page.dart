import 'package:flutter/material.dart';

import '../../core/app_theme.dart';
import '../../core/auth_controller.dart';

class DigitalCardPage extends StatelessWidget {
  const DigitalCardPage({required this.auth, super.key});
  final AuthController auth;

  @override
  Widget build(BuildContext context) {
    final user = auth.user;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Kartu Digital', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: 6),
        const Text('Identitas anggota THS-THM Anda.', style: TextStyle(color: AppColors.textSecondary)),
        const SizedBox(height: 24),
        AspectRatio(
          aspectRatio: 1.586,
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [AppColors.primary, AppColors.primaryDark], begin: Alignment.topLeft, end: Alignment.bottomRight),
              borderRadius: BorderRadius.circular(20),
              boxShadow: const [BoxShadow(color: Color(0x402563EB), blurRadius: 18, offset: Offset(0, 8))],
            ),
            child: Padding(
              padding: const EdgeInsets.all(22),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Row(children: [Icon(Icons.shield_outlined, color: Colors.white), SizedBox(width: 8), Text('THS-THM', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, letterSpacing: 1.2))]),
                const Spacer(),
                Text(user?.name ?? 'Nama Anggota', style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(user?.email ?? '-', style: const TextStyle(color: Color(0xFFDBEAFE))),
                const SizedBox(height: 14),
                Text((user?.role ?? 'anggota').replaceAll('_', ' ').toUpperCase(), style: const TextStyle(color: Color(0xFFDBEAFE), fontSize: 11, letterSpacing: 1)),
              ]),
            ),
          ),
        ),
        const SizedBox(height: 24),
        const Card(child: Padding(padding: EdgeInsets.all(16), child: Text('Tampilan dasar kartu telah tersedia. QR, foto anggota, dan desain kartu lengkap akan dimigrasikan pada tahap berikutnya.'))),
      ],
    );
  }
}
