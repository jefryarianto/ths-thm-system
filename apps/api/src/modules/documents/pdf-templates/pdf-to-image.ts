import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * Convert PDF buffer to PNG image buffer.
 *
 * Prioritas: binary `pdftoppm` (poppler-utils, tersedia di image production
 * via Dockerfile `apk add poppler-utils`) — pdf-poppler TIDAK mendukung Linux
 * ("linux is NOT supported"). Fallback ke pdf-poppler untuk dev Windows.
 */
export async function pdfToPng(pdfBuffer: Buffer): Promise<Buffer> {
  // Write PDF buffer to temp file
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-preview-'));
  const pdfPath = path.join(tmpDir, 'input.pdf');

  try {
    fs.writeFileSync(pdfPath, pdfBuffer);

    let pngPath: string;
    try {
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
    } catch {
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