import { normalizeAnalysis, validateQuestions } from '../utils/examIntegrity';
import {
  ExamWorkflowState,
  ExamAnalysis,
  GeneratedExam,
  InputSource,
} from '../types';

export interface ExamSessionData {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  subject: string;
  grade: string;
  lastInputSource: InputSource | null;
  examAnalysis: ExamAnalysis | null;
  exam1: GeneratedExam | null;
  exam2: GeneratedExam | null;
  exam3: GeneratedExam | null;
  workflowState: ExamWorkflowState;
  activeStepTab: number;
}

export interface StoredExamHistoryItem {
  id: string;
  title: string;
  subject: string;
  grade: string;
  totalQuestions: number;
  completedVariantsCount: number;
  savedAt: string;
  session: ExamSessionData;
}

const STORAGE_SESSION_KEY = 'bienthedethi_current_session';
const STORAGE_HISTORY_KEY = 'bienthedethi_exam_history';
const MAX_HISTORY_ITEMS = 15;

/**
 * Lưu phiên làm việc hiện tại vào localStorage
 */
export function saveCurrentSession(session: ExamSessionData): void {
  try {
    // Keep binary sources out of the limited localStorage quota. Analysis retains the extracted questions.
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(compactSession(session)));
  } catch (error) {
    console.warn('[Session] Không thể lưu phiên vào localStorage (có thể vượt dung lượng):', error);
  }
}

/**
 * Tải phiên làm việc gần nhất từ localStorage
 */
export function loadCurrentSession(): ExamSessionData | null {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION_KEY);
    if (!raw) return null;
    const data = parseSessionFromJson(raw);
    if (data && data.workflowState && data.workflowState !== 'EMPTY') {
      return data;
    }
    return null;
  } catch (error) {
    console.error('[Session] Lỗi khi đọc phiên từ localStorage:', error);
    return null;
  }
}

/**
 * Xóa phiên làm việc hiện tại
 */
export function clearCurrentSession(): void {
  try {
    localStorage.removeItem(STORAGE_SESSION_KEY);
  } catch (error) {
    console.error('[Session] Lỗi khi xóa phiên:', error);
  }
}

/**
 * Lưu một bộ đề đã hoàn thành vào danh mục Lịch sử
 */
export function saveToHistory(session: ExamSessionData): void {
  if (!session.examAnalysis) return;

  try {
    const history = getExamHistory();
    const completedCount = [session.exam1, session.exam2, session.exam3].filter(Boolean).length;

    const historyItem: StoredExamHistoryItem = {
      id: session.id || `exam_${Date.now()}`,
      title: session.title || session.examAnalysis.examMetadata?.title || 'Đề kiểm tra không tên',
      subject: session.subject || session.examAnalysis.examMetadata?.subject || 'Chưa rõ môn',
      grade: session.grade || session.examAnalysis.examMetadata?.grade || 'Toàn cấp',
      totalQuestions: session.examAnalysis.questions?.length || 0,
      completedVariantsCount: completedCount,
      savedAt: new Date().toISOString(),
      session: compactSession(session),
    };

    // Loại bỏ mục cũ nếu trùng id, chèn lên đầu
    const filtered = history.filter((item) => item.id !== historyItem.id);
    const updated = [historyItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);

    localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('[History] Không thể lưu vào lịch sử:', error);
  }
}

/**
 * Lấy danh sách lịch sử đề thi đã lưu
 */
export function getExamHistory(): StoredExamHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_HISTORY_KEY);
    if (!raw) return [];
    const items=JSON.parse(raw);
    if(!Array.isArray(items)) return [];
    return items.flatMap(item => {try {return [{...item,session:parseSessionFromJson(JSON.stringify(item.session))}];} catch {return [];}});
  } catch (error) {
    console.error('[History] Lỗi khi đọc lịch sử đề:', error);
    return [];
  }
}

/**
 * Xóa một mục trong lịch sử
 */
export function deleteHistoryItem(id: string): StoredExamHistoryItem[] {
  try {
    const history = getExamHistory();
    const updated = history.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('[History] Lỗi khi xóa mục lịch sử:', error);
    return [];
  }
}

/**
 * Xuất toàn bộ phiên làm việc dạng file JSON để chia sẻ
 */
export function exportSessionAsJson(session: ExamSessionData): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(session, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  const sanitizedTitle = (session.title || 'bo_de_bien_the')
    .replace(/[^a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9]/g, '_');
  downloadAnchor.setAttribute('download', `${sanitizedTitle}_backup.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Nhập phiên làm việc từ file JSON
 */
export function parseSessionFromJson(jsonString: string): ExamSessionData {
  const data = JSON.parse(jsonString) as ExamSessionData;
  data.examAnalysis = normalizeAnalysis(data?.examAnalysis);
  if(data.exam2&&!data.exam1||data.exam3&&!data.exam2)throw new Error('Phiên làm việc bị thiếu đề biến thể ở bước trước.');
  [data.exam1,data.exam2,data.exam3].forEach((exam,index)=>{if(exam){validateQuestions(exam.questions);if(exam.level!==index+1||!exam.metadata||typeof exam.title!=='string')throw new Error('Dữ liệu đề biến thể không hợp lệ.');}});
  data.workflowState = data.exam3 ? 'COMPLETE' : data.exam2 ? 'EXAM_2_COMPLETE' : data.exam1 ? 'EXAM_1_COMPLETE' : 'ANALYZED';
  const maxStep=data.exam3?6:data.exam2?4:data.exam1?3:2;
  data.activeStepTab=Number.isInteger(data.activeStepTab)&&data.activeStepTab>=1&&data.activeStepTab<=maxStep?data.activeStepTab:maxStep;
  data.id=typeof data.id==='string'?data.id:crypto.randomUUID();
  data.createdAt=data.createdAt||new Date().toISOString();
  data.updatedAt=data.updatedAt||data.createdAt;
  data.title=data.title||data.examAnalysis.examMetadata.title;
  data.subject=data.subject||data.examAnalysis.examMetadata.subject;
  data.grade=data.grade||data.examAnalysis.examMetadata.grade;
  return data;
}

function compactSession(session: ExamSessionData): ExamSessionData {
  const source = session.lastInputSource;
  return {...session,updatedAt:new Date().toISOString(),lastInputSource:source?{...source,imageBase64:undefined,pdfBase64:undefined}:null};
}
