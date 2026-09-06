import type { QuestionModel, VisualData } from './schema';
export const escapeXml=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
export function visualSvg(v:VisualData,q:QuestionModel):string {
  if(v.kind==='asset')return '';
  const text=(x:number,y:number,s:string)=>`<text x="${x}" y="${y}" font-size="15" font-family="DejaVu Sans,Arial,sans-serif" fill="#0f172a">${escapeXml(s)}</text>`;
  const line=(x1:number,y1:number,x2:number,y2:number)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#0369a1" stroke-width="2"/>`;
  let shapes='';
  if(v.kind==='geometry'||v.kind==='diagram'||v.kind==='coordinate') {
    const pts=v.kind==='diagram'?v.nodes:v.points;
    const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y),minX=Math.min(0,...xs),minY=Math.min(0,...ys),dx=Math.max(1,...xs)-minX,dy=Math.max(1,...ys)-minY;
    const scale=Math.min(420/dx,210/dy);
    const map=(x:number,y:number)=>({x:45+scale*(x-minX),y:260-scale*(y-minY)});
    const mapped=pts.map(p=>({...p,...map(p.x,p.y)}));
    if(v.kind==='coordinate'){
      const zero=map(0,0);shapes+=line(25,zero.y,495,zero.y)+line(zero.x,25,zero.x,280);
      for(const points of v.lines)shapes+=`<polyline points="${points.map(([x,y])=>{const p=map(x,y);return `${p.x},${p.y}`;}).join(' ')}" fill="none" stroke="#0369a1" stroke-width="2"/>`;
    }else for(const edge of v.edges){const a=mapped.find(p=>p.id===edge.from),b=mapped.find(p=>p.id===edge.to);if(a&&b) shapes+=line(a.x,a.y,b.x,b.y)+text((a.x+b.x)/2+8,(a.y+b.y)/2-8,edge.label);}
    for(const p of mapped)shapes+=`<circle cx="${p.x}" cy="${p.y}" r="4" fill="#0369a1"/>`+text(p.x+7,p.y-7,p.label);
  }else if(v.kind==='chart'){
    const table=q.tables.find(t=>t.id===v.tableId);if(!table)throw Error('Biểu đồ không có bảng nguồn.');
    const values=table.rows.map(r=>Number(r[v.valueColumn]));if(values.some(n=>!Number.isFinite(n)))throw Error('Dữ liệu biểu đồ không hợp lệ.');
    const min=Math.min(0,...values),max=Math.max(1,...values),range=max-min,step=420/Math.max(1,values.length),y=(n:number)=>260-(n-min)/range*215;
    shapes+=line(40,25,40,260)+line(40,y(0),490,y(0));
    table.rows.forEach((r,i)=>{const x=48+i*step,val=values[i];if(v.chartType==='bar')shapes+=`<rect x="${x}" y="${Math.min(y(val),y(0))}" width="${Math.max(2,step-12)}" height="${Math.abs(y(val)-y(0))}" fill="#0284c7"/>`;shapes+=text(x,y(val)-5,String(val))+text(x,285,r[v.labelColumn]);});
    if(v.chartType==='line')shapes+=`<polyline points="${values.map((n,i)=>`${48+i*step},${y(n)}`).join(' ')}" fill="none" stroke="#0284c7" stroke-width="2"/>`;
    shapes+=text(42,18,table.units);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 310" width="520" height="310" role="img"><title>${escapeXml(v.description)}</title><rect width="520" height="310" fill="white"/>${shapes}</svg>`;
}
