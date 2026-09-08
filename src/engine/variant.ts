import { type QuestionModel } from './schema';
import { solve, syncVisuals, hash, validateQuestion } from './core';
import type { AIProvider } from './ai';

export const subjectAdapters=[
 {id:'history',match:/lịch sử|history/i,forbidden:['facts','dates','people'],strategies:['LANGUAGE_VARIANT']},
 {id:'literature',match:/ngữ văn|literature/i,forbidden:['passage','quotations'],strategies:['LANGUAGE_VARIANT']},
 {id:'chemistry',match:/hóa|chemistry/i,forbidden:['random chemical substitution'],strategies:['NUMERIC_VARIANT','LANGUAGE_VARIANT']},
 {id:'biology',match:/sinh|biology/i,forbidden:['invented biology'],strategies:['NUMERIC_VARIANT','LANGUAGE_VARIANT']},
 {id:'physics',match:/vật l|physics/i,forbidden:['units','physical laws'],strategies:['NUMERIC_VARIANT','VISUAL_VARIANT']},
 {id:'geography',match:/địa|geography/i,forbidden:['factual places'],strategies:['DATASET_VARIANT','LANGUAGE_VARIANT']},
 {id:'math',match:/toán|math/i,forbidden:['unconfirmed geometric constraints'],strategies:['NUMERIC_VARIANT','VISUAL_VARIANT']},
 {id:'language',match:/tiếng|english|language/i,forbidden:['reading passage'],strategies:['LANGUAGE_VARIANT','CONTEXT_VARIANT']},
 {id:'informatics',match:/tin học|informatics/i,forbidden:['unverified code execution'],strategies:['LANGUAGE_VARIANT','NUMERIC_VARIANT']},
 {id:'generic',match:/.*/,forbidden:['factual source data'],strategies:['LANGUAGE_VARIANT']},
];
export const adapterFor=(subject:string)=>subjectAdapters.find(a=>a.match.test(subject))!;
export function numericVariant(original:QuestionModel,seed:number):QuestionModel {
  if(!original.templates||!original.solver)throw Error('Câu chưa có template và solver xác định. Cần AI hoặc giáo viên thiết lập trước.');
  const q=structuredClone(original);let changed=false;
  for(const [key,v]of Object.entries(q.variables))if(v.policy==='MUTABLE'){
    if(v.min===undefined||v.max===undefined)throw Error(`Biến ${key} thiếu giới hạn min/max.`);
    const low=Math.ceil(v.min),high=Math.floor(v.max);if(low>high)throw Error(`Biến ${key} không có giá trị nguyên hợp lệ.`);
    const value=low+((Math.abs(seed)+Object.keys(q.variables).indexOf(key))%(high-low+1));changed ||= value!==v.value;v.value=value;
  }
  if(!changed)throw Error('Khoảng biến chưa tạo được dữ kiện khác. Thử lại hoặc chỉnh giới hạn.');
  const result=solve(q)!;
  const fill=(s:string)=>s.replace(/\{\{([\w]+)\}\}/g,(_,key)=>{if(key==='answer')return String(Number(result.toPrecision(12)));if(!q.variables[key])throw Error(`Template thiếu biến ${key}.`);return String(q.variables[key].value);});
  q.content=fill(q.templates.content);q.explanation=fill(q.templates.explanation);q.correctAnswer.text=fill(q.templates.answer);
  q.options=q.options.map(o=>{if(!q.templates.options[o.id])throw Error('Template chưa bao phủ mọi lựa chọn.');return {...o,text:fill(q.templates.options[o.id])};});
  if(q.formulas.length||q.tables.length)throw Error('Câu có công thức/bảng riêng cần template đồng bộ bổ sung hoặc dùng AI có kiểm định.');
  if(q.visuals.some(v=>v.kind==='asset'&&v.dependencies.length))throw Error('Ảnh gốc phụ thuộc dữ kiện; không được tự đổi số.');
  q.validation={...q.validation,reviewed:false,status:'needs_review',answerConfidence:1};
  const next=syncVisuals(q),validation=validateQuestion(next);if(!validation.valid)throw Error(validation.errors.join(' '));return next;
}
export function mutationErrors(original:QuestionModel,candidate:QuestionModel):string[]{
 const errors:string[]=[];
 if(candidate.subject!==original.subject||candidate.type!==original.type||candidate.difficulty!==original.difficulty||candidate.topic!==original.topic)errors.push('Biến thể thay đổi môn, dạng, chủ đề hoặc độ khó.');
 for(const [k,v]of Object.entries(original.variables))if(v.policy==='IMMUTABLE'&&hash(candidate.variables[k])!==hash(v))errors.push(`Biến bất biến ${k} bị thay đổi.`);
 for(const fact of original.immutableFacts)if(!candidate.content.includes(fact)||!candidate.immutableFacts.includes(fact))errors.push('Ngữ liệu/dữ kiện bất biến bị thay đổi.');
 if(candidate.correctAnswer.optionIds.length!==original.correctAnswer.optionIds.length)errors.push('Số đáp án đúng bị thay đổi.');
 return errors;
}
export async function createVariant(q:QuestionModel,strategy:string,seed:number,ai:AIProvider):Promise<QuestionModel>{
 if(!q.validation.reviewed)throw Error(`Câu ${q.number}: cần duyệt đề gốc trước khi tạo biến thể.`);
 if(!adapterFor(q.subject).strategies.includes(strategy))throw Error(`Môn ${q.subject} không cho phép chiến lược này.`);
 if(strategy==='NUMERIC_VARIANT'&&q.solver&&q.templates)return numericVariant(q,seed);
 const seededStrategy=`${strategy}; variation seed ${seed}`;
 let candidate=await ai.generateVariant(q,seededStrategy);
 // Maximum two structured AI repairs, followed by a fresh validation each time.
 for(let attempt=0;attempt<=2;attempt++){
   const errors=[...mutationErrors(q,candidate),...validateQuestion(candidate).errors,...candidate.validation.errors];
   if(!errors.length)return candidate;
   if(attempt===2)return {...candidate,validation:{...candidate.validation,status:'failed',reviewed:false,errors}};
   candidate=await ai.generateVariant(q,`${seededStrategy}; Repair these previous errors: ${errors.join('; ')}`);
 }
 return candidate;
}
export function similarity(a:QuestionModel,b:QuestionModel):number{if(hash({variables:a.variables,content:a.content,options:a.options})===hash({variables:b.variables,content:b.content,options:b.options}))return 1;const words=(s:string)=>new Set(s.toLocaleLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').split(/\s+/).filter(Boolean));const x=words(a.content),y=words(b.content);return [...x].filter(w=>y.has(w)).length/Math.max(1,new Set([...x,...y]).size);}
