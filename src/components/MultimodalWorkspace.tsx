import React,{useEffect,useRef,useState,Suspense,lazy} from 'react';
import { Upload, FileCheck2, Settings2, Download, Save, BookOpen, Shuffle, ArrowLeft } from 'lucide-react';
import { ApiKeyModal } from './ApiKeyModal';
import { loadStoredApiConfig } from '../services/aiClientFactory';
import { DocumentSchema, QuestionSchema, type DocumentModel,type ExamModel,type QuestionModel } from '../engine/schema';
import { importDocument, importText } from '../engine/import';
import { composeExam, answerText, exportErrors, syncVisuals, validateQuestion } from '../engine/core';
import { createExamProvider } from '../engine/ai';
import { adapterFor, createVariant, similarity } from '../engine/variant';
import { loadWorkspace,saveWorkspace } from '../engine/storage';
import { sampleDocument } from '../engine/sample';
import QuestionEditorV2 from './QuestionEditorV2';
import { MathContent } from './MathContent';
import './multimodal.css';
const Legacy=lazy(()=>import('../App'));

export default function MultimodalWorkspace(){
 const [legacy,setLegacy]=useState((import.meta as any).env?.VITE_ENABLE_MULTIMODAL_IMPORT==='false');
 const [config,setConfig]=useState(loadStoredApiConfig),[settings,setSettings]=useState(false);
 const [doc,setDoc]=useState<DocumentModel|null>(null),[exams,setExams]=useState<ExamModel[]>([]),[active,setActive]=useState(-1),[selected,setSelected]=useState(0);
 const [busy,setBusy]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[loaded,setLoaded]=useState(false),[text,setText]=useState('');
 const [count,setCount]=useState(3),[mode,setMode]=useState('shuffle'),[exportMode,setExportMode]=useState<ExamModel['exportMode']>('student');
 const fileRef=useRef<HTMLInputElement>(null),restoreRef=useRef<HTMLInputElement>(null);
 useEffect(()=>{let alive=true;loadWorkspace().then(data=>{if(alive&&data){setDoc(data.doc);setExams(data.exams);setNotice('Đã khôi phục phiên gần nhất.');}}).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoaded(true);});return()=>{alive=false;};},[]);
 useEffect(()=>{if(!loaded||!doc)return;const timer=setTimeout(()=>{void saveWorkspace(doc,exams).then(()=>setNotice('Đã lưu trên thiết bị này.')).catch(()=>setError('Không lưu được phiên. Hãy tải bản sao JSON trước khi đóng trang.'));},500);return()=>clearTimeout(timer);},[doc,exams,loaded]);
 const run=async(action:()=>Promise<void>)=>{setError('');try{await action();}catch(e){setError((e as Error).message);}finally{setBusy('');}};
 const useDoc=(next:DocumentModel)=>{setDoc(next);setExams([]);setActive(-1);setSelected(0);};
 const current=doc?(active<0?composeExam(doc,'GỐC'):exams[active]):null;
 const question=current?.questions[selected];
 const update=(q:QuestionModel)=>{if(!doc||!current)return;if(active<0){setDoc({...doc,questions:doc.questions.map((p,i)=>i===selected?q:p)});setExams([]);}else setExams(exams.map((exam,i)=>i===active?{...exam,questions:exam.questions.map((p,j)=>j===selected?q:p),answerKey:{...exam.answerKey,[q.id]:answerText(q)}}:exam));};
 const generate=()=>run(async()=>{
  if(!doc)return;const issues=exportErrors(composeExam(doc,'GỐC'));if(issues.length)throw Error(issues.join('\n'));
  setBusy('Đang tạo mã đề…');const provider=createExamProvider(config),next:ExamModel[]=[];
  for(let i=0;i<count;i++){
    const source=structuredClone(doc);
    if(mode!=='shuffle')for(let j=0;j<source.questions.length;j++){
      setBusy(`Mã ${i+1}/${count} · Câu ${j+1}/${source.questions.length}`);
      const q=source.questions[j],strategy=q.templates&&q.solver?'NUMERIC_VARIANT':adapterFor(q.subject).strategies[0];
      try{let candidate=await createVariant(q,strategy,i+7,provider);if(next.some(e=>e.questions.some(p=>p.id===candidate.id&&similarity(p,candidate)>0.98)))candidate={...candidate,validation:{...candidate.validation,reviewed:false,status:'needs_review',warnings:[...candidate.validation.warnings,'Biến thể quá giống mã đã tạo; cần kiểm tra.']}};source.questions[j]=candidate;}
      catch(e){source.questions[j]={...q,validation:{...q.validation,status:'failed',reviewed:false,errors:[(e as Error).message]}};}
    }
    next.push(composeExam(source,String(i+1).padStart(3,'0'),mode!=='variant',mode!=='variant'));
  }
  setExams(next);setActive(0);setSelected(0);setNotice('Đã tạo mã đề. Kiểm tra từng câu trước khi xuất.');
 });
 const doExport=(format:'pdf'|'docx')=>run(async()=>{
  if(!current)return;setBusy(`Đang dựng ${format.toUpperCase()}…`);
  const {createDocx,createPdf,download}=await import('../engine/export');const exam={...current,exportMode};const bytes=format==='pdf'?await createPdf([exam]):await createDocx([exam]);download(bytes,`BienTheDeThi_${exam.code}.${format}`,format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document');setNotice(`Đã xuất ${format.toUpperCase()} mã ${exam.code}.`);
 });
 const backup=()=>run(async()=>{if(!doc)return;const {download}=await import('../engine/export');download(new TextEncoder().encode(JSON.stringify({version:2,doc,exams})), 'BienTheDeThi_backup.json','application/json');});
 if(legacy)return <><button className="v2-return" onClick={()=>setLegacy(false)}>Mở xử lý đề đa phương thức V2</button><Suspense fallback={<p>Đang tải…</p>}><Legacy/></Suspense></>;
 return <div className="v2-app"><header className="v2-header"><div className="v2-brand"><BookOpen aria-hidden="true"/><div><strong>BIẾN THỂ ĐỀ THI</strong><p>Không gian biên soạn đa môn</p></div><span className="v2-badge">V2</span></div><div className="v2-row"><button onClick={()=>setLegacy(true)}>Quy trình 3 cấp độ</button><button onClick={()=>setSettings(true)}><Settings2 size={18}/> Cài đặt AI</button></div></header>
 <main className="v2-main"><div className="v2-intro"><div><p className="v2-eyebrow">TỪ TÀI LIỆU GỐC ĐẾN MÃ ĐỀ HOÀN CHỈNH</p><h1>Đọc đề. Kiểm tra. Tạo biến thể.</h1><p>Giữ câu hỏi, công thức, dữ liệu và hình minh họa trong cùng một bản biên soạn.</p></div><div className="v2-flow"><span>01 Nhập đề</span><span>02 Duyệt câu</span><span>03 Tạo mã đề</span><span>04 Xuất file</span></div></div>
 {error&&<div className="v2-alert" role="alert"><strong>Chưa thực hiện được</strong><p>{error}</p><button onClick={()=>setError('')}>Đóng thông báo</button></div>}
 {busy&&<div className="v2-status" role="status"><span className="v2-spinner"/>{busy}</div>}
 {notice&&<p className="v2-notice" role="status">{notice}</p>}
 <fieldset disabled={!!busy||!loaded} className="v2-controls"><section className="v2-import"><div><h2><Upload size={20}/> Nhập đề gốc</h2><p>PDF có text, PDF scan, DOCX, PNG, JPG, WebP · tối đa 25 MB</p></div><div className="v2-row"><button className="v2-primary" onClick={()=>fileRef.current?.click()}>Chọn tài liệu</button><button onClick={()=>useDoc(sampleDocument())}>Mở đề mẫu minh họa</button><button onClick={()=>restoreRef.current?.click()}>Khôi phục bản sao</button></div><input ref={fileRef} type="file" aria-label="Tải tài liệu đề thi" accept=".pdf,.docx,.png,.jpg,.jpeg,.webp,.txt" hidden onChange={e=>{const file=e.target.files?.[0];if(file)void run(async()=>{setBusy('Đang đọc tài liệu…');useDoc(await importDocument(file,setBusy));});e.target.value='';}}/><input ref={restoreRef} type="file" accept=".json" hidden onChange={e=>{const file=e.target.files?.[0];if(file)void run(async()=>{if(file.size>80*1024*1024)throw Error('Bản sao quá lớn.');const data=JSON.parse(await file.text());const {ExamSchema}=await import('../engine/schema');const parsed=DocumentSchema.parse(data.doc);const restored=ExamSchema.array().parse(data.exams);setDoc(parsed);setExams(restored);setActive(-1);setSelected(0);});e.target.value='';}}/>
 <details><summary>Hoặc dán nội dung đề</summary><label>Nội dung văn bản<textarea rows={5} value={text} onChange={e=>setText(e.target.value)} placeholder="Câu 1. …"/></label><button onClick={()=>useDoc(importText(text))} disabled={!text.trim()}>Đọc văn bản</button></details></section>
 {doc&&<><section className="v2-summary"><div><strong>{doc.questions.length}</strong><span>Câu hỏi</span></div><div><strong>{doc.questions.reduce((s,q)=>s+q.formulas.length,0)}</strong><span>Công thức</span></div><div><strong>{doc.assets.length+doc.questions.reduce((s,q)=>s+q.visuals.filter(v=>v.kind!=='asset').length,0)}</strong><span>Hình / tài sản</span></div><div><strong>{doc.questions.reduce((s,q)=>s+q.tables.length,0)}</strong><span>Bảng dữ liệu</span></div><div><strong>{doc.questions.filter(q=>!q.validation.reviewed).length}</strong><span>Cần duyệt</span></div></section>
 <section className="v2-panel"><div className="v2-grid"><label>Tên đề<input value={doc.metadata.title} onChange={e=>setDoc({...doc,metadata:{...doc.metadata,title:e.target.value}})}/></label><label>Trường<input value={doc.metadata.school} onChange={e=>setDoc({...doc,metadata:{...doc.metadata,school:e.target.value}})}/></label><label>Môn học<input value={doc.metadata.subject} onChange={e=>setDoc({...doc,metadata:{...doc.metadata,subject:e.target.value}})}/></label><label>Lớp<input value={doc.metadata.grade} onChange={e=>setDoc({...doc,metadata:{...doc.metadata,grade:e.target.value}})}/></label><label>Thời gian (phút)<input value={doc.metadata.duration} onChange={e=>setDoc({...doc,metadata:{...doc.metadata,duration:e.target.value}})}/></label></div>
 <div className="v2-row"><button onClick={()=>void run(async()=>{setBusy('Đang kết nối AI…');useDoc(await createExamProvider(config).extract(doc,setBusy));})}>Phân tích AI / OCR từ nguồn</button><button onClick={()=>void backup()}><Save size={16}/> Tải bản sao JSON</button></div><p className="text-sm text-slate-500">Phân tích AI sẽ thay bản nhận dạng và mã đề hiện tại. Hãy lưu bản sao nếu đã chỉnh sửa.</p>
 {!!doc.warnings.length&&<details open><summary>⚠ Lưu ý về nhận dạng ({doc.warnings.length})</summary>{[...new Set(doc.warnings)].map((w,i)=><p key={i}>{w}</p>)}</details>}
 {!!doc.assets.length&&<details><summary>Ảnh gốc để đối chiếu ({doc.assets.length})</summary><div className="v2-grid">{doc.assets.map(v=><figure key={v.id}>{v.kind==='asset'&&<img src={v.dataUrl} alt={v.description} loading="lazy"/>}<figcaption>{v.description}</figcaption></figure>)}</div></details>}
 </section>
 <section className="v2-panel"><h2><Shuffle size={20}/> Tạo nhiều mã đề</h2><div className="v2-row"><label>Số mã đề<input type="number" min={1} max={10} value={count} onChange={e=>setCount(Math.max(1,Math.min(10,Number(e.target.value)||1)))}/></label><label>Cách tạo<select value={mode} onChange={e=>setMode(e.target.value)}><option value="shuffle">Trộn câu và lựa chọn</option><option value="variant">Sinh biến thể theo môn</option><option value="both">Biến thể + trộn đề</option></select></label><button className="v2-primary" onClick={generate}>Tạo {count} mã đề</button></div><p className="text-sm text-slate-500">Duyệt các câu gốc trước khi tạo mã. Biến thể giữ độ khó; mỗi môn có quy tắc riêng.</p></section>
 <nav className="v2-tabs" aria-label="Chọn đề"><button aria-current={active<0?'page':undefined} onClick={()=>{setActive(-1);setSelected(0);}}>Đề gốc</button>{exams.map((e,i)=><button key={e.code} aria-current={active===i?'page':undefined} onClick={()=>{setActive(i);setSelected(0);}}>Mã {e.code} · {e.questions.filter(q=>!q.validation.reviewed).length} cần duyệt</button>)}</nav>
 {current&&<div className="v2-editor-layout"><aside className="v2-question-list"><h2><FileCheck2 size={18}/> Danh sách câu</h2>{current.questions.map((q,i)=><button key={q.id} aria-current={selected===i?'true':undefined} onClick={()=>setSelected(i)}>Câu {q.number}<span>{q.validation.reviewed?'✓':'⚠'}</span></button>)}<button onClick={()=>{const q=QuestionSchema.parse({id:crypto.randomUUID(),version:2,number:doc.questions.length+1,subject:doc.metadata.subject,grade:doc.metadata.grade,type:'short_answer',source:{documentId:doc.id},content:'',originalContent:'',correctAnswer:{text:''},validation:{status:'needs_review'}});setDoc({...doc,questions:[...doc.questions,q]});setExams([]);setActive(-1);setSelected(doc.questions.length);}}>+ Thêm câu</button></aside><div className="v2-editor-content">{question&&<><QuestionEditorV2 q={question} assets={doc.assets} onChange={update} onRestore={active>=0?()=>{const original=doc.questions.find(q=>q.id===question.id);if(original)update({...structuredClone(original),number:question.number});}:undefined}/>{active>=0&&<details className="v2-panel" open><summary>So sánh đề gốc và biến thể</summary><div className="v2-grid"><div><strong>Đề gốc</strong><MathContent content={doc.questions.find(q=>q.id===question.id)?.content||''}/></div><div><strong>Biến thể</strong><MathContent content={question.content}/><p>Đáp án: {answerText(question)}</p></div></div><p>{question.content===doc.questions.find(q=>q.id===question.id)?.content?'Nội dung được giữ; kiểm tra thứ tự lựa chọn.':'Nội dung đã thay đổi.'}</p>{question.validation.errors.map((e,i)=><p role="alert" className="v2-error" key={i}>{e}</p>)}{question.validation.warnings.map((e,i)=><p key={i}>⚠ {e}</p>)}</details>}</>}</div></div>}
 <section className="v2-panel v2-export"><div><h2><Download size={20}/> Xuất đề {current?.code}</h2><p>Kiểm tra lỗi và trạng thái duyệt trước khi tạo file.</p></div><label>Nội dung xuất<select value={exportMode} onChange={e=>setExportMode(e.target.value as ExamModel['exportMode'])}><option value="student">Đề học sinh, không đáp án</option><option value="with_answers">Đề + đáp án cuối tài liệu</option><option value="answers">Đáp án riêng + lời giải</option><option value="teacher">Đề giáo viên có lời giải</option></select></label><div className="v2-row"><button onClick={()=>void doExport('docx')}>Word .docx</button><button className="v2-primary" onClick={()=>void doExport('pdf')}>PDF A4</button></div></section>
 </>}
 </fieldset></main><footer className="v2-footer">Anh Giáo PHẠM QUỐC ĐẠT · Biên soạn có kiểm tra nguồn và duyệt của giáo viên</footer><ApiKeyModal isOpen={settings} onClose={()=>setSettings(false)} initialConfig={config} onConfigSaved={setConfig}/></div>;
}
