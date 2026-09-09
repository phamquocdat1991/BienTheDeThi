import React, { useState, useEffect, useRef } from 'react';
import {
  ExamWorkflowState,
  ExamAnalysis,
  GeneratedExam,
  InputSource,
  ApiConfig,
  VariantQuestion,
  QuestionValidation,
} from './types';
import { Header } from './components/Header';
import { Stepper } from './components/Stepper';
import { InputSection } from './components/InputSection';
import { AnalysisView } from './components/AnalysisView';
import { ExamVariantCard } from './components/ExamVariantCard';
import { LockedCard } from './components/LockedCard';
import { LoadingOverlay } from './components/LoadingOverlay';
import { SummaryCompletionView } from './components/SummaryCompletionView';
import { ResetModal } from './components/ResetModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import { HistoryModal } from './components/HistoryModal';
import { AlertCircle, Sparkles, Key, CheckCircle2, RotateCcw } from 'lucide-react';
import {
  loadStoredApiConfig,
  getActiveApiKey,
  isValidGoogleAiApiKey,
} from './services/aiClientFactory';
import {
  analyzeOriginalExam,
  generateExamVariant,
} from './services/geminiService';
import {
  saveCurrentSession,
  loadCurrentSession,
  clearCurrentSession,
  saveToHistory,
  ExamSessionData,
} from './services/historyService';

export default function App() {
  const sessionIdentity = useRef({ id: crypto.randomUUID(), createdAt: new Date().toISOString() });
  // 1. API Configuration State
  const [apiConfig, setApiConfig] = useState<ApiConfig>(() => loadStoredApiConfig());
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [fallbackNotice, setFallbackNotice] = useState<{
    from: string;
    to: string;
    reason: string;
  } | null>(null);

  // 2. Workflow State Machine
  const [workflowState, setWorkflowState] = useState<ExamWorkflowState>('EMPTY');
  const [activeStepTab, setActiveStepTab] = useState<number>(1);

  // 3. Data Stores
  const [lastInputSource, setLastInputSource] = useState<InputSource | null>(null);
  const [examAnalysis, setExamAnalysis] = useState<ExamAnalysis | null>(null);
  const [exam1, setExam1] = useState<GeneratedExam | null>(null);
  const [exam2, setExam2] = useState<GeneratedExam | null>(null);
  const [exam3, setExam3] = useState<GeneratedExam | null>(null);

  // 4. UI & Dialogs State
  const [loadingText, setLoadingText] = useState<string>('');
  const [loadingSubText, setLoadingSubText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [restoreNotice, setRestoreNotice] = useState<ExamSessionData | null>(null);

  const activeKey = getActiveApiKey(apiConfig);
  const hasValidApiKey = isValidGoogleAiApiKey(activeKey);

  // Tự động mở Modal nhập key khi người dùng lần đầu truy cập theo AI_INSTRUCTIONS.md
  // và kiểm tra xem có phiên làm việc cũ cần khôi phục hay không
  useEffect(() => {
    if (!hasValidApiKey) {
      setIsApiKeyModalOpen(true);
    }
    const previousSession = loadCurrentSession();
    if (previousSession && previousSession.workflowState !== 'EMPTY') {
      setRestoreNotice(previousSession);
    }
  }, []);

  const isLoading =
    workflowState === 'ANALYZING' ||
    workflowState === 'GENERATING_EXAM_1' ||
    workflowState === 'GENERATING_EXAM_2' ||
    workflowState === 'GENERATING_EXAM_3';

  // Handler khi có fallback model tự động
  const handleModelFallback = (from: string, to: string, reason: string) => {
    setFallbackNotice({ from, to, reason });
    setTimeout(() => {
      setFallbackNotice(null);
    }, 6000);
  };

  // Helper đồng bộ và lưu phiên làm việc tự động vào localStorage
  const syncAndSaveSession = (
    state: ExamWorkflowState,
    stepTab: number,
    analysis: ExamAnalysis | null,
    e1: GeneratedExam | null,
    e2: GeneratedExam | null,
    e3: GeneratedExam | null,
    source: InputSource | null
  ) => {
    if (!analysis) return;
    const sessionData: ExamSessionData = {
      id: sessionIdentity.current.id,
      createdAt: sessionIdentity.current.createdAt,
      updatedAt: new Date().toISOString(),
      title: analysis.examMetadata?.title || 'Đề kiểm tra',
      subject: analysis.examMetadata?.subject || 'Toán học',
      grade: analysis.examMetadata?.grade || 'Toàn cấp',
      lastInputSource: source,
      examAnalysis: analysis,
      exam1: e1,
      exam2: e2,
      exam3: e3,
      workflowState: state,
      activeStepTab: stepTab,
    };
    saveCurrentSession(sessionData);
    if (state === 'COMPLETE') {
      saveToHistory(sessionData);
    }
  };

  // Khôi phục phiên làm việc
  const handleRestoreSession = (session: ExamSessionData) => {
    sessionIdentity.current = { id: session.id, createdAt: session.createdAt };
    setErrorMessage(null);
    setLastInputSource(session.lastInputSource);
    setExamAnalysis(session.examAnalysis);
    setExam1(session.exam1);
    setExam2(session.exam2);
    setExam3(session.exam3);
    setWorkflowState(session.workflowState);
    setActiveStepTab(session.activeStepTab || 2);
    setRestoreNotice(null);
  };

  // ==========================================================================
  // BƯỚC 1: PHÂN TÍCH ĐỀ GỐC (Trực tiếp Client-Side)
  // ==========================================================================
  const handleAnalyzeExam = async (source: InputSource) => {
    if (!hasValidApiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }

    setErrorMessage(null);
    setLastInputSource(source);
    setWorkflowState('ANALYZING');
    setLoadingText('Đang phân tích và bóc tách ma trận đề gốc...');
    setLoadingSubText(
      `Đang sử dụng ${apiConfig.selectedModel} để kiểm tra chuẩn GDPT 2018, bóc tách câu hỏi, công thức LaTeX và ma trận nhận thức.`
    );

    try {
      const analysis = await analyzeOriginalExam(source, apiConfig, handleModelFallback);
      sessionIdentity.current = { id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      setExamAnalysis(analysis);
      setExam1(null); setExam2(null); setExam3(null);
      setWorkflowState('ANALYZED');
      setActiveStepTab(2); // Chuyển sang xem ma trận phân tích
      syncAndSaveSession('ANALYZED', 2, analysis, null, null, null, source);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Đã xảy ra lỗi trong quá trình phân tích đề gốc.');
      setWorkflowState('EMPTY');
    }
  };

  // ==========================================================================
  // BƯỚC 2: SINH ĐỀ 1 (Đổi dữ kiện & số liệu)
  // ==========================================================================
  const handleGenerateExam1 = async () => {
    if (!examAnalysis) return;
    if (!hasValidApiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }

    setErrorMessage(null);
    setWorkflowState('GENERATING_EXAM_1');
    setLoadingText('AI đang tạo Đề 1 (Thay đổi dữ kiện & số liệu)...');
    setLoadingSubText(
      'Đang tự giải lại từng bước, tính toán đáp án và khởi chạy động cơ kiểm định độc lập 8 tiêu chí...'
    );

    try {
      const generated = await generateExamVariant(1, examAnalysis, [], apiConfig, handleModelFallback);
      setExam1(generated);
      setExam2(null); setExam3(null);
      setWorkflowState('EXAM_1_COMPLETE');
      setActiveStepTab(3); // Xem Đề 1
      syncAndSaveSession('EXAM_1_COMPLETE', 3, examAnalysis, generated, null, null, lastInputSource);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Lỗi khi tạo Đề 1.');
      setWorkflowState(workflowState); // Giữ nguyên kết quả phân tích để giáo viên có thể thử lại
    }
  };

  // ==========================================================================
  // BƯỚC 3: SINH ĐỀ 2 (Dạng bài tương đương)
  // ==========================================================================
  const handleGenerateExam2 = async () => {
    if (!examAnalysis || !exam1) return;
    if (!hasValidApiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }

    setErrorMessage(null);
    setWorkflowState('GENERATING_EXAM_2');
    setLoadingText('AI đang tạo Đề 2 (Dạng bài & câu hỏi tương đương)...');
    setLoadingSubText(
      'Đang chuyển đổi mô hình bài toán, bảo toàn chuẩn kiến thức kỹ năng và tự giải lại toàn bộ đáp án...'
    );

    try {
      const generated = await generateExamVariant(
        2,
        examAnalysis,
        [exam1],
        apiConfig,
        handleModelFallback
      );
      setExam2(generated);
      setExam3(null);
      setWorkflowState('EXAM_2_COMPLETE');
      setActiveStepTab(4); // Xem Đề 2
      syncAndSaveSession('EXAM_2_COMPLETE', 4, examAnalysis, exam1, generated, null, lastInputSource);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Lỗi khi tạo Đề 2.');
      setWorkflowState(workflowState); // Giữ nguyên Đề 1 đã tạo
    }
  };

  // ==========================================================================
  // BƯỚC 4: SINH ĐỀ 3 (Phân hóa & Vận dụng sâu)
  // ==========================================================================
  const handleGenerateExam3 = async () => {
    if (!examAnalysis || !exam1 || !exam2) return;
    if (!hasValidApiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }

    setErrorMessage(null);
    setWorkflowState('GENERATING_EXAM_3');
    setLoadingText('AI đang tạo Đề 3 (Phân hóa & Vận dụng sâu)...');
    setLoadingSubText(
      'Đang nâng cao suy luận đa bước, lồng ghép tình huống thực tế, bảo đảm đúng chuẩn chương trình...'
    );

    try {
      const generated = await generateExamVariant(
        3,
        examAnalysis,
        [exam1, exam2],
        apiConfig,
        handleModelFallback
      );
      setExam3(generated);
      setWorkflowState('COMPLETE');
      setActiveStepTab(6); // Chuyển sang màn hình Tổng hợp 3 bộ đề
      syncAndSaveSession('COMPLETE', 6, examAnalysis, exam1, exam2, generated, lastInputSource);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Lỗi khi tạo Đề 3.');
      setWorkflowState(workflowState); // Giữ nguyên Đề 2 đã tạo
    }
  };

  // Cập nhật 1 câu hỏi cụ thể sau khi giáo viên sửa
  const handleUpdateQuestion = (
    level: 1 | 2 | 3,
    updatedQuestion: VariantQuestion,
    updatedValidation?: QuestionValidation
  ) => {
    const updateExamState = (
      exam: GeneratedExam | null,
      setExam: React.Dispatch<React.SetStateAction<GeneratedExam | null>>
    ) => {
      if (!exam) return;
      const updatedQuestions = exam.questions.map((q) =>
        q.id === updatedQuestion.id || q.number === updatedQuestion.number ? updatedQuestion : q
      );

      let updatedReport = exam.validationReport ? [...exam.validationReport] : [];
      if (updatedValidation) {
        const valIdx = updatedReport.findIndex(
          (v) =>
            v.questionId === updatedQuestion.id || v.questionNumber === updatedQuestion.number
        );
        if (valIdx !== -1) {
          updatedReport[valIdx] = updatedValidation;
        } else {
          updatedReport.push(updatedValidation);
        }
      }

      setExam({
        ...exam,
        questions: updatedQuestions,
        validationReport: updatedReport,
      });
    };

    if (level === 1) updateExamState(exam1, (updated) => { setExam1(updated); syncAndSaveSession(workflowState, activeStepTab, examAnalysis, updated as GeneratedExam, exam2, exam3, lastInputSource); });
    else if (level === 2) updateExamState(exam2, (updated) => { setExam2(updated); syncAndSaveSession(workflowState, activeStepTab, examAnalysis, exam1, updated as GeneratedExam, exam3, lastInputSource); });
    else if (level === 3) updateExamState(exam3, (updated) => { setExam3(updated); syncAndSaveSession(workflowState, activeStepTab, examAnalysis, exam1, exam2, updated as GeneratedExam, lastInputSource); });
  };

  // Reset toàn bộ trạng thái app
  const handleFullReset = () => {
    clearCurrentSession();
    sessionIdentity.current = { id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setWorkflowState('EMPTY');
    setActiveStepTab(1);
    setLastInputSource(null);
    setExamAnalysis(null);
    setExam1(null);
    setExam2(null);
    setExam3(null);
    setErrorMessage(null);
    setRestoreNotice(null);
  };

  // Điều hướng bước trên Stepper
  const handleStepSelect = (stepId: number) => {
    if (isLoading) return;
    if (stepId === 1) setActiveStepTab(1);
    else if (stepId === 2 && examAnalysis) setActiveStepTab(2);
    else if (stepId === 3 && (exam1 || workflowState === 'EXAM_1_COMPLETE')) setActiveStepTab(3);
    else if (stepId === 4 && (exam2 || workflowState === 'EXAM_2_COMPLETE')) setActiveStepTab(4);
    else if (stepId === 5 && (exam3 || workflowState === 'COMPLETE')) setActiveStepTab(5);
    else if (stepId === 6 && workflowState === 'COMPLETE') setActiveStepTab(6);
  };

  return (
    <div className="sunrise-app min-h-screen bg-[#fffbf7] text-slate-900 flex flex-col font-sans selection:bg-[#238773] selection:text-white">
      {/* Header */}
      <Header
        workflowState={workflowState}
        hasApiKey={hasValidApiKey}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onOpenHistoryModal={() => setIsHistoryModalOpen(true)}
        onReset={() => setIsResetModalOpen(true)}
      />

      {/* Progress Stepper */}
      <Stepper
        workflowState={workflowState}
        activeTab={activeStepTab}
        onSelectStep={handleStepSelect}
        hasError={!!errorMessage}
      />

      {/* Fallback Toast Notification */}
      {fallbackNotice && (
        <div className="fixed top-20 right-4 z-40 max-w-md p-4 rounded-2xl bg-amber-900/90 text-amber-100 border border-amber-500 shadow-xl backdrop-blur-md text-xs animate-in slide-in-from-top-4">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-200">Tự động chuyển model dự phòng:</p>
              <p className="mt-0.5">
                Model <code className="bg-amber-950 px-1 py-0.5 rounded">{fallbackNotice.from}</code> đang quá tải, hệ thống đang dùng model dự phòng{' '}
                <code className="bg-amber-950 px-1 py-0.5 rounded text-white font-bold">{fallbackNotice.to}</code>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Canvas */}
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Banner khôi phục phiên làm việc trước đó */}
        {restoreNotice && workflowState === 'EMPTY' && (
          <div className="max-w-4xl mx-auto p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-950 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <RotateCcw className="w-5 h-5 text-[#238773] shrink-0" />
              <div>
                <p className="font-bold text-slate-900 text-sm">
                  Bạn có một phiên làm việc chưa hoàn tất: <span className="text-[#238773]">{restoreNotice.title}</span>
                </p>
                <p className="text-slate-500 mt-0.5">
                  Lưu gần nhất lúc {new Date(restoreNotice.updatedAt).toLocaleTimeString('vi-VN')} ({restoreNotice.subject} - {restoreNotice.grade})
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                onClick={() => setRestoreNotice(null)}
                className="px-3 py-1.5 rounded-xl hover:bg-slate-200 text-slate-600 font-semibold cursor-pointer transition"
              >
                Bỏ qua
              </button>
              <button
                onClick={() => handleRestoreSession(restoreNotice)}
                className="px-4 py-1.5 rounded-xl bg-[#238773] hover:bg-[#176653] text-white font-bold shadow-xs transition active:scale-95 cursor-pointer"
              >
                Khôi phục phiên
              </button>
            </div>
          </div>
        )}

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="max-w-4xl mx-auto flex items-start gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs shadow-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="font-bold text-sm">Thông báo từ hệ thống:</p>
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
            <div className="flex items-center gap-2">
              {!hasValidApiKey && (
                <button
                  onClick={() => setIsApiKeyModalOpen(true)}
                  className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                >
                  Nhập API Key
                </button>
              )}
              <button
                onClick={() => setErrorMessage(null)}
                className="text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 rounded hover:bg-rose-100/60"
              >
                Đóng
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: Input Section */}
        {activeStepTab === 1 && (
          <InputSection
            onAnalyze={handleAnalyzeExam}
            isLoading={isLoading}
            hasApiKey={hasValidApiKey}
            onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
          />
        )}

        {/* STEP 2: Original Exam Analysis Matrix View */}
        {activeStepTab === 2 && examAnalysis && (
          <AnalysisView
            analysis={examAnalysis}
            onGenerateExam1={handleGenerateExam1}
            isLoading={isLoading}
          />
        )}

        {/* STEP 3: Exam 1 (Level 1) View */}
        {activeStepTab === 3 && (
          <>
            {exam1 ? (
              <ExamVariantCard
                exam={exam1}
                originalAnalysis={examAnalysis!}
                onProceedNext={handleGenerateExam2}
                onRegenerateCurrent={handleGenerateExam1}
                onStartOver={() => setIsResetModalOpen(true)}
                isNextAvailable={
                  workflowState === 'EXAM_1_COMPLETE' ||
                  workflowState === 'EXAM_2_COMPLETE' ||
                  workflowState === 'COMPLETE'
                }
                nextButtonLabel="TIẾP TỤC: TẠO ĐỀ 2 (DẠNG TƯƠNG ĐƯƠNG)"
                isLoading={isLoading}
                apiConfig={apiConfig}
                onUpdateQuestion={(updatedQ, updatedVal) =>
                  handleUpdateQuestion(1, updatedQ, updatedVal)
                }
              />
            ) : (
              <LockedCard
                level={2}
                title="Đề Biến Thể 1 (Đổi Số Liệu & Ngữ Cảnh)"
                description="Hệ thống cần phân tích đề gốc trước khi sinh Đề 1."
                requirement="Vui lòng bấm 'Tiếp tục tạo Đề 1' từ màn hình phân tích."
              />
            )}
          </>
        )}

        {/* STEP 4: Exam 2 (Level 2) View */}
        {activeStepTab === 4 && (
          <>
            {exam2 ? (
              <ExamVariantCard
                exam={exam2}
                originalAnalysis={examAnalysis!}
                onProceedNext={handleGenerateExam3}
                onRegenerateCurrent={handleGenerateExam2}
                onStartOver={() => setIsResetModalOpen(true)}
                isNextAvailable={
                  workflowState === 'EXAM_2_COMPLETE' || workflowState === 'COMPLETE'
                }
                nextButtonLabel="TIẾP TỤC: TẠO ĐỀ 3 (PHÂN HÓA SÂU)"
                isLoading={isLoading}
                apiConfig={apiConfig}
                onUpdateQuestion={(updatedQ, updatedVal) =>
                  handleUpdateQuestion(2, updatedQ, updatedVal)
                }
              />
            ) : (
              <LockedCard
                level={2}
                title="Đề Biến Thể 2 (Dạng Bài Tương Đương)"
                description="Tạo các dạng bài tương đương về kỹ năng và nhận thức, không đơn thuần chỉ thay số."
                requirement="Chỉ được mở sau khi Đề 1 đã hoàn tất quy trình giải lại và kiểm định (Trạng thái EXAM_1_COMPLETE)."
              />
            )}
          </>
        )}

        {/* STEP 5: Exam 3 (Level 3) View */}
        {activeStepTab === 5 && (
          <>
            {exam3 ? (
              <ExamVariantCard
                exam={exam3}
                originalAnalysis={examAnalysis!}
                onProceedNext={() => {
                  setWorkflowState('COMPLETE');
                  setActiveStepTab(6);
                }}
                onRegenerateCurrent={handleGenerateExam3}
                onStartOver={() => setIsResetModalOpen(true)}
                isNextAvailable={true}
                nextButtonLabel="HOÀN TẤT & XEM TỔNG HỢP 3 BỘ ĐỀ"
                isLoading={isLoading}
                apiConfig={apiConfig}
                onUpdateQuestion={(updatedQ, updatedVal) =>
                  handleUpdateQuestion(3, updatedQ, updatedVal)
                }
              />
            ) : (
              <LockedCard
                level={3}
                title="Đề Biến Thể 3 (Phân Hóa & Vận Dụng Sâu)"
                description="Tăng cường khả năng phân hóa học sinh, suy luận đa bước và giải quyết tình huống thực tiễn."
                requirement="Chỉ được mở sau khi Đề 2 đã hoàn tất quy trình giải lại và kiểm định (Trạng thái EXAM_2_COMPLETE)."
              />
            )}
          </>
        )}

        {/* STEP 6: Complete Summary View */}
        {activeStepTab === 6 &&
          workflowState === 'COMPLETE' &&
          exam1 &&
          exam2 &&
          exam3 &&
          examAnalysis && (
            <SummaryCompletionView
              exams={[exam1, exam2, exam3]}
              originalAnalysis={examAnalysis}
              onStartOver={() => setIsResetModalOpen(true)}
              onRegenerateLevel={(lvl) => {
                if (lvl === 1) handleGenerateExam1();
                else if (lvl === 2) handleGenerateExam2();
                else if (lvl === 3) handleGenerateExam3();
              }}
              isLoading={isLoading}
              apiConfig={apiConfig}
              onUpdateQuestionInExam={(lvl, updatedQ, updatedVal) =>
                handleUpdateQuestion(lvl, updatedQ, updatedVal)
              }
            />
          )}
      </main>

      {/* Loading Overlay */}
      {isLoading && (
        <LoadingOverlay stageText={loadingText} subText={loadingSubText} />
      )}

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        initialConfig={apiConfig}
        onConfigSaved={(newCfg) => setApiConfig(newCfg)}
      />

      {/* Reset Confirmation Dialog */}
      <ResetModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleFullReset}
      />

      {/* Exam History & Backup Dialog */}
      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        onRestoreSession={handleRestoreSession}
      />
    </div>
  );
}
