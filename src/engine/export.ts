import { Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, Header, Footer, PageNumber } from 'docx';
import type { ExamModel, QuestionModel } from './schema';
import { exportErrors, answerText, formulaError } from './core';
import { visualSvg } from './visual';

export type Raster={bytes:Uint8Array;width:number;height:number};
export type Rasterizer=(source:string)=>Promise<Raster>;
export const browserRasterize:Rasterizer=async(source)=>{
 const url=source.startsWith('data:')?source:URL.createObjectURL(new Blob([source],{type:'image/svg+xml'}));
 try{return await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{const width=image.naturalWidth||520,height=image.naturalHeight||310,canvas=document.createElement('canvas');const scale=Math.min(3,2400/Math.max(width,height));canvas.width=Math.ceil(width*scale);canvas.height=Math.ceil(height*scale);const ctx=canvas.getContext('2d');if(!ctx)return reject(Error('Không tạo được canvas xuất hình.'));ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);canvas.toBlob(async b=>{if(!b)return reject(Error('Không chuyển được hình PNG.'));resolve({bytes:new Uint8Array(await b.arrayBuffer()),width,height});},'image/png');};image.onerror=()=>reject(Error('Không tải được ảnh để xuất.'));image.src=url;});}finally{if(!source.startsWith('data:'))URL.revokeObjectURL(url);}
};
let mathEngine:Promise<(latex:string)=>string>|undefined;
async function formulaSvg(latex:string):Promise<string>{
 if(formulaError(latex))throw Error('Công thức không hợp lệ: không thể xuất.');
 mathEngine??=(async()=>{const [{mathjax},{TeX},{SVG},{liteAdaptor},{RegisterHTMLHandler}]=await Promise.all([import('mathjax-full/js/mathjax.js'),import('mathjax-full/js/input/tex.js'),import('mathjax-full/js/output/svg.js'),import('mathjax-full/js/adaptors/liteAdaptor.js'),import('mathjax-full/js/handlers/html.js')]);await import('mathjax-full/js/input/tex/mhchem/MhchemConfiguration.js');await import('mathjax-full/js/input/tex/ams/AmsConfiguration.js');await import('mathjax-full/js/input/tex/newcommand/NewcommandConfiguration.js');const adaptor=liteAdaptor();RegisterHTMLHandler(adaptor);const engine=mathjax.document('',{InputJax:new TeX({packages:['base','ams','newcommand','mhchem']}),OutputJax:new SVG({fontCache:'none'})});return (value:string)=>{const node=engine.convert(value,{display:false});const raw=adaptor.outerHTML(node);const svg=raw.slice(raw.indexOf('<svg'),raw.lastIndexOf('</svg>')+6);if(/data-mjx-error/.test(svg))throw Error('MathJax không xuất được công thức.');return svg.replace(/width="([\d.]+)ex"/,(_,n)=>`width="${Number(n)*8}"`).replace(/height="([\d.]+)ex"/,(_,n)=>`height="${Number(n)*8}"`);};})();
 return (await mathEngine)(latex);
}
type Segment={type:'text';text:string}|{type:'image';image:Raster};
async function rich(text:string,raster:Rasterizer):Promise<Segment[]>{const out:Segment[]=[];let last=0;for(const m of text.matchAll(/\$\$([\s\S]*?)\$\$|\$([^$\n]+)\$/g)){if(m.index!>last)out.push({type:'text',text:text.slice(last,m.index)});out.push({type:'image',image:await raster(await formulaSvg(m[1]??m[2]))});last=m.index!+m[0].length;}if(last<text.length)out.push({type:'text',text:text.slice(last)});return out;}
function guard(exams:ExamModel[]){const errors=exams.flatMap(e=>exportErrors(e).map(s=>`Mã ${e.code}: ${s}`));if(errors.length)throw Error(errors.slice(0,12).join('\n'));}
function imageDimensions(image:Raster,maxWidth:number,maxHeight:number){const scale=Math.min(1,maxWidth/image.width,maxHeight/image.height);return {width:image.width*scale,height:image.height*scale};}
// Extractors can collect formulas from answers/options as well as the stem.
// These already have their own rendering location and must not leak into the stem.
export function standaloneQuestionFormulas(q:QuestionModel){
 const compact=(text:string)=>text.replace(/\s+/g,'');
 const located=[q.content,q.explanation,q.correctAnswer.text,...q.options.map(o=>o.text)].map(compact);
 return q.formulas.filter(f=>{const latex=compact(f.latex),raw=compact(f.rawSource);return !located.some(text=>(latex&&text.includes(latex))||(raw&&text.includes(raw)));});
}
export async function createDocx(exams:ExamModel[],raster:Rasterizer=browserRasterize):Promise<Uint8Array>{
 guard(exams);
 const sections:any[]=[];
 const paragraph=async(text:string,bold=false)=>new Paragraph({spacing:{after:120},children:await Promise.all((await rich(text,raster)).map(s=>s.type==='text'?new TextRun({text:s.text,font:'DejaVu Sans',size:24,bold}):new ImageRun({type:'png',data:s.image.bytes,transformation:imageDimensions(s.image,600,100)})))});
 for(const exam of exams){
  const children:any[]=[await paragraph(exam.metadata.school,true),await paragraph(exam.metadata.title,true),await paragraph(`Môn: ${exam.metadata.subject} · Lớp: ${exam.metadata.grade} · Mã đề: ${exam.code}`),await paragraph(`Thời gian: ${exam.metadata.duration||'…'} phút`)];
  let section='';
  if(exam.exportMode!=='answers')for(const q of exam.questions){
   if(q.sectionId!==section){section=q.sectionId;const name=exam.sections.find(s=>s.id===section)?.title;if(name)children.push(await paragraph(name,true));}
   children.push(await paragraph(`Câu ${q.number}. ${q.content}`,true));
   for(const f of standaloneQuestionFormulas(q))children.push(await paragraph(`$${f.latex}$`));
   for(const table of q.tables){children.push(await paragraph(table.caption));const rows=[table.headers,...table.rows];children.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:await Promise.all(rows.map(async(r,i)=>new TableRow({tableHeader:i===0,children:await Promise.all(r.map(async c=>new TableCell({children:[await paragraph(c)]})))})))}));}
   for(const v of q.visuals.filter(v=>!v.hidden)){const image=await raster(v.kind==='asset'?v.dataUrl:visualSvg(v,q));children.push(new Paragraph({children:[new ImageRun({type:'png',data:image.bytes,transformation:imageDimensions(image,570,340)})]}));children.push(await paragraph(v.description));}
   for(let i=0;i<q.options.length;i++)children.push(await paragraph(`${String.fromCharCode(65+i)}. ${q.options[i].text}`));
   if(exam.exportMode==='teacher'){children.push(await paragraph(`Đáp án: ${answerText(q)}`));children.push(await paragraph(q.explanation));}
  }
  if(exam.exportMode==='answers'||exam.exportMode==='with_answers'){
   children.push(new Paragraph({pageBreakBefore:exam.exportMode==='with_answers',children:[new TextRun({text:`ĐÁP ÁN — MÃ ${exam.code}`,bold:true})]}));
   for(const q of exam.questions){children.push(await paragraph(`Câu ${q.number}: ${answerText(q)}`));if(exam.exportMode==='answers')children.push(await paragraph(q.explanation));}
  }
  sections.push({properties:{page:{size:{width:11906,height:16838},margin:{top:1134,bottom:1134,left:1134,right:1134}}},headers:{default:new Header({children:[new Paragraph(`Mã đề ${exam.code}`)]})},footers:{default:new Footer({children:[new Paragraph({children:[new TextRun({children:['Trang ',PageNumber.CURRENT]})]})]})},children});
 }
 return new Uint8Array(await Packer.toArrayBuffer(new Document({sections})));
}
export async function createPdf(exams:ExamModel[],fontBytes?:Uint8Array,raster:Rasterizer=browserRasterize):Promise<Uint8Array>{
 guard(exams);const [{PDFDocument,rgb},{default:fontkit}]=await Promise.all([import('pdf-lib'),import('@pdf-lib/fontkit')]);const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
 const font=await pdf.embedFont(fontBytes||new Uint8Array(await (await fetch('/fonts/DejaVuSans.ttf')).arrayBuffer()),{subset:true});
 const W=595.28,H=841.89,margin=48,usable=W-2*margin;let page:any,y=0,code='';
 const newPage=()=>{page=pdf.addPage([W,H]);y=H-margin;page.drawText(`Mã đề ${code}`,{x:margin,y:H-25,size:9,font});page.drawText(String(pdf.getPageCount()),{x:W-margin,y:25,size:9,font});};
 const ensure=(height:number)=>{if(!page||y-height<margin)newPage();};
 const line=async(text:string,size=11)=>{
  const segments=await rich(text,raster);let x=margin;ensure(size*1.5);
  for(const s of segments)if(s.type==='text'){
    for(const word of s.text.split(/(\s+)/)){if(word.includes('\n')){y-=size*1.6;x=margin;ensure(size*1.6);continue;}const width=font.widthOfTextAtSize(word,size);if(x+width>W-margin&&x>margin){y-=size*1.6;x=margin;ensure(size*1.6);}if(width>usable){for(const char of word){const cw=font.widthOfTextAtSize(char,size);if(x+cw>W-margin){y-=size*1.6;x=margin;ensure(size*1.6);}page.drawText(char,{x,y,size,font});x+=cw;}}else{page.drawText(word,{x,y,size,font});x+=width;}}
  }else{const dim=imageDimensions(s.image,usable,48);if(x+dim.width>W-margin){y-=size*1.7;x=margin;}ensure(dim.height+size);const image=await pdf.embedPng(s.image.bytes);page.drawImage(image,{x,y:y-dim.height+size,...dim});x+=dim.width+4;y-=Math.max(0,dim.height-size*1.7);}
  y-=size*1.8;
 };
 for(const exam of exams){code=exam.code;newPage();await line(exam.metadata.school,12);await line(exam.metadata.title,15);await line(`Môn: ${exam.metadata.subject} · Lớp: ${exam.metadata.grade} · Mã đề: ${code}`);await line(`Thời gian: ${exam.metadata.duration||'…'} phút`);
  let section='';
  if(exam.exportMode!=='answers')for(const q of exam.questions){ensure(55);if(q.sectionId!==section){section=q.sectionId;const name=exam.sections.find(s=>s.id===section)?.title;if(name)await line(name,13);}await line(`Câu ${q.number}. ${q.content}`);
   for(const f of standaloneQuestionFormulas(q))await line(`$${f.latex}$`);
   for(const table of q.tables){await line(table.caption);const columns=table.headers.length;if(!columns)continue;const cellWidth=usable/columns,size=10;
    const wrap=(text:string)=>{const result:string[]=[];let current='';for(const c of text){if(c==='\n'||font.widthOfTextAtSize(current+c,size)>cellWidth-12){result.push(current);current=c==='\n'?'':c;}else current+=c;}result.push(current);return result;};
    for(const row of [table.headers,...table.rows]){const wrapped=row.map(wrap),height=Math.max(...wrapped.map(a=>a.length))*15+10;if(height>H-2*margin-30)throw Error('Một ô bảng quá dài để vừa trang A4. Chia nhỏ bảng trước khi xuất.');ensure(height);for(let ci=0;ci<columns;ci++){page.drawRectangle({x:margin+ci*cellWidth,y:y-height,width:cellWidth,height,borderWidth:0.5,borderColor:rgb(.4,.4,.4)});wrapped[ci].forEach((t,ri)=>page.drawText(t,{x:margin+ci*cellWidth+6,y:y-15-ri*15,size,font}));}y-=height;}y-=12;
   }
   for(const v of q.visuals.filter(v=>!v.hidden)){const rastered=await raster(v.kind==='asset'?v.dataUrl:visualSvg(v,q)),dim=imageDimensions(rastered,usable,300);ensure(dim.height+35);const image=await pdf.embedPng(rastered.bytes);page.drawImage(image,{x:margin,y:y-dim.height,...dim});y-=dim.height+10;await line(v.description,9);}
   for(let i=0;i<q.options.length;i++)await line(`${String.fromCharCode(65+i)}. ${q.options[i].text}`);
   if(exam.exportMode==='teacher'){await line(`Đáp án: ${answerText(q)}`);await line(q.explanation);}y-=10;
  }
  if(exam.exportMode==='answers'||exam.exportMode==='with_answers'){if(exam.exportMode==='with_answers')newPage();await line(`ĐÁP ÁN — MÃ ${code}`,14);for(const q of exam.questions){await line(`Câu ${q.number}: ${answerText(q)}`);if(exam.exportMode==='answers')await line(q.explanation);}}
 }
 return pdf.save();
}
export function download(bytes:Uint8Array,name:string,mime:string){const url=URL.createObjectURL(new Blob([bytes as BlobPart],{type:mime})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
