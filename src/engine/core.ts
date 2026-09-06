import katex from 'katex';
import 'katex/contrib/mhchem';
import { QuestionSchema, type QuestionModel, type VisualData, type DocumentModel, type ExamModel } from './schema';

export function normalizeLatex(raw: string, chemistry = false): string {
  let value = raw.trim().replace(/^\$\$?|\$\$?$/g, '').replace(/^\\\(|\\\)$/g, '').replace(/^\\\[|\\\]$/g, '');
  if (chemistry) return value.startsWith('\\ce{') ? value : `\\ce{${value.replace(/[₀-₉]/g, x => String('₀₁₂₃₄₅₆₇₈₉'.indexOf(x))).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+/g, x => '^{' + [...x].map(c => ({'⁺':'+','⁻':'-'}[c] ?? String('⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c)))).join('') + '}')}}`;
  return value.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, x => '^{'+[...x].map(c=>'⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c)).join('')+'}').replace(/[₀-₉]+/g, x=>'_{'+[...x].map(c=>'₀₁₂₃₄₅₆₇₈₉'.indexOf(c)).join('')+'}').replace(/−/g,'-');
}
export function formulaError(latex: string): string | null {
  try { katex.renderToString(latex, { throwOnError: true, trust: false, strict: 'error', maxExpand: 1000 }); return null; } catch { return 'Công thức LaTeX không hợp lệ hoặc chưa được hỗ trợ.'; }
}
export function stableStringify(value: unknown): string {
  if (value === undefined) return 'null';
  if (Array.isArray(value)) return '['+value.map(stableStringify).join(',')+']';
  if (value !== null && typeof value === 'object') return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stableStringify((value as any)[k])).join(',')+'}';
  return JSON.stringify(value);
}
export function hash(value: unknown): string {
  // Non-cryptographic dependency fingerprint; never used as a security boundary.
  let n = 2166136261; for (const c of stableStringify(value)) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return (n>>>0).toString(16);
}
export function dependencyHash(v: VisualData, q: QuestionModel): string {
  return hash({ dependencies: v.dependencies.map(p=>p.startsWith('variables.') ? q.variables[p.slice(10)] : p.startsWith('tables.') ? q.tables.find(t=>t.id===p.slice(7)) : null), table: v.kind==='chart' ? q.tables.find(t=>t.id===v.tableId) : null });
}
export function answerText(q: QuestionModel): string {
  return q.correctAnswer.optionIds.length ? q.correctAnswer.optionIds.map(id=> { const i=q.options.findIndex(o=>o.id===id); return i<0?'?':String.fromCharCode(65+i); }).join(', ') : q.correctAnswer.text;
}
export function solve(q: QuestionModel): number | null {
  if (!q.solver) return null;
  const vs=q.solver.inputs.map(k=>q.variables[k]?.value); if(vs.some(v=>!Number.isFinite(v))) throw Error('Solver thiếu biến.');
  const [a,b]=vs;
  let result: number;
  switch(q.solver.kind) { case 'sum': result=vs.reduce((a,b)=>a+b,0);break; case 'product': result=vs.reduce((a,b)=>a*b,1);break; case 'ratio': result=a/b;break; case 'linear': result=-b/a;break; case 'pythagoras': if(a<=0||b<=0) throw Error('Độ dài phải dương.'); result=Math.hypot(a,b);break; }
  if(!Number.isFinite(result)) throw Error('Kết quả không hữu hạn hoặc chia cho 0.'); return result;
}
export function validateQuestion(q: QuestionModel) {
  const errors:string[]=[], warnings:string[]=[];
  if(!QuestionSchema.safeParse(q).success) return {valid:false, errors:['QuestionModel sai cấu trúc.'], warnings, confidence:0};
  if(!q.content.trim()) errors.push('Thiếu nội dung câu hỏi.');
  if(!answerText(q).trim()) errors.push('Thiếu đáp án.');
  if(new Set(q.options.map(o=>o.id)).size!==q.options.length) errors.push('Trùng ID lựa chọn.');
  if(new Set(q.options.map(o=>o.text.trim().toLocaleLowerCase())).size!==q.options.length) errors.push('Phương án bị trùng.');
  if(q.options.some(o=>!o.text.trim())) errors.push('Phương án rỗng.');
  if(q.type==='single_choice' && (q.correctAnswer.optionIds.length!==1||q.options.length<2)) errors.push('Trắc nghiệm một đáp án cần đúng một option ID.');
  if(q.correctAnswer.optionIds.some(id=>!q.options.some(o=>o.id===id))) errors.push('Đáp án không thuộc các phương án.');
  for(const [k,v] of Object.entries(q.variables)) if((v.min!==undefined && v.value<v.min)||(v.max!==undefined&&v.value>v.max)) errors.push(`Biến ${k} nằm ngoài giới hạn.`);
  q.formulas.forEach(f=> {if(formulaError(f.latex)) errors.push(`Công thức ${f.id} không hợp lệ.`); if(f.needsReview) warnings.push(`Công thức ${f.id} cần kiểm tra.`);});
  const inline=q.content.matchAll(/\$\$([\s\S]*?)\$\$|\$([^$\n]+)\$/g);
  for(const m of inline) if(formulaError(m[1]??m[2])) errors.push('Công thức trong nội dung không hợp lệ.');
  q.tables.forEach(t=>{if(t.rows.some(r=>r.length!==t.headers.length)) errors.push(`Bảng ${t.id} không đủ cột.`);});
  q.visuals.forEach(v=>{
    if(v.needsReview) warnings.push(`Hình ${v.id} cần kiểm tra.`);
    if(v.dependencyHash!==dependencyHash(v,q)) errors.push(`Hình ${v.id} chưa đồng bộ dữ kiện.`);
    if(v.kind==='geometry') { const ids=new Set(v.points.map(p=>p.id)); for(const e of v.edges) { if(!ids.has(e.from)||!ids.has(e.to)) errors.push('Hình tham chiếu điểm không tồn tại.'); if(e.variable && (!q.variables[e.variable] || e.label!==String(q.variables[e.variable].value))) errors.push(`Nhãn ${e.variable} lệch dữ kiện.`); } }
    if(v.kind==='chart') {const t=q.tables.find(t=>t.id===v.tableId); if(!t) errors.push('Biểu đồ thiếu bảng nguồn.'); else if(t.rows.some(r=>r[v.labelColumn]===undefined||!r[v.valueColumn]?.trim()||!Number.isFinite(Number(r[v.valueColumn])))) errors.push('Biểu đồ có dữ liệu không phải số hoặc thiếu cột.');}
    if(v.kind==='diagram' && v.edges.some(e=>!v.nodes.some(n=>n.id===e.from)||!v.nodes.some(n=>n.id===e.to))) errors.push('Sơ đồ thiếu nút tham chiếu.');
  });
  try { const n=solve(q); if(n!==null) { const a=q.correctAnswer.optionIds.length===1?q.options.find(o=>o.id===q.correctAnswer.optionIds[0])?.text:q.correctAnswer.text; if(!a?.trim()||Math.abs(Number(a)-n)>1e-8||!Number.isFinite(Number(a))) errors.push('Đáp án không khớp solver.'); } } catch(e) { errors.push((e as Error).message); }
  if(!q.validation.reviewed) warnings.push('Chưa được giáo viên duyệt nội dung, hình và đáp án.');
  if(q.validation.status==='failed') errors.push('Câu đang ở trạng thái lỗi.');
  if(q.validation.errors.length) errors.push(...q.validation.errors);
  return {valid:errors.length===0,errors,warnings,confidence:Math.min(q.validation.extractionConfidence,q.validation.answerConfidence,...q.formulas.map(f=>f.confidence),...q.visuals.map(v=>v.confidence))};
}
export function syncVisuals(q: QuestionModel): QuestionModel {
  return {...q,visuals:q.visuals.map(v=>{const next=structuredClone(v);if(next.kind==='geometry') {next.points=next.points.map(p=>({...p,x:p.xVariable&&q.variables[p.xVariable]?q.variables[p.xVariable].value:p.x,y:p.yVariable&&q.variables[p.yVariable]?q.variables[p.yVariable].value:p.y}));next.edges=next.edges.map(e=>e.variable&&q.variables[e.variable]?{...e,label:String(q.variables[e.variable].value)}:e);}next.dependencyHash=dependencyHash(next,q);return next;})};
}
export function shuffled<T>(a:T[], random= Math.random):T[] {const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
export function composeExam(doc:DocumentModel,code:string,shuffleQuestions=false,shuffleOptions=false):ExamModel {
  // Keep dependent questions and section order intact. Only shuffle within a section when independent.
  let questions=structuredClone(doc.questions);
  if(shuffleQuestions) {const sections=[...new Set(questions.map(q=>q.sectionId))]; questions=sections.flatMap(s=>{const a=questions.filter(q=>q.sectionId===s);return a.some(q=>q.dependencies.length)?a:shuffled(a);});}
  questions=questions.map((q,i)=>({...q,number:i+1,options:shuffleOptions&&['single_choice','multiple_choice'].includes(q.type)?shuffled(q.options):q.options}));
  return {version:2,code,metadata:doc.metadata,sections:doc.sections,questions,answerKey:Object.fromEntries(questions.map(q=>[q.id,answerText(q)])),exportMode:'student'};
}
export function exportErrors(exam:ExamModel):string[] {
  const errors=exam.questions.flatMap(q=>{const v=validateQuestion(q);return [...v.errors,...(!q.validation.reviewed||q.formulas.some(f=>f.needsReview)||q.visuals.some(v=>v.needsReview)?['Cần duyệt lại.']:[])].map(e=>`Câu ${q.number}: ${e}`);});
  if(!exam.questions.length) errors.push('Đề chưa có câu hỏi.');
  if(new Set(exam.questions.map(q=>q.id)).size!==exam.questions.length) errors.push('ID câu bị trùng.');
  exam.questions.forEach((q,i)=>{if(q.number!==i+1) errors.push('Thứ tự câu không liên tục.');if(exam.answerKey[q.id]!==answerText(q))errors.push(`Câu ${q.number}: Bảng đáp án không khớp.`);});return errors;
}
export function fromLegacy(q:any,subject='',grade='',documentId='legacy'):QuestionModel {
  const options=(q.options||[]).map((o:any,i:number)=>({id:o.id||`${q.id}-o${i}`,text:String(o.text||'')}));
  const optionIds=(q.options||[]).flatMap((o:any,i:number)=>String(o.label).trim()===String(q.correctAnswer).trim()?[options[i].id]:[]);
  return QuestionSchema.parse({id:q.id||crypto.randomUUID(),version:2,number:q.number||1,subject,grade,topic:q.topic||'',difficulty:q.difficulty||'',type:q.type==='multiple_choice'?'single_choice':q.type==='fill_in_blank'?'fill_blank':q.type||'other',source:{documentId},sectionId:q.sectionId||'',content:q.questionText||'',originalContent:q.questionText||'',options,correctAnswer:{optionIds,text:optionIds.length?'':String(q.correctAnswer||'')},explanation:q.explanation||'',formulas:(q.formulas||[]).filter((f:any)=>typeof f==='string').map((f:string,i:number)=>({id:`f${i}`,rawSource:f,latex:normalizeLatex(f),confidence:0,needsReview:true})),validation:{status:'needs_review',reviewed:false,extractionConfidence:0,answerConfidence:0}});
}
