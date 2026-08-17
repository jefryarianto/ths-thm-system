const sharp = require('sharp');
const { readFileSync, writeFileSync } = require('fs');

function colorDist(a, b) { return Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2); }
function median(v){ if(!v.length) return 0; const s=[...v].sort((x,y)=>x-y); const m=Math.floor(s.length/2); return s.length%2?s[m]:(s[m-1]+s[m])/2; }

async function removeBg(input){
  const meta = await sharp(input).metadata();
  const { data, info } = await sharp(input).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const px = (x,y)=>(y*w+x)*4;
  const rgbAt = (x,y)=>[data[px(x,y)], data[px(x,y)+1], data[px(x,y)+2]];
  const border=[];
  const ring=3, step=Math.max(1, Math.floor((w+h)/200));
  for(let x=ring;x<w-ring;x+=step) border.push(rgbAt(x,ring), rgbAt(x,h-1-ring));
  for(let y=ring;y<h-ring;y+=step) border.push(rgbAt(ring,y), rgbAt(w-1-ring,y));
  const bgColor=[median(border.map(c=>c[0])), median(border.map(c=>c[1])), median(border.map(c=>c[2]))];
  const dists = border.map(c=>colorDist(c,bgColor)).sort((a,b)=>a-b);
  let clusterEnd = 40;
  for(let i=1;i<dists.length;i++){ const gap=dists[i]-dists[i-1]; if(gap>=8 && dists[i-1]<90){ clusterEnd=dists[i-1]; break; } }
  const tolerance = Math.max(32, Math.min(85, Math.ceil(clusterEnd*1.4)));
  const softMax = tolerance*1.9;
  const isBg = new Uint8Array(w*h), visited = new Uint8Array(w*h);
  const stack=[];
  const push=(x,y)=>{ const i=y*w+x; if(x<0||y<0||x>=w||y>=h||visited[i]) return; visited[i]=1;
    if(colorDist(rgbAt(x,y),bgColor)<=tolerance){ isBg[i]=1; stack.push(i); } };
  for(let x=0;x<w;x++){ push(x,0); push(x,h-1); }
  for(let y=0;y<h;y++){ push(0,y); push(w-1,y); }
  while(stack.length){ const i=stack.pop(); const x=i%w, y=(i-x)/w; push(x+1,y); push(x-1,y); push(x,y+1); push(x,y-1); }
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    const i=px(x,y);
    if(isBg[y*w+x]){ data[i+3]=0; }
    else { const d=colorDist([data[i],data[i+1],data[i+2]],bgColor);
      if(d<softMax){ const a=((d-tolerance)/(softMax-tolerance))*255; data[i+3]=Math.min(255,Math.max(0,Math.round(a))); } }
  }
  const out = await sharp(data,{raw:{width:w,height:h,channels:4}}).png({compressionLevel:9}).toBuffer();
  let cleared=0, kept=0;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const i=px(x,y); if(data[i+3]===0) cleared++; else kept++; }
  console.log(`size=${w}x${h} bg=${bgColor.map(c=>Math.round(c))} tol=${tolerance} cleared=${cleared} (${(cleared/(w*h)*100).toFixed(1)}%) kept=${kept}`);
  return out;
}

(async ()=>{
  const input = readFileSync('Jefry Arianto Baba.jpg');
  const out = await removeBg(input);
  writeFileSync('_scripts/jefry-bg-test.png', out);
  console.log('output bytes:', out.length);
})().catch(e=>{ console.error(e.message); process.exit(1); });
