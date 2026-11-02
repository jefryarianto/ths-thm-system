/** Contoh opsional: npm install pdf-lib
 * node normalize-pdf.mjs hasil-browser.pdf hasil-cetak.pdf
 * Membetulkan pembulatan page size browser, menambahkan TrimBox dan BleedBox.
 * Hanya untuk PDF dua halaman yang dibuat dari halaman cetak KTA ini.
 */
import { PDFDocument } from 'pdf-lib';
import { readFile, writeFile } from 'node:fs/promises';
const [, , input, output] = process.argv;
if (!input || !output) throw new Error('Penggunaan: node normalize-pdf.mjs input.pdf output.pdf');
const mm = n => n * 72 / 25.4;
const doc = await PDFDocument.load(await readFile(input));
if (doc.getPageCount() !== 2) throw new Error('Diharapkan tepat dua halaman KTA.');
for (const page of doc.getPages()) {
  const { width, height } = page.getSize();
  if (Math.abs(width - mm(89.6)) > mm(2) || Math.abs(height - mm(57.98)) > mm(2))
    throw new Error('Ukuran halaman jauh dari ukuran KTA. Pastikan preferCSSPageSize dan @page aktif.');
  page.scaleContent(mm(89.6) / width, mm(57.98) / height);
  page.setMediaBox(0, 0, mm(89.6), mm(57.98));
  page.setCropBox(0, 0, mm(89.6), mm(57.98));
  page.setBleedBox(0, 0, mm(89.6), mm(57.98));
  page.setTrimBox(mm(2), mm(2), mm(85.6), mm(53.98));
}
await writeFile(output, await doc.save());
console.log(`Selesai: ${output}. Pastikan kembali hasil cetak dan pemindaian QR.`);
