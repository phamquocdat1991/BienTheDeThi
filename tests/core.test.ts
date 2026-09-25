import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanAndParseJSON, extractFileContentInBrowser } from '../src/services/fileExtractService';
import {
  completeValidation,
  overallStatus,
  scorePractice,
  validateQuestions,
  normalizeAnalysis,
} from '../src/utils/examIntegrity';
import { generateShuffledExams } from '../src/utils/shuffleExamUtils';
import {
  parseSessionFromJson,
  saveCurrentSession,
  saveToHistory,
  getExamHistory,
  loadCurrentSession,
} from '../src/services/historyService';
import { escapeExportData, escapeHtml } from '../src/utils/htmlSafety';
import { parseApiError, getFriendlyErrorMessage } from '../src/services/geminiService';
import type { GeneratedExam, VariantQuestion } from '../src/types';

// Mock localStorage & sessionStorage in Node environment
const storage = new Map<string, string>();
const mockStorage = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => storage.set(k, v),
  removeItem: (k: string) => storage.delete(k),
  clear: () => storage.clear(),
};

Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, configurable: true });
Object.defineProperty(globalThis, 'sessionStorage', { value: mockStorage, configurable: true });

const question: VariantQuestion = {
  id: 'q1',
  number: 1,
  originalQuestionId: 'o1',
  questionText: 'Tính tổng 2 + 3 = ?',
  type: 'multiple_choice',
  options: [
    { label: 'A', text: '5' },
    { label: 'B', text: '6' },
    { label: 'C', text: '7' },
    { label: 'D', text: '8' },
  ],
  correctAnswer: 'A',
  points: 2,
  difficulty: 'Nhận biết',
  explanation: '2 + 3 = 5',
  solveSteps: ['Cộng hai số nguyên.'],
  changesFromOriginal: 'Đổi số liệu',
};

const essay: VariantQuestion = {
  ...question,
  id: 'q2',
  number: 2,
  type: 'essay',
  options: undefined,
  points: 8,
  correctAnswer: 'Giáo viên chấm theo lời giải chi tiết.',
};

const metadata = {
  title: 'Đề kiểm tra Toán 10',
  subject: 'Toán học',
  grade: 'Lớp 10',
  durationMinutes: 45,
  totalQuestions: 2,
  totalPoints: 10,
};

const analysis = normalizeAnalysis({ examMetadata: metadata, questions: [question, essay] });

const exam: GeneratedExam = {
  title: 'Biến thể kiểm thử',
  level: 1,
  levelName: 'Đổi dữ kiện & số liệu',
  levelDescription: 'Kiểm thử chất lượng',
  metadata,
  sections: [],
  questions: [question, essay],
  validationReport: [],
  overallValidationStatus: 'WARNING',
  validationSummary: 'Dữ liệu kiểm thử',
  createdAt: new Date().toISOString(),
};

test('1. valid JSON preserves newline, Unicode and LaTeX exactly', () => {
  const value = { text: 'Dòng 1\nDòng 2', math: '$\\frac{1}{2}$', unicode: 'Đề thi chuẩn GDPT 2018' };
  assert.deepEqual(cleanAndParseJSON(JSON.stringify(value)), value);
  assert.equal(cleanAndParseJSON<{ text: string }>('{"text":"\\u0111\\u1ec1 thi"}').text, 'đề thi');
});

test('2. malformed single-backslash LaTeX is repaired when JSON is invalid', () => {
  assert.equal(cleanAndParseJSON<{ x: string }>('{"x":"$\\sqrt{4}$"}').x, '$\\sqrt{4}$');
});

test('3. empty and duplicate question data is rejected', () => {
  assert.throws(() => validateQuestions([]));
  assert.throws(() => validateQuestions([question, question]));
  assert.throws(() => validateQuestions([{ ...question, correctAnswer: 'F' }]));
});

test('4. missing or partial verification cannot pass silently', () => {
  const evaluations = completeValidation([question], []);
  assert.equal(overallStatus(evaluations), 'WARNING');
  assert.equal(overallStatus(completeValidation([question], [{ questionId: 'q1', status: 'PASS' }])), 'PASS');
  assert.equal(overallStatus([{ ...evaluations[0], status: 'FAIL' }]), 'FAIL');
});

test('5. shuffling preserves answer content, input data, and true/false ordering', () => {
  const tf: VariantQuestion = {
    ...question,
    id: 'tf',
    number: 3,
    type: 'true_false',
    correctAnswer: 'a) Đúng; b) Sai',
    options: [
      { label: 'a', text: 'Mệnh đề một' },
      { label: 'b', text: 'Mệnh đề hai' },
    ],
  };

  const input: GeneratedExam = { ...exam, questions: [question, essay, tf] };
  const before = JSON.stringify(input);

  for (let i = 0; i < 20; i++) {
    const result = generateShuffledExams(input);
    for (const code of result.codes) {
      const q = code.questions.find((x) => x.id === 'q1')!;
      assert.equal(q.options!.find((o) => o.label === q.correctAnswer)!.text, '5');
      assert.deepEqual(code.questions.find((x) => x.id === 'tf')!.options, tf.options);
      assert.equal(code.questions.find((x) => x.id === 'tf')!.correctAnswer, tf.correctAnswer);
      assert.equal(code.questions.length, 3);
      for (const item of code.questions) {
        assert.equal(code.answerKey[item.number], item.correctAnswer);
      }
    }
  }
  assert.equal(JSON.stringify(input), before);
});

test('6. unknown answer mappings are left unchanged when shuffling', () => {
  const q = { ...question, correctAnswer: 'A và B' };
  const result = generateShuffledExams({ ...exam, questions: [q] });
  assert.deepEqual(result.codes[0].questions[0].options, q.options);
});

test('7. practice uses question weights and excludes manual questions', () => {
  const q3: VariantQuestion = { ...question, id: 'q3', number: 3, points: 6 };
  const score = scorePractice([question, q3, essay], { 1: 'A', 3: 'B', 2: 'Tự luận' });
  // question (2đ, Đúng = 2đ), q3 (6đ, Sai = 0đ), essay (8đ, Manual) -> autogradable = 2 + 6 = 8đ -> score = (2/8)*10 = 2.5đ
  assert.equal(score.score, 2.5);
  assert.equal(score.manual, 1);
  assert.equal(scorePractice([essay], {}).score, null);
  assert.equal(scorePractice([], {}).score, null);
});

test('8. session recovery derives a usable state after an interrupted request', () => {
  const session = parseSessionFromJson(
    JSON.stringify({ examAnalysis: analysis, exam1: exam, workflowState: 'GENERATING_EXAM_2', activeStepTab: 6 })
  );
  assert.equal(session.workflowState, 'EXAM_1_COMPLETE');
  assert.equal(session.activeStepTab, 3);
});

test('9. malformed import and missing prerequisite exams are rejected', () => {
  assert.throws(() => parseSessionFromJson('{}'));
  assert.throws(() => parseSessionFromJson('null'));
});

test('10. large binary sources do not exhaust session storage', () => {
  storage.clear();
  const session = parseSessionFromJson(JSON.stringify({ id: 'first', examAnalysis: analysis, exam1: exam }));
  session.lastInputSource = {
    type: 'file',
    fileName: 'exam.pdf',
    pdfBase64: 'x'.repeat(6_000_000), // 6MB base64
  };

  saveCurrentSession(session);
  const storedStr = storage.get('bienthedethi_current_session')!;
  assert.ok(storedStr.length < 10000, 'Chuỗi lưu trong storage phải nhỏ hơn 10KB sau khi loại bỏ base64');
  assert.equal(loadCurrentSession()!.lastInputSource!.fileName, 'exam.pdf');

  saveToHistory(session);
  saveToHistory({ ...session, id: 'second' });
  assert.equal(getExamHistory().length, 2);
});

test('11. corrupt history is ignored without crashing', () => {
  storage.set('bienthedethi_exam_history', '{ corrupt json');
  assert.deepEqual(getExamHistory(), []);
});

test('12. unsupported old Word, empty files and corrupt DOCX are rejected', async () => {
  await assert.rejects(extractFileContentInBrowser(new File(['old binary'], 'exam.doc')));
  await assert.rejects(extractFileContentInBrowser(new File([], 'empty.txt')));
  await assert.rejects(extractFileContentInBrowser(new File(['not a zip'], 'broken.docx')));
});

test('13. plain text file extraction keeps Vietnamese and formula content', async () => {
  const content = 'Đề kiểm tra Toán học: $x^2 + 1 = 5$';
  const source = await extractFileContentInBrowser(new File([content], 'exam.txt', { type: 'text/plain' }));
  assert.equal(source.rawText, content);
});

test('14. HTML exports escape executable markup and preserve comparisons', () => {
  const value = { questionText: '<img src=x onerror=alert(1)>', formula: '$x < 2$' };
  const output = escapeExportData(value);
  assert.equal(output.questionText, '&lt;img src=x onerror=alert(1)&gt;');
  assert.equal(output.formula, '$x &lt; 2$');
  assert.notEqual(value.questionText, output.questionText);
});

test('15. API error categorization handles rate limits and overload properly', () => {
  assert.equal(parseApiError({ status: 429 }), 'RATE_LIMITED');
  assert.equal(parseApiError({ message: 'Resource has been exhausted (e.g. check quota)' }), 'RATE_LIMITED');
  assert.equal(parseApiError({ status: 503 }), 'MODEL_OVERLOADED');
  assert.equal(parseApiError({ status: 401 }), 'INVALID_API_KEY');
  assert.equal(parseApiError({ status: 403 }), 'PERMISSION_DENIED');
  assert.ok(getFriendlyErrorMessage({ status: 401 }, 'gemini').includes('401'));
});
