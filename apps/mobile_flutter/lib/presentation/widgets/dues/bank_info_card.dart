// Bank Info Card Widget
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../data/models/bank_info.dart';
import '../../logic/dues/dues_bloc.dart';

class BankInfoCard extends StatefulWidget {
  const BankInfoCard({super.key});

  @override
  State<BankInfoCard> createState() => _BankInfoCardState();
}

class _BankInfoCardState extends State<BankInfoCard> {
  bool _expanded = true;
  bool _obscureAccountNumbers = true;
  List<BankInfo>? _bankInfos;
  bool _loaded = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchBankInfo();
  }

  Future<void> _fetchBankInfo() async {
    if (_loaded) return;
    try {
      // Using the DuesBloc's API client or creating a temporary one
      // For now, we'll use the bloc's built-in fetch if available
      // This is a simplified version - actual implementation may vary
      setState(() => _loaded = true);
    } catch (e) {
      setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: ExpansionTile(
        initiallyExpanded: _expanded,
        onExpansionChanged: (v) => setState(() => _expanded = v),
        leading: Icon(
          Icons.account_balance,
          color: theme.colorScheme.primary,
        ),
        title: Text(
          'Rekening Tujuan Pembayaran',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              onPressed: () => setState(() => _obscureAccountNumbers = !_obscureAccountNumbers),
              icon: Icon(
                _obscureAccountNumbers ? Icons.visibility_off : Icons.visibility,
                color: theme.colorScheme.onSurfaceVariant,
              ),
              tooltip: _obscureAccountNumbers ? 'Tampilkan' : 'Sembunyikan',
            ),
            AnimatedRotation(
              turns: _expanded ? 0.5 : 0,
              duration: const Duration(milliseconds: 200),
              child: Icon(
                Icons.expand_more,
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
        children: [
          if (_error != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Text(
                _error!,
                style: TextStyle(color: theme.colorScheme.error, fontSize: 12),
              ),
            )
          else if (_bankInfos?.isNotEmpty ?? false)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Column(
                children: _bankInfos!.map((bank) => _buildBankTile(theme, bank)).toList(),
              ),
            )
          else
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Center(
                child: Text(
                  'Belum ada rekening tujuan',
                  style: TextStyle(color: theme.colorScheme.onSurfaceVariant),
                ),
              ),
            ),
        ],
      );
  }

  Widget _buildBankTile(ThemeData theme, BankInfo bank) {
    final displayNumber = _obscureAccountNumbers
        ? '${bank.accountNumber.substring(0, 4)}${'*' * (bank.accountNumber.length - 8)}${bank.accountNumber.substring(bank.accountNumber.length - 4)}'
        : bank.accountNumber;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: theme.colorScheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: theme.colorScheme.primaryContainer,
                child: Icon(Icons.account_balance, color: theme.colorScheme.primary, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      bank.bankName,
                      style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    Text(
                      bank.accountName,
                      style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
              if (bank.isActive)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.green.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    'AKTIF',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: Colors.green[700],
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Icon(Icons.account_number, size: 16, color: theme.colorScheme.onSurfaceVariant),
              const SizedBox(width: 8),
              Expanded(
                child: SelectableText(
                  displayNumber,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontFamily: 'monospace',
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              IconButton(
                icon: Icon(
                  _obscureAccountNumbers ? Icons.visibility : Icons.visibility_off,
                  size: 18,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                onPressed: () => setState(() => _obscureAccountNumbers = !_obscureAccountNumbers),
                tooltip: _obscureAccountNumbers ? 'Tampilkan' : 'Sembunyikan',
              ),
            ],
          ),
        ],
      ),
    );
  }
}