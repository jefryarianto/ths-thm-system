import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// Field pencarian konsisten untuk seluruh layar daftar.
///
/// Mengganti `InputDecoration` inline yang duplikat di tiap layar.
/// Desain: surface container, radius md, prefix icon, dan tombol clear
/// hanya muncul saat ada teks — memberi feedback jelas ke user.
class AppSearchField extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final String hintText;
  final IconData icon;

  const AppSearchField({
    super.key,
    required this.controller,
    required this.onChanged,
    this.hintText = 'Cari…',
    this.icon = Icons.search_rounded,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ValueListenableBuilder<TextEditingValue>(
      valueListenable: controller,
      builder: (context, value, _) {
        return TextField(
          controller: controller,
          onChanged: onChanged,
          textInputAction: TextInputAction.search,
          // Label semantik untuk screen reader — input "Cari" tidak boleh
          // hanya dibedakan dari ikon.
          decoration: InputDecoration(
            hintText: hintText,
            prefixIcon: Icon(icon, size: 20),
            prefixIconColor: theme.colorScheme.onSurfaceVariant,
            suffixIcon: value.text.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.close_rounded, size: 18),
                    tooltip: 'Hapus pencarian',
                    onPressed: () {
                      controller.clear();
                      onChanged('');
                    },
                  )
                : null,
            filled: true,
            fillColor: theme.colorScheme.surfaceContainerHigh,
            border: const OutlineInputBorder(
              borderRadius: AppTheme.radiusMdAll,
              borderSide: BorderSide.none,
            ),
            enabledBorder: const OutlineInputBorder(
              borderRadius: AppTheme.radiusMdAll,
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: AppTheme.radiusMdAll,
              borderSide: BorderSide(
                color: theme.colorScheme.primary,
                width: 1.6,
              ),
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: AppTheme.space12,
              vertical: AppTheme.space12,
            ),
          ),
        );
      },
    );
  }
}
