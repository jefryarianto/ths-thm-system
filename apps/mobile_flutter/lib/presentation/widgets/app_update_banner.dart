import 'package:flutter/material.dart';

import '../../core/services/app_update_service.dart';
import '../../core/theme/app_theme.dart';

/// Banner himbauan pembaruan aplikasi di halaman login.
///
/// Membaca state [AppUpdateService.instance.notifier]:
/// - `updateAvailable` → banner emas "Versi baru tersedia" (bisa ditunda).
/// - `forceUpdate` → banner merah "Update wajib" (halaman login juga
///   menampilkan overlay blocking via [ForceUpdateOverlay]).
/// - `downloading` → progress unduhan inline.
class AppUpdateBanner extends StatelessWidget {
  const AppUpdateBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<AppUpdateState>(
      valueListenable: AppUpdateService.instance.notifier,
      builder: (context, state, _) {
        if (state.status == AppUpdateStatus.upToDate ||
            state.status == AppUpdateStatus.checking) {
          return const SizedBox.shrink();
        }

        final force = state.status == AppUpdateStatus.forceUpdate;
        final downloading = state.status == AppUpdateStatus.downloading;
        final info = state.info;

        final accent = force ? AppTheme.danger : AppTheme.primaryDark;
        final background = (force ? AppTheme.danger : AppTheme.primary)
            .withValues(alpha: 0.08);
        final icon = force
            ? Icons.error_outline
            : (downloading ? null : Icons.system_update_alt);

        return Container(
          width: double.infinity,
          margin: const EdgeInsets.only(bottom: 20),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: background,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: accent.withValues(alpha: 0.4)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  if (icon != null) ...[
                    Icon(icon, color: accent, size: 22),
                    const SizedBox(width: 10),
                  ],
                  Expanded(
                    child: Text(
                      force
                          ? 'Update wajib tersedia'
                          : (downloading
                              ? 'Mengunduh pembaruan…'
                              : 'Versi ${info?.versionName ?? 'baru'} tersedia'),
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: accent,
                      ),
                    ),
                  ),
                ],
              ),
              if (!downloading &&
                  info != null &&
                  info.changelog.trim().isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    info.changelog.trim(),
                    style: const TextStyle(
                        fontSize: 12, color: AppTheme.textSlate),
                  ),
                ),
              if (downloading)
                Padding(
                  padding: const EdgeInsets.only(top: 10),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: LinearProgressIndicator(
                      value: state.downloadProgress,
                      minHeight: 6,
                      backgroundColor: accent.withValues(alpha: 0.15),
                    ),
                  ),
                ),
              if (!downloading)
                Padding(
                  padding: const EdgeInsets.only(top: 10),
                  child: Align(
                    alignment: Alignment.centerRight,
                    child: FilledButton(
                      style: FilledButton.styleFrom(
                        backgroundColor: accent,
                        foregroundColor: Colors.white,
                        minimumSize: const Size(0, 40),
                        padding: const EdgeInsets.symmetric(horizontal: 18),
                        textStyle: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      onPressed: info == null
                          ? null
                          : () => AppUpdateService.instance
                              .downloadAndInstall(info),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.get_app, size: 18),
                          SizedBox(width: 6),
                          Text('Update'),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

/// Overlay layar penuh saat update WAJIB — menutupi halaman login sehingga
/// pengguna tidak dapat melanjutkan sebelum memperbarui aplikasi.
class ForceUpdateOverlay extends StatelessWidget {
  const ForceUpdateOverlay({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<AppUpdateState>(
      valueListenable: AppUpdateService.instance.notifier,
      builder: (context, state, _) {
        if (state.status == AppUpdateStatus.forceUpdate ||
            state.status == AppUpdateStatus.downloading) {
          final downloading = state.status == AppUpdateStatus.downloading;
          final info = state.info;

          return ColoredBox(
            color: Theme.of(context).scaffoldBackgroundColor,
            child: SafeArea(
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 420),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Icon(
                          downloading ? Icons.get_app : Icons.system_update_alt,
                          size: 64,
                          color: AppTheme.primary,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          downloading
                              ? 'Mengunduh ${info?.versionName ?? 'pembaruan'}…'
                              : 'Update Wajib',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            color: AppTheme.navy,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          downloading
                              ? 'Mohon tunggu unduhan selesai, lalu ikuti petunjuk '
                                  'instalasi dari sistem Android.'
                              : 'Anda harus memperbarui aplikasi THS-THM ke versi '
                                  'terbaru untuk melanjutkan.',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 14,
                            color: AppTheme.textSlate,
                          ),
                        ),
                        if (!downloading &&
                            info != null &&
                            info.changelog.trim().isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 12),
                            child: Text(
                              info.changelog.trim(),
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppTheme.textMuted,
                              ),
                            ),
                          ),
                        if (downloading)
                          Padding(
                            padding: const EdgeInsets.only(top: 24),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: LinearProgressIndicator(
                                value: state.downloadProgress,
                                minHeight: 8,
                              ),
                            ),
                          ),
                        if (!downloading)
                          Padding(
                            padding: const EdgeInsets.only(top: 28),
                            child: FilledButton(
                              onPressed: info == null
                                  ? null
                                  : () => AppUpdateService.instance
                                      .downloadAndInstall(info),
                              child: const Text('Perbarui Sekarang'),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          );
        }
        return const SizedBox.shrink();
      },
    );
  }
}
