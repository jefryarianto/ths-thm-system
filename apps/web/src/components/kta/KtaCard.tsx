'use client';
import {useEffect,useId,useRef,useState, type RefObject} from 'react';
import QRCode from 'qrcode';
import type {Anggota} from './types';
import {W,H,pt,y,u,fitSingle,wrap,expiry,type Measure} from './layout';

type Props={side:'depan'|'belakang'; anggota:Anggota; assetBase?:string; svgRef?:{current:SVGSVGElement|null}; onWarnings?:(messages:string[])=>void};
const rank:Record<Anggota['tingkatan'],{count:number;color:string}>={pratama:{count:1,color:'#185AB5'},tamtama:{count:2,color:'#185AB5'},muda:{count:1,color:'#E4B500'},madya:{count:2,color:'#E4B500'},utama:{count:3,color:'#E4B500'}};
const fallback:Measure=(s,size)=>s.length*size*.72;
const Text=(p:React.SVGProps<SVGTextElement>)=><text fontFamily="KTADejaVu, DejaVu Sans, sans-serif" {...p}/>;
const v=(s?:string)=>s?.trim()?u(s):'[BELUM DIISI]';

function HeaderText({x,baseline,size,text,yellow=false}:{x:number;baseline:number;size:number;text:string;yellow?:boolean}) {
  return <g fontSize={size} fontWeight="700" textAnchor="end" aria-label={text}>
    <Text x={x+1.4} y={baseline+1.4} fill="#17394F" aria-hidden="true">{text}</Text>
    <Text x={x-.9} y={baseline-.9} fill={yellow?'#FFF2A1':'#FFFFFF'} aria-hidden="true">{text}</Text>
    <Text x={x} y={baseline} fill={yellow?'#F8DB38':'#DFEAF3'}>{text}</Text>
  </g>;
}
function Qr({data,logo,id}:{data:string;logo:string;id:string}) {
  let qr:ReturnType<typeof QRCode.create>;
  try{qr=QRCode.create(data,{errorCorrectionLevel:'H'});}catch{return null;}
  const n=qr.modules.size, q=4, full=n+q*2, squares:React.ReactNode[]=[];
  for(let row=0;row<n;row++) for(let col=0;col<n;col++) if(qr.modules.get(row,col)) squares.push(<rect key={`${row}-${col}`} x={col+q} y={row+q} width="1" height="1"/>);
  const middle=full/2, logoWidth=Math.max(3,Math.round(n*.08));
  return <svg x="641" y={y(22)} width="185" height="185" viewBox={`0 0 ${full} ${full}`}>
    <defs><linearGradient id={id} x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#143B76"/><stop offset="1" stopColor="#3373AE"/></linearGradient></defs>
    <rect width={full} height={full} fill="#fff"/><g shapeRendering="crispEdges" fill={`url(#${id})`}>{squares}</g>
    <circle cx={middle} cy={middle} r={logoWidth*.70} fill="#fff"/><image href={logo} x={middle-logoWidth/2} y={middle-logoWidth/2} width={logoWidth} height={logoWidth} preserveAspectRatio="xMidYMid meet"/>
  </svg>;
}

export function KtaCard({side,anggota:a,assetBase='/kta',svgRef,onWarnings}:Props){
  const id=useId().replace(/:/g,'');const base=assetBase.replace(/\/$/,'');
  const [ready,setReady]=useState(false);
  const [measure,setMeasure]=useState<Measure>(()=>fallback);
  const localRef=useRef<SVGSVGElement|null>(null);
  // SVG font metrics can vary with the viewport. Measure at BOTH the live preview
  // width and 2022px export width; choose the larger to preserve gaps in both.
  useEffect(()=>{
    let active=true;let observer:ResizeObserver|undefined;const probes:SVGSVGElement[]=[];
    document.fonts.ready.then(()=>{
      if(!active)return;
      const ns='http://www.w3.org/2000/svg';
      const makeProbe=()=>{const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.setAttribute('aria-hidden','true');svg.style.cssText='position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none;overflow:hidden';const text=document.createElementNS(ns,'text');text.setAttribute('font-family','KTADejaVu, DejaVu Sans, sans-serif');svg.appendChild(text);document.body.appendChild(svg);probes.push(svg);return {svg,text};};
      const preview=makeProbe(), exported=makeProbe();exported.svg.style.width='2022px';exported.svg.style.height=`${2022*H/W}px`;
      const update=()=>{if(!active)return;const width=localRef.current?.getBoundingClientRect().width||856;preview.svg.style.width=`${width}px`;preview.svg.style.height=`${width*H/W}px`;
        const get:Measure=(text,size,bold)=>{for(const el of [preview.text,exported.text]){el.setAttribute('font-size',String(size));el.setAttribute('font-weight',bold?'700':'400');el.textContent=text;}return Math.max(preview.text.getComputedTextLength(),exported.text.getComputedTextLength());};
        setMeasure(()=>get);setReady(true);
      };
      update();if(typeof ResizeObserver!=='undefined' && localRef.current){observer=new ResizeObserver(update);observer.observe(localRef.current);}
    });
    return()=>{active=false;observer?.disconnect();probes.forEach(p=>p.remove());};
  },[]);
  const nameText=v(a.nama), sex=a.jenisKelamin||'';
  const name=fitSingle(nameText,506-(sex?40+pt(7):0),pt(7),pt(3.8),measure);
  const genderX=306+measure(name.text,name.size,true)+40;
  const backName=fitSingle(nameText,508-(sex?90+pt(5.3):0),pt(5.3),pt(3.6),measure,false);
  const backGenderX=292+measure(backName.text,backName.size,false)+90;
  const dadar=fitSingle([a.tempatDadar,a.tahunDadar].filter(Boolean).join(', ')||'[BELUM DIISI]',275,pt(5.1),pt(3.8),measure);
  const branch=wrap(a.ranting||'[BELUM DIISI]',275,3,pt(5.1),pt(3.8),measure);
  const number=fitSingle(a.nomor||'[BELUM DIISI]',275,pt(5.2),pt(3.8),measure);
  const address=wrap(a.alamat||'[BELUM DIISI]',520,3,pt(5.3),pt(4),measure,false);
  const birth=fitSingle(v(a.tempatTanggalLahir),520,pt(5.3),pt(4),measure,false);
  const job=fitSingle(v(a.pekerjaan),520,pt(5.3),pt(4),measure,false);
  const status=fitSingle(v(a.status),520,pt(5.3),pt(4),measure,false);
  const pelantikan=fitSingle(v(a.tanggalPelantikan || a.tahunPelantikan),520,pt(5.3),pt(4),measure,false);
  const coordinator=fitSingle(a.koordinator||'E. HENDRIKUS MASAN BEDA',330,pt(5),pt(3.8),measure,false);
  const issue=fitSingle('TANGGAL TERBIT : '+(a.tanggalTerbit||'...............'),360,pt(5),pt(3.6),measure,false);
  const messages:string[]=[];
  if(name.overflow||backName.overflow)messages.push('Nama terlalu panjang; mohon ringkas atau atur layout secara manual.');
  if(dadar.overflow)messages.push('Tempat/tahun Dadar terlalu panjang.');
  if(branch.overflow)messages.push('Ranting terlalu panjang untuk tiga baris.');
  if(number.overflow)messages.push('Nomor anggota terlalu panjang.');
  if(address.overflow)messages.push('Alamat terlalu panjang untuk tiga baris.');
  if([birth,job,status,pelantikan].some(x=>x.overflow))messages.push('Salah satu data belakang terlalu panjang.');
  if(coordinator.overflow||issue.overflow)messages.push('Teks footer belakang terlalu panjang.');
  if(a.berlakuSampai && expiry(a.berlakuSampai)==='FORMAT?')messages.push('Berlaku sampai harus berupa YYYY-MM.');
  if(!a.qrImageUrl && a.verifyUrl){try{const uri=new URL(a.verifyUrl);if(!['http:','https:'].includes(uri.protocol))throw Error();QRCode.create(a.verifyUrl,{errorCorrectionLevel:'H'});}catch{messages.push('URL verifikasi tidak valid atau terlalu panjang untuk QR.');}}
  const messageKey=messages.join('\n');
  useEffect(()=>{if(ready)onWarnings?.(messageKey?messageKey.split('\n'):[]);},[ready,messageKey,onWarnings]);
  const badge=rank[a.tingkatan]||rank.pratama;
  const badgeYs=badge.count===1?[470.3]:badge.count===2?[y(6.45)-15,y(4.45)-15]:[454.8,470.8,486.8];
  // y(6.45)-15 equals top of upper stripe; photo and badge both 24 mm wide.
  const backRows=[['NAMA LENGKAP',backName],['TEMPAT / TANGGAL LAHIR',birth],['PEKERJAAN',job],['STATUS',status],['PELANTIKAN',pelantikan]] as const;
  return <svg ref={node=>{localRef.current=node;if(svgRef)svgRef.current=node;}} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`KTA sisi ${side}`} className="kta-svg" data-side={side}>
   <defs><clipPath id={`clip-${id}`}><rect x="0" y="0" width={W} height={H} rx="31.8"/></clipPath><clipPath id={`photo-${id}`}><rect x="44" y="145.8" width="240" height="300" rx="14"/></clipPath></defs>
   <g clipPath={`url(#clip-${id})`}>
    <image href={`${base}/background/${side}.png`} x="0" y="0" width={W} height={H} preserveAspectRatio="none"/>
    {side==='depan'? <>
     <image href={`${base}/logo.png`} x="700" y="30.8" width="112" height="112"/>
     <HeaderText x={683} baseline={y(49.45)} size={pt(5.2)} text="ORGANISASI PENCAK SILAT PENDIDIKAN"/>
     <HeaderText x={683} baseline={y(46.4)} size={pt(6.4)} text="TUNGGAL HATI SEMINARI – TUNGGAL HATI MARIA"/>
     <HeaderText x={683} baseline={y(43.1)} size={pt(5.6)} text="DISTRIK KEUSKUPAN LARANTUKA"/>
     <HeaderText x={683} baseline={y(37.1)} size={pt(6.4)} text="KARTU TANDA ANGGOTA" yellow/>
     <rect x="44" y="145.8" width="240" height="300" rx="14" fill="#DDE6EA"/>
     {a.fotoUrl && <image href={a.fotoUrl} x="44" y="145.8" width="240" height="300" preserveAspectRatio="xMidYMid slice" clipPath={`url(#photo-${id})`}/>}
     <rect x="44" y="453.8" width="240" height="48" rx="3" fill="#fff" stroke="#A9B9CB" strokeWidth="1"/>
     {badgeYs.map((yy,i)=><rect key={i} x="47.5" y={yy} width="233" height="15" rx="1.5" fill={badge.color}/>)}
     <Text x="306" y={y(33.5)} fontWeight="700" fontSize={pt(4)} fill="#000">NAMA LENGKAP</Text>
     <g fontWeight="700" fontSize={name.size}>
      <Text x="307.3" y={y(30.7)+1.2} fill="#8193A0" aria-hidden="true">{name.text}</Text><Text x="305.2" y={y(30.7)-.8} fill="#fff" aria-hidden="true">{name.text}</Text><Text x="306" y={y(30.7)} fill="#111C25">{name.text}</Text>
      {sex && <Text x={genderX} y={y(30.7)} fill="#000">{sex}</Text>}
     </g>
     <Text x="306" y={y(26.6)} fontSize={pt(4)} fontWeight="700">TEMPAT / TAHUN DADAR</Text>
     <Text x="306" y={y(23.8)} fontSize={dadar.size} fontWeight="700">{dadar.text}</Text>
     <Text x="306" y={y(19.7)} fontSize={pt(4)} fontWeight="700">RANTING</Text>
     {branch.lines.map((line,i)=><Text key={i} x="306" y={y(16.9)+i*25} fontSize={branch.size} fontWeight="700">{line}</Text>)}
     <Text x="306" y={y(7.7)} fontSize={pt(4)} fontWeight="700">NO. ANGGOTA</Text>
     <Text x="306" y={y(4.9)} fontSize={number.size} fontWeight="700">{number.text}</Text>
     <Text x="733.5" y={y(23.4)} textAnchor="middle" fontSize={pt(5)} fontWeight="700">EXP: {expiry(a.berlakuSampai)}</Text>
     <line x1="625" y1={y(20.99)} x2="625" y2={y(4.51)} stroke="#0B377B" strokeWidth="1.235"/>
     {a.qrImageUrl ? <image href={a.qrImageUrl} x="641" y={y(22)} width="185" height="185" preserveAspectRatio="xMidYMid meet"/> : a.verifyUrl ? <Qr data={a.verifyUrl} logo={`${base}/logo.png`} id={`qr-${id}`}/> : null}
    </>:<>
     <Text x="44" y={y(48.65)} fill="#F8DB38" fontWeight="700" fontSize={pt(7)}>DATA ANGGOTA</Text>
     {backRows.map(([label,value],i)=><g key={label}>
       <Text x="44" y={y(41.4-i*4)} fontWeight="700" fontSize={pt(4)}>{label}</Text><Text x="271" y={y(41.4-i*4)} fontWeight="700" fontSize={pt(4)}>:</Text>
       <Text x="292" y={y(41.4-i*4)} fontSize={value.size}>{value.text}</Text>
       {i===0 && sex && <Text x={backGenderX} y={y(41.4)} fontSize={pt(5.3)}>{sex}</Text>}
     </g>)}
     <Text x="44" y={y(21.4)} fontWeight="700" fontSize={pt(4)}>ALAMAT</Text><Text x="271" y={y(21.4)} fontWeight="700" fontSize={pt(4)}>:</Text>
     {address.lines.map((line,i)=><Text key={i} x="292" y={y(21.4)+24*i} fontSize={address.size}>{line}</Text>)}
     <Text x="44" y={y(3.5)} fontSize={issue.size}>{issue.text}</Text>
     <Text x="481" y={y(12.2)} fontSize={pt(4)} fontWeight="700">KOORDINATOR DISTRIK</Text>
     {a.tandaTanganUrl && <image href={a.tandaTanganUrl} x="481" y="421" width="254" height="50" preserveAspectRatio="xMidYMid meet"/>}
     <line x1="481" y1={y(5.7)} x2={481+measure(coordinator.text,coordinator.size,false)} y2={y(5.7)} stroke="#0B377B" strokeWidth="1.6"/>
     <Text x="481" y={y(3.5)} fontSize={coordinator.size}>{coordinator.text}</Text>
    </>}
    {/* Mikroteks adalah lapisan SVG; file gambar latar tetap tanpa tulisan. */}
    <Text x="-20" y={y(.75)} fontSize={pt(2.6)} fill="#0B377B" aria-label={side==='depan'?'PRO PATRIA ET ECCLESIA':'Fortiter in Re, Suaviter in Modo'}>
      {Array(18).fill(side==='depan'?'PRO PATRIA ET ECCLESIA •':'Fortiter in Re, Suaviter in Modo •').join(' ')}
    </Text>
   </g>
  </svg>;
}
