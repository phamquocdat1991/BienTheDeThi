import { z } from 'zod';
import { QuestionSchema, type DocumentModel, type QuestionModel } from './schema';
import { dependencyHash, hash, syncVisuals, validateQuestion } from './core';
import { generateWithModelFallback } from '../services/geminiService';
import type { ApiConfig } from '../types';

export interface AIProvider { extract(doc:DocumentModel,progress:(s:string)=>void):Promise<DocumentModel>; generateVariant(q:QuestionModel,strategy:string):Promise<QuestionModel>; validate(original:QuestionModel,candidate:QuestionModel):Promise<{valid:boolean;errors:string[];warnings:string[]}>; }
const cache=new Map<string,unknown>();
const questionTypes=['single_choice','multiple_choice','true_false','short_answer','essay','fill_blank','matching','ordering','reading_comprehension','image_based','table_based','graph_based','compound_question','other'] as const;
// Gemini rejects very large/deep schemas. Keep the wire schema compact, then
// deterministically map and validate it with the full versioned QuestionSchema.
export const AIQuestionDraftSchema=z.object({
  subject:z.string(),grade:z.string(),topic:z.string(),difficulty:z.string(),type:z.enum(questionTypes),content:z.string(),
  variables:z.array(z.object({name:z.string(),value:z.number(),policy:z.enum(['IMMUTABLE','MUTABLE','DERIVED']),min:z.union([z.number(),z.null()]),max:z.union([z.number(),z.null()]),unit:z.string()})),
  formulas:z.array(z.object({rawSource:z.string(),latex:z.string(),confidence:z.number().min(0).max(1),kind:z.enum(['math','chemistry'])})),
  tables:z.array(z.object({headers:z.array(z.string()),rows:z.array(z.array(z.string())),caption:z.string(),units:z.string()})),
  options:z.array(z.string()),correctOptionIndexes:z.array(z.number().int().min(0)),answerText:z.string(),explanation:z.string(),immutableFacts:z.array(z.string()),warnings:z.array(z.string()),
});
const extractionWireSchema=z.object({questions:z.array(AIQuestionDraftSchema),warnings:z.array(z.string())});
const variantWireSchema=AIQuestionDraftSchema;
type AIQuestionDraft=z.infer<typeof AIQuestionDraftSchema>;
export function draftToQuestion(draft:AIQuestionDraft,base:{id:string;number:number;documentId:string;source?:QuestionModel['source'];original?:QuestionModel}):QuestionModel {
  if(draft.correctOptionIndexes.some(i=>!Number.isInteger(i)||i<0||i>=draft.options.length)||new Set(draft.correctOptionIndexes).size!==draft.correctOptionIndexes.length) throw Error('AI tham chiếu đáp án ngoài phạm vi hoặc trùng chỉ số.');
  const names=draft.variables.map(v=>v.name.trim());
  if(names.some(n=>!n||['__proto__','constructor','prototype'].includes(n))||new Set(names).size!==names.length) throw Error('AI trả tên biến rỗng, không an toàn hoặc trùng nhau.');
  const optionIds=draft.options.map((_,i)=>base.original?.options[i]?.id||`${base.id}-o${i+1}`);
  const variables=Object.fromEntries(draft.variables.map(v=>[v.name.trim(),{value:v.value,policy:v.policy,...(v.min===null?{}:{min:v.min}),...(v.max===null?{}:{max:v.max}),unit:v.unit}]));
  const question=QuestionSchema.parse({
    ...(base.original||{}),id:base.id,version:2,number:base.number,subject:draft.subject,grade:draft.grade,topic:draft.topic,difficulty:draft.difficulty,type:draft.type,
    source:base.source||{documentId:base.documentId},content:draft.content,originalContent:base.original?.originalContent||draft.content,variables,
    formulas:draft.formulas.map((f,i)=>({...f,id:base.original?.formulas[i]?.id||`${base.id}-f${i+1}`,needsReview:f.confidence<0.9})),
    tables:draft.tables.map((t,i)=>({...t,id:base.original?.tables[i]?.id||`${base.id}-t${i+1}`,mergedCells:[]})),
    options:draft.options.map((text,i)=>({id:optionIds[i],text})),correctAnswer:{optionIds:draft.correctOptionIndexes.map(i=>optionIds[i]),text:draft.answerText},
    explanation:draft.explanation,immutableFacts:draft.immutableFacts,
    validation:{...(base.original?.validation||{}),status:'needs_review',reviewed:false,errors:[],warnings:draft.warnings,extractionConfidence:base.original?base.original.validation.extractionConfidence:0.75,answerConfidence:0.5},
  });
  return syncVisuals(question);
}
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
        const result=await structured(extractionWireSchema,`Extract exam questions exactly from these blocks into the provided compact schema. Keep formulas as canonical LaTeX and table values verbatim. Do not invent answers: missing answer -> empty answerText and empty correctOptionIndexes. Preserve reading passages and subquestions. Cross-page, image association, or ambiguous segmentation MUST emit a warning. Never invent visual relationships. All arrays and strings in the schema are required; use empty values when evidence is absent.`,{parts},config);
        for(const draft of result.questions){const id=`${doc.id}-q${found.length+1}`;found.push(draftToQuestion(draft,{id,number:found.length+1,documentId:doc.id,source:blocks[0]?.source}));}
        next.warnings.push(...result.warnings);
      }
      if(!found.length)throw Error('AI không nhận diện được câu hỏi. Vui lòng kiểm tra ảnh hoặc tài liệu.');
      next.questions=found;next.warnings.push('Kết quả AI cần đối chiếu nguồn, đặc biệt câu nối qua trang và ảnh/bảng. Ảnh gốc vẫn nằm trong danh sách tài sản để gắn vào câu.');return next;
    },
    async generateVariant(q,strategy){
      const prompt=`Generate one ${strategy} variant using the provided compact draft schema. Preserve subject, topic, difficulty, question type and assessment goal. Never change immutableFacts, IMMUTABLE variables, historical facts, named factual events or quoted literary/reading passages. Keep option count and ordering; correctOptionIndexes are zero-based indices into options. Synchronize content, formulas, tables, options, answerText and explanation. Do not change data required by preserved original images. If this cannot be done safely, return unchanged question data and explain the limitation in warnings. No unsupported scientific relationships. All schema fields are required; use empty arrays or strings when evidence is absent. Do not claim deterministic verification.`;
      const toCandidate=async(instruction:string)=>draftToQuestion(await structured(variantWireSchema,instruction,JSON.stringify({...q,visuals:q.visuals.map(v=>({kind:v.kind,description:v.description,dependencies:v.dependencies}))}),config),{id:q.id,number:q.number,documentId:q.source.documentId,source:q.source,original:q});
      let candidate=await toCandidate(prompt);
      candidate={...candidate,id:q.id,source:q.source,number:q.number,originalContent:q.originalContent,visuals:q.visuals};
      candidate=syncVisuals(candidate);candidate.validation={...candidate.validation,reviewed:false,status:'needs_review',errors:[]};
      const result=await provider.validate(q,candidate);
      candidate.validation={...candidate.validation,status:result.valid?'needs_review':'failed',errors:result.errors,warnings:result.warnings,reviewed:false};
      return candidate;
    },
    async validate(original,candidate){const deterministic=validateQuestion(candidate);const remote=await structured(validateSchema,'Independently solve and check this candidate against the original. Check immutable facts, numerical answer, unique correct option, units, source passage, scientific/geometric evidence, table-chart identity and explanation. Report uncertainty as warnings; never default to valid.',JSON.stringify({original,candidate}),config);return {valid:deterministic.valid&&remote.valid,errors:[...deterministic.errors,...remote.errors],warnings:[...deterministic.warnings,...remote.warnings]};},
  };return provider;
}
