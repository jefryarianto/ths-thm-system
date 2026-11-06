'use client';
// Copy `components` and `public/kta` into your project, import kta-fonts.css at root.
import {useCallback,useRef,useState} from 'react';
import {KtaCard} from '../components/KtaCard';
import {downloadCardPng} from '../components/exportPng';
import type {Anggota} from '../components/types';

export function PasangDiWebsite({anggota}:{anggota:Anggota}) {
  const depan=useRef<SVGSVGElement>(null);
  const belakang=useRef<SVGSVGElement>(null);
  const [errors,setErrors]=useState<string[]>([]);
  const [exportError,setExportError]=useState('');
  const handleWarnings=useCallback((v:string[])=>setErrors(v),[]);
  async function unduh(side:'depan'|'belakang'){
    const svg=side==='depan'?depan.current:belakang.current;
    if(!svg||errors.length)return;
    try {setExportError('');await downloadCardPng(svg,side);} catch(e) {setExportError(e instanceof Error?e.message:'Ekspor gagal');}
  }
  return <section>
    {errors.length>0&&<ul role="alert">{errors.map(e=><li key={e}>{e}</li>)}</ul>}
    {exportError&&<p role="alert">{exportError}</p>}
    <div style={{maxWidth:700}}><KtaCard side="depan" anggota={anggota} svgRef={depan} onWarnings={handleWarnings}/></div>
    <div style={{maxWidth:700,marginTop:16}}><KtaCard side="belakang" anggota={anggota} svgRef={belakang}/></div>
    <button disabled={errors.length>0} onClick={()=>unduh('depan')}>Unduh depan</button>
    <button disabled={errors.length>0} onClick={()=>unduh('belakang')}>Unduh belakang</button>
  </section>;
}
