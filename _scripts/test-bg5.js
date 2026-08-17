const sharp = require('sharp');
(async ()=>{
  const { data, info } = await sharp('_scripts/jefry-bg-test.png').raw().toBuffer({ resolveWithObject: true });
  const w=info.width,h=info.height,px=(x,y)=>(y*w+x)*4;
  const probe=(x,y)=>{ const i=px(x,y); return `rgba(${data[i]},${data[i+1]},${data[i+2]},${data[i+3]})`; };
  // sisi kiri bawah & kanan bawah (di luar jaket) — area yang mungkin terisolasi
  console.log('left-bottom:', probe(4,600), probe(4,500), probe(4,400), probe(10,650));
  console.log('right-bottom:', probe(w-5,600), probe(w-5,500), probe(w-5,400), probe(w-10,650));
  // hitung piksel merah tersisa (alpha>0, r>200, g<130, b<130)
  let red=0;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const i=px(x,y); if(data[i+3]>0 && data[i]>200 && data[i+1]<130 && data[i+2]<130) red++; }
  console.log('red-ish opaque pixels remaining:', red);
})().catch(e=>{console.error(e);process.exit(1);});
