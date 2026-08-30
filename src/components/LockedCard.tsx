import React from 'react';
import { Lock, ShieldAlert } from 'lucide-react';

interface LockedCardProps {
  level: 2 | 3;
  title: string;
  description: string;
  requirement: string;
}

export const LockedCard: React.FC<LockedCardProps> = ({
  level,
  title,
  description,
  requirement,
}) => {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-[#F8FAFC] p-8 sm:p-12 text-center relative overflow-hidden">
        {/* Lock Watermark */}
        <div className="absolute top-4 right-4 text-slate-300 pointer-events-none">
          <Lock className="w-12 h-12 opacity-30" />
        </div>

        <div className="max-w-md mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-200 text-slate-500 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider">
              Đang Khóa: Cấp Độ {level}
            </span>
            <h3 className="text-xl font-bold text-[#1E293B]">{title}</h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">{description}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-xs text-[#92400E] text-left flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Quy tắc tuần tự bắt buộc:</strong>
              <span className="mt-0.5 block">{requirement}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

