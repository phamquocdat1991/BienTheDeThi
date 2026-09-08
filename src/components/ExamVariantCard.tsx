import React, { useState } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Copy,
  Printer,
  Download,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  GitCompare,
  Check,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Edit3,
  Play,
  Shuffle,
  FileDown,
} from 'lucide-react';
import {
  GeneratedExam,
  ExamAnalysis,
  QuestionValidation,
  VariantQuestion,
  ApiConfig,
} from '../types';
import {
  formatExamAsText,
  formatAnswersAsText,
  exportToWordDoc,
  exportStudentExamDoc,
  exportTeacherAnswerDoc,
} from '../utils/exportUtils';
import { MathContent } from './MathContent';
import { EditQuestionModal } from './EditQuestionModal';
import { ExamInteractiveModal } from './ExamInteractiveModal';
import { ShuffleModal } from './ShuffleModal';

interface ExamVariantCardProps {
  exam: GeneratedExam;
  originalAnalysis: ExamAnalysis;
  onProceedNext?: () => void;
  onRegenerateCurrent: () => void;
  onStartOver: () => void;
  isNextAvailable: boolean;
  nextButtonLabel: string;
  isLoading: boolean;
  apiConfig?: ApiConfig;
  onUpdateQuestion?: (
    updatedQuestion: VariantQuestion,
    updatedValidation?: QuestionValidation
  ) => void;
}

export const ExamVariantCard: React.FC<ExamVariantCardProps> = ({
  exam,
  originalAnalysis,
  onProceedNext,
  onRegenerateCurrent,
  onStartOver,
  isNextAvailable,
  nextButtonLabel,
  isLoading,
  apiConfig,
  onUpdateQuestion,
}) => {
  const [activeTab, setActiveTab] = useState<'exam' | 'answers' | 'validation' | 'comparison'>('exam');
  const [copiedType, setCopiedType] = useState<'exam' | 'answers' | null>(null);
  const [expandedValId, setExpandedValId] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<VariantQuestion | null>(null);
  const [isInteractiveModalOpen, setIsInteractiveModalOpen] = useState<boolean>(false);
  const [isShuffleModalOpen, setIsShuffleModalOpen] = useState<boolean>(false);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);

  const handleCopyExam = async () => {
    const text = formatExamAsText(exam);
    await navigator.clipboard.writeText(text);
    setCopiedType('exam');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyAnswers = async () => {
    const text = formatAnswersAsText(exam);
    await navigator.clipboard.writeText(text);
    setCopiedType('answers');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportWord = () => {
    exportToWordDoc(exam, true);
  };

  const passCount = exam.validationReport?.filter((v) => v.status === 'PASS').length || 0;
  const warningCount = exam.validationReport?.filter((v) => v.status === 'WARNING').length || 0;
  const failCount = exam.validationReport?.filter((v) => v.status === 'FAIL').length || 0;

  const handleSaveQuestionEdit = (
    updatedQuestion: VariantQuestion,
    updatedValidation?: QuestionValidation
  ) => {
    if (onUpdateQuestion) {
      onUpdateQuestion(updatedQuestion, updatedValidation);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Banner with Level Info & Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#4F46E5]/15 text-[#4338CA] text-xs font-bold border border-[#4F46E5]/30">
                <Sparkles className="w-3.5 h-3.5 text-[#4F46E5]" />
                CẤP ĐỘ {exam.level}: {exam.levelName}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                  exam.overallValidationStatus === 'PASS'
                    ? 'bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]'
                    : 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                {exam.overallValidationStatus === 'PASS'
                  ? 'AI đã rà soát: ĐẠT'
                  : exam.overallValidationStatus === 'FAIL' ? 'Kiểm định: CÓ LỖI CẦN SỬA' : 'Kiểm định: CẦN LƯU Ý'}
              </span>
              {exam.repairedQuestionCount && exam.repairedQuestionCount > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EEF2FF] text-[#4338CA] text-[11px] font-medium border border-[#C7D2FE]">
                  Đã tự động chỉnh sửa {exam.repairedQuestionCount} câu
                </span>
              ) : null}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{exam.title}</h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">{exam.levelDescription}</p>
          </div>

          {/* Top Level Next CTA */}
          {onProceedNext && isNextAvailable && (
            <div className="shrink-0 w-full lg:w-auto">
              <button
                onClick={onProceedNext}
                disabled={isLoading}
                className="w-full lg:w-auto flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] active:bg-[#3730A3] text-white font-bold text-sm shadow-md shadow-[#4F46E5]/20 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>{nextButtonLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Toolbar Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopyExam}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F8FAFC] hover:bg-slate-200 text-slate-800 text-xs font-semibold transition border border-slate-200 cursor-pointer active:scale-95"
            >
              {copiedType === 'exam' ? (
                <>
                  <Check className="w-4 h-4 text-[#10B981]" />
                  <span className="text-[#15803D]">Đã sao chép đề!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-600" />
                  <span>Sao chép đề</span>
                </>
              )}
            </button>

            <button
              onClick={handleCopyAnswers}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F8FAFC] hover:bg-slate-200 text-slate-800 text-xs font-semibold transition border border-slate-200 cursor-pointer active:scale-95"
            >
              {copiedType === 'answers' ? (
                <>
                  <Check className="w-4 h-4 text-[#10B981]" />
                  <span className="text-[#15803D]">Đã sao chép đáp án!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-600" />
                  <span>Sao chép đáp án</span>
                </>
              )}
            </button>

            {/* Button Thi thử trực tuyến */}
            <button
              onClick={() => setIsInteractiveModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
              title="Làm bài thi thử trực tiếp trên máy có bấm giờ và tự động chấm điểm"
            >
              <Play className="w-4 h-4 fill-white text-white" />
              <span>Thi thử trực tuyến</span>
            </button>

            {/* Button Trộn 4 mã đề */}
            <button
              onClick={() => setIsShuffleModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition border border-indigo-200 cursor-pointer active:scale-95"
              title="Hoán vị câu hỏi và phương án A/B/C/D thành 4 mã đề 101, 102, 103, 104"
            >
              <Shuffle className="w-4 h-4 text-indigo-600" />
              <span>Trộn 4 mã đề</span>
            </button>

            {/* Export Dropdown / Menu */}
            <div className="relative inline-block text-left">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#92400E] text-xs font-bold transition border border-[#FCD34D] shadow-xs cursor-pointer active:scale-95"
              >
                <Download className="w-4 h-4 text-[#D97706]" />
                <span>Xuất file Word (.doc)</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#D97706]" />
              </button>

              {showExportMenu && (
                <div
                  className="absolute left-0 mt-1.5 w-60 rounded-2xl bg-white border border-slate-200 shadow-xl z-40 p-1.5 space-y-1 animate-in fade-in"
                  onMouseLeave={() => setShowExportMenu(false)}
                >
                  <button
                    onClick={() => {
                      exportStudentExamDoc(exam);
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-slate-100 flex items-center justify-between text-slate-700 font-medium transition cursor-pointer"
                  >
                    <span>📄 Đề Học Sinh (Không đáp án)</span>
                  </button>
                  <button
                    onClick={() => {
                      exportTeacherAnswerDoc(exam);
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-slate-100 flex items-center justify-between text-slate-700 font-medium transition cursor-pointer"
                  >
                    <span>📝 Đáp Án & Hướng Dẫn Chấm</span>
                  </button>
                  <button
                    onClick={() => {
                      exportToWordDoc(exam, true);
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-slate-100 flex items-center justify-between text-slate-900 font-bold border-t border-slate-100 transition cursor-pointer"
                  >
                    <span>📦 Trọn Gói (Đề + Lời Giải)</span>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F8FAFC] hover:bg-slate-200 text-slate-800 text-xs font-semibold transition border border-slate-200 cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>In đề thi</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRegenerateCurrent}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition border border-slate-300 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Tạo lại Đề {exam.level} này</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* 4 Required Tabs in Exact Order: ĐỀ THI | ĐÁP ÁN | KIỂM ĐỊNH | SO SÁNH */}
        <div className="flex border-b border-slate-200 bg-[#F8FAFC] p-1.5 gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('exam')}
            className={`flex items-center gap-2 py-3 px-5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'exam'
                ? 'bg-white text-[#4F46E5] shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>ĐỀ THI</span>
          </button>

          <button
            onClick={() => setActiveTab('answers')}
            className={`flex items-center gap-2 py-3 px-5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'answers'
                ? 'bg-white text-[#4F46E5] shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>ĐÁP ÁN</span>
          </button>

          <button
            onClick={() => setActiveTab('validation')}
            className={`flex items-center gap-2 py-3 px-5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'validation'
                ? 'bg-white text-[#4F46E5] shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>KIỂM ĐỊNH ({passCount} PASS / {warningCount} CẢNH BÁO)</span>
          </button>

          <button
            onClick={() => setActiveTab('comparison')}
            className={`flex items-center gap-2 py-3 px-5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'comparison'
                ? 'bg-white text-[#4F46E5] shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <GitCompare className="w-4 h-4" />
            <span>SO SÁNH</span>
          </button>
        </div>

        {/* Tab 1: Exam Sheet View (ĐỀ THI) */}
        {activeTab === 'exam' && (
          <div className="p-6 sm:p-10 space-y-8 bg-white" id="printable-exam-area">
            {/* Standard Vietnamese School Header */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b-2 border-slate-900 text-center sm:text-left">
              <div>
                <p className="text-xs font-bold text-slate-900 uppercase">SỞ GD&ĐT / TRƯỜNG: ........................</p>
                <p className="text-xs text-slate-700 italic">
                  Tổ Bộ môn: {exam.metadata?.subject || 'Tự nhiên'}
                </p>
                <p className="text-xs text-slate-700 mt-2">
                  Họ và tên thí sinh: .....................................................
                </p>
                <p className="text-xs text-slate-700">
                  Lớp: ......................... SBD: ....................................
                </p>
              </div>

              <div className="text-center sm:text-right space-y-0.5">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase">
                  {exam.title}
                </h3>
                <p className="text-xs font-bold text-[#4F46E5] uppercase">
                  {exam.levelName}
                </p>
                <p className="text-xs text-slate-600 italic">
                  Thời gian làm bài: {exam.metadata?.durationMinutes || 45} phút (không kể thời gian giao đề)
                </p>
                <p className="text-[11px] text-slate-600">Mã đề: <strong>V0{exam.level}</strong></p>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-6">
              {exam.questions.map((q: VariantQuestion, idx: number) => (
                <div key={q.id || idx} className="space-y-2.5 break-inside-avoid p-3 rounded-xl hover:bg-slate-50 transition relative group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1">
                      <span className="text-sm font-bold text-slate-900 shrink-0">
                        Câu {q.number || idx + 1}:
                      </span>
                      <div className="text-sm text-slate-900 leading-relaxed font-normal flex-1">
                        <MathContent content={q.questionText} />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEditingQuestion(q)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#E0E7FF] hover:bg-[#C7D2FE] text-[#4338CA] text-[11px] font-bold shrink-0 transition no-print cursor-pointer"
                      title="Chỉnh sửa hoặc nhờ AI giải lại câu này"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Sửa câu này</span>
                    </button>
                  </div>

                  {/* Multiple choice options */}
                  {q.options && q.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pl-4 sm:pl-6 pt-1">
                      {q.options.map((opt) => (
                        <div key={opt.label} className="text-xs text-slate-800 flex items-start gap-1.5">
                          <strong className="text-slate-900 font-bold shrink-0">{opt.label}.</strong>
                          <MathContent content={opt.text} inline />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* End of test note */}
            <div className="pt-8 text-center text-xs font-semibold text-slate-500 border-t border-slate-200">
              ---------- HẾT ----------
              <p className="text-[11px] font-normal italic text-slate-400 mt-1">
                (Cán bộ coi thi không giải thích gì thêm)
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Answers & Detailed Solutions (ĐÁP ÁN) */}
        {activeTab === 'answers' && (
          <div className="p-6 sm:p-8 space-y-8">
            {/* Quick Answer Matrix */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
                <h3 className="text-base font-bold text-slate-900">BẢNG ĐÁP ÁN NHANH</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-300 text-xs text-center">
                  <thead>
                    <tr className="bg-[#F8FAFC] text-slate-700 font-bold">
                      {exam.questions.map((q, idx) => (
                        <th key={q.id || idx} className="border border-slate-300 p-2.5">
                          Câu {q.number || idx + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white text-[#15803D] font-extrabold text-sm">
                      {exam.questions.map((q, idx) => (
                        <td key={q.id || idx} className="border border-slate-300 p-2.5">
                          {q.correctAnswer}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detailed Solutions */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#4F46E5]" />
                <h3 className="text-base font-bold text-slate-900">LỜI GIẢI CHI TIẾT TỪNG CÂU</h3>
              </div>

              <div className="space-y-4">
                {exam.questions.map((q: VariantQuestion, idx: number) => (
                  <div
                    key={q.id || idx}
                    className="p-5 rounded-xl border border-slate-200 bg-[#F8FAFC] space-y-3 relative group"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#1E293B] text-white text-xs font-bold">
                          Câu {q.number || idx + 1}
                        </span>
                        <span className="text-xs font-bold text-[#15803D] bg-[#DCFCE7] px-2 py-0.5 rounded border border-[#86EFAC]">
                          Đáp án đúng: {q.correctAnswer}
                        </span>
                        <span className="text-xs text-slate-600 bg-slate-200 px-2 py-0.5 rounded font-medium">
                          {q.difficulty}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        {q.points && (
                          <span className="text-xs font-semibold text-slate-600">{q.points} điểm</span>
                        )}

                        <button
                          type="button"
                          onClick={() => setEditingQuestion(q)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-[#4F46E5] border border-slate-200 text-xs font-bold transition cursor-pointer"
                          title="Chỉnh sửa câu hỏi này"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Chỉnh sửa câu</span>
                        </button>
                      </div>
                    </div>

                    <div className="text-xs font-medium text-slate-800">
                      <MathContent content={q.questionText} />
                    </div>

                    {/* Step-by-step solving */}
                    {q.solveSteps && q.solveSteps.length > 0 && (
                      <div className="p-3.5 rounded-lg bg-white border border-slate-200 text-xs space-y-1.5">
                        <p className="font-bold text-slate-800">Các bước tự giải lại của AI:</p>
                        <ol className="list-decimal pl-4 space-y-1 text-slate-700">
                          {q.solveSteps.map((step, sIdx) => (
                            <li key={sIdx}>
                              <MathContent content={step} />
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {q.explanation && (
                      <div className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed space-y-1">
                        <strong className="text-slate-900 block">Hướng dẫn chấm / Lời giải sư phạm: </strong>
                        <MathContent content={q.explanation} />
                      </div>
                    )}

                    {q.changesFromOriginal && (
                      <p className="text-[11px] text-[#4338CA] bg-[#EEF2FF] p-2.5 rounded border border-[#C7D2FE]">
                        <strong>Điểm biến thể so với đề gốc:</strong> {q.changesFromOriginal}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Independent Validation Report (KIỂM ĐỊNH) */}
        {activeTab === 'validation' && (
          <div className="p-6 sm:p-8 space-y-6">
            {/* Validation Summary Card - Brand Slate */}
            <div className="p-5 rounded-2xl bg-[#1E293B] text-white space-y-3 border border-[#334155]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-[#10B981]" />
                <h3 className="text-lg font-bold">Báo Cáo Động Cơ Kiểm Định Độc Lập</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {exam.validationSummary ||
                  'Chuyên gia phản biện độc lập đã rà soát toàn bộ các câu hỏi theo 8 tiêu chí kiểm định khắt khe.'}
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <div className="px-3 py-1.5 rounded-xl bg-[#10B981]/20 border border-[#10B981]/40 text-[#86EFAC] text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                  <span>{passCount} Câu PASS</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-[#F59E0B]/20 border border-[#F59E0B]/40 text-[#FDE68A] text-xs font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
                  <span>{warningCount} Câu CẢNH BÁO</span>
                </div>
                {failCount > 0 && (
                  <div className="px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-400/30 text-rose-300 text-xs font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span>{failCount} Câu FAIL</span>
                  </div>
                )}
              </div>
            </div>

            {/* Validation Table / Detailed Checklist */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900">
                Chi tiết 8 Tiêu chí Khảo thí từng câu:
              </h4>

              <div className="space-y-3">
                {exam.validationReport?.map((val: QuestionValidation, idx: number) => {
                  const isExpanded = expandedValId === val.questionId;
                  return (
                    <div
                      key={val.questionId || idx}
                      className={`rounded-xl border transition p-4 ${
                        val.status === 'PASS'
                          ? 'bg-white border-slate-200'
                          : val.status === 'WARNING'
                          ? 'bg-[#FEF3C7]/40 border-[#FDE68A]'
                          : 'bg-rose-50/40 border-rose-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              Câu {val.questionNumber || idx + 1}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                val.status === 'PASS'
                                  ? 'bg-[#DCFCE7] text-[#15803D]'
                                  : val.status === 'WARNING'
                                  ? 'bg-[#FEF3C7] text-[#B45309]'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {val.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700">{val.message || 'Đạt tất cả tiêu chuẩn phản biện.'}</p>
                        </div>

                        <button
                          onClick={() => setExpandedValId(isExpanded ? null : val.questionId)}
                          className="text-xs text-[#4F46E5] font-semibold flex items-center gap-1 hover:underline shrink-0 cursor-pointer"
                        >
                          <span>{isExpanded ? 'Ẩn 8 tiêu chí' : 'Xem 8 tiêu chí'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* 8 Criteria Grid */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          <div className="bg-[#F8FAFC] p-2.5 rounded-lg border border-slate-200">
                            <strong className="text-slate-800">1. Kiến thức khoa học:</strong>
                            <p className="text-slate-600 mt-0.5">{val.knowledgeCheck || 'Chuẩn xác'}</p>
                          </div>
                          <div className="bg-[#F8FAFC] p-2.5 rounded-lg border border-slate-200">
                            <strong className="text-slate-800">2. Công thức áp dụng:</strong>
                            <p className="text-slate-600 mt-0.5">{val.formulaCheck || 'Đúng công thức'}</p>
                          </div>
                          <div className="bg-[#F8FAFC] p-2.5 rounded-lg border border-slate-200">
                            <strong className="text-slate-800">3. Định lý & Định luật:</strong>
                            <p className="text-slate-600 mt-0.5">{val.lawOrRuleCheck || 'Tuân thủ'}</p>
                          </div>
                          <div className="bg-[#F8FAFC] p-2.5 rounded-lg border border-slate-200">
                            <strong className="text-slate-800">4. Điều kiện xác định/thực tế:</strong>
                            <p className="text-slate-600 mt-0.5">{val.conditionCheck || 'Thỏa mãn'}</p>
                          </div>
                          <div className="bg-[#F8FAFC] p-2.5 rounded-lg border border-slate-200">
                            <strong className="text-slate-800">5. Tính chặt chẽ lời giải:</strong>
                            <p className="text-slate-600 mt-0.5">{val.solutionCheck || 'Logic'}</p>
                          </div>
                          <div className="bg-[#F8FAFC] p-2.5 rounded-lg border border-slate-200">
                            <strong className="text-slate-800">6. Tính duy nhất của đáp án:</strong>
                            <p className="text-slate-600 mt-0.5">{val.answerCheck || 'Duy nhất & nhiễu chuẩn'}</p>
                          </div>
                          <div className="bg-[#F8FAFC] p-2.5 rounded-lg border border-slate-200">
                            <strong className="text-slate-800">7. Chuẩn mức độ nhận thức:</strong>
                            <p className="text-slate-600 mt-0.5">{val.difficultyCheck || 'Phù hợp'}</p>
                          </div>
                          <div className="bg-[#F8FAFC] p-2.5 rounded-lg border border-slate-200">
                            <strong className="text-slate-800">8. Chuẩn cấp lớp/chương trình:</strong>
                            <p className="text-slate-600 mt-0.5">{val.gradeLevelCheck || 'Không vượt chuẩn'}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Side-by-Side Comparison with Original Exam (SO SÁNH) */}
        {activeTab === 'comparison' && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Đối Chiếu Từng Câu: Đề Gốc vs Đề Biến Thể Cấp Độ {exam.level}
              </h3>
              <p className="text-xs text-slate-500">
                Theo dõi chính xác những thay đổi sư phạm, số liệu, dạng câu hỏi hoặc chiều sâu tư duy giữa 2 phiên bản.
              </p>
            </div>

            <div className="space-y-6">
              {exam.questions.map((vq: VariantQuestion, idx: number) => {
                const origQ =
                  originalAnalysis.questions?.[idx] ||
                  originalAnalysis.questions?.find((q) => q.id === vq.originalQuestionId);
                return (
                  <div
                    key={vq.id || idx}
                    className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs"
                  >
                    {/* Header */}
                    <div className="bg-[#F8FAFC] p-3 px-4 flex items-center justify-between border-b border-slate-200 text-xs font-bold text-slate-800">
                      <span>CÂU HỎI SỐ {vq.number || idx + 1}</span>
                      <span className="text-[#4338CA] bg-[#EEF2FF] px-2.5 py-0.5 rounded-full border border-[#C7D2FE]">
                        {vq.changesFromOriginal || 'Biến thể tương ứng'}
                      </span>
                    </div>

                    {/* Side-by-side columns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                      {/* Original Question */}
                      <div className="p-4 space-y-3 bg-white">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            [ĐỀ GỐC]
                          </span>
                          {origQ && (
                            <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                              {origQ.difficulty}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-800 leading-relaxed font-medium">
                          {origQ ? (
                            <MathContent content={origQ.questionText} />
                          ) : (
                            '(Không tìm thấy câu gốc tương ứng)'
                          )}
                        </div>

                        {origQ?.options && (
                          <div className="space-y-1 pl-2">
                            {origQ.options.map((opt) => (
                              <div
                                key={opt.label}
                                className={`text-[11px] flex items-start gap-1 ${
                                  opt.label === origQ.correctAnswer
                                    ? 'text-[#15803D] font-bold'
                                    : 'text-slate-600'
                                }`}
                              >
                                <span className="font-bold shrink-0">{opt.label}. </span>
                                <MathContent content={opt.text} inline />
                              </div>
                            ))}
                          </div>
                        )}

                        {origQ && (
                          <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-200/80">
                            Đáp án gốc: <strong className="text-slate-800">{origQ.correctAnswer}</strong>
                          </p>
                        )}
                      </div>

                      {/* Variant Question */}
                      <div className="p-4 space-y-3 bg-[#EEF2FF]/30">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-[#4F46E5] uppercase tracking-wider">
                            [ĐỀ BIẾN THỂ CẤP ĐỘ {exam.level}]
                          </span>
                          <span className="text-[10px] font-semibold bg-[#E0E7FF] text-[#4338CA] px-2 py-0.5 rounded">
                            {vq.difficulty}
                          </span>
                        </div>

                        <div className="text-xs text-slate-900 leading-relaxed font-medium">
                          <MathContent content={vq.questionText} />
                        </div>

                        {vq.options && (
                          <div className="space-y-1 pl-2">
                            {vq.options.map((opt) => (
                              <div
                                key={opt.label}
                                className={`text-[11px] flex items-start gap-1 ${
                                  opt.label === vq.correctAnswer
                                    ? 'text-[#15803D] font-bold bg-[#DCFCE7] px-1.5 py-0.5 rounded'
                                    : 'text-slate-700'
                                }`}
                              >
                                <span className="font-bold shrink-0">{opt.label}. </span>
                                <MathContent content={opt.text} inline />
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-200 text-[11px] space-y-1">
                          <p className="text-[#15803D] font-bold">
                            Đáp án mới: {vq.correctAnswer}
                          </p>
                          <div className="text-slate-600 italic">
                            <span>Lời giải tóm tắt: </span>
                            <MathContent content={vq.explanation} inline />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom CTA for next phase */}
      {onProceedNext && isNextAvailable && (
        <div className="p-6 rounded-2xl bg-[#1E293B] text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm border border-[#334155]">
          <div>
            <h4 className="text-base font-bold text-white">{nextButtonLabel}</h4>
            <p className="text-xs text-slate-300 mt-0.5">
              Đề {exam.level} đã hoàn tất kiểm định và lưu trữ. Tiếp tục quy trình tuần tự theo chuẩn khảo thí.
            </p>
          </div>

          <button
            onClick={onProceedNext}
            disabled={isLoading}
            className="shrink-0 flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] active:bg-[#3730A3] text-white font-bold text-sm shadow-md shadow-[#4F46E5]/20 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <span>{nextButtonLabel}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal for Editing a Specific Question */}
      {editingQuestion && (
        <EditQuestionModal
          isOpen={!!editingQuestion}
          onClose={() => setEditingQuestion(null)}
          question={editingQuestion}
          originalQuestion={originalAnalysis.questions?.find(
            (q) => q.id === editingQuestion.originalQuestionId || q.number === editingQuestion.number
          )}
          level={exam.level}
          apiConfig={apiConfig}
          onSaveQuestion={handleSaveQuestionEdit}
        />
      )}

      {/* Modal for Student Interactive Quiz */}
      <ExamInteractiveModal
        isOpen={isInteractiveModalOpen}
        onClose={() => setIsInteractiveModalOpen(false)}
        exam={exam}
      />

      {/* Modal for Shuffling 4 Variant Codes */}
      <ShuffleModal
        isOpen={isShuffleModalOpen}
        onClose={() => setIsShuffleModalOpen(false)}
        exam={exam}
      />
    </div>
  );
};
