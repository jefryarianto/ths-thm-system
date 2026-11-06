'use client';
import {useCallback,useRef,useState} from 'react';
import {KtaCard} from '../components/KtaCard';
import {downloadCardPng} from '../components/exportPng';
import type {Anggota,Tingkatan} from '../components/types';

const initial:Anggota={nama:'CONTOH ANGGOTA',jenisKelamin:'L',nomor:'CONTOH-001',ranting:'NAMA RANTING',tempatDadar:'TEMPAT DADAR',tahunDadar:'2024',berlakuSampai:'2031-10',tingkatan:'tamtama',verifyUrl:'https://example.org/verify/demo-001',tempatTanggalLahir:'TEMPAT, TANGGAL LAHIR',pekerjaan:'',status:'',tanggalPelantikan:'',tahunPelantikan:'',alamat:'ALAMAT ANGGOTA',tanggalTerbit:'',koordinator:'E. HENDRIKUS MASAN BEDA'};
const ranks:Tingkatan[]=['pratama','tamtama','muda','madya','utama'];
export default function Page(){
 const [a,setA]=useState<Anggota>(initial);const [warn,setWarn]=useState<string[]>([]);const [notice,setNotice]=useState('');const [loading,setLoading]=useState(false);
 const front=useRef<SVGSVGElement>(null),back=useRef<SVGSVGElement>(null);
 const warnings=useCallback((w:string[])=>setWarn(w),[]);
 const change=(key:keyof Anggota,value:string)=>setA(old=>({...old,[key]:value}));
 function upload(key:'fotoUrl'|'qrImageUrl'|'tandaTanganUrl',file?:File){
   if(!file){change(key,'');return;}if(!file.type.startsWith('image/')){setNotice('Pilih file gambar.');return;}if(file.size>10*1024*1024){setNotice('Ukuran gambar maksimal 10 MB.');return;}
   const r=new FileReader();r.onload=()=>{change(key,String(r.result));setNotice('');};r.readAsDataURL(file);
 }
 async function download(side:'depan'|'belakang'){
  const svg=side==='depan'?front.current:back.current;if(!svg)return;
  if(warn.length){setNotice('Perbaiki peringatan data sebelum mengekspor.');return;}
  setLoading(true);setNotice('');try{await downloadCardPng(svg,side);}catch(err){setNotice(err instanceof Error?err.message:'Ekspor gagal.');}finally{setLoading(false);}
 }
 const textField=(label:string,key:keyof Anggota,placeholder='')=><label>{label}<input value={String(a[key]||'')} placeholder={placeholder} onChange={e=>change(key,e.target.value)}/></label>;
 return <main>
  <header><p className="eyebrow">CONTOH INTEGRASI · REACT / NEXT.JS</p><h1>Generator kartu anggota</h1><p>Pratinjau dua sisi dengan latar terpisah. Data pada halaman ini hanya contoh dan tidak disimpan ke server.</p></header>
  <div className="app-grid"><section className="editor" aria-label="Formulir data anggota">
   <h2>Data anggota</h2><p className="hint">Data contoh dapat diganti. Pelantikan tidak diambil dari tahun Dadar.</p>
   <div className="fields">
    {textField('Nama lengkap','nama')}
    <label>Jenis kelamin<select value={a.jenisKelamin||''} onChange={e=>change('jenisKelamin',e.target.value)}><option value="">Tidak ditampilkan</option><option value="L">L</option><option value="P">P</option></select></label>
    {textField('Nomor anggota','nomor')}{textField('Ranting','ranting')}{textField('Tempat Dadar','tempatDadar')}{textField('Tahun Dadar','tahunDadar','YYYY')}
    <label>Tingkatan<select value={a.tingkatan} onChange={e=>change('tingkatan',e.target.value)}>{ranks.map(r=><option key={r} value={r}>{r[0].toUpperCase()+r.slice(1)}</option>)}</select></label>
    <label>Berlaku sampai<input type="month" value={a.berlakuSampai||''} onChange={e=>change('berlakuSampai',e.target.value)}/></label>
    {textField('Tempat / tanggal lahir','tempatTanggalLahir')}{textField('Pekerjaan','pekerjaan')}{textField('Status','status')}
    {textField('Tanggal pelantikan','tanggalPelantikan','mis. 12 JULI 2020')}{textField('Tahun pelantikan (jika tanggal tidak ada)','tahunPelantikan','YYYY')}
    <label className="full">Alamat<textarea value={a.alamat} onChange={e=>change('alamat',e.target.value)} rows={2}/></label>
    {textField('Tanggal terbit','tanggalTerbit')}{textField('Nama koordinator','koordinator')}
    <label className="full">URL verifikasi<input value={a.verifyUrl||''} onChange={e=>change('verifyUrl',e.target.value)} placeholder="https://website-anda/verify/..."/><small>Contoh example.org bukan layanan verifikasi nyata. QR dihasilkan otomatis sebagai QR standar dengan logo.</small></label>
    <label>Foto<input type="file" accept="image/*" onChange={e=>upload('fotoUrl',e.target.files?.[0])}/></label>
    <label>Gambar QR khusus (opsional)<input type="file" accept="image/*" onChange={e=>upload('qrImageUrl',e.target.files?.[0])}/><small>Prioritas di atas URL verifikasi; sertakan quiet zone.</small></label>
    <label>Tanda tangan (opsional)<input type="file" accept="image/*" onChange={e=>upload('tandaTanganUrl',e.target.files?.[0])}/></label>
   </div>
  </section><section className="preview" aria-label="Pratinjau kartu">
   <div className="preview-head"><div><p className="eyebrow">CR80 · DUA SISI</p><h2>Pratinjau kartu</h2></div><span className="tag">85,6 × 53,98 mm</span></div>
   <p className="hint">Sisi depan</p><KtaCard side="depan" anggota={a} svgRef={front} onWarnings={warnings}/>
   <p className="hint">Sisi belakang</p><KtaCard side="belakang" anggota={a} svgRef={back}/>
   {warn.length>0 && <div role="alert" className="alert"><strong>Perlu penyesuaian</strong><ul>{warn.map(w=><li key={w}>{w}</li>)}</ul></div>}
   {notice && <div role="alert" className="alert">{notice}</div>}
   <div className="actions"><button disabled={loading||warn.length>0} onClick={()=>download('depan')}>Unduh PNG depan</button><button disabled={loading||warn.length>0} onClick={()=>download('belakang')}>Unduh PNG belakang</button><button className="secondary" onClick={()=>window.print()}>Cetak dua sisi</button></div>
   <p className="hint">PNG 2022 × 1275 px. Pastikan QR diuji pada perangkat dan ukuran tampil yang sebenarnya.</p>
  </section></div>
 </main>;
}
