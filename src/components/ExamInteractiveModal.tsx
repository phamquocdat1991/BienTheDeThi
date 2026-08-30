import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Award,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  RotateCcw,
  BookOpen,
  HelpCircle,
  Sparkles,
  X,
  Eye,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { GeneratedExam, VariantQuestion } from '../types';
import { MathContent } from './MathContent';

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
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(
    (exam.metadata?.durationMinutes || 45) * 60
  );
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState<boolean>(false);
  const [filterMode, setFilterMode] = useState<'all' | 'wrong' | 'correct'>('all');

  const timerRef = useRef<any>(null);

  // Khởi tạo timer khi mở modal
  useEffect(() => {
    if (isOpen && !isSubmitted) {
      setTimeRemainingSeconds((exam.metadata?.durationMinutes || 45) * 60);
      setSelectedAnswers({});
      setCurrentIndex(0);
      setIsSubmitted(false);
      setShowConfirmSubmit(false);
    }
  }, [isOpen, exam]);

  // Bộ đếm ngược thời gian
  useEffect(() => {
    if (!isOpen || isSubmitted) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

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
  }, [isOpen, isSubmitted]);

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

  const triggerConfettiIfPassed = () => {
    // Tính điểm
    let correctCount = 0;
    exam.questions.forEach((q) => {
      if (
        selectedAnswers[q.number] &&
        selectedAnswers[q.number].trim().toUpperCase() === q.correctAnswer.trim().toUpperCase()
      ) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / totalQuestions) * 10 * 10) / 10;
    if (score >= 7.0) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // Im lặng nếu confetti không hỗ trợ
      }
    }
  };

  // Tính toán kết quả
  const answeredCount = Object.keys(selectedAnswers).length;
  let correctCount = 0;
  let wrongCount = 0;

  const questionResults = exam.questions.map((q) => {
    const userAnswer = selectedAnswers[q.number];
    const isAnswered = Boolean(userAnswer);
    const isCorrect =
      isAnswered && userAnswer.trim().toUpperCase() === q.correctAnswer.trim().toUpperCase();

    if (isCorrect) correctCount++;
    else if (isAnswered) wrongCount++;

    return {
      question: q,
      userAnswer,
      isCorrect,
      isAnswered,
    };
  });

  const finalScore = Math.round((correctCount / totalQuestions) * 10 * 10) / 10;

  // Format thời gian
  const minutes = Math.floor(timeRemainingSeconds / 60);
  const seconds = timeRemainingSeconds % 60;
  const isTimeCritical = timeRemainingSeconds < 300; // Dưới 5 phút

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl h-[92vh] rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Top bar: Exam Info & Timer */}
        <div className="bg-[#1E293B] text-white px-6 py-4 flex items-center justify-between border-b border-[#334155] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0284C7] flex items-center justify-center text-white font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white truncate max-w-md">{exam.title}</h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#0284C7]/20 text-[#38BDF8] border border-[#0284C7]/30">
                  Cấp độ {exam.level}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Chế độ thi thử trực tuyến • Chuẩn GDPT 2018
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Countdown timer */}
            {!isSubmitted ? (
              <div
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border font-mono font-bold text-sm shadow-xs ${
                  isTimeCritical
                    ? 'bg-rose-950/60 border-rose-500/80 text-rose-300 animate-pulse'
                    : 'bg-slate-800 border-slate-700 text-sky-300'
                }`}
              >
                <Clock className="w-4 h-4 text-sky-400" />
                <span>
                  {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/60 text-emerald-300 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Đã nộp bài</span>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/60 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content Area: Left question navigator, Right active question or score */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left / Sidebar Question Navigator */}
          <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 p-4 flex flex-col justify-between shrink-0 overflow-y-auto max-h-48 md:max-h-full">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Mục lục câu hỏi</span>
                <span className="text-xs text-slate-500 font-semibold">
                  {answeredCount}/{totalQuestions} đã làm
                </span>
              </div>

              {/* Grid question badges */}
              <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-4 gap-2">
                {exam.questions.map((q, idx) => {
                  const isCurrent = idx === currentIndex;
                  const isAnswered = Boolean(selectedAnswers[q.number]);
                  const qResult = isSubmitted ? questionResults[idx] : null;

                  let badgeStyle = 'bg-white border-slate-300 text-slate-700 hover:border-sky-400';

                  if (isSubmitted && qResult) {
                    if (qResult.isCorrect) {
                      badgeStyle = 'bg-emerald-100 border-emerald-400 text-emerald-800 font-bold';
                    } else if (qResult.isAnswered) {
                      badgeStyle = 'bg-rose-100 border-rose-400 text-rose-800 font-bold';
                    } else {
                      badgeStyle = 'bg-slate-200 border-slate-300 text-slate-500';
                    }
                  } else if (isAnswered) {
                    badgeStyle = 'bg-sky-100 border-sky-400 text-sky-800 font-bold';
                  }

                  if (isCurrent) {
                    badgeStyle += ' ring-2 ring-[#0284C7] ring-offset-1 font-bold';
                  }

                  return (
                    <button
                      key={q.number}
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-9 rounded-xl border text-xs flex items-center justify-center transition cursor-pointer min-w-[36px] ${badgeStyle}`}
                    >
                      {q.number}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom button in navigator */}
            <div className="pt-4 border-t border-slate-200 mt-4 space-y-2">
              {!isSubmitted ? (
                <button
                  onClick={() => setShowConfirmSubmit(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>NỘP BÀI THI</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsSubmitted(false);
                    setSelectedAnswers({});
                    setTimeRemainingSeconds((exam.metadata?.durationMinutes || 45) * 60);
                    setCurrentIndex(0);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Làm Lại Từ Đầu</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Question Card / Result */}
          <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto bg-white">
            {/* Review Summary Score Banner when submitted */}
            {isSubmitted && (
              <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200 shadow-xs space-y-4 animate-in fade-in">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold">
                      <Award className="w-3.5 h-3.5 text-emerald-600" />
                      <span>KẾT QUẢ BÀI THI</span>
                    </div>
                    <h4 className="text-xl font-bold text-slate-900">
                      Điểm số của bạn:{' '}
                      <span className="text-[#0284C7] text-2xl">{finalScore}</span> / 10 điểm
                    </h4>
                    <p className="text-xs text-slate-600">
                      Đúng {correctCount}/{totalQuestions} câu • Sai {wrongCount} câu • Bỏ qua{' '}
                      {totalQuestions - answeredCount} câu
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">Lọc xem:</span>
                    <button
                      onClick={() => setFilterMode('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        filterMode === 'all'
                          ? 'bg-[#0284C7] text-white'
                          : 'bg-white border border-slate-200 text-slate-700'
                      }`}
                    >
                      Tất cả
                    </button>
                    <button
                      onClick={() => setFilterMode('wrong')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        filterMode === 'wrong'
                          ? 'bg-rose-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-700'
                      }`}
                    >
                      Câu sai ({wrongCount})
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Current Question View */}
            {currentQuestion ? (
              <div className="flex-1 flex flex-col justify-between space-y-6">
                <div className="space-y-5">
                  {/* Question header info */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-slate-900 text-white text-xs font-bold">
                        {currentQuestion.number}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        Câu {currentQuestion.number} / {totalQuestions}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600">
                        {currentQuestion.difficulty || 'Thông hiểu'}
                      </span>
                      {currentQuestion.topic && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700">
                          {currentQuestion.topic}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question text with KaTeX */}
                  <div className="text-base text-slate-900 font-medium leading-relaxed">
                    <MathContent content={currentQuestion.questionText} />
                  </div>

                  {/* Options List */}
                  {currentQuestion.options && currentQuestion.options.length > 0 && (
                    <div className="space-y-3 pt-2" role="radiogroup">
                      {currentQuestion.options.map((opt) => {
                        const isSelected = selectedAnswers[currentQuestion.number] === opt.label;
                        const isCorrectAnswer =
                          opt.label.trim().toUpperCase() ===
                          currentQuestion.correctAnswer.trim().toUpperCase();

                        let optionCardStyle =
                          'border-slate-200 bg-white hover:border-[#0284C7]/60 hover:bg-sky-50/30';

                        if (isSubmitted) {
                          if (isCorrectAnswer) {
                            optionCardStyle =
                              'border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold';
                          } else if (isSelected && !isCorrectAnswer) {
                            optionCardStyle =
                              'border-rose-400 bg-rose-50 text-rose-950 line-through';
                          }
                        } else if (isSelected) {
                          optionCardStyle =
                            'border-[#0284C7] bg-[#0284C7]/10 text-[#0284C7] font-semibold shadow-xs';
                        }

                        return (
                          <button
                            key={opt.label}
                            onClick={() => handleSelectOption(currentQuestion.number, opt.label)}
                            disabled={isSubmitted}
                            className={`w-full min-h-[48px] p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition cursor-pointer ${optionCardStyle}`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                  isSubmitted && isCorrectAnswer
                                    ? 'bg-emerald-600 text-white'
                                    : isSubmitted && isSelected && !isCorrectAnswer
                                    ? 'bg-rose-600 text-white'
                                    : isSelected
                                    ? 'bg-[#0284C7] text-white'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {opt.label}
                              </span>
                              <div className="text-sm">
                                <MathContent content={opt.text} inline />
                              </div>
                            </div>

                            {/* Status Icon for accessibility */}
                            {isSubmitted && isCorrectAnswer && (
                              <span className="text-emerald-600 flex items-center gap-1 text-xs font-bold">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Đáp án đúng</span>
                              </span>
                            )}
                            {isSubmitted && isSelected && !isCorrectAnswer && (
                              <span className="text-rose-600 flex items-center gap-1 text-xs font-bold">
                                <XCircle className="w-4 h-4" />
                                <span>Bạn chọn</span>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Solution & Explanation when submitted */}
                  {isSubmitted && (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 mt-4 text-xs animate-in fade-in">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>Lời giải chi tiết & Hướng dẫn sư phạm:</span>
                      </div>
                      <div className="text-slate-700 leading-relaxed pl-5">
                        {currentQuestion.solveSteps && currentQuestion.solveSteps.length > 0 && (
                          <ul className="list-disc space-y-1 mb-2">
                            {currentQuestion.solveSteps.map((step, sIdx) => (
                              <li key={sIdx}>
                                <MathContent content={step} inline />
                              </li>
                            ))}
                          </ul>
                        )}
                        <p>
                          <MathContent content={currentQuestion.explanation || 'Chưa có lời giải chi tiết'} />
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Navigation between questions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                    disabled={currentIndex === 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Câu trước</span>
                  </button>

                  <button
                    onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                    disabled={currentIndex === totalQuestions - 1}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <span>Câu tiếp theo</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirmSubmit && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-3 text-amber-600">
                <AlertCircle className="w-6 h-6" />
                <h4 className="font-bold text-base text-slate-900">Xác nhận nộp bài?</h4>
              </div>
              <p className="text-xs text-slate-600">
                Bạn đã trả lời <strong>{answeredCount}</strong> / {totalQuestions} câu hỏi.
                {totalQuestions - answeredCount > 0 && (
                  <span className="block mt-1 text-rose-600 font-semibold">
                    Còn {totalQuestions - answeredCount} câu hỏi bạn chưa chọn đáp án!
                  </span>
                )}
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowConfirmSubmit(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Làm tiếp
                </button>
                <button
                  onClick={handleSubmitExam}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer"
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
