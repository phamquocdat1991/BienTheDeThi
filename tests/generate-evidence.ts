// Export integration fixture. Uses a real SVG rasterizer, never a mocked AI response.
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {sampleDocument} from '../src/engine/sample';
import {composeExam} from '../src/engine/core';
import {createDocx,createPdf,type Rasterizer} from '../src/engine/export';
const require=createRequire(import.meta.url);
const sharp=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/sharp');
const raster:Rasterizer=async s=>{const bytes=s.startsWith('data:')?Buffer.from(s.split(',')[1],'base64'):Buffer.from(s);const meta=await sharp(bytes).metadata();return {bytes:new Uint8Array(await sharp(bytes,{density:192}).flatten({background:'#ffffff'}).png().toBuffer()),width:meta.width||520,height:meta.height||310};};
const doc=sampleDocument();
doc.metadata.duration='45';doc.metadata.school='TRƯỜNG THCS — KIỂM TRA BẢN XUẤT';
doc.questions[0].content+=' Công thức: $\\frac{1}{2}$; $\\sqrt{x}$; $x_1^2$; $\\vec{AB}$; $\\alpha$.';
for(const q of doc.questions){q.validation.reviewed=true;q.validation.status='ready';q.visuals.forEach(v=>v.needsReview=false);}
const exam={...composeExam(doc,'001'),exportMode:'teacher' as const};
await fs.mkdir('test-results',{recursive:true});
await fs.writeFile('test-results/export-001.docx',await createDocx([exam],raster));
await fs.writeFile('test-results/export-001.pdf',await createPdf([exam],new Uint8Array(await fs.readFile('public/fonts/DejaVuSans.ttf')),raster));
await fs.writeFile('test-results/exam-001.json',JSON.stringify(exam,null,2));
console.log('Real DOCX and PDF written: test-results/export-001.*');
