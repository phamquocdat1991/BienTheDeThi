import React, { useState } from 'react';
import {
  BookOpen,
  Clock,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Sparkles,
  Sigma,
  FileCheck2,
  ListOrdered,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';
import { ExamAnalysis, OriginalQuestion } from '../types';
import { MathContent } from './MathContent';

interface AnalysisViewProps {
  analysis: ExamAnalysis;
  onGenerateExam1: () => void;
  isLoading: boolean;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({
  analysis,
  onGenerateExam1,
  isLoading,
}) => {
  const [showAllQuestions, setShowAllQuestions] = useState(true);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  const meta = analysis.examMetadata || {
    title: 'Đề kiểm tra',
    subject: 'Toán học',
    grade: 'Lớp 10',
    durationMinutes: 45,
    totalPoints: 10,
    totalQuestions: analysis.questions?.length || 0,
  };

  const diffLevels = analysis.difficultyLevels || {
    recognitionCount: 0,
    comprehensionCount: 0,
    applicationCount: 0,
    advancedApplicationCount: 0,
  };

  const totalQuestions = analysis.questions?.length || 1;
  const recPct = Math.round(((diffLevels.recognitionCount || 0) / totalQuestions) * 100);
  const compPct = Math.round(((diffLevels.comprehensionCount || 0) / totalQuestions) * 100);
  const appPct = Math.round(((diffLevels.applicationCount || 0) / totalQuestions) * 100);
  const advPct = Math.round(((diffLevels.advancedApplicationCount || 0) / totalQuestions) * 100);

  const toggleQuestionExpand = (id: string) => {
    setExpandedQuestionId(expandedQuestionId === id ? null : id);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC] text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Bước 2: Phân Tích Ma Trận Đề Gốc Thành Công</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {meta.title || 'Kết Quả Phân Tích Đề Kiểm Tra Gốc'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">
              Hệ thống đã nhận diện cấu trúc, phân loại nhận thức và lưu ma trận đề thi để phục vụ sinh 03 đề biến thể tuần tự.
            </p>
          </div>

          <div className="shrink-0 w-full lg:w-auto">
            <button
              onClick={onGenerateExam1}
              disabled={isLoading}
              className="w-full lg:w-auto flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-[#238773] hover:bg-[#176653] active:bg-[#124f43] text-white font-bold text-sm shadow-md shadow-[#238773]/20 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-sky-200" />
              <span>TIẾP TỤC: TẠO ĐỀ BIẾN THỂ 1 (ĐỔI SỐ LIỆU)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-[#fffbf7] rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
              <BookOpen className="w-4 h-4 text-[#238773]" />
              <span>Môn & Khối Lớp</span>
            </div>
            <p className="text-base font-bold text-slate-900">
              {meta.subject || 'Đa môn'} • {meta.grade || 'Toàn cấp'}
            </p>
          </div>

          <div className="bg-[#fffbf7] rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
              <Clock className="w-4 h-4 text-[#238773]" />
              <span>Thời Gian Làm Bài</span>
            </div>
            <p className="text-base font-bold text-slate-900">
              {meta.durationMinutes || 45} phút
            </p>
          </div>

          <div className="bg-[#fffbf7] rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
              <ListOrdered className="w-4 h-4 text-[#10B981]" />
              <span>Tổng Số Câu Hỏi</span>
            </div>
            <p className="text-base font-bold text-slate-900">
              {analysis.questions?.length || 0} câu hỏi
            </p>
          </div>

          <div className="bg-[#fffbf7] rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
              <Award className="w-4 h-4 text-[#F59E0B]" />
              <span>Tổng Thang Điểm</span>
            </div>
            <p className="text-base font-bold text-slate-900">
              {meta.totalPoints || 10} điểm
            </p>
          </div>
        </div>

        {/* Cognitive Difficulty Distribution Bar */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-wrap justify-between items-center text-xs font-bold text-slate-700 gap-1">
            <span>Phân bố mức độ nhận thức (Chuẩn 4 mức Bộ GD&ĐT):</span>
            <span className="text-slate-500 font-medium">
              {diffLevels.recognitionCount || 0} NB • {diffLevels.comprehensionCount || 0} TH •{' '}
              {diffLevels.applicationCount || 0} VD • {diffLevels.advancedApplicationCount || 0} VDC
            </span>
          </div>

          <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
            <div
              style={{ width: `${Math.max(recPct, 5)}%` }}
              className="bg-[#10B981] transition-all hover:opacity-90"
              title={`Nhận biết: ${diffLevels.recognitionCount || 0} câu (${recPct}%)`}
            />
            <div
              style={{ width: `${Math.max(compPct, 5)}%` }}
              className="bg-[#238773] transition-all hover:opacity-90"
              title={`Thông hiểu: ${diffLevels.comprehensionCount || 0} câu (${compPct}%)`}
            />
            <div
              style={{ width: `${Math.max(appPct, 5)}%` }}
              className="bg-[#F59E0B] transition-all hover:opacity-90"
              title={`Vận dụng: ${diffLevels.applicationCount || 0} câu (${appPct}%)`}
            />
            <div
              style={{ width: `${Math.max(advPct, 5)}%` }}
              className="bg-[#EF4444] transition-all hover:opacity-90"
              title={`Vận dụng cao: ${diffLevels.advancedApplicationCount || 0} câu (${advPct}%)`}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>
              <span>Nhận biết: <strong>{diffLevels.recognitionCount || 0} câu</strong> ({recPct}%)</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-[#238773]"></span>
              <span>Thông hiểu: <strong>{diffLevels.comprehensionCount || 0} câu</strong> ({compPct}%)</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span>
              <span>Vận dụng: <strong>{diffLevels.applicationCount || 0} câu</strong> ({appPct}%)</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]"></span>
              <span>Vận dụng cao: <strong>{diffLevels.advancedApplicationCount || 0} câu</strong> ({advPct}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pedagogical Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Knowledge & Objectives */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <BookOpen className="w-5 h-5 text-[#238773]" />
            <h3 className="text-base font-bold text-slate-900">Mục Tiêu & Đơn Vị Kiến Thức</h3>
          </div>

          <div className="space-y-3">
            {analysis.topics && analysis.topics.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-600 mb-1.5">Chủ đề kiểm tra:</p>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.topics.map((topic, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-[#eefaf5] text-[#176653] text-xs font-semibold border border-[#b8dfce]"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {analysis.learningObjectives && analysis.learningObjectives.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-600 mb-1.5">Mục tiêu học tập cần đạt:</p>
                <ul className="space-y-1">
                  {analysis.learningObjectives.map((obj, i) => (
                    <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                      <span className="text-[#238773] font-bold">•</span>
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.skills && analysis.skills.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-600 mb-1.5">Kỹ năng đánh giá:</p>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.skills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Formulas, Laws & Rules */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Sigma className="w-5 h-5 text-[#238773]" />
            <h3 className="text-base font-bold text-slate-900">Công Thức, Định Luật & Ràng Buộc</h3>
          </div>

          <div className="space-y-3">
            {analysis.formulas && analysis.formulas.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-600 mb-1.5">Công thức trọng tâm:</p>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.formulas.map((form, i) => (
                    <code
                      key={i}
                      className="px-2 py-1 rounded bg-slate-100 text-slate-800 text-xs font-mono border border-slate-200"
                    >
                      {form}
                    </code>
                  ))}
                </div>
              </div>
            )}

            {analysis.theorems && analysis.theorems.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-600 mb-1.5">Định lý & Định luật:</p>
                <ul className="space-y-1">
                  {analysis.theorems.map((th, i) => (
                    <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                      <span className="text-[#238773] font-bold">•</span>
                      <span>{th}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.warnings && analysis.warnings.length > 0 && (
              <div className="p-3.5 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#92400E]">
                  <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
                  <span>Lưu ý khảo thí từ Đề gốc:</span>
                </div>
                <ul className="space-y-0.5">
                  {analysis.warnings.map((w, i) => (
                    <li key={i} className="text-xs text-[#92400E] pl-4 list-disc">
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Questions Breakdown List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-[#238773]" />
            <h3 className="text-base font-bold text-slate-900">
              Danh Sách Câu Hỏi Đề Gốc Đã Bóc Tách ({analysis.questions?.length || 0} câu)
            </h3>
          </div>

          <button
            onClick={() => setShowAllQuestions(!showAllQuestions)}
            className="text-xs font-bold text-[#238773] hover:text-[#176653] flex items-center gap-1 cursor-pointer"
          >
            {showAllQuestions ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showAllQuestions ? 'Thu gọn danh sách' : 'Mở rộng danh sách'}</span>
          </button>
        </div>

        {showAllQuestions && (
          <div className="divide-y divide-slate-100">
            {analysis.questions?.map((q: OriginalQuestion, idx: number) => {
              const isExpanded = expandedQuestionId === q.id;
              return (
                <div key={q.id || idx} className="p-5 hover:bg-[#fffbf7] transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#204f43] text-white text-xs font-bold">
                          Câu {q.number || idx + 1}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            q.difficulty === 'Nhận biết'
                              ? 'bg-[#DCFCE7] text-[#15803D]'
                              : q.difficulty === 'Thông hiểu'
                              ? 'bg-[#def3e9] text-[#176653]'
                              : q.difficulty === 'Vận dụng'
                              ? 'bg-[#FEF3C7] text-[#B45309]'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {q.difficulty || 'Thông hiểu'}
                        </span>
                        {q.topic && (
                          <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {q.topic}
                          </span>
                        )}
                        {q.points && (
                          <span className="text-xs text-slate-500 font-semibold">({q.points} điểm)</span>
                        )}
                      </div>

                      <div className="text-sm font-medium text-slate-800 leading-relaxed">
                        <MathContent content={q.questionText} />
                      </div>

                      {/* Options */}
                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {q.options.map((opt) => (
                            <div
                              key={opt.label}
                              className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                                opt.label === q.correctAnswer
                                  ? 'bg-[#DCFCE7] text-[#15803D] font-bold border border-[#86EFAC]'
                                  : 'bg-[#fffbf7] text-slate-700 border border-slate-200'
                              }`}
                            >
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                                  opt.label === q.correctAnswer
                                    ? 'bg-[#10B981] text-white'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {opt.label}
                              </span>
                              <MathContent content={opt.text} inline />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Explanation toggle */}
                      {(q.explanation || isExpanded) && (
                        <div className="pt-2">
                          <button
                            onClick={() => toggleQuestionExpand(q.id)}
                            className="text-[11px] font-bold text-[#238773] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>{isExpanded ? 'Ẩn lời giải gốc' : 'Xem đáp án & lời giải gốc'}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>

                          {isExpanded && (
                            <div className="mt-2 p-3.5 rounded-xl bg-[#fffbf7] border border-slate-200 text-xs text-slate-700 space-y-1.5">
                              <p>
                                <strong>Đáp án đúng:</strong>{' '}
                                <span className="text-[#10B981] font-bold">{q.correctAnswer}</span>
                              </p>
                              {q.explanation && (
                                <div>
                                  <strong className="text-slate-900">Hướng dẫn giải: </strong>
                                  <MathContent content={q.explanation} />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom CTA Banner */}
      <div className="p-6 rounded-2xl bg-[#eefaf5] border border-[#b8dfce] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-base font-bold text-[#176653]">
            Sẵn sàng tiến hành sinh Đề 1 (Thay đổi số liệu/dữ kiện)
          </h4>
          <p className="text-xs text-slate-600 mt-0.5">
            AI sẽ giữ nguyên dạng bài và mục tiêu, thay đổi số liệu, tự giải lại và kiểm định độc lập.
          </p>
        </div>

        <button
          onClick={onGenerateExam1}
          disabled={isLoading}
          className="shrink-0 flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#238773] hover:bg-[#176653] active:bg-[#124f43] text-white font-bold text-sm shadow-md shadow-[#238773]/20 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>BẮT ĐẦU TẠO ĐỀ 1 NGAY</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

