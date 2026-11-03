// TEMPORARY diagnostic entrypoint (dihapus setelah verifikasi).
import 'package:flutter/material.dart';

import 'core/theme/app_theme.dart';
import 'presentation/screens/qr_scan_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(MaterialApp(
    debugShowCheckedModeBanner: false,
    theme: AppTheme.light(),
    darkTheme: AppTheme.dark(),
    home: const _Launcher(),
  ));
}

class _Launcher extends StatelessWidget {
  const _Launcher();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Probe')),
      body: Column(
        children: [
          SizedBox(
            height: 120,
            child: TextButton(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const QrScanScreen()),
              ),
              child: const Text('BUKA QR'),
            ),
          ),
        ],
      ),
    );
  }
}
