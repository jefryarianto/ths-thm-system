import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../data/models/anggota.dart';
import '../../data/repositories/kta_repository.dart';
import '../widgets/anggota_search_delegate.dart';
import 'kta_preview_screen.dart';

class KtaListScreen extends StatelessWidget {
  final KtaRepository? repository;

  const KtaListScreen({super.key, this.repository});

  KtaRepository _getRepository(BuildContext context) {
    if (repository != null) {
      return repository!;
    }
    return Provider.of<KtaRepository>(context, listen: false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('KTA Anggota'),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () async {
              final repo = _getRepository(context);
              final anggota = await showSearch<Anggota?>(
                context: context,
                delegate: AnggotaSearchDelegate(repo),
              );
              if (anggota != null && context.mounted) {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => KtaPreviewScreen(
                      anggota: anggota,
                      repository: repo,
                    ),
                  ),
                );
              }
            },
          ),
        ],
      ),
      body: const Center(
        child: Text('Cari anggota untuk melihat KTA'),
      ),
    );
  }
}
