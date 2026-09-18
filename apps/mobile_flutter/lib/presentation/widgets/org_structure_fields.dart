import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';
import '../../core/constants/app_constants.dart';
import '../../data/models/distrik.dart';
import '../../data/models/ranting.dart';
import '../../data/models/wilayah.dart';

/// Model data yang dikembalikan dari bottom sheet picker.
class _PickerResult {
  final String rantingId;
  final String displayPath; // "Distrik A / Wilayah 1 / Ranting X"
  const _PickerResult(this.rantingId, this.displayPath);
}

/// Satu field berjenjang Distrik → Wilayah → Ranting.
///
/// Di-tap membuka bottom sheet picker bertingkat dengan **pencarian
/// (search)** di setiap level. Dipakai di form publik (pendaftaran
/// calon anggota & klaim akun).
class OrgStructureFields extends StatefulWidget {
  final ValueChanged<String?> onRantingChanged;

  /// Seam untuk test: GET sendiri (absolute URL, mengembalikan decoded
  /// body). Default memakai [ApiClient.dio] dengan interceptor auth.
  final Future<dynamic> Function(String url)? fetch;

  const OrgStructureFields({
    super.key,
    required this.onRantingChanged,
    this.fetch,
  });

  @override
  State<OrgStructureFields> createState() => _OrgStructureFieldsState();
}

class _OrgStructureFieldsState extends State<OrgStructureFields> {
  late final Future<dynamic> Function(String url) _fetch =
      widget.fetch ?? ((url) => ApiClient().dio.get(url));
  final _displayCtrl = TextEditingController();
  String? _rantingId;

  @override
  void dispose() {
    _displayCtrl.dispose();
    super.dispose();
  }

  Future<void> _openPicker() async {
    final result = await showModalBottomSheet<_PickerResult>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _OrgPickerSheet(fetch: _fetch),
    );
    if (result == null || !mounted) return;
    setState(() {
      _rantingId = result.rantingId;
      _displayCtrl.text = result.displayPath;
    });
    widget.onRantingChanged(result.rantingId);
  }

  void _clearSelection() {
    setState(() {
      _rantingId = null;
      _displayCtrl.clear();
    });
    widget.onRantingChanged(null);
  }

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      readOnly: true,
      controller: _displayCtrl,
      onTap: _openPicker,
      decoration: InputDecoration(
        labelText: 'Ranting Asal *',
        prefixIcon: const Icon(Icons.location_on_outlined),
        hintText: 'Tap untuk memilih distrik → wilayah → ranting',
        suffixIcon: _rantingId != null
            ? IconButton(
                icon: const Icon(Icons.clear),
                tooltip: 'Hapus pilihan',
                onPressed: _clearSelection,
              )
            : const Icon(Icons.chevron_right),
      ),
      validator: (_) => _rantingId == null ? 'Pilih ranting' : null,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  _OrgPickerSheet — bottom sheet bertingkat dengan pencarian
// ═══════════════════════════════════════════════════════════════════════════

class _OrgPickerSheet extends StatefulWidget {
  final Future<dynamic> Function(String url) fetch;
  const _OrgPickerSheet({required this.fetch});
  @override
  State<_OrgPickerSheet> createState() => _OrgPickerSheetState();
}

class _OrgPickerSheetState extends State<_OrgPickerSheet> {
  static const _titles = ['Pilih Distrik', 'Pilih Wilayah', 'Pilih Ranting'];
  static const _hints = ['distrik', 'wilayah', 'ranting'];
  static const _icons = [
    Icons.account_balance_outlined,
    Icons.location_city_outlined,
    Icons.location_on_outlined,
  ];

  int _step = 0; // 0 = distrik, 1 = wilayah, 2 = ranting
  final _searchCtrl = TextEditingController();

  Distrik? _selectedDistrik;
  Wilayah? _selectedWilayah;

  List<Distrik> _distriks = [];
  List<Wilayah> _wilayahs = [];
  List<Ranting> _rantings = [];

  bool _distriksLoading = true;
  bool _wilayahsLoading = false;
  bool _rantingsLoading = false;
  bool _distrikFailed = false;
  bool _wilayahFailed = false;
  bool _rantingFailed = false;

  // ── Computed ────────────────────────────────────────────────────────

  String get _title => _titles[_step];

  String? get _breadcrumb {
    if (_step == 1) return _selectedDistrik?.nama;
    if (_step == 2 && _selectedDistrik != null && _selectedWilayah != null) {
      return '${_selectedDistrik!.nama}  ›  ${_selectedWilayah!.nama}';
    }
    return null;
  }

  bool get _isLoading => switch (_step) {
        0 => _distriksLoading,
        1 => _wilayahsLoading,
        _ => _rantingsLoading,
      };

  bool get _isFailed => switch (_step) {
        0 => _distrikFailed,
        1 => _wilayahFailed,
        _ => _rantingFailed,
      };

  // ── Lifecycle ───────────────────────────────────────────────────────

  @override
  void initState() {
    super.initState();
    _loadDistriks();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  // ── Fetch ──────────────────────────────────────────────────────────

  Future<void> _loadDistriks() async {
    setState(() {
      _distriksLoading = true;
      _distrikFailed = false;
    });
    try {
      final res = await widget.fetch(AppConstants.publicDistrik);
      if (!mounted) return;
      setState(() {
        _distriks = _parseData<Distrik>(res.data, Distrik.fromJson);
        _distriksLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _distriksLoading = false;
        _distrikFailed = true;
      });
    }
  }

  Future<void> _loadWilayahs(String distrikId) async {
    setState(() {
      _wilayahsLoading = true;
      _wilayahFailed = false;
    });
    try {
      final res = await widget
          .fetch('${AppConstants.publicWilayah}?distrikId=$distrikId');
      if (!mounted) return;
      setState(() {
        _wilayahs = _parseData<Wilayah>(res.data, Wilayah.fromJson);
        _wilayahsLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _wilayahsLoading = false;
        _wilayahFailed = true;
      });
    }
  }

  Future<void> _loadRantings(String wilayahId) async {
    setState(() {
      _rantingsLoading = true;
      _rantingFailed = false;
    });
    try {
      final res = await widget
          .fetch('${AppConstants.publicRanting}?wilayahId=$wilayahId');
      if (!mounted) return;
      setState(() {
        _rantings = _parseData<Ranting>(res.data, Ranting.fromJson);
        _rantingsLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _rantingsLoading = false;
        _rantingFailed = true;
      });
    }
  }

  List<T> _parseData<T>(dynamic body, T Function(Map<String, dynamic>) from) {
    final raw = body is Map ? body['data'] : body;
    return (raw is List ? raw : [])
        .whereType<Map<String, dynamic>>()
        .map(from)
        .toList();
  }

  // ── Navigation ─────────────────────────────────────────────────────

  void _onBack() {
    if (_step == 0) {
      Navigator.pop(context);
      return;
    }
    setState(() {
      _step--;
      _searchCtrl.clear();
      if (_step == 0) {
        _selectedDistrik = null;
        _wilayahs = [];
      }
      if (_step == 1) {
        _selectedWilayah = null;
        _rantings = [];
      }
    });
  }

  void _onDistrikTap(Distrik d) {
    setState(() {
      _selectedDistrik = d;
      _step = 1;
      _searchCtrl.clear();
    });
    _loadWilayahs(d.id);
  }

  void _onWilayahTap(Wilayah w) {
    setState(() {
      _selectedWilayah = w;
      _step = 2;
      _searchCtrl.clear();
    });
    _loadRantings(w.id);
  }

  void _onRantingTap(Ranting r) {
    final p = '${_selectedDistrik?.nama ?? ''} / ${_selectedWilayah?.nama ?? ''} / ${r.nama}';
    Navigator.pop(context, _PickerResult(r.id, p));
  }

  void _retry() {
    switch (_step) {
      case 0:
        _loadDistriks();
      case 1:
        if (_selectedDistrik != null) _loadWilayahs(_selectedDistrik!.id);
      case 2:
        if (_selectedWilayah != null) _loadRantings(_selectedWilayah!.id);
    }
  }

  // ── List & filter ──────────────────────────────────────────────────

  List<T> _filter<T>(List<T> items, String Function(T) name) {
    final q = _searchCtrl.text.toLowerCase().trim();
    if (q.isEmpty) return items;
    return items.where((i) => name(i).toLowerCase().contains(q)).toList();
  }

  // ── Build ──────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.5,
      maxChildSize: 0.9,
      expand: false,
      builder: (ctx, scrollCtrl) => Column(
        children: [
          // Handle bar
          Center(
            child: Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(top: 12, bottom: 4),
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          // Title + breadcrumb + back/close
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
            child: Row(
              children: [
                IconButton(icon: const Icon(Icons.arrow_back), onPressed: _onBack),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _title,
                        style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
                      ),
                      if (_breadcrumb != null)
                        Text(
                          _breadcrumb!,
                          style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                          overflow: TextOverflow.ellipsis,
                        ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          // Search bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: TextField(
              controller: _searchCtrl,
              decoration: InputDecoration(
                hintText: 'Cari ${_hints[_step]}...',
                prefixIcon: const Icon(Icons.search, size: 20),
                isDense: true,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 10,
                ),
              ),
              onChanged: (_) => setState(() {}),
            ),
          ),
          const SizedBox(height: 4),
          // Content: loading / error / list
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _isFailed
                    ? _buildError()
                    : _buildList(scrollCtrl),
          ),
        ],
      ),
    );
  }

  Widget _buildError() => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 48, color: Colors.grey.shade400),
            const SizedBox(height: 12),
            Text(
              'Gagal memuat data',
              style: TextStyle(color: Colors.grey.shade600),
            ),
            const SizedBox(height: 12),
            FilledButton.tonalIcon(
              onPressed: _retry,
              icon: const Icon(Icons.refresh),
              label: const Text('Coba lagi'),
            ),
          ],
        ),
      );

  Widget _buildList(ScrollController sc) {
    switch (_step) {
      case 0:
        return _buildTiles<Distrik>(
          sc,
          _filter(_distriks, (d) => d.nama),
          (d) => d.nama,
          _onDistrikTap,
          'Tidak ada distrik tersedia',
        );
      case 1:
        return _buildTiles<Wilayah>(
          sc,
          _filter(_wilayahs, (w) => w.nama),
          (w) => w.nama,
          _onWilayahTap,
          'Tidak ada wilayah tersedia',
        );
      default:
        return _buildTiles<Ranting>(
          sc,
          _filter(_rantings, (r) => r.nama),
          (r) => r.nama,
          _onRantingTap,
          'Tidak ada ranting tersedia',
          finalChoice: true,
        );
    }
  }

  Widget _buildTiles<T>(
    ScrollController sc,
    List<T> items,
    String Function(T) name,
    void Function(T) onTap,
    String emptyMsg, {
    bool finalChoice = false,
  }) {
    if (items.isEmpty) {
      return Center(
        child: Text(emptyMsg, style: TextStyle(color: Colors.grey.shade500)),
      );
    }
    return ListView.builder(
      controller: sc,
      itemCount: items.length,
      itemBuilder: (_, i) => ListTile(
        leading: Icon(_icons[_step]),
        title: Text(name(items[i])),
        trailing: finalChoice ? null : const Icon(Icons.chevron_right),
        onTap: () => onTap(items[i]),
      ),
    );
  }
}