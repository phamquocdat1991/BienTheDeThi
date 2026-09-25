import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Send,
  HelpCircle,
  Award,
  BookOpen,
  X,
  FileText,
} from 'lucide-react';
import { GeneratedExam, VariantQuestion } from '../types';
import { MathContent } from './MathContent';
import { scorePractice } from '../utils/examIntegrity';

interface ExamInteractiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: GeneratedExam;
}

export const ExamInteractiveModal: React.FC<ExamInteractiveModalProps> = ({
  isOpen,
  onClose,
  exam,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(() => {
    return (exam.metadata.durationMinutes || 45) * 60;
  });
  const [showConfirmSubmit, setShowConfirmSubmit] = useState<boolean>(false);

  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Reset state khi mở modal
    setCurrentIndex(0);
    setSelectedAnswers({});
    setIsSubmitted(false);
    setShowConfirmSubmit(false);
    setTimeRemainingSeconds((exam.metadata.durationMinutes || 45) * 60);

    timerRef.current = setInterval(() => {
      setTimeRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, exam]);

  if (!isOpen) return null;

  const totalQuestions = exam.questions.length;
  const currentQuestion: VariantQuestion | undefined = exam.questions[currentIndex];

  const handleSelectOption = (questionNumber: number, optionLabel: string) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionNumber]: optionLabel,
    }));
  };

  const handleAutoSubmit = () => {
    setIsSubmitted(true);
    triggerConfettiIfPassed();
  };

  const handleSubmitExam = () => {
    setShowConfirmSubmit(false);
    setIsSubmitted(true);
    triggerConfettiIfPassed();
  };

  // Tính điểm theo trọng số điểm thực tế qua scorePractice
  const practiceResult = scorePractice(exam.questions, selectedAnswers);

  const triggerConfettiIfPassed = () => {
    if (practiceResult.score !== null && practiceResult.score >= 7.0) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // ignore
      }
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(selectedAnswers).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header Modal */}
        <div className="bg-[#204f43] text-white p-4 sm:p-5 flex items-center justify-between border-b border-[#386758]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#238773] flex items-center justify-center text-white shadow-inner">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                Thi Thử Trực Tuyến - {exam.title}
              </h3>
              <p className="text-xs text-slate-300">
                Môn: {exam.metadata.subject || 'Chưa rõ'} | Lớp: {exam.metadata.grade || 'Toàn cấp'} | Thời gian:{' '}
                {exam.metadata.durationMinutes || 45} phút
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Đồng hồ bấm giờ */}
            {!isSubmitted ? (
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono text-xs sm:text-sm font-bold border ${
                  timeRemainingSeconds < 300
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                    : 'bg-[#1b4339] text-[#a7f3d0] border-[#2d6a5a]'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>{formatTime(timeRemainingSeconds)}</span>
              </div>
            ) : (
              <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                Đã nộp bài
              </span>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/60 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Cột trái: Nội dung câu hỏi */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6 border-b md:border-b-0 md:border-r border-slate-200">
            {currentQuestion ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-xl bg-[#238773] text-white text-xs font-bold shadow-xs">
                      Câu {currentQuestion.number} / {totalQuestions}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {currentQuestion.difficulty || 'Thông hiểu'}
                    </span>
                    <span className="text-xs text-slate-500">
                      ({currentQuestion.points || 0.5} điểm)
                    </span>
                  </div>

                  {isSubmitted && (
                    <div>
                      {selectedAnswers[currentQuestion.number]?.trim().toUpperCase() ===
                      currentQuestion.correctAnswer?.trim().toUpperCase() ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Đúng
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                          <XCircle className="w-3.5 h-3.5" /> Sai
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Nội dung câu hỏi */}
                <div className="text-sm sm:text-base font-semibold text-slate-900 leading-relaxed bg-[#fffbf7] p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <MathContent content={currentQuestion.questionText} />
                </div>

                {/* Các phương án lựa chọn */}
                {currentQuestion.options && currentQuestion.options.length > 0 ? (
                  <div className="space-y-3">
                    {currentQuestion.options.map((opt) => {
                      const isSelected = selectedAnswers[currentQuestion.number] === opt.label;
                      const isCorrect = isSubmitted && opt.label === currentQuestion.correctAnswer;
                      const isWrongChoice = isSubmitted && isSelected && !isCorrect;

                      let btnStyle = 'border-slate-200 bg-white hover:border-[#238773] hover:bg-[#eefaf5] text-slate-800';

                      if (isSelected && !isSubmitted) {
                        btnStyle = 'border-[#238773] bg-[#eefaf5] text-[#204f43] font-semibold ring-2 ring-[#238773]/20';
                      } else if (isCorrect) {
                        btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-200';
                      } else if (isWrongChoice) {
                        btnStyle = 'border-rose-400 bg-rose-50 text-rose-900 ring-2 ring-rose-200';
                      }

                      return (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => handleSelectOption(currentQuestion.number, opt.label)}
                          disabled={isSubmitted}
                          className={`w-full p-4 rounded-2xl border text-left text-xs sm:text-sm transition flex items-start gap-3 cursor-pointer ${btnStyle}`}
                        >
                          <span
                            className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              isSelected || isCorrect
                                ? 'bg-[#238773] text-white'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {opt.label}
                          </span>
                          <div className="flex-1 mt-0.5">
                            <MathContent content={opt.text} inline />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : currentQuestion.type === 'short_answer' ? (
                  <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <label className="block text-xs font-bold text-slate-700">
                      Điền đáp số / câu trả lời ngắn:
                    </label>
                    <input
                      type="text"
                      disabled={isSubmitted}
                      value={selectedAnswers[currentQuestion.number] || ''}
                      onChange={(e) => handleSelectOption(currentQuestion.number, e.target.value)}
                      placeholder="Nhập kết quả (ví dụ: 12.5 hoặc 3/4)..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-[#238773] focus:outline-hidden"
                    />
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-800 space-y-2">
                    <div className="font-semibold flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-amber-600" />
                      <span>Câu hỏi tự luận / thực hành</span>
                    </div>
                    <textarea
                      disabled={isSubmitted}
                      value={selectedAnswers[currentQuestion.number] || ''}
                      onChange={(e) => handleSelectOption(currentQuestion.number, e.target.value)}
                      placeholder="Ghi vắn tắt các bước làm bài của bạn tại đây..."
                      rows={3}
                      className="w-full p-3 rounded-xl border border-amber-300 text-xs text-slate-800 bg-white focus:outline-hidden"
                    />
                  </div>
                )}

                {/* Lời giải chi tiết sau khi nộp bài */}
                {isSubmitted && (
                  <div className="p-5 rounded-2xl bg-[#eefaf5] border border-[#238773]/30 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#204f43]">
                      <HelpCircle className="w-4 h-4 text-[#238773]" />
                      <span>Đáp án đúng: {currentQuestion.correctAnswer}</span>
                    </div>

                    {currentQuestion.solveSteps && currentQuestion.solveSteps.length > 0 && (
                      <div className="space-y-1 text-xs text-slate-700">
                        <p className="font-semibold text-slate-800">Các bước giải:</p>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                          {currentQuestion.solveSteps.map((s, idx) => (
                            <li key={idx}>
                              <MathContent content={s} inline />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="text-xs text-slate-700 leading-relaxed border-t border-[#238773]/20 pt-2">
                      <p className="font-semibold text-slate-800">Giải thích chi tiết:</p>
                      <MathContent content={currentQuestion.explanation} />
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Cột phải: Bản đồ câu hỏi & Điểm số */}
          <div className="w-full md:w-80 p-5 bg-[#fffbf7] flex flex-col justify-between overflow-y-auto space-y-5">
            {/* Kết quả sau khi nộp */}
            {isSubmitted && (
              <div className="p-4 rounded-2xl bg-white border border-slate-200 text-center space-y-3 shadow-xs">
                <div className="inline-flex p-3 rounded-full bg-emerald-50 text-[#238773]">
                  <Award className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-3xl font-extrabold text-[#204f43]">
                    {practiceResult.score !== null ? `${practiceResult.score} / 10` : 'Chờ chấm'}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {practiceResult.correctPoints} / {practiceResult.totalPoints} điểm đạt được
                    {practiceResult.manual > 0 && ` (${practiceResult.manual} câu tự luận chờ giáo viên chấm)`}
                  </p>
                </div>
              </div>
            )}

            {/* Bảng danh sách câu hỏi */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Danh sách câu hỏi:</span>
                <span>
                  {answeredCount} / {totalQuestions} đã làm
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2 max-h-56 overflow-y-auto p-1">
                {exam.questions.map((q, idx) => {
                  const isCurrent = idx === currentIndex;
                  const isAnswered = !!selectedAnswers[q.number];
                  let btnColor = 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100';

                  if (isSubmitted) {
                    const isCorrect =
                      selectedAnswers[q.number]?.trim().toUpperCase() ===
                      q.correctAnswer?.trim().toUpperCase();
                    btnColor = isCorrect
                      ? 'bg-emerald-500 text-white border-emerald-600'
                      : 'bg-rose-500 text-white border-rose-600';
                  } else if (isCurrent) {
                    btnColor = 'bg-[#204f43] text-white border-[#204f43] shadow-xs';
                  } else if (isAnswered) {
                    btnColor = 'bg-[#eefaf5] text-[#204f43] border-[#238773] font-bold';
                  }

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-9 rounded-xl border text-xs font-bold transition flex items-center justify-center cursor-pointer ${btnColor}`}
                    >
                      {q.number}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Điều hướng Next/Prev & Nộp bài */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold disabled:opacity-40 transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Câu trước
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                  disabled={currentIndex === totalQuestions - 1}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold disabled:opacity-40 transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  Câu sau <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {!isSubmitted ? (
                <button
                  type="button"
                  onClick={() => setShowConfirmSubmit(true)}
                  className="w-full py-3 px-4 rounded-xl bg-[#238773] hover:bg-[#1b6b5b] text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" /> Nộp bài thi
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition cursor-pointer"
                >
                  Đóng bài thi
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal xác nhận nộp bài */}
        {showConfirmSubmit && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-white p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-xl border border-slate-200 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Xác nhận nộp bài?</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Bạn đã trả lời {answeredCount} / {totalQuestions} câu hỏi. Bạn có chắc chắn muốn nộp bài để xem điểm và lời giải chi tiết?
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmSubmit(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Làm tiếp
                </button>
                <button
                  type="button"
                  onClick={handleSubmitExam}
                  className="flex-1 py-2 rounded-xl bg-[#238773] text-xs font-bold text-white hover:bg-[#1b6b5b] cursor-pointer"
                >
                  Nộp bài ngay
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
