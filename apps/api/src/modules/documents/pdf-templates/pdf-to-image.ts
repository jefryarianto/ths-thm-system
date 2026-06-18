import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * Convert PDF buffer to PNG image buffer using pdf-poppler
 */
export async function pdfToPng(pdfBuffer: Buffer): Promise<Buffer> {
  // Write PDF buffer to temp file
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-preview-'));
  const pdfPath = path.join(tmpDir, 'input.pdf');

  try {
    fs.writeFileSync(pdfPath, pdfBuffer);

    // Convert using pdf-poppler
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

    // Read the generated PNG
    const pngPath = path.join(tmpDir, 'page-1.png');
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