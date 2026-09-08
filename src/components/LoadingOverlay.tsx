import React, { useEffect, useState } from 'react';
import { Loader2, Sparkles, BrainCircuit, CheckCircle2 } from 'lucide-react';

interface LoadingOverlayProps {
  stageText: string;
  subText?: string;
  level?: 1 | 2 | 3 | 'analysis';
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  stageText,
  subText,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const stepsForGeneration = [
    { title: 'Phân tích ma trận kiến thức & cấp độ', desc: 'Kiểm tra chuẩn chương trình Bộ GD&ĐT' },
    { title: 'Biên soạn nội dung câu hỏi mới', desc: 'Đảm bảo tính sư phạm và mục tiêu nhận thức' },
    { title: 'Mô hình tự giải lại từng bước', desc: 'Kiểm tra điều kiện, công thức và tính toán đáp án' },
    { title: 'Chuyên gia kiểm định độc lập 8 tiêu chí', desc: 'Rà soát lỗi sai, phương án nhiễu và độ khó' },
    { title: 'Tự động hiệu chỉnh câu chưa đạt chuẩn', desc: 'Đóng gói đề thi biến thể chuẩn mực' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev < stepsForGeneration.length - 1 ? prev + 1 : prev));
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-[#1E293B]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 sm:p-10 max-w-lg w-full shadow-2xl border border-slate-200 text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Animated Icon */}
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 rounded-3xl bg-[#4F46E5]/20 animate-ping" />
          <div className="relative w-20 h-20 rounded-3xl bg-[#4F46E5] flex items-center justify-center text-white shadow-xl shadow-[#4F46E5]/30">
            <BrainCircuit className="w-10 h-10 animate-pulse" />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#EEF2FF] text-[#4338CA] text-xs font-bold border border-[#C7D2FE]">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            <span>AI BIẾN THỂ ĐỀ THI ĐANG XỬ LÝ</span>
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {stageText}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
            {subText || 'Hệ thống đang thực hiện tuần tự để bảo đảm tính chính xác sư phạm 100%.'}
          </p>
        </div>

        {/* Real Step Indicators */}
        <div className="bg-[#F8FAFC] rounded-2xl p-4 border border-slate-200 text-left space-y-3">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Tiến trình khảo thí chi tiết:
          </p>
          <div className="space-y-2.5">
            {stepsForGeneration.map((step, idx) => {
              const isDone = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;

              return (
                <div key={idx} className="flex items-start gap-2.5 text-xs">
                  <div className="mt-0.5 shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                    ) : isCurrent ? (
                      <Loader2 className="w-4 h-4 text-[#4F46E5] animate-spin" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-300 bg-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`font-semibold ${
                        isDone
                          ? 'text-slate-700'
                          : isCurrent
                          ? 'text-[#4338CA] font-bold'
                          : 'text-slate-400'
                      }`}
                    >
                      {step.title}
                    </p>
                    <p
                      className={`text-[10px] ${
                        isCurrent ? 'text-[#4F46E5]' : 'text-slate-400'
                      }`}
                    >
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-[11px] text-slate-400 italic">
          Vui lòng đợi trong giây lát, quá trình giải lại và kiểm định độc lập cần tính toán khoa học.
        </p>
      </div>
    </div>
  );
};

