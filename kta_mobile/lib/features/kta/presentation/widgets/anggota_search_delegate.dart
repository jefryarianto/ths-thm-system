import 'package:flutter/material.dart';
import '../../data/models/anggota.dart';
import '../../data/repositories/kta_repository.dart';

class AnggotaSearchDelegate extends SearchDelegate<Anggota?> {
  final KtaRepository repository;

  AnggotaSearchDelegate(this.repository);

  @override
  List<Widget> buildActions(BuildContext context) => [
        IconButton(
          icon: const Icon(Icons.clear),
          onPressed: () {
            query = '';
            showSuggestions(context);
          },
        ),
      ];

  @override
  Widget buildLeading(BuildContext context) => IconButton(
        icon: const Icon(Icons.arrow_back),
        onPressed: () => close(context, null),
      );

  @override
  Widget buildResults(BuildContext context) => _buildSuggestions(context);

  @override
  Widget buildSuggestions(BuildContext context) => _buildSuggestions(context);

  Widget _buildSuggestions(BuildContext context) {
    if (query.trim().length < 2) {
      return const Center(child: Text('Ketik minimal 2 karakter'));
    }

    return FutureBuilder<List<Anggota>>(
      future: repository.searchAnggota(query.trim()),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(child: Text('Error: ${snapshot.error}'));
        }
        final results = snapshot.data ?? [];
        if (results.isEmpty) {
          return const Center(child: Text('Tidak ditemukan'));
        }

        return ListView.builder(
          itemCount: results.length,
          itemBuilder: (context, index) {
            final a = results[index];
            return ListTile(
              title: Text(a.nama),
              subtitle: Text('${a.nomor} • ${a.ranting}'),
              onTap: () => close(context, a),
            );
          },
        );
      },
    );
  }
}
