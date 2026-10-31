String nameInitials(String name) {
  final trimmed = name.trim();
  if (trimmed.isEmpty) return '?';
  final parts = trimmed.split(RegExp(r'\s+')).where((e) => e.isNotEmpty).toList();
  if (parts.isEmpty) return '?';
  if (parts.length == 1) {
    final w = parts[0];
    return (w.length >= 3 ? w.substring(0, 3) : w).toUpperCase();
  }
  if (parts.length == 2) {
    final w1 = parts[0];
    final w2 = parts[1];
    return ((w1.isNotEmpty ? w1[0] : '') + (w2.length >= 2 ? w2.substring(0, 2) : w2)).toUpperCase();
  }
  final w1 = parts[0];
  final w2 = parts[1];
  final w3 = parts[2];
  return ((w1.isNotEmpty ? w1[0] : '') + (w2.isNotEmpty ? w2[0] : '') + (w3.isNotEmpty ? w3[0] : '')).toUpperCase();
}
