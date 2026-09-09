import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  ClipboardPaste,
  Sparkles,
  FileCheck,
  AlertCircle,
  X,
  BookOpen,
  CheckCircle2,
  Key,
} from 'lucide-react';
import { InputSource } from '../types';
import { SAMPLE_EXAMS, SampleExam } from '../utils/sampleData';
import { extractFileContentInBrowser } from '../services/fileExtractService';

interface InputSectionProps {
  onAnalyze: (source: InputSource) => void;
  isLoading: boolean;
  hasApiKey: boolean;
  onOpenApiKeyModal: () => void;
}

export const InputSection: React.FC<InputSectionProps> = ({
  onAnalyze,
  isLoading,
  hasApiKey,
  onOpenApiKeyModal,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState<string>(() => { try { return localStorage.getItem('bienthedethi_input_draft') || ''; } catch { return ''; } });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isExtracting, setIsExtracting] = useState(false);
  const [draftStatus, setDraftStatus] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      try { localStorage.setItem('bienthedethi_input_draft', pastedText); setDraftStatus(pastedText ? 'Đã lưu nháp trên thiết bị' : ''); }
      catch { setDraftStatus('Không thể lưu nháp trên thiết bị này'); }
    }, 400);
    return () => clearTimeout(timer);
  }, [pastedText]);

  // Handle file selection
  const processFile = (file: File) => {
    setErrorMessage(null);
    const validExtensions = ['.docx', '.doc', '.pdf', '.png', '.jpg', '.jpeg', '.webp', '.txt'];
    const lowerName = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => lowerName.endsWith(ext));

    if (!isValid) {
      setErrorMessage(
        'Định dạng file không được hỗ trợ. Vui lòng tải file DOCX, PDF, PNG, JPG, JPEG, WEBP hoặc TXT.'
      );
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('Kích thước file vượt quá giới hạn 25MB. Vui lòng chọn file nhỏ hơn.');
      return;
    }

    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const loadSample = (sample: SampleExam) => {
    setPastedText(sample.content);
    setActiveTab('paste');
    setErrorMessage(null);
  };

  const handleStartAnalysis = async () => {
    if (isExtracting || isLoading) return;
    setErrorMessage(null);

    if (!hasApiKey) {
      onOpenApiKeyModal();
      return;
    }

    if (activeTab === 'paste') {
      if (!pastedText.trim() || pastedText.trim().length < 20) {
        setErrorMessage('Vui lòng nhập hoặc dán nội dung đề kiểm tra đầy đủ (tối thiểu 20 ký tự).');
        return;
      }
      onAnalyze({
        type: 'text',
        rawText: pastedText.trim(),
      });
    } else {
      if (!selectedFile) {
        setErrorMessage('Vui lòng chọn hoặc kéo thả file đề thi vào khu vực tải lên.');
        return;
      }

      try {
        setIsExtracting(true);
        const source = await extractFileContentInBrowser(selectedFile);
        onAnalyze(source);
      } catch (err: any) {
        console.error(err);
        setErrorMessage(err.message || 'Không thể xử lý file. Vui lòng thử lại.');
      } finally { setIsExtracting(false); }
    }
  };


  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <section className="sunrise-welcome">
        <div><span className="sunrise-eyebrow">KHÔNG GIAN SOẠN ĐỀ CỦA THẦY CÔ</span>
        <h2>Biến thể đề thi <em>thông minh</em></h2>
        <p>Từ một đề gốc, mở ra ba cấp độ học tập. Bắt đầu bằng tài liệu của thầy cô.</p>
        <div className="sunrise-tags"><span>3 cấp độ biến thể</span><span>8 tiêu chí kiểm định</span><span>Xuất Word & đáp án</span></div></div>
        <div className="sunrise-note">Mỗi đề thi tốt hơn,<br />mỗi giờ dạy nhẹ hơn.<span> Cùng AI, dành thêm thời gian cho học trò.</span></div>
      </section>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx,.doc,.pdf,.png,.jpg,.jpeg,.webp,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />

      {/* Main Input Card - 60% White & Soft Slate */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Tab Header */}
        <div className="flex border-b border-slate-200 bg-[#fffbf7] p-1.5 gap-1.5">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-white text-[#238773] shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <UploadCloud className="w-4 h-4 text-[#238773]" />
            <span>Kéo thả & Tải File</span>
            <span className="text-[11px] font-normal text-slate-400 hidden sm:inline">(DOCX, PDF, Ảnh, TXT)</span>
          </button>

          <button
            onClick={() => setActiveTab('paste')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeTab === 'paste'
                ? 'bg-white text-[#238773] shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <ClipboardPaste className="w-4 h-4 text-[#238773]" />
            <span>Dán Văn Bản Trực Tiếp</span>
            <span className="text-[11px] font-normal text-slate-400 hidden sm:inline">(Soạn thảo/Copy)</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 sm:p-8 space-y-6">
          {activeTab === 'upload' ? (
            <div>
              {!selectedFile ? (
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Chọn file đề thi"
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition flex flex-col items-center justify-center gap-4 ${
                    isDragOver
                      ? 'border-[#238773] bg-[#eefaf5]'
                      : 'border-slate-300 hover:border-[#238773] bg-[#fffbf7] hover:bg-[#eefaf5]/50'
                  }`}
                >
                  <div className="w-16 h-16 rounded-2xl bg-[#def3e9] text-[#238773] flex items-center justify-center shadow-xs">
                    <UploadCloud className="w-8 h-8" />
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm sm:text-base font-bold text-slate-800">
                      Kéo và thả file đề thi vào đây, hoặc <span className="text-[#238773] hover:underline">duyệt từ máy tính</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Hỗ trợ Microsoft Word (.docx), Adobe PDF (.pdf), Ảnh đề thi (.png, .jpg, .webp) và Text (.txt) - Tối đa 25MB
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    <span className="px-2.5 py-1 rounded-md bg-[#def3e9] text-[#176653] text-xs font-semibold border border-[#b8dfce]">
                      DOCX / Word
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200">
                      PDF
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-[#FEF3C7] text-[#B45309] text-xs font-semibold border border-[#FDE68A]">
                      PNG / JPG / WEBP
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                      TXT
                    </span>
                  </div>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl p-6 bg-[#fffbf7] space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#238773] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <FileCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 break-all">{selectedFile.name}</p>
                        <p className="text-xs text-slate-500">
                          {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'Tài liệu đề thi'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleRemoveFile}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Xóa file đã chọn"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {filePreview && (
                    <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden max-h-64 bg-slate-900 flex items-center justify-center">
                      <img
                        src={filePreview}
                        alt="Đề thi đã chọn"
                        className="max-h-64 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-[#238773] hover:text-[#176653] font-bold cursor-pointer"
                    >
                      Chọn file khác
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs text-slate-500">
                <label htmlFor="examTextInput" className="font-bold text-slate-700">
                  Nội dung đề kiểm tra:
                </label>
                <span className="font-medium">{pastedText.length} ký tự · {draftStatus}</span>
              </div>
              <textarea
                id="examTextInput"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Dán toàn bộ nội dung đề thi vào đây (bao gồm tiêu đề, các phần trắc nghiệm/tự luận, các câu hỏi và đáp án nếu có)..."
                rows={12}
                className="w-full rounded-xl border border-slate-300 p-4 text-xs sm:text-sm font-mono text-slate-800 focus:border-[#238773] focus:ring-2 focus:ring-[#238773]/20 transition resize-y bg-[#fffbf7]"
              />
            </div>
          )}

          {/* Quick Sample Selector */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Hoặc thử nhanh với Đề thi mẫu chuẩn:
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {SAMPLE_EXAMS.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => loadSample(sample)}
                  className="text-left p-3.5 rounded-xl border border-slate-200 hover:border-[#238773] bg-[#fffbf7] hover:bg-[#eefaf5] transition group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 group-hover:text-[#238773]">
                      {sample.subject} - {sample.grade}
                    </span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700">
                      {sample.duration}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-1">{sample.title}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Error display */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-bold">Đã xảy ra vấn đề:</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Submit Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <div className="text-xs text-slate-600 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>
              <span>Gemini 3.6 / 3.5 Flash bóc tách công thức LaTeX, bảng biểu & ma trận nhận thức</span>
            </div>

            <button
              onClick={handleStartAnalysis}
              disabled={isLoading || isExtracting}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-[#238773] hover:bg-[#176653] active:bg-[#124f43] text-white font-bold text-sm shadow-md shadow-[#238773]/20 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isExtracting ? 'Đang đọc tài liệu…' : 'Phân tích đề gốc'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

