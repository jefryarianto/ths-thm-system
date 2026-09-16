import 'package:flutter/material.dart';

/// Tampilkan SnackBar (toast) terpusat di tengah layar.
///
/// Margin vertikal diproporsikan terhadap tinggi layar agar toast tampil di
/// tengah (bukan menempel di bawah), dengan margin horizontal 24 di kedua sisi.
void showCenteredSnackBar(
  BuildContext context,
  String message, {
  Duration? duration,
}) {
  final vertical = MediaQuery.of(context).size.height * 0.30;
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(message),
      duration: duration ?? const Duration(seconds: 2),
      behavior: SnackBarBehavior.floating,
      margin: EdgeInsets.symmetric(horizontal: 24, vertical: vertical),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ),
  );
}
