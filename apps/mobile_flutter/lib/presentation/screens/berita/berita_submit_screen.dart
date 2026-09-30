import 'package:flutter/material.dart';
import '../../../core/api/api_client.dart';
import '../../widgets/app_bar_icon_title.dart';
import '../../widgets/app_loading_spinner.dart';

class BeritaSubmitScreen extends StatefulWidget {
  const BeritaSubmitScreen({super.key});

  @override
  State<BeritaSubmitScreen> createState() => _BeritaSubmitScreenState();
}

class _BeritaSubmitScreenState extends State<BeritaSubmitScreen> {
  final _formKey = GlobalKey<FormState>();
  final _judulCtrl = TextEditingController();
  final _ringkasanCtrl = TextEditingController();
  final _kontenCtrl = TextEditingController();
  final _slugCtrl = TextEditingController();
  bool _isSubmitting = false;
  String? _error;

  @override
  void dispose() {
    _judulCtrl.dispose();
    _ringkasanCtrl.dispose();
    _kontenCtrl.dispose();
    _slugCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _isSubmitting = true;
      _error = null;
    });
    try {
      final api = ApiClient();
      await api.dio.post('/content/berita/submit', data: {
        'judul': _judulCtrl.text.trim(),
        'ringkasan': _ringkasanCtrl.text.trim(),
        'konten': _kontenCtrl.text.trim(),
        'slug': _slugCtrl.text.trim(),
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Berita berhasil diajukan! Menunggu persetujuan admin.')),
        );
        _judulCtrl.clear();
        _ringkasanCtrl.clear();
        _kontenCtrl.clear();
        _slugCtrl.clear();
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const AppBarIconTitle(icon: Icons.newspaper, title: 'Ajukan Berita Baru'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                controller: _judulCtrl,
                decoration: const InputDecoration(labelText: 'Judul *'),
                validator: (v) => v == null || v.isEmpty ? 'Judul wajib diisi' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _ringkasanCtrl,
                decoration: const InputDecoration(labelText: 'Ringkasan *'),
                validator: (v) => v == null || v.isEmpty ? 'Ringkasan wajib diisi' : null,
                maxLines: 3,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _kontenCtrl,
                decoration: const InputDecoration(labelText: 'Konten (HTML) *'),
                validator: (v) => v == null || v.isEmpty ? 'Konten wajib diisi' : null,
                maxLines: 8,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _slugCtrl,
                decoration: const InputDecoration(labelText: 'Slug *'),
                validator: (v) => v == null || v.isEmpty ? 'Slug wajib diisi' : null,
              ),
              const SizedBox(height: 24),
              _isSubmitting
                  ? const Center(child: AppLoadingSpinner())
                  : ElevatedButton(
                      onPressed: _submit,
                      child: const Text('Ajukan Berita'),
                    ),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text(_error!, style: const TextStyle(color: Colors.red)),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

