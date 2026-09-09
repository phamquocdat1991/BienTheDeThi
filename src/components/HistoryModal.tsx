import React, { useState, useEffect, useRef } from 'react';
import {
  History,
  X,
  RotateCcw,
  Trash2,
  Download,
  Upload,
  BookOpen,
  Calendar,
  Layers,
  Sparkles,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import {
  StoredExamHistoryItem,
  getExamHistory,
  deleteHistoryItem,
  exportSessionAsJson,
  parseSessionFromJson,
  ExamSessionData,
} from '../services/historyService';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreSession: (session: ExamSessionData) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  onRestoreSession,
}) => {
  const [historyItems, setHistoryItems] = useState<StoredExamHistoryItem[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setHistoryItems(getExamHistory());
      setImportError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Bạn có chắc chắn muốn xóa đề này khỏi lịch sử không?')) {
      const updated = deleteHistoryItem(id);
      setHistoryItems(updated);
    }
  };

  const handleExport = (item: StoredExamHistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    exportSessionAsJson(item.session);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const session = parseSessionFromJson(text);
        onRestoreSession(session);
        onClose();
      } catch (err: any) {
        setImportError(err.message || 'Tệp JSON không hợp lệ.');
      }
    };
    reader.onerror = () => {
      setImportError('Không thể đọc tệp sao lưu.');
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-[#204f43] text-white p-6 flex items-start justify-between border-b border-[#386758]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Lịch Sử Đề Thi Đã Tạo
              </h3>
              <p className="text-xs text-slate-300">
                Xem lại, khôi phục hoặc xuất các bộ đề biến thể đã lưu trong máy của bạn
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

        {/* Action bar: Import backup */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs font-medium text-slate-600">
            Tổng cộng: <strong className="text-slate-900">{historyItems.length}</strong> bộ đề được lưu
          </span>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileImport}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-sky-600" />
              <span>Nạp file sao lưu (.JSON)</span>
            </button>
          </div>
        </div>

        {importError && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{importError}</span>
          </div>
        )}

        {/* Body Items */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {historyItems.length === 0 ? (
            <div className="text-center py-12 space-y-3 text-slate-400">
              <History className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
              <p className="text-sm font-medium text-slate-600">Chưa có đề thi nào trong lịch sử</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Khi bạn hoàn tất phân tích đề gốc hoặc tạo các đề biến thể, hệ thống sẽ tự động lưu trữ tại đây để bạn có thể xem lại bất kỳ lúc nào.
              </p>
            </div>
          ) : (
            historyItems.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onRestoreSession(item.session);
                  onClose();
                }}
                className="group p-4 rounded-2xl border border-slate-200 hover:border-[#238773] bg-white hover:bg-sky-50/40 transition shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#238773]/15 text-[#176653]">
                      {item.subject} • {item.grade}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Layers className="w-3 h-3 text-emerald-600" />
                      {item.completedVariantsCount}/3 đề hoàn tất
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(item.savedAt).toLocaleDateString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 truncate group-hover:text-[#238773] transition">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Quy mô: {item.totalQuestions} câu hỏi • Lưu tự động
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={(e) => handleExport(item, e)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition"
                    title="Tải xuống tệp .JSON để lưu trữ / chia sẻ"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    onClick={(e) => handleDelete(item.id, e)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition"
                    title="Xóa khỏi lịch sử"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      onRestoreSession(item.session);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#238773] hover:bg-[#176653] text-white text-xs font-bold shadow-xs transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Mở Lại</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
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
