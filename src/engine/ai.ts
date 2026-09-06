import { z } from 'zod';
import { QuestionSchema, type DocumentModel, type QuestionModel } from './schema';
import { dependencyHash, hash, syncVisuals, validateQuestion } from './core';
import { generateWithModelFallback } from '../services/geminiService';
import type { ApiConfig } from '../types';

export interface AIProvider { extract(doc:DocumentModel,progress:(s:string)=>void):Promise<DocumentModel>; generateVariant(q:QuestionModel,strategy:string):Promise<QuestionModel>; validate(original:QuestionModel,candidate:QuestionModel):Promise<{valid:boolean;errors:string[];warnings:string[]}>; }
const cache=new Map<string,unknown>();
async function structured<T>(schema:z.ZodType<T>,system:string,contents:any,config:ApiConfig):Promise<T> {
  const fingerprint=hash({system,contents,model:config.selectedModel});
  if(cache.has(fingerprint))return structuredClone(cache.get(fingerprint)) as T;
  const text=await generateWithModelFallback({systemInstruction:system,contents,configOverride:{responseJsonSchema:z.toJSONSchema(schema,{target:'draft-7'})}},config);
  let json:unknown;try{json=JSON.parse(text.trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));}catch{throw Error('AI trả JSON bị hỏng; tài liệu hiện tại được giữ nguyên.');}
  const result=schema.safeParse(json);if(!result.success)throw Error('AI trả dữ liệu không đúng schema. Vui lòng thử lại hoặc sửa câu thủ công.');
  if(cache.size>=40)cache.delete(cache.keys().next().value!);cache.set(fingerprint,result.data);return result.data;
}
export function createExamProvider(config:ApiConfig):AIProvider {
  const validateSchema=z.object({valid:z.boolean(),errors:z.array(z.string()),warnings:z.array(z.string())});
  const provider:AIProvider={
    async extract(doc,progress){
      const next=structuredClone(doc),found:QuestionModel[]=[];
      // Bound each call to source blocks on one page (or 12k text blocks for OOXML/text).
      const groups:any[][]=[];let group:any[]=[],length=0;
      for(const block of doc.blocks){const previous=group[group.length-1];if(group.length&&(length+block.text.length>12000||(block.source.page!==previous.source.page))){groups.push(group);group=[];length=0;}group.push(block);length+=block.text.length;}if(group.length)groups.push(group);
      if(!groups.length)throw Error('Tài liệu không có nội dung để phân tích.');
      for(let i=0;i<groups.length;i++) {
        progress(`AI phân tích phần ${i+1}/${groups.length}`);
        const blocks=groups[i],parts:any[]=[{text:JSON.stringify({metadata:doc.metadata,blocks:blocks.map(b=>({...b,asset:b.asset?{id:b.asset.id,description:b.asset.description}:undefined}))})}];
        for(const b of blocks)if(b.asset?.kind==='asset'){const [header,data]=b.asset.dataUrl.split(',');parts.push({inlineData:{mimeType:header.slice(5).split(';')[0],data}});}
        const result=await structured(z.object({questions:z.array(QuestionSchema),warnings:z.array(z.string())}),`Extract exam questions exactly from these blocks. Return version 2 QuestionModel. Keep formulas as canonical LaTeX, table values verbatim. Source documentId=${doc.id}. Do not invent answers: missing answer -> empty text and needs_review. Preserve reading passages, subquestions, source page references. Cross-page or ambiguous segmentation MUST emit a warning. For existing original images reference no invented file; use visuals=[] and explain associations in warnings. Only structured diagrams with explicitly stated constraints may be created. All questions start needs_review, reviewed=false. IDs must be unique.`,{parts},config);
        for(const q of result.questions){q.id=`${doc.id}-q${found.length+1}`;q.number=found.length+1;q.source.documentId=doc.id;q.originalContent=q.content;q.validation.reviewed=false;q.validation.status='needs_review';q.visuals=q.visuals.filter(v=>v.kind!=='asset');found.push(syncVisuals(q));}
        next.warnings.push(...result.warnings);
      }
      if(!found.length)throw Error('AI không nhận diện được câu hỏi. Vui lòng kiểm tra ảnh hoặc tài liệu.');
      next.questions=found;next.warnings.push('Kết quả AI cần đối chiếu nguồn, đặc biệt câu nối qua trang và ảnh/bảng. Ảnh gốc vẫn nằm trong danh sách tài sản để gắn vào câu.');return next;
    },
    async generateVariant(q,strategy){
      const prompt=`Generate one ${strategy} variant. Preserve subject, topic, difficulty, question type and assessment goal. Never change immutableFacts, IMMUTABLE variables, historical facts, named factual events or quoted literary/reading passages. All linked content/formulas/tables/visuals/options/answer/explanation must be regenerated consistently. Original asset data cannot be recreated: leave preserved assets exactly unchanged; if required to change, fail with validation.status=needs_review. No unsupported scientific relationships. Return QuestionModel version=2. Keep IDs and source. Mark reviewed=false. Do not claim deterministic verification.`;
      let candidate=await structured(QuestionSchema,prompt,JSON.stringify({...q,visuals:q.visuals.filter(v=>v.kind!=='asset')}),config);
      candidate={...candidate,id:q.id,source:q.source,number:q.number,originalContent:q.originalContent,visuals:[...candidate.visuals.filter(v=>v.kind!=='asset'),...q.visuals.filter(v=>v.kind==='asset')]};
      candidate=syncVisuals(candidate);candidate.validation={...candidate.validation,reviewed:false,status:'needs_review',errors:[]};
      const result=await provider.validate(q,candidate);
      candidate.validation={...candidate.validation,status:result.valid?'needs_review':'failed',errors:result.errors,warnings:result.warnings,reviewed:false};
      return candidate;
    },
    async validate(original,candidate){const deterministic=validateQuestion(candidate);const remote=await structured(validateSchema,'Independently solve and check this candidate against the original. Check immutable facts, numerical answer, unique correct option, units, source passage, scientific/geometric evidence, table-chart identity and explanation. Report uncertainty as warnings; never default to valid.',JSON.stringify({original,candidate}),config);return {valid:deterministic.valid&&remote.valid,errors:[...deterministic.errors,...remote.errors],warnings:[...deterministic.warnings,...remote.warnings]};},
  };return provider;
}
