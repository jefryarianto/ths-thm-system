// QR Scan Screen - Refactored main screen using extracted components
import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../core/api/api_client.dart';
import '../../core/constants/app_constants.dart';
import '../../core/utils/formatters.dart';
import '../../logic/auth/auth_bloc.dart';
import '../widgets/app_loading_spinner.dart';
import '../widgets/qr_scan/mode_selector.dart';
import '../widgets/qr_scan/qr_scan_models.dart';
import '../widgets/qr_scan/qr_scanner_widget.dart';

class QrScanScreen extends StatefulWidget {
  const QrScanScreen({super.key});

  @override
  State<QrScanScreen> createState() => _QrScanScreenState();
}

class _QrScanScreenState extends State<QrScanScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  ScanMode _currentMode = ScanMode.verify;
  LookupSearchType _lookupSearchType = LookupSearchType.qrCode;
  List<KegiatanItem> _kegiatanList = [];
  bool _isLoadingKegiatan = true;
  String? _selectedKegiatanId;
  final TextEditingController _manualSearchController = TextEditingController();
  List<ScanHistoryItem> _scanHistory = [];
  bool _isLoadingHistory = true;

  final ApiClient _apiClient = ApiClient();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadKegiatan();
    _loadScanHistory();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _manualSearchController.dispose();
    super.dispose();
  }

  Future<void> _loadKegiatan() async {
    setState(() => _isLoadingKegiatan = true);
    try {
      final response = await _apiClient.dio.get(
        AppConstants.graduations,
        queryParameters: {'limit': 50},
      );
      final data = response.data['data'] as List<dynamic>? ?? [];
      setState(() {
        _kegiatanList = data
            .map((e) => KegiatanItem.fromJson('graduation', e as Map<String, dynamic>))
            .toList();
        _isLoadingKegiatan = false;
      });
    } catch (e) {
      setState(() => _isLoadingKegiatan = false);
    }
  }

  Future<void> _loadScanHistory() async {
    setState(() => _isLoadingHistory = true);
    try {
      final raw = await _storage.read(key: 'scan_history_v1');
      if (raw != null && raw.isNotEmpty) {
        final list = jsonDecode(raw) as List<dynamic>;
        setState(() {
          _scanHistory = list
              .whereType<Map<String, dynamic>>()
              .map(ScanHistoryItem.fromJson)
              .toList();
        });
      }
    } catch (_) {
      setState(() => _scanHistory = []);
    } finally {
      setState(() => _isLoadingHistory = false);
    }
  }

  Future<void> _saveScanHistory() async {
    try {
      final raw = jsonEncode(_scanHistory.map((e) => e.toJson()).toList());
      await _storage.write(key: 'scan_history_v1', value: raw);
    } catch (_) {}
  }

  void _addToHistory(ScanHistoryItem item) {
    setState(() {
      _scanHistory.insert(0, item);
      if (_scanHistory.length > 100) {
        _scanHistory = _scanHistory.sublist(0, 100);
      }
    });
    _saveScanHistory();
  }

  Future<void> _onScan(String rawValue) async {
    final authState = context.read<AuthBloc>().state;
    if (authState is! AuthAuthenticated) return;

    try {
      ScanResultData result;
      String type;

      switch (_currentMode) {
        case ScanMode.verify:
          result = await _verifyDocument(rawValue);
          type = 'document_verify';
          break;
        case ScanMode.checkin:
          result = await _checkIn(rawValue);
          type = 'check_in';
          break;
        case ScanMode.lookup:
          result = await _lookupMember(rawValue);
          type = 'member_lookup';
          break;
      }

      if (!mounted) return;

      _addToHistory(ScanHistoryItem(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        type: type,
        result: result.success ? 'Sukses' : 'Gagal',
        detail: result.message,
        timestamp: DateTime.now().toIso8601String(),
      ));

      _showResultDialog(result);
    } catch (e) {
      _showResultDialog(ScanResultData(
        success: false,
        message: 'Terjadi kesalahan',
        detail: e.toString(),
      ));
    }
  }

  Future<ScanResultData> _verifyDocument(String token) async {
    try {
      final res = await _apiClient.dio.get('${AppConstants.baseUrl}/documents/verify/$token');
      if (res.data['success'] == true) {
        final doc = res.data['data'];
        return ScanResultData(
          success: true,
          message: 'Dokumen Valid',
          detail: '${doc['jenisDokumen'] ?? 'Dokumen'} - ${doc['namaPemilik'] ?? ''}',
        );
      }
      return ScanResultData(
        success: false,
        message: 'Dokumen Tidak Valid',
        detail: res.data['message'] ?? 'Token tidak ditemukan',
      );
    } on DioException catch (e) {
      return ScanResultData(
        success: false,
        message: 'Verifikasi Gagal',
        detail: _apiClient.messageFromError(e, fallback: 'Server error'),
      );
    }
  }

  Future<ScanResultData> _checkIn(String qrPayload) async {
    if (_selectedKegiatanId == null) {
      return const ScanResultData(
        success: false,
        message: 'Pilih Kegiatan',
        detail: 'Silakan pilih kegiatan sebelum check-in',
      );
    }

    try {
      final res = await _apiClient.dio.post(
        '${AppConstants.baseUrl}/graduations/$_selectedKegiatanId/checkin',
        data: {'qrToken': qrPayload},
      );
      if (res.data['success'] == true) {
        return ScanResultData(
          success: true,
          message: 'Check-In Berhasil',
          detail: res.data['data']?['message'] ?? 'Peserta tercatat hadir',
        );
      }
      return ScanResultData(
        success: false,
        message: 'Check-In Gagal',
        detail: res.data['message'] ?? 'QR tidak valid untuk kegiatan ini',
      );
    } on DioException catch (e) {
      return ScanResultData(
        success: false,
        message: 'Check-In Gagal',
        detail: _apiClient.messageFromError(e, fallback: 'Server error'),
      );
    }
  }

  Future<ScanResultData> _lookupMember(String identifier) async {
    try {
      final res = await _apiClient.dio.get(
        '${AppConstants.baseUrl}/members/lookup',
        queryParameters: {
          'q': identifier,
          'type': _lookupSearchType == LookupSearchType.qrCode ? 'qr' : 'manual',
        },
      );
      if (res.data['success'] == true) {
        final member = res.data['data'];
        return ScanResultData(
          success: true,
          message: 'Anggota Ditemukan',
          detail: '${member['namaLengkap']} (${member['nomorAnggota']}) - ${member['rantingNama'] ?? ''}',
        );
      }
      return ScanResultData(
        success: false,
        message: 'Anggota Tidak Ditemukan',
        detail: res.data['message'] ?? 'Coba cari dengan nomor/nama lain',
      );
    } on DioException catch (e) {
      return ScanResultData(
        success: false,
        message: 'Pencarian Gagal',
        detail: _apiClient.messageFromError(e, fallback: 'Server error'),
      );
    }
  }

  void _showResultDialog(ScanResultData result) {
    if (!mounted) return;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        icon: Icon(
          result.success ? Icons.check_circle : Icons.error,
          color: result.success ? Colors.green : Colors.red,
          size: 48,
        ),
        title: Text(result.success ? 'Berhasil' : 'Gagal'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(result.message, style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(result.detail),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Tutup'),
          ),
        ],
      ),
    );
  }

  Future<void> _pickImageFromGallery() async {
    final picker = ImagePicker();
    final xFile = await picker.pickImage(source: ImageSource.gallery);
    if (xFile == null) return;

    // TODO: Process image for QR code using ML Kit or similar
    // For now, show not implemented
    _showResultDialog(const ScanResultData(
      success: false,
      message: 'Belum Tersedia',
      detail: 'Scan dari galeri akan segera hadir',
    ));
  }

  @override
  Widget build(BuildContext context) {
    final authState = context.watch<AuthBloc>().state;
    final isActivityAdmin = authState is AuthAuthenticated &&
        (authState.user.role == 'admin_kegiatan' ||
            authState.user.role == 'admin_ranting' ||
            authState.user.role == 'admin_wilayah' ||
            authState.user.role == 'admin_distrik' ||
            authState.user.role == 'superadmin');
    final isExaminer = authState is AuthAuthenticated &&
        authState.user.role == 'penguji';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan QR'),
        actions: [
          IconButton(
            icon: const Icon(Icons.photo_library),
            onPressed: _pickImageFromGallery,
            tooltip: 'Scan dari Galeri',
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(60),
          child: ModeSelector(
            selectedMode: _currentMode,
            onModeChanged: (ScanMode mode) {
              setState(() {
                _currentMode = mode;
                if (mode == ScanMode.checkin && _selectedKegiatanId == null) {
                  _tabController.animateTo(1); // Switch to kegiatan tab
                }
              });
            },
            isActivityAdmin: isActivityAdmin,
            isExaminer: isExaminer,
          ),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Tab 1: Scanner
          _buildScannerTab(),
          // Tab 2: Kegiatan Selection (for check-in) / Lookup / History
          _buildSecondaryTab(),
        ],
      ),
      bottomNavigationBar: TabBar(
        controller: _tabController,
        tabs: const [
          Tab(icon: Icon(Icons.qr_code_scanner), text: 'Scanner'),
          Tab(icon: Icon(Icons.more_horiz), text: 'Lainnya'),
        ],
      ),
    );
  }

  Widget _buildScannerTab() {
    if (_currentMode == ScanMode.lookup && _lookupSearchType == LookupSearchType.manual) {
      return _buildManualLookup();
    }

    return Column(
      children: [
        if (_currentMode == ScanMode.checkin && _selectedKegiatanId == null)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            color: Theme.of(context).colorScheme.errorContainer,
            child: Row(
              children: [
                Icon(Icons.warning_amber, color: Theme.of(context).colorScheme.error),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Pilih kegiatan di tab "Lainnya" untuk check-in',
                    style: TextStyle(color: Theme.of(context).colorScheme.onErrorContainer),
                  ),
                ),
              ],
            ),
          ),
        Expanded(
          child: QrScannerWidget(
            mode: _currentMode,
            onScan: _onScan,
            onPermissionDenied: () => _showPermissionDialog(),
            onCameraError: () => _showCameraErrorDialog(),
          ),
        ),
        if (_currentMode == ScanMode.lookup)
          Padding(
            padding: const EdgeInsets.all(16),
            child: OutlinedButton.icon(
              onPressed: () => setState(() => _lookupSearchType = LookupSearchType.manual),
              icon: const Icon(Icons.keyboard),
              label: const Text('Input Manual (Nama/Nomor)'),
            ),
          ),
      ],
    );
  }

  Widget _buildSecondaryTab() {
    if (_currentMode == ScanMode.checkin) {
      return _buildKegiatanSelection();
    } else if (_currentMode == ScanMode.lookup && _lookupSearchType == LookupSearchType.manual) {
      return _buildManualLookup();
    } else {
      return _buildHistoryTab();
    }
  }

  Widget _buildKegiatanSelection() {
    if (_isLoadingKegiatan) {
      return const Center(child: AppLoadingSpinner());
    }

    if (_kegiatanList.isEmpty) {
      return const Center(child: Text('Belum ada kegiatan pendadaran'));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _kegiatanList.length,
      itemBuilder: (context, index) {
        final kegiatan = _kegiatanList[index];
        final isSelected = _selectedKegiatanId == kegiatan.id;

        return Card(
          color: isSelected
              ? Theme.of(context).colorScheme.primaryContainer
              : null,
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: isSelected
                  ? Theme.of(context).colorScheme.primary
                  : Theme.of(context).colorScheme.surfaceContainerHighest,
              child: Icon(
                Icons.school,
                color: isSelected
                    ? Theme.of(context).colorScheme.onPrimary
                    : Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            title: Text(
              kegiatan.nama,
              style: TextStyle(
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
            ),
            subtitle: Text(
              '${kegiatan.lokasi ?? 'Lokasi TBD'} • ${Formatters.dateIndo(kegiatan.tanggalMulai)}',
            ),
            trailing: isSelected
                ? Icon(Icons.check_circle, color: Theme.of(context).colorScheme.primary)
                : null,
            onTap: () => setState(() => _selectedKegiatanId = kegiatan.id),
          ),
        );
      },
    );
  }

  Widget _buildManualLookup() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Cari Anggota (Manual)',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _manualSearchController,
            decoration: InputDecoration(
              labelText: 'Nama / Nomor Anggota',
              prefixIcon: const Icon(Icons.search),
              border: const OutlineInputBorder(),
              suffixIcon: _manualSearchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _manualSearchController.clear();
                        setState(() {});
                      },
                    )
                  : null,
            ),
            onChanged: (_) => setState(() {}),
            onSubmitted: (_) => _onManualSearch(),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _manualSearchController.text.isNotEmpty ? _onManualSearch : null,
              icon: const Icon(Icons.search),
              label: const Text('Cari'),
            ),
          ),
        ],
    ),
  );
  }

  Future<void> _onManualSearch() async {
    final query = _manualSearchController.text.trim();
    if (query.isEmpty) return;

    setState(() => _lookupSearchType = LookupSearchType.manual);
    await _onScan(query);
  }

  Widget _buildHistoryTab() {
    if (_isLoadingHistory) {
      return const Center(child: AppLoadingSpinner());
    }

    if (_scanHistory.isEmpty) {
      return const Center(child: Text('Belum ada riwayat scan'));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _scanHistory.length,
      itemBuilder: (context, index) {
        final item = _scanHistory[index];
        final isSuccess = item.result == 'Sukses';

        return Card(
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: isSuccess
                  ? Colors.green.withValues(alpha: 0.1)
                  : Colors.red.withValues(alpha: 0.1),
              child: Icon(
                isSuccess ? Icons.check_circle : Icons.error,
                color: isSuccess ? Colors.green : Colors.red,
              ),
            ),
            title: Text(item.detail),
            subtitle: Text(
              '${item.type.replaceAll('_', ' ').toUpperCase()} • ${Formatters.dateTimeIndo(item.timestamp)}',
            ),
            trailing: Text(
              item.result,
              style: TextStyle(
                color: isSuccess ? Colors.green : Colors.red,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        );
      },
    );
  }

  void _showPermissionDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Izin Kamera Diperlukan'),
        content: const Text('Aplikasi memerlukan akses kamera untuk memindai QR code. Buka pengaturan untuk mengizinkan.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              openAppSettings();
            },
            child: const Text('Buka Pengaturan'),
          ),
        ],
      ),
    );
  }

  void _showCameraErrorDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Kamera Error'),
        content: const Text('Tidak dapat mengakses kamera. Pastikan tidak ada aplikasi lain yang menggunakan kamera.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK')),
        ],
      ),
    );
  }
}