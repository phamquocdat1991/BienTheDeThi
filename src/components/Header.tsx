import React from 'react';
import { BookOpenCheck, Plus, ShieldCheck, Settings2, ExternalLink, History, ArrowUpRight } from 'lucide-react';
import { ExamWorkflowState } from '../types';
import { VisitCounter } from './VisitCounter';
interface HeaderProps { workflowState: ExamWorkflowState; hasApiKey: boolean; onOpenApiKeyModal: () => void; onOpenHistoryModal: () => void; onReset: () => void; }
export const Header: React.FC<HeaderProps> = ({ workflowState, hasApiKey, onOpenApiKeyModal, onOpenHistoryModal, onReset }) => {
  const busy = workflowState === 'ANALYZING' || workflowState.startsWith('GENERATING');
  return <>
    <aside className="workspace-sidebar no-print" aria-label="Không gian giáo viên">
      <a className="brand" href="#main-content"><span className="brand-mark"><BookOpenCheck size={23}/></span><span>Biến thể đề thi<small>TEACHER WORKSPACE</small></span></a>
      <div className="sidebar-caption">KHÔNG GIAN LÀM VIỆC</div>
      <button className="sidebar-link active" onClick={onReset} disabled={busy}><Plus size={18}/>Tạo đề mới<ArrowUpRight size={15} className="ml-auto"/></button>
      <button className="sidebar-link" onClick={onOpenHistoryModal} disabled={busy}><History size={18}/>Lịch sử đề</button>
      <button className="sidebar-link" onClick={onOpenApiKeyModal} disabled={busy}><Settings2 size={18}/>Cài đặt AI</button>
      <div className="sidebar-guide"><span className="guide-symbol">3</span><h2>Từ một đề gốc,<br/>mở rộng cách tư duy.</h2><p>Đổi dữ kiện · Dạng tương đương · Phân hóa và vận dụng</p><div><ShieldCheck size={15}/>Hướng tới GDPT 2018</div></div>
      <div className="sidebar-bottom"><a href="https://aistudio.google.com/api-keys" target="_blank" rel="noopener noreferrer">Lấy API key Google<ExternalLink size={14}/></a><VisitCounter/><div className="author"><span>Đ</span><div>Anh Giáo PHẠM QUỐC ĐẠT<small>Phát triển ứng dụng giáo dục</small></div></div></div>
    </aside>
    <header className="workspace-topbar"><div><span className="desktop-breadcrumb">Không gian giáo viên <span>/</span></span><strong>Biên soạn đề thi</strong><span className="version-pill">3 cấp độ</span></div><div className="topbar-actions"><span className={`api-status ${hasApiKey ? 'configured' : ''}`}><i/>{hasApiKey ? 'Đã lưu cấu hình AI' : 'Chưa cấu hình AI'}</span><button onClick={onOpenApiKeyModal} disabled={busy} className="topbar-settings" aria-label="Cài đặt AI"><Settings2 size={17}/></button></div></header>
    <nav className="mobile-actions no-print" aria-label="Thao tác nhanh"><button onClick={onReset} disabled={busy}><Plus size={16}/>Tạo đề mới</button><button onClick={onOpenHistoryModal} disabled={busy}><History size={16}/>Lịch sử đề</button><button onClick={onOpenApiKeyModal} disabled={busy}><Settings2 size={16}/>Cài đặt AI</button></nav>
  </>;
};
