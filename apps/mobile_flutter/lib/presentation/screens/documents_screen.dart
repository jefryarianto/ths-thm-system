import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/document.dart';
import '../../logic/document/document_bloc.dart';
import '../widgets/app_loading_spinner.dart';

class DocumentsScreen extends StatefulWidget {
  const DocumentsScreen({super.key});

  @override
  State<DocumentsScreen> createState() => _DocumentsScreenState();
}

class _DocumentsScreenState extends State<DocumentsScreen> {
  @override
  void initState() {
    super.initState();
    final state = context.read<DocumentBloc>().state;
    if (state is! DocumentLoaded && state is! DocumentLoading) {
      context.read<DocumentBloc>().add(const DocumentLoadRequested());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Dokumen Saya')),
      body: BlocBuilder<DocumentBloc, DocumentState>(
        builder: (context, state) {
          if (state is DocumentLoading) {
            return const AppLoadingSpinner();
          }
          if (state is DocumentError) {
            return _Error(message: state.message);
          }
          if (state is! DocumentLoaded) {
            return const Center(child: Text('Belum ada dokumen'));
          }
          final docs = state.documents;
          if (docs.isEmpty) {
            return const Center(child: Text('Tidak ada dokumen'));
          }
          return RefreshIndicator(
            onRefresh: () async =>
                context.read<DocumentBloc>().add(const DocumentLoadRequested()),
            child: ListView.builder(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(12),
              itemCount: docs.length,
              itemBuilder: (context, i) => _DocumentCard(doc: docs[i]),
            ),
          );
        },
      ),
    );
  }
}

class _DocumentCard extends StatelessWidget {
  final Document doc;
  const _DocumentCard({required this.doc});

  String _tipeLabel(String tipe) {
    const labels = {
      'kartu_anggota': 'Kartu Anggota',
      'sertifikat_pendadaran': 'Sertifikat Pendadaran',
      'sertifikat_pelatihan': 'Sertifikat Pelatihan',
      'piagam_prestasi': 'Piagam Prestasi',
      'surat_keterangan': 'Surat Keterangan',
    };
    return labels[tipe] ?? tipe;
  }

  IconData _tipeIcon(String tipe) {
    switch (tipe) {
      case 'kartu_anggota':
        return Icons.badge_outlined;
      case 'sertifikat_pendadaran':
        return Icons.school_outlined;
      case 'sertifikat_pelatihan':
        return Icons.workspace_premium_outlined;
      case 'piagam_prestasi':
        return Icons.emoji_events_outlined;
      default:
        return Icons.description_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = AppTheme.statusColor(doc.status);
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        leading: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: AppTheme.primary.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(_tipeIcon(doc.tipe), color: AppTheme.primary),
        ),
        title: Text(
          _tipeLabel(doc.tipe),
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(doc.nomorDokumen,
                style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
            const SizedBox(height: 2),
            Text(
              doc.status,
              style: TextStyle(
                color: color,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
            Text(
              Formatters.dateLong(doc.createdAt),
              style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
            ),
          ],
        ),
        isThreeLine: true,
        trailing: const Icon(Icons.chevron_right),
        onTap: () => context.push<void>('/documents/${doc.id}'),
      ),
    );
  }
}

class _Error extends StatelessWidget {
  final String message;
  const _Error({required this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: AppTheme.danger),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () => context
                  .read<DocumentBloc>()
                  .add(const DocumentLoadRequested()),
              child: const Text('Coba Lagi'),
            ),
          ],
        ),
      ),
    );
  }
}
