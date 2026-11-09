export const W=856, H=539.8;
export const pt=(value:number)=>value*25.4/72*10;
export const y=(bottomMm:number)=>(53.98-bottomMm)*10;
export const u=(s:string)=>s.trim().toLocaleUpperCase('id-ID');
export type Measure=(text:string,size:number,bold:boolean)=>number;
/** If no fit is possible, return an error rather than silently truncating. */
export function fitSingle(s:string,max:number,base:number,min:number,measure:Measure,bold=true) {
  const v=u(s); let size=base;
  while(size>min && measure(v,size,bold)>max) size=Math.max(min,size-.25);
  return {text:v,size,overflow:measure(v,size,bold)>max};
}
export function wrap(s:string,max:number,linesMax:number,base:number,min:number,measure:Measure,bold=true) {
  const words=u(s).split(/\s+/).filter(Boolean);
  for(let size=base;size>=min-.01;size-=.25) {
    const lines:string[]=[];let line='';
    for (const word of words) {
      // Split single unbreakable tokens instead of hiding them.
      const chunks:string[]=[];let chunk='';
      for (const char of word) {
        if(chunk && measure(chunk+char,size,bold)>max){chunks.push(chunk);chunk=char;} else chunk+=char;
      }
      if(chunk) chunks.push(chunk);
      for(const part of chunks){const candidate=line?line+' '+part:part; if(line && measure(candidate,size,bold)>max){lines.push(line);line=part;} else line=candidate;}
    }
    if(line)lines.push(line);
    if(lines.length<=linesMax && lines.every(l=>measure(l,size,bold)<=max)) return {lines,size,overflow:false};
  }
  return {lines:[],size:min,overflow:true};
}
export const expiry=(s?:string)=>{if(!s)return 'MM/YY';const m=/^(\d{4})-(0[1-9]|1[0-2])$/.exec(s);return m?`${m[2]}/${m[1].slice(2)}`:'FORMAT?';};
