import { unzipSync, strFromU8 } from 'fflate';
import { DocumentSchema, QuestionSchema, type DocumentBlock, type DocumentModel, type VisualData } from './schema';
import { normalizeLatex, syncVisuals, hash } from './core';

export const MAX_FILE_BYTES=25*1024*1024;
export async function detectFile(file:File) {
  if(!file.size||file.size>MAX_FILE_BYTES) throw Error('Tệp rỗng hoặc vượt giới hạn 25 MB.');
  const a=new Uint8Array(await file.slice(0,512).arrayBuffer());
  const s=String.fromCharCode(...a); let mime='';
  if(s.startsWith('%PDF-')) mime='application/pdf';
  else if(a[0]===0x50&&a[1]===0x4b&&a[2]===3&&a[3]===4) mime='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  else if(a[0]===137&&s.slice(1,4)==='PNG'&&a[4]===13&&a[5]===10) mime='image/png';
  else if(a[0]===255&&a[1]===216&&a[2]===255) mime='image/jpeg';
  else if(s.startsWith('RIFF')&&s.slice(8,12)==='WEBP') mime='image/webp';
  else if((file.type==='text/plain'||file.name.toLowerCase().endsWith('.txt'))&&!a.includes(0)) mime='text/plain';
  if(!mime) throw Error('Định dạng không hỗ trợ hoặc nội dung tệp bị hỏng. Chọn PDF, DOCX, PNG, JPG, WebP hoặc TXT.');
  if(file.type && !['application/octet-stream','application/zip',mime].includes(file.type)) throw Error('Loại MIME không khớp nội dung tệp.');
  return mime;
}
export async function dataUrl(file:Blob):Promise<string> {return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(Error('Không đọc được tệp.'));r.readAsDataURL(file);});}
const xml=(s:string)=>{ if(/<!DOCTYPE|<!ENTITY/i.test(s)) throw Error('XML có khai báo không an toàn.');const d=new DOMParser().parseFromString(s,'application/xml');if(d.querySelector('parsererror'))throw Error('Cấu trúc XML bị hỏng.');return d;};
const local=(e:Element,name:string)=>Array.from(e.getElementsByTagNameNS('*',name));
const direct=(e:Element,name:string)=>Array.from(e.children).find(x=>x.localName===name);
function math(n:Element):string {
  const child=(name:string)=>{const e=direct(n,name);return e?math(e):'';};
  switch(n.localName) {
    case 't': return n.textContent||'';
    case 'f': return `\\frac{${child('num')}}{${child('den')}}`;
    case 'sSup':return `{${child('e')}}^{${child('sup')}}`;
    case 'sSub':return `{${child('e')}}_{${child('sub')}}`;
    case 'sSubSup':return `{${child('e')}}_{${child('sub')}}^{${child('sup')}}`;
    case 'rad':return `\\sqrt${child('deg')?'['+child('deg')+']':''}{${child('e')}}`;
    case 'm':return '\\begin{matrix}'+Array.from(n.children).filter(x=>x.localName==='mr').map(r=>Array.from(r.children).filter(x=>x.localName==='e').map(math).join('&')).join('\\\\')+'\\end{matrix}';
    default:return Array.from(n.children).filter(x=>!x.localName.endsWith('Pr')).map(math).join('');
  }
}
function paragraph(p:Element):string {
  function visit(n:Element):string {if(n.localName==='oMath')return '$'+normalizeLatex(math(n))+'$';if(n.localName==='t')return n.textContent||'';if(n.localName==='tab')return '\t';if(n.localName==='br')return '\n';return Array.from(n.children).map(visit).join('');}
  return visit(p);
}
export function newDocument(title:string):DocumentModel {return DocumentSchema.parse({id:crypto.randomUUID(),version:2,metadata:{title},sections:[],questions:[],assets:[],sourcePages:[],blocks:[],warnings:[]});}
export function segmentDocument(doc:DocumentModel):DocumentModel {
  const questions:DocumentModel['questions']=[];
  let current:DocumentModel['questions'][number]|undefined, sectionId='';
  for(const block of doc.blocks) {
    if(block.type==='heading' && /^(phần|section|part)\b/i.test(block.text)) {sectionId=block.id;doc.sections.push({id:sectionId,title:block.text});continue;}
    const lines=block.text.split('\n');
    for(const line of lines) {
      const explicit=line.match(/^\s*(?:Câu|Question)\s+(\d+)\s*[.):]?\s*(.*)$/iu);
      const numbered=line.match(/^\s*(\d+)\s*[.)]\s+(.+)$/u);
      const start=explicit || (numbered && (!current || Number(numbered[1])===current.number+1) ? numbered : null);
      if(start) {
        current=QuestionSchema.parse({id:`${doc.id}-q${questions.length+1}`,version:2,number:questions.length+1,subject:doc.metadata.subject,grade:doc.metadata.grade,sectionId,source:block.source,content:start[2],originalContent:start[2],type:'other',correctAnswer:{text:''},validation:{status:'needs_review',extractionConfidence:explicit?0.85:0.55,answerConfidence:0}});questions.push(current);
      } else if(current && line.trim()) current.content+=(current.content?'\n':'')+line;
    }
    if(current) {if(block.table)current.tables.push(block.table);if(block.asset)current.visuals.push(block.asset);}
  }
  for(const q of questions) {
    // Only an explicit answer heading is evidence; never infer answers from prose.
    const answerLines=[...q.content.matchAll(/^(?:Đáp án|Answer)\s*:\s*(.+)$/gimu)];
    let detectedAnswer='';
    if(answerLines.length===1) {
      const match=answerLines[0];detectedAnswer=match[1].trim();
      q.explanation=q.content.slice(match.index!+match[0].length).trim().replace(/^(?:Lời giải|Explanation)\s*:\s*/iu,'');
      q.content=q.content.slice(0,match.index).trim();
    }
    const split=q.content.split(/(?:^|\n|\s{2,})([A-H])[.)]\s+/g);
    if(split.length>=5) {q.content=split[0].trim();for(let i=1;i<split.length;i+=2)q.options.push({id:`${q.id}-${split[i]}`,text:split[i+1]?.trim()||''});q.type='single_choice';}
    if(detectedAnswer) {
      const option=q.options.find(o=>o.id===`${q.id}-${detectedAnswer}`);
      q.correctAnswer=option?{optionIds:[option.id],text:''}:{optionIds:[],text:detectedAnswer};
      q.validation.answerConfidence=0.7;
    }
    q.formulas=Array.from(q.content.matchAll(/\$\$([\s\S]*?)\$\$|\$([^$\n]+)\$/g)).map((m,i)=>({id:`${q.id}-f${i}`,rawSource:m[1]??m[2],latex:normalizeLatex(m[1]??m[2]),confidence:0.7,needsReview:true,kind:'math' as const}));
    q.originalContent=q.content;
  }
  doc.questions=questions.map(syncVisuals);
  if(!questions.length)doc.warnings.push('Chưa tách được câu theo bố cục. Dùng phân tích AI để nhận diện ngữ nghĩa.');
  if(doc.blocks.some(b=>b.asset||b.table))doc.warnings.push('Kiểm tra quan hệ hình/bảng với câu; vị trí nối tiếp chỉ là gợi ý, không phải xác nhận.');
  return doc;
}
async function parseDocx(file:File,doc:DocumentModel) {
  const bytes=new Uint8Array(await file.arrayBuffer());
  let total=0;
  const files=unzipSync(bytes,{filter:e=>{total+=e.originalSize;if(total>80*1024*1024||e.originalSize>20*1024*1024)throw Error('DOCX giải nén vượt giới hạn an toàn.');return /^(word\/|\[Content_Types\])/.test(e.name);}});
  if(!files['word/document.xml']||!files['[Content_Types].xml'])throw Error('Tệp ZIP không phải DOCX hợp lệ.');
  if(Object.keys(files).some(p=>/vbaProject/i.test(p)))throw Error('Không hỗ trợ tài liệu có macro.');
  const d=xml(strFromU8(files['word/document.xml']));
  const rels=files['word/_rels/document.xml.rels']?xml(strFromU8(files['word/_rels/document.xml.rels'])):null;
  const body=d.getElementsByTagNameNS('*','body')[0]; if(!body)throw Error('DOCX thiếu nội dung.');
  for(const el of Array.from(body.children)) {
    const id=`b${doc.blocks.length}`,source={documentId:doc.id,blockId:id};
    if(el.localName==='p') {
      let text=paragraph(el);
      if(local(el,'numPr').length&&!/^\s*(Câu|Question|\d+[.)])/iu.test(text)) {doc.warnings.push('Có đánh số tự động OOXML: cần AI/giáo viên xác nhận cấp đánh số.');}
      if(text.trim())doc.blocks.push({id,type:/^(phần|section|part)\s/iu.test(text)?'heading':'text',text,source});
      for(const embed of local(el,'blip')) {
        const relId=embed.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','embed');
        const rel=rels?Array.from(rels.documentElement.children).find(e=>e.getAttribute('Id')===relId):undefined;
        const target=rel?.getAttribute('Target')||'';
        if(!target||rel?.getAttribute('TargetMode')==='External'||target.includes('..')) {doc.warnings.push('Hình liên kết ngoài không được tải tự động.');continue;}
        const buf=files['word/'+target.replace(/^\//,'')];if(!buf){doc.warnings.push('Không tìm thấy ảnh nhúng.');continue;}
        const imgFile=new File([buf as BlobPart],target);let mime:string;
        try {mime=await detectFile(imgFile);}catch{doc.warnings.push('Ảnh nhúng WMF/EMF/SVG chưa được chuyển đổi.');continue;}
        if(!mime.startsWith('image/'))continue;
        const asset:VisualData={kind:'asset',id:`asset${doc.assets.length}`,description:'Ảnh gốc trong DOCX',dataUrl:await dataUrl(new Blob([buf as BlobPart],{type:mime})),classification:'ORIGINAL_ASSET',regenerationPolicy:'preserve',dependencies:[],dependencyHash:'',hidden:false,confidence:1,needsReview:true,source};
        doc.assets.push(asset);doc.blocks.push({id:asset.id,type:'image',text:'',source,asset});
      }
      if(local(el,'oMath').some(m=>local(m,'nary').length||local(m,'acc').length||local(m,'d').length))doc.warnings.push('Phương trình OOXML phức tạp cần đối chiếu bản gốc; không tự xác nhận chuyển đổi.');
    } else if(el.localName==='tbl') {
      const rows=Array.from(el.children).filter(e=>e.localName==='tr').map(r=>Array.from(r.children).filter(e=>e.localName==='tc').map(c=>local(c,'p').map(paragraph).join('\n')));
      const table={id:`t${doc.blocks.length}`,headers:rows[0]||[],rows:rows.slice(1),caption:'',units:'',mergedCells:[]};
      if(local(el,'gridSpan').length||local(el,'vMerge').length)doc.warnings.push('Bảng có ô gộp: cần kiểm tra lại cột trước xuất.');
      doc.blocks.push({id,type:'table',text:'',source,table});
    }
  }
  doc.sourcePages.push({page:1,width:0,height:0,method:'ooxml'});
}
async function parsePdf(file:File,doc:DocumentModel,progress:(s:string)=>void) {
  const pdfjs=await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc=new URL('pdfjs-dist/build/pdf.worker.min.mjs',import.meta.url).href;
  const loading=pdfjs.getDocument({data:await file.arrayBuffer()});
  const pdf=await loading.promise;
  try {
    if(pdf.numPages>100)throw Error('Tối đa 100 trang mỗi lần nhập. Vui lòng chia tài liệu.');
    for(let p=1;p<=pdf.numPages;p++) {
      progress(`Đọc trang ${p}/${pdf.numPages}`);
      const page=await pdf.getPage(p),vp=page.getViewport({scale:1}),text=await page.getTextContent();
      const items=text.items.filter((x:any)=>typeof x.str==='string') as any[];
      const native=items.map(x=>x.str).join('').trim().length>30;
      doc.sourcePages.push({page:p,width:vp.width,height:vp.height,method:native?'native':'vision'});
      if(native) {
        let line='',y:number|undefined,start:any;
        const flush=()=>{if(line.trim())doc.blocks.push({id:`p${p}b${doc.blocks.length}`,type:/^(phần|section|part)\s/iu.test(line)?'heading':'text',text:line.trim(),fontSize:start?.height,source:{documentId:doc.id,page:p,boundingBox:[start?.transform[4]||0,vp.height-(y||0),vp.width,start?.height||12]}});line='';};
        for(const item of items){if(y!==undefined&&Math.abs(item.transform[5]-y)>3)flush();if(!line)start=item;y=item.transform[5];line+=(line?' ':'')+item.str;if(item.hasEOL)flush();}flush();
        const ops=await page.getOperatorList();
        if(ops.fnArray.some(op=>[pdfjs.OPS.paintImageXObject,pdfjs.OPS.paintInlineImageXObject,pdfjs.OPS.constructPath].includes(op)))doc.warnings.push(`Trang ${p} có hình/vector hoặc đường kẻ: cần kiểm tra từ bản gốc, text layer không chứa đầy đủ hình.`);
      } else {
        const view=page.getViewport({scale:Math.min(1.5,1600/vp.width)}),canvas=document.createElement('canvas');canvas.width=view.width;canvas.height=view.height;
        await page.render({canvas,viewport:view}).promise;
        const asset:VisualData={kind:'asset',id:`scan-${p}`,description:`Trang scan ${p}`,dataUrl:canvas.toDataURL('image/jpeg',0.85),classification:'ORIGINAL_ASSET',regenerationPolicy:'preserve',dependencies:[],dependencyHash:'',hidden:false,confidence:1,needsReview:true,source:{documentId:doc.id,page:p}};
        doc.assets.push(asset);doc.blocks.push({id:asset.id,type:'image',text:'',source:asset.source!,asset});canvas.width=0;canvas.height=0;
      }
      page.cleanup();await new Promise(resolve=>setTimeout(resolve,0));
    }
  } finally {await loading.destroy();}
}
export async function importDocument(file:File,progress:(s:string)=>void=()=>{}):Promise<DocumentModel> {
  const mime=await detectFile(file),doc=newDocument(file.name);progress('Đang đọc cấu trúc tài liệu…');
  if(mime==='application/pdf')await parsePdf(file,doc,progress);
  else if(mime.includes('wordprocessingml'))await parseDocx(file,doc);
  else if(mime.startsWith('image/')){const asset:VisualData={kind:'asset',id:'image-1',description:file.name,dataUrl:await dataUrl(new Blob([await file.arrayBuffer()],{type:mime})),classification:'ORIGINAL_ASSET',regenerationPolicy:'preserve',dependencies:[],dependencyHash:'',hidden:false,confidence:1,needsReview:true,source:{documentId:doc.id,page:1}};doc.assets.push(asset);doc.blocks.push({id:'image-1',type:'image',text:'',source:asset.source!,asset});doc.sourcePages.push({page:1,width:0,height:0,method:'vision'});}
  else doc.blocks.push({id:'text-1',type:'text',text:await file.text(),source:{documentId:doc.id,blockId:'text-1'}});
  return segmentDocument(doc);
}
export function importText(text:string):DocumentModel {const doc=newDocument('Đề kiểm tra');doc.blocks.push({id:'text-1',type:'text',text,source:{documentId:doc.id,blockId:'text-1'}});return segmentDocument(doc);}
