import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../logic/forum/forum_bloc.dart';
import '../widgets/app_loading_spinner.dart';

class ForumCreateScreen extends StatefulWidget {
  const ForumCreateScreen({super.key});

  @override
  State<ForumCreateScreen> createState() => _ForumCreateScreenState();
}

class _ForumCreateScreenState extends State<ForumCreateScreen> {
  final _judulCtrl = TextEditingController();
  final _kontenCtrl = TextEditingController();
  String? _categoryId;
  bool _submitting = false;
  bool _categoriesLoaded = false;

  @override
  void dispose() {
    _judulCtrl.dispose();
    _kontenCtrl.dispose();
    super.dispose();
  }

  void _submit() {
    if (_categoryId == null ||
        _judulCtrl.text.trim().isEmpty ||
        _kontenCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Semua field harus diisi')));
      return;
    }
    setState(() => _submitting = true);
    context.read<ForumBloc>().add(ForumCreateThreadRequested(
          categoryId: _categoryId!,
          judul: _judulCtrl.text.trim(),
          konten: _kontenCtrl.text.trim(),
        ));
  }

  @override
  Widget build(BuildContext context) {
    if (!_categoriesLoaded) {
      context.read<ForumBloc>().add(const ForumCategoriesLoadRequested());
      _categoriesLoaded = true;
    }
    return Scaffold(
      appBar: AppBar(title: const Text('Buat Thread Baru')),
      body: BlocListener<ForumBloc, ForumState>(
        listener: (context, state) {
          if (state is ForumCategoriesLoaded &&
              state.categories.isNotEmpty &&
              _categoryId == null) {
            setState(() => _categoryId = state.categories.first.id);
          }
          if (_submitting && state is! ForumLoading) {
            setState(() => _submitting = false);
            if (state is! ForumError) {
              ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Thread berhasil dibuat')));
              context.pop();
            }
          }
        },
        child: BlocBuilder<ForumBloc, ForumState>(
          builder: (context, state) {
            if (state is ForumLoading && state is! ForumCategoriesLoaded) {
              return const AppLoadingSpinner();
            }
            final cats =
                state is ForumCategoriesLoaded ? state.categories : <dynamic>[];
            return ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const Text('Kategori',
                    style:
                        TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: cats
                      .map((c) => ChoiceChip(
                            label: Text(c.nama),
                            selected: _categoryId == c.id,
                            onSelected: (_) =>
                                setState(() => _categoryId = c.id),
                          ))
                      .toList(),
                ),
                const SizedBox(height: 20),
                TextField(
                  controller: _judulCtrl,
                  decoration: const InputDecoration(labelText: 'Judul'),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _kontenCtrl,
                  decoration: const InputDecoration(labelText: 'Konten'),
                  maxLines: 8,
                  textAlignVertical: TextAlignVertical.top,
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: _submitting ? null : _submit,
                  child: _submitting
                      ? const AppLoadingSpinner.small(color: Colors.white)
                      : const Text('Buat Thread'),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
