import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  Sparkles,
  Download,
  RotateCcw,
  Layers,
  GitCompare,
} from 'lucide-react';
import { GeneratedExam, ExamAnalysis, VariantQuestion, QuestionValidation, ApiConfig } from '../types';
import { exportToWordDoc, exportAllThreeVariantsDoc } from '../utils/exportUtils';
import { ExamVariantCard } from './ExamVariantCard';

interface SummaryCompletionViewProps {
  exams: GeneratedExam[];
  originalAnalysis: ExamAnalysis;
  onStartOver: () => void;
  onRegenerateLevel: (level: 1 | 2 | 3) => void;
  isLoading: boolean;
  apiConfig?: ApiConfig;
  onUpdateQuestionInExam?: (
    level: 1 | 2 | 3,
    updatedQuestion: VariantQuestion,
    updatedValidation?: QuestionValidation
  ) => void;
}

export const SummaryCompletionView: React.FC<SummaryCompletionViewProps> = ({
  exams,
  originalAnalysis,
  onStartOver,
  onRegenerateLevel,
  isLoading,
  apiConfig,
  onUpdateQuestionInExam,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    // Fire celebratory confetti on complete
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (e) {
      // Ignore if canvas-confetti fails
    }
  }, []);

  const totalQuestions = exams.reduce((acc, ex) => acc + (ex.questions?.length || 0), 0);
  const totalPass = exams.reduce(
    (acc, ex) => acc + (ex.validationReport?.filter((v) => v.status === 'PASS').length || 0),
    0
  );
  const totalRepaired = exams.reduce((acc, ex) => acc + (ex.repairedQuestionCount || 0), 0);

  const handleExportUnifiedWord = () => {
    if (exams.length >= 3) {
      exportAllThreeVariantsDoc(exams[0], exams[1], exams[2]);
    } else {
      handleExportAllWord();
    }
  };

  const handleExportAllWord = () => {
    exams.forEach((exam, idx) => {
      setTimeout(() => {
        exportToWordDoc(exam, true);
      }, idx * 500);
    });
  };

  const currentExam = exams.find((e) => e.level === selectedLevel) || exams[0];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Celebration Header - Slate Brand with Emerald badge */}
      <div className="bg-[#1E293B] text-white rounded-3xl p-8 sm:p-10 shadow-lg border border-[#334155] text-center sm:text-left space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#10B981]/20 text-[#86EFAC] border border-[#10B981]/30 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              <span>Quy trình hoàn tất: Đã tạo thành công bộ 03 đề biến thể</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              BỘ 03 ĐỀ BIẾN THỂ ĐÃ SẴN SÀNG SỬ DỤNG
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Tất cả 03 cấp độ biến thể (Đổi số, Tương đương, Phân hóa sâu) đã trải qua quy trình giải lại từng bước và kiểm định độc lập 8 tiêu chí.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full sm:w-auto">
            <button
              onClick={handleExportUnifiedWord}
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#92400E] font-bold text-xs sm:text-sm transition shadow-sm border border-[#FCD34D] active:scale-95 cursor-pointer"
              title="Xuất cả 3 cấp độ vào 1 file Word (.doc) duy nhất"
            >
              <Download className="w-4 h-4 text-[#D97706]" />
              <span>Tải Trọn Bộ 3 Đề (1 File .doc)</span>
            </button>

            <button
              onClick={onStartOver}
              className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs sm:text-sm border border-slate-600 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Biên soạn đề mới</span>
            </button>
          </div>
        </div>

        {/* Quality Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 text-left">
            <p className="text-[11px] text-slate-300 font-medium">Tổng số câu đã sinh</p>
            <p className="text-xl font-bold text-white mt-0.5">{totalQuestions} câu</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 text-left">
            <p className="text-[11px] text-slate-300 font-medium">Tỷ lệ Đạt Chuẩn</p>
            <p className="text-xl font-bold text-[#86EFAC] mt-0.5">
              {totalQuestions > 0 ? Math.round((totalPass / totalQuestions) * 100) : 100}% PASS
            </p>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 text-left">
            <p className="text-[11px] text-slate-300 font-medium">Đã tự sửa câu lỗi</p>
            <p className="text-xl font-bold text-white mt-0.5">{totalRepaired} câu</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 text-left">
            <p className="text-[11px] text-slate-300 font-medium">Tiêu chuẩn sư phạm</p>
            <p className="text-xl font-bold text-white mt-0.5">Bộ GD&ĐT 2018</p>
          </div>
        </div>
      </div>

      {/* Level Selector Tabs */}
      <div className="flex bg-[#F1F5F9] p-1.5 rounded-2xl gap-2 border border-slate-200">
        {exams.map((ex) => (
          <button
            key={ex.level}
            onClick={() => setSelectedLevel(ex.level)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              selectedLevel === ex.level
                ? 'bg-white text-[#4F46E5] shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            {ex.level === 1 ? (
              <Layers className="w-4 h-4 text-[#10B981]" />
            ) : ex.level === 2 ? (
              <GitCompare className="w-4 h-4 text-[#4F46E5]" />
            ) : (
              <Sparkles className="w-4 h-4 text-[#F59E0B]" />
            )}
            <span>Đề {ex.level}: {ex.levelName.replace(/ĐỀ BIẾN THỂ \d: /, '')}</span>
          </button>
        ))}
      </div>

      {/* Active Exam Card */}
      {currentExam && (
        <ExamVariantCard
          exam={currentExam}
          originalAnalysis={originalAnalysis}
          onRegenerateCurrent={() => onRegenerateLevel(currentExam.level)}
          onStartOver={onStartOver}
          isNextAvailable={false}
          nextButtonLabel=""
          isLoading={isLoading}
          apiConfig={apiConfig}
          onUpdateQuestion={(updatedQ, updatedVal) => {
            if (onUpdateQuestionInExam) {
              onUpdateQuestionInExam(currentExam.level, updatedQ, updatedVal);
            }
          }}
        />
      )}
    </div>
  );
};
