import 'package:flutter/material.dart';
import '../../data/models/anggota.dart';
import '../../data/repositories/kta_repository.dart';
import '../widgets/kta_card.dart';

class KtaPreviewScreen extends StatelessWidget {
  final Anggota? anggota;
  final String? anggotaId;
  final KtaRepository? repository;

  const KtaPreviewScreen({
    this.anggota,
    this.anggotaId,
    this.repository,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('KTA Saya'),
      ),
      body: SafeArea(
        child: _buildBody(context),
      ),
    );
  }

  Widget _buildBody(BuildContext context) {
    if (anggota != null) {
      return Center(
        child: KtaCard(anggota: anggota!),
      );
    }

    if (anggotaId != null && repository != null) {
      return FutureBuilder<Anggota>(
        future: repository!.getAnggota(anggotaId!),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(
              child: Text(
                'Gagal memuat KTA: ${snapshot.error}',
                textAlign: TextAlign.center,
              ),
            );
          }
          if (snapshot.hasData) {
            return Center(
              child: KtaCard(anggota: snapshot.data!),
            );
          }
          return const Center(child: Text('Data tidak ditemukan'));
        },
      );
    }

    return const Center(child: Text('Data anggota tidak tersedia'));
  }
}
