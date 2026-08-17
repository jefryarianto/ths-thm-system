/* eslint-env node */
/**
 * Config plugin — salin videothsnew.mp4 ke android/app/src/main/assets/videos/
 * saat prebuild (EAS Build memanggil `expo prebuild`). Login screen memutar video
 * via `asset:///videos/videothsnew.mp4` (ExoPlayer membaca asset native, tanpa
 * ketergantungan pada resolusi asset Metro yang rapuh di build lokal).
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withBundledVideo(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const src = path.join(projectRoot, 'assets', 'videos', 'videothsnew.mp4');
      const destDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'assets',
        'videos',
      );
      if (fs.existsSync(src)) {
        fs.mkdirSync(destDir, { recursive: true });
        fs.copyFileSync(src, path.join(destDir, 'videothsnew.mp4'));
      }
      return config;
    },
  ]);
};
