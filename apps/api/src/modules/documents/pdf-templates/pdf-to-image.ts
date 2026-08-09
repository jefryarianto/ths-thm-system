import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { execFile, spawnSync } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * Apakah binary `pdftoppm` (poppler-utils) tersedia di PATH?
 * Dievaluasi sekali saat modul dimuat.
 */
const HAS_PDFTOPPM = (() => {
  try {
    const res = spawnSync('pdftoppm', ['-v'], { stdio: 'ignore' });
    // pdftoppm -v menulis ke stderr dan keluar dengan kode non-zero pada versi lama,
    // jadi cukup cek bahwa binary ada (error != ENOENT).
    return !(res.error && (res.error as NodeJS.ErrnoException).code === 'ENOENT');
  } catch {
    return false;
  }
})();

/**
 * Convert PDF buffer to PNG image buffer.
 *
 * Prioritas: binary `pdftoppm` (poppler-utils, tersedia di image production
 * via Dockerfile `apk add poppler-utils`) — pdf-poppler TIDAK mendukung Linux
 * ("linux is NOT supported"). Fallback ke pdf-poppler hanya jika pdftoppm
 * tidak tersedia (mis. dev Windows tanpa poppler).
 */
export async function pdfToPng(pdfBuffer: Buffer): Promise<Buffer> {
  // Write PDF buffer to temp file
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-preview-'));
  const pdfPath = path.join(tmpDir, 'input.pdf');

  try {
    fs.writeFileSync(pdfPath, pdfBuffer);

    let pngPath: string;
    if (HAS_PDFTOPPM) {
      // Poppler pdftoppm: konversi halaman 1, 300 DPI, output page-1.png
      await execFileAsync('pdftoppm', [
        '-png',
        '-r', '300',
        '-f', '1',
        '-l', '1',
        pdfPath,
        path.join(tmpDir, 'page'),
      ]);
      pngPath = path.join(tmpDir, 'page-1.png');
    } else {
      // pdftoppm tidak tersedia (mis. dev Windows tanpa poppler) — fallback pdf-poppler
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfPoppler = require('pdf-poppler');
      const opts = {
        format: 'png',
        out_dir: tmpDir,
        out_prefix: 'page',
        page: 1, // Only first page
        scale: 300, // DPI
      };
      await pdfPoppler.convert(pdfPath, opts);
      pngPath = path.join(tmpDir, 'page-1.png');
    }

    // Read the generated PNG
    if (!fs.existsSync(pngPath)) {
      throw new Error('PDF to PNG conversion failed: output file not found');
    }

    const pngBuffer = fs.readFileSync(pngPath);
    return pngBuffer;
  } finally {
    // Cleanup temp files
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}