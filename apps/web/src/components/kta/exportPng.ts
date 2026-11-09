/** Rasterizes the live SVG after embedding fonts and images, avoiding CSS/font loss.
 * Remote images must be CORS-readable. No member data is sent anywhere here. */
async function dataURL(blob:Blob):Promise<string>{return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(new Error('Gagal membaca aset.'));r.readAsDataURL(blob);});}
async function embed(href:string){
  if(href.startsWith('data:'))return href;
  let response:Response;
  try{response=await fetch(href,{mode:'cors'});}catch{throw new Error(`Aset tidak dapat diambil (periksa CORS): ${href}`);}
  if(!response.ok)throw new Error(`Aset tidak ditemukan (${response.status}): ${href}`);
  return dataURL(await response.blob());
}
export async function downloadCardPng(svg:SVGSVGElement,side:'depan'|'belakang',assetBase='/kta'){
  await document.fonts.ready;
  await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
  const node=svg.cloneNode(true) as SVGSVGElement;
  const images=Array.from(node.querySelectorAll('image'));
  await Promise.all(images.map(async image=>{const href=image.getAttribute('href');if(href)image.setAttribute('href',await embed(href));}));
  const base=assetBase.replace(/\/$/,'');
  const [regular,bold]=await Promise.all([embed(`${base}/fonts/DejaVuSans.ttf`),embed(`${base}/fonts/DejaVuSans-Bold.ttf`)]);
  const defs=node.querySelector('defs')||node.insertBefore(document.createElementNS('http://www.w3.org/2000/svg','defs'),node.firstChild);
  const style=document.createElementNS('http://www.w3.org/2000/svg','style');
  style.textContent=`@font-face{font-family:KTADejaVu;src:url('${regular}') format('truetype');font-weight:400}@font-face{font-family:KTADejaVu;src:url('${bold}') format('truetype');font-weight:700}`;
  defs.appendChild(style);node.setAttribute('width','2022');node.setAttribute('height','1275');
  const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(node)],{type:'image/svg+xml;charset=utf-8'}));
  try{
    const img=new Image();await new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=()=>reject(new Error('SVG tidak dapat dirender menjadi gambar.'));img.src=url;});
    const c=document.createElement('canvas');c.width=2022;c.height=1275;const ctx=c.getContext('2d');if(!ctx)throw new Error('Canvas tidak tersedia.');ctx.drawImage(img,0,0,c.width,c.height);
    const blob=await new Promise<Blob>((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('Gagal membuat PNG.')),'image/png'));
    const out=URL.createObjectURL(blob);const link=document.createElement('a');link.href=out;link.download=`KTA-${side}.png`;link.click();setTimeout(()=>URL.revokeObjectURL(out),3000);
  }finally{URL.revokeObjectURL(url);}
}
