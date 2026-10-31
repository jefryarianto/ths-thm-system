String nameInitials(String name) {
  final trimmed = name.trim();
  if (trimmed.isEmpty) return '?';
  final parts = trimmed.split(RegExp(r'\s+')).where((e) => e.isNotEmpty).toList();
  if (parts.isEmpty) return '?';
  if (parts.length == 1) {
    final w = parts[0];
    return (w.length >= 2 ? w.substring(0, 2) : w).toUpperCase();
  }
  return ((parts[0].isNotEmpty ? parts[0][0] : '') + (parts[1].isNotEmpty ? parts[1][0] : ''))
      .toUpperCase();
}
