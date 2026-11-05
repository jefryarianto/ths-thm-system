import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/member.dart';
import '../../logic/kta_application/kta_application_bloc.dart';
import '../widgets/app_bar_icon_title.dart';
import '../widgets/app_loading_spinner.dart';
import '../widgets/state_views.dart';

class KtaBulkSelectScreen extends StatefulWidget {
  const KtaBulkSelectScreen({super.key});

  @override
  State<KtaBulkSelectScreen> createState() => _KtaBulkSelectScreenState();
}

class _KtaBulkSelectScreenState extends State<KtaBulkSelectScreen> {
  final ApiClient _api = ApiClient();
  final Set<String> _selected = {};
  List<Member> _members = [];
  bool _loading = true;
  String? _error;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final token = await _api.getAccessToken();
      if (token == null || token.isEmpty) {
        setState(() => _error = 'Belum login');
        return;
      }
      final response = await _api.dio.get('/members', queryParameters: {
        'limit': 100,
        'page': 1,
        if (_query.isNotEmpty) 'search': _query,
      });
      final data = response.data['data'];
      final members = data is List
          ? data.whereType<Map<String, dynamic>>().map(Member.fromJson).toList()
          : <Member>[];
      setState(() => _members = members);
    } on DioException catch (e) {
      setState(() => _error = _api.messageFromError(e));
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  bool _isEligible(Member m) =>
      m.statusData == 'complete' &&
      m.statusValidasi == 'approved' &&
      m.statusKeanggotaan == 'aktif';

  void _toggle(Member m) {
    setState(() {
      if (_selected.contains(m.id)) {
        _selected.remove(m.id);
      } else {
        _selected.add(m.id);
      }
    });
  }

  void _submit() {
    if (_selected.isEmpty) return;
    context.read<KtaApplicationBloc>().add(
          KtaApplicationBulkSubmitRequested(
            anggotaIds: _selected.toList(),
            batchName: 'Bulk KTA ${DateTime.now().toString().substring(0, 10)}',
          ),
        );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const AppBarIconTitle(icon: Icons.assignment_add, title: 'Bulk Pengajuan KTA'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(AppTheme.space16),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Cari nama / nomor anggota...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              ),
              onSubmitted: (_) => _load(),
              onChanged: (v) => _query = v.trim(),
            ),
          ),
          Expanded(
            child: BlocBuilder<KtaApplicationBloc, KtaApplicationState>(
              builder: (context, state) {
                if (state is KtaApplicationSubmitting) {
                  return const Center(child: AppLoadingSpinner());
                }
                if (state is KtaApplicationBulkSubmitted) {
                  return _SuccessView(result: state);
                }
                if (state is KtaApplicationError) {
                  return ErrorStateView(message: state.message, onRetry: () => _submit());
                }
                return _buildMemberList();
              },
            ),
          ),
          if (_selected.isNotEmpty)
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(AppTheme.space16),
                child: FilledButton.icon(
                  onPressed: _submit,
                  icon: const Icon(Icons.send),
                  label: Text('Kirim ${_selected.length} Pengajuan'),
                  style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildMemberList() {
    if (_loading) return const Center(child: AppLoadingSpinner());
    if (_error != null) return ErrorStateView(message: _error!, onRetry: _load);
    if (_members.isEmpty) {
      return const EmptyStateView(
        icon: Icons.people_outline,
        title: 'Tidak Ada Anggota',
        message: 'Coba ubah pencarian.',
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(AppTheme.space16),
      itemCount: _members.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (context, index) {
        final m = _members[index];
        final eligible = _isEligible(m);
        return Card(
          child: CheckboxListTile(
            value: _selected.contains(m.id),
            onChanged: eligible ? (_) => _toggle(m) : null,
            title: Text(m.namaLengkap),
            subtitle: Text(
              'NRA: ${m.nomorAnggota} • ${m.namaRanting}\n'
              '${eligible ? 'Siap KTA' : 'Data belum lengkap / belum validasi / non-aktif'}',
              style: const TextStyle(fontSize: 12),
            ),
            secondary: CircleAvatar(
              backgroundColor: eligible ? Colors.green : Colors.red.withValues(alpha: 0.3),
              child: Icon(eligible ? Icons.check : Icons.close, color: Colors.white, size: 16),
            ),
          ),
        );
      },
    );
  }
}

class _SuccessView extends StatelessWidget {
  final KtaApplicationBulkSubmitted result;

  const _SuccessView({required this.result});

  @override
  Widget build(BuildContext context) {
    return EmptyStateView(
      icon: Icons.check_circle,
      title: 'Bulk Pengajuan Terkirim',
      message: '${result.totalSubmitted} anggota berhasil diajukan.\n'
          '${result.ineligible.length} anggota tidak memenuhi syarat.',
    );
  }
}
