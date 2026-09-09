import React from 'react';
import { BookOpenCheck, RotateCcw, ShieldCheck, Key, Sparkles, ExternalLink, History } from 'lucide-react';
import { ExamWorkflowState } from '../types';
import { VisitCounter } from './VisitCounter';

interface HeaderProps {
  workflowState: ExamWorkflowState;
  hasApiKey: boolean;
  onOpenApiKeyModal: () => void;
  onOpenHistoryModal: () => void;
  onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  workflowState,
  hasApiKey,
  onOpenApiKeyModal,
  onOpenHistoryModal,
  onReset,
}) => {
  const isStarted = workflowState !== 'EMPTY';

  return (
    <header className="sunrise-header border-b sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-16 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#238773] to-[#176653] flex items-center justify-center shadow-inner text-white font-bold shrink-0">
            <BookOpenCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#174f45] flex items-center gap-1.5">
                AI BIẾN THỂ ĐỀ THI <span className="text-[#238773] font-bold">3 CẤP ĐỘ</span>
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#238773]/20 text-[#238773] border border-[#238773]/40">
                Sư phạm Chuẩn hóa GDPT 2018
              </span>
            </div>
            <p className="text-xs text-slate-600 flex items-center gap-1.5 flex-wrap">
              <span>Phát triển bởi: <strong className="text-[#a44f62] font-bold">Anh Giáo PHẠM QUỐC ĐẠT</strong></span>
              <span className="hidden md:inline text-slate-500">•</span>
              <span className="hidden md:inline text-slate-400">Phân tích đề gốc • Tự giải lại • Kiểm định 8 tiêu chí</span>
            </p>
          </div>
        </div>

        {/* Center: Visit Counter */}
        <div className="hidden md:flex items-center">
          <VisitCounter />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Dedicated Red Action: "Lấy API key để sử dụng app" per AI_INSTRUCTIONS.md */}
          <a
            href="https://aistudio.google.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
            title="Lấy API Key Google miễn phí tại Google AI Studio"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Lấy API key để sử dụng app</span>
          </a>

          {/* API Key Settings Button */}
          <button
            onClick={onOpenApiKeyModal}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer active:scale-95 shadow-xs ${
              hasApiKey
                ? 'bg-white hover:bg-emerald-50 text-[#176653] border-emerald-200'
                : 'bg-orange-50 hover:bg-orange-100 text-amber-900 border-orange-200'
            }`}
            title="Cài đặt API Key & Model"
          >
            <Key className={`w-3.5 h-3.5 ${hasApiKey ? 'text-emerald-400' : 'text-[#a44f62]'}`} />
            <span>{hasApiKey ? 'Cài đặt API' : 'Nhập Key'}</span>
          </button>

          {/* History Button */}
          <button
            onClick={onOpenHistoryModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-[#176653] text-xs font-bold transition border border-emerald-200 cursor-pointer active:scale-95 shadow-xs"
            title="Xem danh sách đề thi đã tạo & sao lưu"
          >
            <History className="w-3.5 h-3.5 text-[#a44f62]" />
            <span>Lịch sử đề</span>
          </button>

          {isStarted && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-[#176653] text-xs font-semibold transition border border-emerald-200 cursor-pointer shadow-xs active:scale-95"
              title="Bắt đầu phân tích đề mới"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
              <span>Bắt đầu lại</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
