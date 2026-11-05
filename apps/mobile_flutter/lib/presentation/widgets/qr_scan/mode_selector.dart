// Mode Selector Widget - Switch between verify, checkin, lookup modes
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../logic/auth/auth_bloc.dart';
import '../widgets/qr_scan/qr_scan_models.dart';

class ModeSelector extends StatelessWidget {
  final ScanMode selectedMode;
  final ValueChanged<ScanMode> onModeChanged;
  final bool isActivityAdmin;
  final bool isExaminer;

  const ModeSelector({
    super.key,
    required this.selectedMode,
    required this.onModeChanged,
    required this.isActivityAdmin,
    required this.isExaminer,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final modes = _getAvailableModes();

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: modes.map<Widget>((_ModeInfo mode) {
          final isSelected = selectedMode == mode.mode;
          return Expanded(
            child: GestureDetector(
              onTap: () => onModeChanged(mode.mode),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
                decoration: BoxDecoration(
                  color: isSelected
                      ? theme.colorScheme.primary
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      mode.icon,
                      size: 20,
                      color: isSelected
                          ? theme.colorScheme.onPrimary
                          : theme.colorScheme.onSurfaceVariant,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      mode.label,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                        color: isSelected
                            ? theme.colorScheme.onPrimary
                            : theme.colorScheme.onSurfaceVariant,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  List<_ModeInfo> _getAvailableModes() {
    final List<_ModeInfo> modes = [
      _ModeInfo(ScanMode.verify, Icons.verified_outlined, 'Verifikasi'),
    ];

    if (isActivityAdmin || isExaminer) {
      modes.add(_ModeInfo(ScanMode.checkin, Icons.check_circle_outline, 'Check-In'));
    }

    modes.add(_ModeInfo(ScanMode.lookup, Icons.search, 'Cari Anggota'));

    return modes;
  }
}

class _ModeInfo {
  final ScanMode mode;
  final IconData icon;
  final String label;

  _ModeInfo(this.mode, this.icon, this.label);
}