export function buildCardPreviewHtml(imageUrl: string) {
  const url = imageUrl.replace(/"/g, '&quot;');
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>KTA</title>
<style>
@page { size: 85.6mm 53.98mm; margin: 0 }
html, body { margin: 0; padding: 0; background: #ffffff; }
.side { position: relative; width: 85.6mm; height: 53.98mm; overflow: hidden; page-break-after: always; break-after: page; }
.side:last-child { page-break-after: auto; break-after: auto; }
.side img { position: absolute; left: 0; width: 85.6mm; max-width: none; }
.front img { top: 0; }
.back img { top: -53.98mm; }
</style></head><body>
<div class="side front"><img src="${url}" alt="Depan" /></div>
<div class="side back"><img src="${url}" alt="Belakang" /></div>
<script>
let loaded = 0;
function ready() { if (++loaded === 2) window.print(); }
Array.from(document.images).forEach((img) => { if (img.complete) ready(); else img.onload = ready; });
</script>
</body></html>`;
}

export async function previewDigitalCardImage(memberId: string) {
  const token = localStorage.getItem('accessToken');
  const endpoint = `${window.location.origin}/api/members/${encodeURIComponent(memberId)}/digital-card/image`;
  const response = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Gagal memuat gambar KTA');

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const win = window.open('', '_blank');
  if (!win) {
    URL.revokeObjectURL(url);
    return;
  }

  win.document.write(buildCardPreviewHtml(url));
  win.document.close();
  win.focus();
  win.addEventListener('unload', () => URL.revokeObjectURL(url), { once: true });
  window.addEventListener('unload', () => URL.revokeObjectURL(url), { once: true });
}
