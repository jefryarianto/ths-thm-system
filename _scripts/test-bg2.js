const sharp = require('sharp');
(async ()=>{
  const { data, info } = await sharp('_scripts/jefry-bg-test.png').raw().toBuffer({ resolveWithObject: true });
  const w=info.width, h=info.height, px=(x,y)=>(y*w+x)*4;
  const probe=(x,y)=>{ const i=px(x,y); return `(${x},${y}) rgba(${data[i]},${data[i+1]},${data[i+2]},${data[i+3]})`; };
  console.log('corners:', probe(2,2), probe(w-3,2), probe(2,h-3), probe(w-3,h-3));
  console.log('center:', probe(w/2,h/2));
  // scan baris tengah untuk cek transisi: apakah ada pita alpha parsial yang wajar
  let partial=0;
  for(let x=0;x<w;x++){ const a=data[px(x,Math.floor(h*0.55))+3]; if(a>0 && a<255) partial++; }
  console.log('partial-alpha px on mid line:', partial);
  // bounding box konten (alpha>0)
  let minX=w,minY=h,maxX=0,maxY=0;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ if(data[px(x,y)+3]>10){ if(x<minX)minX=x; if(x>maxX)maxX=x; if(y<minY)minY=y; if(y>maxY)maxY=y; } }
  console.log(`content bbox: x ${minX}-${maxX} y ${minY}-${maxY} (${maxX-minX}x${maxY-minY})`);
})().catch(e=>{ console.error(e); process.exit(1); });
