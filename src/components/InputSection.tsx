import React, { useEffect, useRef, useState } from 'react';
import { UploadCloud, ClipboardPaste, FileText, X, ArrowRight, Sparkles, Check, ShieldCheck, BookOpen, Calculator, Atom, FlaskConical, Loader2 } from 'lucide-react';
import { InputSource } from '../types';
import { extractFileContentInBrowser } from '../services/fileExtractService';
import { SAMPLE_EXAMS, SampleExam } from '../utils/sampleData';
interface InputSectionProps { onAnalyze: (source: InputSource) => void | Promise<void>; isLoading: boolean; hasApiKey: boolean; onOpenApiKeyModal: () => void; }
const DRAFT_KEY = 'bienthedethi_input_draft';
export const InputSection: React.FC<InputSectionProps> = ({onAnalyze,isLoading,hasApiKey,onOpenApiKeyModal}) => {
  const [pastedText,setPastedText]=useState(()=>{try{return localStorage.getItem(DRAFT_KEY)||'';}catch{return '';}});
  const [activeTab,setActiveTab]=useState<'upload'|'paste'>(()=>{try{return localStorage.getItem(DRAFT_KEY)?'paste':'upload';}catch{return 'upload';}});
  const [selectedFile,setSelectedFile]=useState<File|null>(null);
  const [filePreview,setFilePreview]=useState<string|null>(null);
  const [isDragOver,setIsDragOver]=useState(false);
  const [isExtracting,setIsExtracting]=useState(false);
  const [errorMessage,setErrorMessage]=useState<string|null>(null);
  const [draftSaved,setDraftSaved]=useState(false);
  const fileInputRef=useRef<HTMLInputElement>(null);
  const extractionLock=useRef(false);
  const busy=isLoading||isExtracting;
  useEffect(()=>{ const timer=setTimeout(()=>{try{localStorage.setItem(DRAFT_KEY,pastedText);setDraftSaved(Boolean(pastedText));}catch{setDraftSaved(false);}},350);return()=>clearTimeout(timer);},[pastedText]);
  useEffect(()=>{if(!selectedFile||!/^image\//.test(selectedFile.type)){setFilePreview(null);return;}const url=URL.createObjectURL(selectedFile);setFilePreview(url);return()=>URL.revokeObjectURL(url);},[selectedFile]);
  const processFile=(file:File)=>{
    setErrorMessage(null);
    if(file.name.toLowerCase().endsWith('.doc')){setErrorMessage('Tệp Word .doc cũ chưa được hỗ trợ. Hãy lưu thành .docx hoặc PDF rồi tải lại.');return;}
    if(!/\.(docx|pdf|png|jpe?g|webp|txt)$/i.test(file.name)){setErrorMessage('Vui lòng chọn tệp DOCX, PDF, PNG, JPG, WEBP hoặc TXT.');return;}
    if(file.size===0||file.size>25*1024*1024){setErrorMessage('Tệp phải có nội dung và không vượt quá 25 MB.');return;}
    setSelectedFile(file);
  };
  const loadSample=(sample:SampleExam)=>{setPastedText(sample.content);setActiveTab('paste');setErrorMessage(null);};
  const start=async()=>{
    if(extractionLock.current||busy)return;
    setErrorMessage(null);
    if(activeTab==='paste'&&pastedText.trim().length<20){setErrorMessage('Nhập nội dung đề thi đầy đủ, tối thiểu 20 ký tự.');return;}
    if(activeTab==='upload'&&!selectedFile){setErrorMessage('Hãy chọn một tệp đề thi trước khi phân tích.');return;}
    if(!hasApiKey){onOpenApiKeyModal();return;}
    extractionLock.current=true;
    try{setIsExtracting(true);const source=activeTab==='paste'?{type:'text' as const,rawText:pastedText.trim()}:await extractFileContentInBrowser(selectedFile!);await onAnalyze(source);}catch(error){setErrorMessage(error instanceof Error?error.message:'Không thể đọc tệp. Vui lòng thử lại.');}finally{setIsExtracting(false);extractionLock.current=false;}
  };
  return <div className="input-workspace">
    <section className="workspace-intro"><span className="eyebrow"><Sparkles size={14}/>TRỢ LÝ BIÊN SOẠN ĐỀ THI</span><h1>Một đề gốc.<br className="mobile-break"/> <span>Ba cấp độ tư duy.</span></h1><p>Giữ mạch kiến thức, mở rộng cách đặt câu hỏi.<br/>Cùng AI tạo bộ đề phù hợp với mục tiêu giảng dạy của bạn.</p></section>
    <div className="input-grid"><section className="source-card" aria-labelledby="source-title"><div className="source-heading"><div><span className="section-kicker">BƯỚC 01 / 06</span><h2 id="source-title">Bắt đầu từ đề thi của bạn</h2></div><span className="source-label"><FileText size={14}/>Đề gốc</span></div>
      <div className="source-tabs" role="tablist" aria-label="Cách nhập đề"><button role="tab" aria-selected={activeTab==='upload'} aria-controls="source-panel" id="upload-tab" className={activeTab==='upload'?'selected':''} onClick={()=>{setActiveTab('upload');setErrorMessage(null);}} disabled={busy}><UploadCloud size={17}/>Tải tệp lên</button><button role="tab" aria-selected={activeTab==='paste'} aria-controls="source-panel" id="paste-tab" className={activeTab==='paste'?'selected':''} onClick={()=>{setActiveTab('paste');setErrorMessage(null);}} disabled={busy}><ClipboardPaste size={17}/>Dán văn bản</button></div>
      <input ref={fileInputRef} aria-label="Tệp đề thi" type="file" accept=".docx,.pdf,.png,.jpg,.jpeg,.webp,.txt" className="hidden" onChange={e=>{const file=e.target.files?.[0];if(file)processFile(file);e.target.value='';}}/>
      <div className="source-content" id="source-panel" role="tabpanel" aria-labelledby={activeTab==='upload'?'upload-tab':'paste-tab'}>
        {activeTab==='upload' ? <div className={`upload-zone ${isDragOver?'dragging':''}`} onDragOver={e=>{e.preventDefault();if(!busy)setIsDragOver(true);}} onDragLeave={()=>setIsDragOver(false)} onDrop={e=>{e.preventDefault();setIsDragOver(false);if(!busy&&e.dataTransfer.files[0])processFile(e.dataTransfer.files[0]);}}>
          {selectedFile?<><span className="upload-icon"><FileText size={29}/></span><strong className="file-name">{selectedFile.name}</strong><p>{(selectedFile.size/1024).toFixed(1)} KB · Sẵn sàng phân tích</p>{filePreview&&<img src={filePreview} alt="Xem trước đề thi" className="upload-preview"/>}<div className="file-actions"><button className="secondary-button" onClick={()=>fileInputRef.current?.click()} disabled={busy}>Chọn file khác</button><button aria-label="Bỏ tệp đã chọn" className="icon-button" onClick={()=>setSelectedFile(null)} disabled={busy}><X size={18}/></button></div></>:<><span className="upload-icon"><UploadCloud size={30}/></span><strong>Kéo thả đề thi vào đây</strong><p>hoặc chọn tệp có sẵn trên thiết bị của bạn</p><button className="secondary-button" onClick={()=>fileInputRef.current?.click()} disabled={busy}>Chọn tệp từ thiết bị<ArrowRight size={15}/></button><div className="file-types">DOCX<span>PDF</span>PNG / JPG / WEBP<span>TXT</span></div><small>Tối đa 25 MB mỗi tệp</small></>}
        </div>:<div className="paste-panel"><div><label htmlFor="examTextInput">Nội dung đề kiểm tra</label><small>{pastedText.length.toLocaleString('vi-VN')} ký tự</small></div><textarea id="examTextInput" value={pastedText} onChange={e=>{setPastedText(e.target.value);setDraftSaved(false);}} disabled={busy} placeholder="Dán đề thi gồm tiêu đề, câu hỏi, phương án và đáp án (nếu có)…" rows={10}/><small className="draft-status" role="status">{draftSaved?<><Check size={13}/>Đã lưu bản nháp trên thiết bị này</>:'Giữ nguyên công thức và dữ kiện của đề gốc.'}</small></div>}
        {errorMessage&&<div className="input-error" role="alert">{errorMessage}</div>}
        <div className="source-footer"><p><ShieldCheck size={15}/>{hasApiKey?'Sẵn sàng phân tích với AI':'Thêm API key khi bạn sẵn sàng phân tích'}</p><button className="primary-button" onClick={start} disabled={busy}>{busy?<Loader2 size={17} className="animate-spin"/>:<Sparkles size={17}/>}<span>{busy?'Đang xử lý…':'Phân tích đề gốc'}</span><ArrowRight size={17}/></button></div>
      </div>
    </section>
    <aside className="workflow-guide"><div className="guide-heading"><BookOpen size={19}/><h2>Bộ đề của bạn sẽ có gì?</h2></div>{[['01','Đổi dữ kiện & ngữ cảnh','Giữ dạng bài, thay số liệu và tình huống.'],['02','Dạng bài tương đương','Đổi cách hỏi, bảo toàn kiến thức và kỹ năng.'],['03','Phân hóa & vận dụng','Tăng chiều sâu suy luận trong phạm vi lớp học.']].map(([n,t,d])=><div className="level-guide" key={n}><span>{n}</span><div><h3>{t}</h3><p>{d}</p></div></div>)}<div className="quality-note"><ShieldCheck size={19}/><div><strong>Rà soát theo 8 tiêu chí</strong><p>Đối chiếu kiến thức, lời giải và đáp án. Giáo viên duyệt lại trước khi sử dụng.</p></div></div><details><summary>Mẹo để có kết quả tốt</summary><p>Dùng ảnh rõ nét, không cắt mất câu hỏi. Với Word chứa hình hoặc công thức nhúng, hãy xuất PDF để AI đọc đầy đủ.</p></details></aside></div>
    <section className="sample-section"><div className="sample-heading"><h2>Chưa có đề sẵn? Thử một đề mẫu.</h2><span>3 môn học · Có thể chỉnh sửa</span></div><div className="sample-grid">{SAMPLE_EXAMS.map((sample,idx)=>{const Icon=[Calculator,Atom,FlaskConical][idx]||BookOpen;return <button className={`sample-card sample-${idx}`} key={sample.id} onClick={()=>loadSample(sample)} disabled={busy}><span className="sample-icon"><Icon size={22}/></span><div><strong>{sample.subject}<small>{sample.grade} · {sample.duration}</small></strong><p>{sample.title}</p></div><ArrowUpRightIcon/></button>;})}</div></section>
    <p className="workspace-footnote">AI hỗ trợ biên soạn. Chuyên môn của giáo viên quyết định chất lượng bộ đề.</p>
  </div>;
};
const ArrowUpRightIcon=()=> <ArrowRight size={17} className="sample-arrow"/>;
