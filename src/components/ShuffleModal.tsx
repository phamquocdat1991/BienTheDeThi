import React, { useState, useEffect } from 'react';
import {
  Shuffle,
  X,
  Download,
  CheckCircle2,
  Table,
  FileSpreadsheet,
  HelpCircle,
  Eye,
} from 'lucide-react';
import { GeneratedExam } from '../types';
import {
  generateShuffledExams,
  exportShuffledExamsToWord,
  ShuffleExamResult,
} from '../utils/shuffleExamUtils';

interface ShuffleModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: GeneratedExam;
}

export const ShuffleModal: React.FC<ShuffleModalProps> = ({ isOpen, onClose, exam }) => {
  const [shuffleResult, setShuffleResult] = useState<ShuffleExamResult | null>(null);
  const [activeCode, setActiveCode] = useState<string>('101');

  useEffect(() => {
    if (isOpen && exam) {
      const res = generateShuffledExams(exam, ['101', '102', '103', '104']);
      setShuffleResult(res);
      setActiveCode('101');
    }
  }, [isOpen, exam]);

  if (!isOpen || !shuffleResult) return null;

  const currentCodeData = shuffleResult.codes.find((c) => c.code === activeCode);

  const handleExportDoc = () => {
    exportShuffledExamsToWord(shuffleResult, {
      subject: exam.metadata?.subject,
      grade: exam.metadata?.grade,
      durationMinutes: exam.metadata?.durationMinutes,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="bg-[#1E293B] text-white p-6 flex items-start justify-between border-b border-[#334155]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Shuffle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Trộn Đề & Tạo Các Mã Đề Phụ (101, 102, 103, 104)
              </h3>
              <p className="text-xs text-slate-300">
                Tự động hoán vị thứ tự câu hỏi và phương án A/B/C/D, tạo bảng đáp án đối chiếu nhanh
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

        {/* Action bar & code selector */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          {/* Code Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-600 mr-2">Mã đề:</span>
            {shuffleResult.codes.map((c) => (
              <button
                key={c.code}
                onClick={() => setActiveCode(c.code)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeCode === c.code
                    ? 'bg-[#0284C7] text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                Mã {c.code}
              </button>
            ))}
            <button
              onClick={() => setActiveCode('table')}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeCode === 'table'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-300'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Bảng Đáp Án Tổng Hợp</span>
            </button>
          </div>

          {/* Export Action */}
          <button
            onClick={handleExportDoc}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Tải Trọn Bộ 4 Mã Đề (.DOC)</span>
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeCode === 'table' ? (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200">
                Bảng đối chiếu đáp án chuẩn xác giữa 4 mã đề. Dùng để chấm bài thi nhanh khi học sinh làm các mã đề khác nhau.
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-xs text-center border-collapse">
                  <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 border-r border-slate-200">Câu Số</th>
                      {shuffleResult.codes.map((c) => (
                        <th key={c.code} className="p-2.5 border-r border-slate-200 last:border-r-0">
                          Mã {c.code}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {shuffleResult.masterAnswerTable.map((row) => (
                      <tr key={row.questionNumber} className="hover:bg-slate-50">
                        <td className="p-2 font-bold text-slate-800 bg-slate-50/60 border-r border-slate-200">
                          Câu {row.questionNumber}
                        </td>
                        {shuffleResult.codes.map((c) => (
                          <td
                            key={c.code}
                            className="p-2 border-r border-slate-200 last:border-r-0 font-bold text-indigo-700"
                          >
                            {row.answersByCode[c.code] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : currentCodeData ? (
            <div className="space-y-4">
              <div className="p-3 bg-sky-50 text-sky-800 text-xs rounded-xl border border-sky-200 flex items-center justify-between">
                <span>
                  Đang xem trước <strong>Mã đề {currentCodeData.code}</strong> (Đã hoán vị ngẫu nhiên câu hỏi & đáp án).
                </span>
                <span className="font-semibold">{currentCodeData.questions.length} câu</span>
              </div>

              <div className="space-y-3">
                {currentCodeData.questions.map((q) => (
                  <div
                    key={q.number}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs"
                  >
                    <p className="font-bold text-slate-900">
                      Câu {q.number}: <span className="font-normal">{q.questionText}</span>
                    </p>

                    {q.options && q.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.options.map((opt) => {
                          const isCorrect = opt.label === q.correctAnswer;
                          return (
                            <div
                              key={opt.label}
                              className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 ${
                                isCorrect
                                  ? 'bg-emerald-50/80 border-emerald-300 font-semibold text-emerald-900'
                                  : 'bg-white border-slate-200 text-slate-700'
                              }`}
                            >
                              <span
                                className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[11px] ${
                                  isCorrect
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {opt.label}
                              </span>
                              <span>{opt.text}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center">
          <span className="text-xs text-slate-500">
            Hỗ trợ xuất định dạng Word Microsoft (.doc) chuẩn Times New Roman A4
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
