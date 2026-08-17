const sharp = require('sharp');
const { readFileSync } = require('fs');
function colorDist(a,b){ return Math.sqrt((a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2); }
(async ()=>{
  const input = readFileSync('Jefry Arianto Baba.jpg');
  const { data, info } = await sharp(input).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w=info.width,h=info.height,px=(x,y)=>(y*w+x)*4;
  const rgbAt=(x,y)=>[data[px(x,y)],data[px(x,y)+1],data[px(x,y)+2]];
  const border=[]; const ring=3, step=Math.max(1,Math.floor((w+h)/200));
  for(let x=ring;x<w-ring;x+=step) border.push(rgbAt(x,ring),rgbAt(x,h-1-ring));
  for(let y=ring;y<h-ring;y+=step) border.push(rgbAt(ring,y),rgbAt(w-1-ring,y));
  const med=a=>{const s=[...a].sort((x,y)=>x-y);const m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2;};
  const bg=[med(border.map(c=>c[0])),med(border.map(c=>c[1])),med(border.map(c=>c[2]))];
  const dists=border.map(c=>colorDist(c,bg)).sort((a,b)=>a-b);
  console.log('bg',bg.map(c=>Math.round(c)));
  // histogram
  const buckets={};
  for(const d of dists){ const k=Math.floor(d/10)*10; buckets[k]=(buckets[k]||0)+1; }
  console.log('dist hist (from-to:count):', Object.entries(buckets).map(([k,v])=>`${k}-${+k+10}:${v}`).join(' '));
  // skin sample (dari area wajah yang diketahui ~209,155,129) — jarak dari bg
  const skin=[209,155,129];
  console.log('skin-to-bg dist:', colorDist(skin,bg).toFixed(1));
  // background jauh? cek pojok bawah: jacket blue
  console.log('bottom corner color:', rgbAt(3,h-4), 'dist:', colorDist(rgbAt(3,h-4),bg).toFixed(1));
})().catch(e=>{console.error(e);process.exit(1);});
