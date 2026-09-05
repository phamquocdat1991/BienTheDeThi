import React, { useState, useEffect } from 'react';
import {
  Edit3,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  RotateCcw,
  BookOpen,
  Loader2,
  Check,
} from 'lucide-react';
import {
  VariantQuestion,
  OriginalQuestion,
  DifficultyLevel,
  QuestionValidation,
  ApiConfig,
} from '../types';
import { fixSingleQuestionWithAI } from '../services/geminiService';
import { validateQuestions, pendingValidation } from '../utils/examIntegrity';
import { MathContent } from './MathContent';

interface EditQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: VariantQuestion;
  originalQuestion?: OriginalQuestion;
  level: 1 | 2 | 3;
  apiConfig?: ApiConfig;
  onSaveQuestion: (
    updatedQuestion: VariantQuestion,
    updatedValidation?: QuestionValidation
  ) => void;
}

export const EditQuestionModal: React.FC<EditQuestionModalProps> = ({
  isOpen,
  onClose,
  question,
  originalQuestion,
  level,
  apiConfig,
  onSaveQuestion,
}) => {
  const [editedQuestion, setEditedQuestion] = useState<VariantQuestion>({ ...question });
  const [teacherNote, setTeacherNote] = useState<string>('');
  const [isAiFixing, setIsAiFixing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setEditedQuestion({ ...question });
      setTeacherNote('');
      setErrorMessage(null);
      setSuccessMessage(null);
      setPreviewMode(false);
    }
  }, [isOpen, question]);

  if (!isOpen) return null;

  const handleOptionChange = (index: number, text: string) => {
    if (!editedQuestion.options) return;
    const updated = [...editedQuestion.options];
    updated[index] = { ...updated[index], text };
    setEditedQuestion({ ...editedQuestion, options: updated });
  };

  const handleAiFix = async () => {
    setIsAiFixing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await fixSingleQuestionWithAI(
        {
          question: editedQuestion,
          originalQuestion,
          level,
          teacherNote: teacherNote.trim() || undefined,
        },
        apiConfig
      );

      setEditedQuestion(result.repairedQuestion);
      setSuccessMessage('AI đã giải lại và hiệu chỉnh câu hỏi thành công!');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Lỗi khi nhờ AI hiệu chỉnh câu hỏi.');
    } finally {
      setIsAiFixing(false);
    }
  };

  const handleSave = () => {
    try { validateQuestions([editedQuestion]); } catch (error) { setErrorMessage(error instanceof Error ? error.message : 'Câu hỏi không hợp lệ.'); return; }
    onSaveQuestion(editedQuestion, pendingValidation(editedQuestion, 'Nội dung đã chỉnh sửa. Giáo viên cần rà soát lại trước khi sử dụng.'));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-[#1E293B] text-white p-6 flex items-start justify-between border-b border-[#334155]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#4F46E5] flex items-center justify-center text-white shadow-inner">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Chỉnh Sửa Câu Hỏi Số {editedQuestion.number} (Đề Biến Thể Cấp Độ {level})
              </h3>
              <p className="text-xs text-slate-300">
                Tự sửa tay nội dung hoặc yêu cầu AI giải lại theo chỉ dẫn sư phạm cụ thể
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* AI Assistance Box */}
          <div className="p-4 rounded-2xl bg-[#EEF2FF] border border-[#C7D2FE] space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#4338CA]">
              <Sparkles className="w-4 h-4 text-[#4F46E5]" />
              <span>Yêu cầu AI Tự Giải Lại & Sửa Câu Này (Tùy chọn):</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={teacherNote}
                onChange={(e) => setTeacherNote(e.target.value)}
                placeholder="VD: Đổi số liệu câu này cho chẵn hơn, hoặc đổi phương án nhiễu C..."
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 focus:outline-hidden focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
              />
              <button
                type="button"
                onClick={handleAiFix}
                disabled={isAiFixing}
                className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-xs shrink-0 transition disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isAiFixing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang giải lại...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Hiệu chỉnh ngay</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Success / Error alerts */}
          {successMessage && (
            <div className="p-3 rounded-xl bg-[#DCFCE7] border border-[#86EFAC] text-[#15803D] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#10B981]" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Question Text */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800">Nội dung câu hỏi (hỗ trợ công thức $...$):</label>
              <button
                type="button"
                onClick={() => setPreviewMode(!previewMode)}
                className="text-[11px] font-bold text-[#4F46E5] hover:underline"
              >
                {previewMode ? 'Chuyển sang chế độ soạn thảo' : 'Xem trước công thức'}
              </button>
            </div>

            {previewMode ? (
              <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                <MathContent content={editedQuestion.questionText} />
              </div>
            ) : (
              <textarea
                value={editedQuestion.questionText}
                onChange={(e) =>
                  setEditedQuestion({ ...editedQuestion, questionText: e.target.value })
                }
                rows={4}
                className="w-full p-3 rounded-xl border border-slate-300 font-sans text-xs focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
              />
            )}
          </div>

          {/* Options */}
          {editedQuestion.options && editedQuestion.options.length > 0 && (
            <div className="space-y-2">
              <label className="font-bold text-slate-800">Các phương án lựa chọn:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {editedQuestion.options.map((opt, idx) => (
                  <div key={opt.label} className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-slate-200 font-bold flex items-center justify-center shrink-0">
                      {opt.label}
                    </span>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      className="flex-1 p-2 rounded-lg border border-slate-300 text-xs focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata Row: Correct Answer, Difficulty, Points */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">Đáp án đúng:</label>
              <input
                type="text"
                value={editedQuestion.correctAnswer}
                onChange={(e) =>
                  setEditedQuestion({ ...editedQuestion, correctAnswer: e.target.value })
                }
                className="w-full p-2 rounded-lg border border-slate-300 text-xs font-bold text-[#15803D]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">Mức độ nhận thức:</label>
              <select
                value={editedQuestion.difficulty}
                onChange={(e) =>
                  setEditedQuestion({
                    ...editedQuestion,
                    difficulty: e.target.value as DifficultyLevel,
                  })
                }
                className="w-full p-2 rounded-lg border border-slate-300 text-xs bg-white"
              >
                <option value="Nhận biết">Nhận biết</option>
                <option value="Thông hiểu">Thông hiểu</option>
                <option value="Vận dụng">Vận dụng</option>
                <option value="Vận dụng cao">Vận dụng cao</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">Điểm số:</label>
              <input
                type="number"
                step="0.25"
                value={editedQuestion.points || 0.5}
                onChange={(e) =>
                  setEditedQuestion({ ...editedQuestion, points: parseFloat(e.target.value) || 0.5 })
                }
                className="w-full p-2 rounded-lg border border-slate-300 text-xs"
              />
            </div>
          </div>

          {/* Explanation */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800">Lời giải chi tiết / Hướng dẫn chấm:</label>
            <textarea
              value={editedQuestion.explanation || ''}
              onChange={(e) =>
                setEditedQuestion({ ...editedQuestion, explanation: e.target.value })
              }
              rows={3}
              className="w-full p-3 rounded-xl border border-slate-300 font-sans text-xs focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-6 bg-[#F8FAFC] border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold shadow-md shadow-[#4F46E5]/20 transition cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Lưu Thay Đổi Câu Hỏi</span>
          </button>
        </div>
      </div>
    </div>
  );
};
