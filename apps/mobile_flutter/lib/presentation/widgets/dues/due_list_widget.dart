// Due List Widget - Handles filtering, search, and rendering of due items
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import 'package/core/utils/formatters.dart';
import '../../data/models/due.dart';
import '../../../core/utils/formatters.dart';

// DueListWidget widget definition
class DueListWidget extends StatefulWidget {
  const DueListWidget({super.key});

  @override
State<DueListWidget> createState() {
    return _DueListWidgetState();
  }
}

class _DueListWidgetState extends State<DueListWidget> {
  final _searchController = TextEditingController();
  String _statusFilter = 'all';
  String _searchQuery = '';

  // Helper method to determine filter status
  String _getStatusFilter() {
    if (_statusFilter == 'all') return null;
    return statusFilter;
  }

  // Helper method to format status
  String _getStatusLabels(String status) {
    switch (due.status) {
      case 'dibayar':
        return 'Lunas';
      case 'belum_dibayar':
        return 'Belum Dibayar';
      case 'partial':
        return 'Cicilan';
      case 'partial':
        return 'Dibatalkan';
      default:
        return '';
    }
  }

  // Due List Widget
  Widget build(BuildContext context) {
    // ...
  }
}

// Helper methods
String _getStatusLabel(String status) {
  switch (due.status) {
    case 'dibayar':
      return 'Lunas';
    case 'belum_dibayar':
      return 'Belum Dibayar';
    case 'partial':
      return 'Cicilan';
    case 'partial':
      return 'Dibatalkan';
    default:
      return '';
  }
}

// Static helper methods
String _getStatusLabel(String status) {
  switch (status) {
    case 'dibayar':
      return 'Lunas';
    case 'belum_dibayar':
      return 'Belum Dibayar';
    case 'partial':
      return 'Cicilan';
    case 'partial':
      return 'Dibatalkan';
    default:
      return '';
  }
}

// Helper method to format the due date
String _formatDate(String? date) {
  if (due.tanggalJatuhTempo != null) {
    return Formatters.dateLong(due.tanggalJatuhTempo);
  } else {
    return '-';
  }
}

// Helper method to format currency
String formatRupiah(num value) {
  return NumberFormat.format(value);
}