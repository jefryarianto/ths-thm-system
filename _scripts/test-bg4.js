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
  // largest gap
  let bestGap=-1, bestIdx=-1;
  for(let i=1;i<dists.length;i++){
    const g=dists[i]-dists[i-1];
    if(g>bestGap){ bestGap=g; bestIdx=i-1; }
  }
  const tol1 = dists[bestIdx];
  // cari gap besar pertama (cluster bg berakhir): scan dari kecil, ambil gap pertama >= 8 setelah nilai kecil
  let tol2=0, found=false;
  for(let i=1;i<dists.length;i++){
    const g=dists[i]-dists[i-1];
    if(g>=8 && dists[i-1]<90){ tol2=dists[i-1]; found=true; break; }
  }
  console.log('largest gap:', bestGap.toFixed(1), 'at dist', tol1.toFixed(1), `(idx ${bestIdx}/${dists.length})`);
  console.log('first gap>=8 below 90:', found? tol2.toFixed(1):'none');
  // usulan toleransi
  const tol = found ? Math.max(32, Math.min(85, Math.ceil(tol2*1.4))) : Math.max(32, Math.min(85, Math.ceil(tol1*1.4)));
  console.log('proposed tolerance:', tol);
})().catch(e=>{console.error(e);process.exit(1);});
