/** Contoh pengujian lokal, BUKAN endpoint publik.
 * npm install -D playwright
 * npx playwright install chromium
 * node export-pdf.mjs http://localhost:3000/kta-contoh kartu.pdf
 * Jangan teruskan URL dari input pengguna ke skrip ini (risiko SSRF).
 */
import { chromium } from 'playwright';
import { resolve } from 'node:path';
const [, , url, output] = process.argv;
if (!url || !output) throw new Error('Penggunaan: node export-pdf.mjs URL_TERKENDALI output.pdf');
const parsed = new URL(url);
if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('URL harus HTTP(S).');
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  // Untuk halaman privat, gunakan mekanisme sesi yang aman dari aplikasi Anda.
  await page.goto(parsed.href, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-kta-ready="true"]', { timeout: 30000 });
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: resolve(output), preferCSSPageSize: true, printBackground: true });
  console.log(`PDF tersimpan: ${output}. Periksa ukuran; gunakan normalize-pdf.mjs jika perlu.`);
} finally { await browser.close(); }
