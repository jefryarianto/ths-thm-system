// Due List Widget - Handles filtering, search, and rendering of due items
import 'package:flutter/material.dart';


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
  // Due List Widget
  @override
  Widget build(BuildContext context) {
    return const SizedBox.shrink();
  }
}

// Helper method to format currency
String formatRupiah(num value) {
  return Formatters.rupiah(value);
}