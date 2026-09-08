import React from 'react';
import { Check, Loader2, Lock } from 'lucide-react';
import { ExamWorkflowState } from '../types';
interface StepperProps { workflowState: ExamWorkflowState; activeTab?: number; onSelectStep?: (id: number) => void; hasError?: boolean; }
const steps = [['Đề gốc','Nạp nội dung'],['Phân tích','Ma trận kiến thức'],['Biến thể 1','Đổi dữ kiện'],['Biến thể 2','Dạng tương đương'],['Biến thể 3','Phân hóa tư duy'],['Hoàn tất','Xuất bộ đề']];
const completed: Record<ExamWorkflowState,number> = {EMPTY:0,ANALYZING:1,ANALYZED:2,GENERATING_EXAM_1:2,EXAM_1_COMPLETE:3,GENERATING_EXAM_2:3,EXAM_2_COMPLETE:4,GENERATING_EXAM_3:4,COMPLETE:6};
export const Stepper: React.FC<StepperProps> = ({workflowState,activeTab=1,onSelectStep,hasError}) => {
  const done = completed[workflowState];
  const busy = workflowState === 'ANALYZING' || workflowState.startsWith('GENERATING');
  return <nav className="workflow-progress no-print" aria-label="Tiến trình biên soạn đề thi"><ol>{steps.map(([title, subtitle],idx)=>{
    const id=idx+1, available=id===1||id<=done, active=id===activeTab, processing=busy&&id===done+1;
    return <li key={id}><button disabled={!available||busy} onClick={()=>onSelectStep?.(id)} aria-current={active?'step':undefined} className={`workflow-step ${active?'current':''} ${id<=done?'complete':''} ${hasError&&active?'step-error':''}`}><span className="step-number">{processing?<Loader2 size={17} className="animate-spin"/>:id<=done&&!active?<Check size={17}/>:!available&&!processing?<Lock size={14}/>:id}</span><span><strong>{title}</strong><small>{processing?'Đang xử lý…':subtitle}</small></span></button></li>;
  })}</ol></nav>;
};
