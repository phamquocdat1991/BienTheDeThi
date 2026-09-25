import { GeneratedExam, VariantQuestion, QuestionOption } from '../types';
import { escapeHtml } from './htmlSafety';

export interface ShuffledExamCode {
  code: string; // '101', '102', '103', '104'
  title: string;
  originalLevel: number;
  questions: VariantQuestion[];
  answerKey: Record<number, string>; // questionNumber -> 'A' | 'B' | ...
}

export interface ShuffleExamResult {
  sourceTitle: string;
  level: number;
  codes: ShuffledExamCode[];
  masterAnswerTable: {
    questionNumber: number;
    answersByCode: Record<string, string>;
  }[];
}

/**
 * Thuật toán Fisher-Yates shuffle có sao chép mảng
 */
function shuffleArray<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Trộn phương án 1 câu hỏi trắc nghiệm đơn (multiple_choice):
 * Hoán vị phương án A, B, C, D và cập nhật lại đáp án đúng
 */
function shuffleMultipleChoiceQuestion(q: VariantQuestion, newNumber: number): VariantQuestion {
  if (
    !q.options ||
    q.options.length < 2 ||
    q.type === 'essay' ||
    q.type === 'short_answer' ||
    q.type === 'fill_in_blank'
  ) {
    return {
      ...q,
      number: newNumber,
    };
  }

  // Câu đúng sai: giữ nguyên nhãn mệnh đề con (a, b, c, d), không hoán vị nhãn A, B, C, D
  if (q.type === 'true_false') {
    return {
      ...q,
      number: newNumber,
    };
  }

  // Nếu đáp án có dạng tổ hợp (ví dụ "A và B", "Cả A, B, C") thì giữ nguyên thứ tự phương án
  const cleanAnswer = (q.correctAnswer || '').trim().toUpperCase();
  if (cleanAnswer.length > 1 && !/^[A-F]$/.test(cleanAnswer)) {
    return {
      ...q,
      number: newNumber,
    };
  }

  // Tìm phương án đúng ban đầu
  const originalCorrectOption = q.options.find(
    (opt) => opt.label.trim().toUpperCase() === cleanAnswer
  );

  if (!originalCorrectOption) {
    return {
      ...q,
      number: newNumber,
    };
  }

  // Đảo thứ tự các phương án
  const shuffledRawOptions = shuffleArray(q.options);
  const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
  let newCorrectAnswer = q.correctAnswer;

  const newOptions: QuestionOption[] = shuffledRawOptions.map((opt, idx) => {
    const label = labels[idx] || String.fromCharCode(65 + idx);
    if (opt.text === originalCorrectOption.text) {
      newCorrectAnswer = label;
    }
    return {
      label,
      text: opt.text,
    };
  });

  return {
    ...q,
    number: newNumber,
    options: newOptions,
    correctAnswer: newCorrectAnswer,
  };
}

/**
 * Xáo trộn câu hỏi theo từng nhóm phần (sections)
 * Đảm bảo câu trắc nghiệm chỉ trộn trong phần trắc nghiệm, không lẫn với Đúng/Sai hay Tự luận
 */
function shuffleQuestionsBySections(questions: VariantQuestion[]): VariantQuestion[] {
  const sectionMap = new Map<string, VariantQuestion[]>();
  const defaultKey = '__default_section__';

  questions.forEach((q) => {
    const key = q.sectionId || defaultKey;
    if (!sectionMap.has(key)) {
      sectionMap.set(key, []);
    }
    sectionMap.get(key)!.push(q);
  });

  const finalQuestions: VariantQuestion[] = [];
  let currentNumber = 1;

  for (const [, group] of sectionMap.entries()) {
    const shuffledGroup = shuffleArray(group);

    shuffledGroup.forEach((q) => {
      const shuffledQ = shuffleMultipleChoiceQuestion(q, currentNumber);
      finalQuestions.push(shuffledQ);
      currentNumber++;
    });
  }

  return finalQuestions;
}

/**
 * Sinh ra các mã đề phụ (mặc định: 101, 102, 103, 104) từ 1 đề biến thể
 */
export function generateShuffledExams(
  exam: GeneratedExam,
  codeList: string[] = ['101', '102', '103', '104']
): ShuffleExamResult {
  const codes: ShuffledExamCode[] = [];

  codeList.forEach((code) => {
    const finalQuestions = shuffleQuestionsBySections(exam.questions);

    const answerKey: Record<number, string> = {};
    finalQuestions.forEach((q) => {
      answerKey[q.number] = q.correctAnswer;
    });

    codes.push({
      code,
      title: `${exam.title} - Mã đề ${code}`,
      originalLevel: exam.level,
      questions: finalQuestions,
      answerKey,
    });
  });

  const maxQuestions = exam.questions.length;
  const masterAnswerTable: {
    questionNumber: number;
    answersByCode: Record<string, string>;
  }[] = [];

  for (let qNum = 1; qNum <= maxQuestions; qNum++) {
    const answersByCode: Record<string, string> = {};
    codes.forEach((c) => {
      answersByCode[c.code] = c.answerKey[qNum] || '-';
    });

    masterAnswerTable.push({
      questionNumber: qNum,
      answersByCode,
    });
  }

  return {
    sourceTitle: exam.title,
    level: exam.level,
    codes,
    masterAnswerTable,
  };
}

/**
 * Xuất trọn gói các mã đề trộn và bảng đáp án tổng hợp sang file Word (.doc)
 */
export function exportShuffledExamsToWord(
  result: ShuffleExamResult,
  metadata: { subject?: string; grade?: string; durationMinutes?: number }
): void {
  const wordBaseCss = `
    @page { size: A4 portrait; margin: 2cm; }
    body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.4; color: #000; }
    .header-table { width: 100%; border: none; margin-bottom: 12px; }
    .code-box { display: inline-block; border: 2px solid #000; padding: 4px 12px; font-weight: bold; font-size: 14pt; }
    .question { margin-bottom: 14px; page-break-inside: avoid; }
    .options-table { width: 100%; margin-top: 4px; margin-bottom: 8px; }
    .options-table td { width: 50%; padding: 3px 6px; }
    .page-break { page-break-before: always; }
    .master-table { width: 100%; border-collapse: collapse; text-align: center; font-size: 12pt; margin-top: 15px; }
    .master-table th, .master-table td { border: 1px solid #000; padding: 6px; }
    .master-table th { background-color: #f2f2f2; font-weight: bold; }
  `;

  let contentHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>${escapeHtml(result.sourceTitle)} - Các Mã Đề Trộn</title><style>${wordBaseCss}</style></head>
    <body>
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="margin: 0; font-size: 18pt;">BẢNG ĐÁP ÁN TỔNG HỢP CÁC MÃ ĐỀ TRỘN</h1>
        <p style="font-size: 13pt; margin: 4px 0;">${escapeHtml(result.sourceTitle)} (Cấp độ ${result.level})</p>
        <p style="font-style: italic; font-size: 11pt;">Môn: ${escapeHtml(metadata.subject || 'Đa môn')} • Thời gian: ${metadata.durationMinutes || 45} phút</p>
      </div>

      <table class="master-table">
        <tr>
          <th>Câu</th>
          ${result.codes.map((c) => `<th>Mã đề ${escapeHtml(c.code)}</th>`).join('')}
        </tr>
        ${result.masterAnswerTable
          .map(
            (row) => `
          <tr>
            <td><strong>${row.questionNumber}</strong></td>
            ${result.codes
              .map((c) => `<td><strong>${escapeHtml(row.answersByCode[c.code] || '-')}</strong></td>`)
              .join('')}
          </tr>
        `
          )
          .join('')}
      </table>
  `;

  result.codes.forEach((examCode) => {
    contentHtml += `
      <div class="page-break"></div>
      <table class="header-table">
        <tr>
          <td style="width: 50%;">
            <strong>SỞ GD&ĐT / TRƯỜNG: ........................</strong><br>
            <em>Tổ Bộ môn: ${escapeHtml(metadata.subject || 'Chuyên môn')}</em><br>
            <em>Đề kiểm tra chuẩn GDPT 2018</em>
          </td>
          <td style="width: 50%; text-align: right;">
            <div class="code-box">MÃ ĐỀ: ${escapeHtml(examCode.code)}</div><br>
            <em>Thời gian: ${metadata.durationMinutes || 45} phút</em>
          </td>
        </tr>
      </table>

      <div style="margin-bottom: 15px; border-bottom: 1px solid #000; padding-bottom: 5px;">
        Họ và tên thí sinh: .......................................................................... Lớp: ................. SBD: ....................
      </div>

      <div style="text-align: center; font-weight: bold; font-size: 14pt; margin-bottom: 15px;">
        ${escapeHtml(examCode.title.toUpperCase())}
      </div>

      ${examCode.questions
        .map(
          (q) => `
        <div class="question">
          <div><strong>Câu ${q.number}:</strong> ${escapeHtml(q.questionText)}</div>
          ${
            q.options && q.options.length > 0
              ? `
            <table class="options-table">
              <tr>
                ${q.options
                  .slice(0, 2)
                  .map((opt) => `<td><strong>${escapeHtml(opt.label)}.</strong> ${escapeHtml(opt.text)}</td>`)
                  .join('')}
              </tr>
              ${
                q.options.length > 2
                  ? `
                <tr>
                  ${q.options
                    .slice(2, 4)
                    .map((opt) => `<td><strong>${escapeHtml(opt.label)}.</strong> ${escapeHtml(opt.text)}</td>`)
                    .join('')}
                </tr>
              `
                  : ''
              }
            </table>
          `
              : ''
          }
        </div>
      `
        )
        .join('')}

      <div style="text-align: center; margin-top: 25px; font-weight: bold;">
        ---------- HẾT MÃ ĐỀ ${escapeHtml(examCode.code)} ----------
      </div>
    `;
  });

  contentHtml += `</body></html>`;

  const blob = new Blob(['\ufeff' + contentHtml], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const sanitizedTitle = result.sourceTitle.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9]/g, '_');
  link.download = `CacMaDeTron_${sanitizedTitle}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
