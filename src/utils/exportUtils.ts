import { GeneratedExam } from '../types';

/**
 * Format exam questions into clean readable text for copying
 */
export function formatExamAsText(exam: GeneratedExam): string {
  let output = `========================================================\n`;
  output += `${exam.title.toUpperCase()}\n`;
  output += `Môn: ${exam.metadata.subject || 'Chưa rõ'} - Lớp: ${exam.metadata.grade || 'Chưa rõ'}\n`;
  output += `Thời gian làm bài: ${exam.metadata.durationMinutes || 45} phút | Tổng số câu: ${exam.questions.length}\n`;
  output += `Cấp độ biến thể: ${exam.levelName}\n`;
  output += `========================================================\n\n`;

  if (exam.metadata.instructions) {
    output += `HƯỚNG DẪN: ${exam.metadata.instructions}\n\n`;
  }

  exam.questions.forEach((q, idx) => {
    output += `Câu ${q.number || idx + 1}: ${q.questionText}\n`;
    if (q.options && q.options.length > 0) {
      q.options.forEach((opt) => {
        output += `   ${opt.label}. ${opt.text}\n`;
      });
    }
    output += `\n`;
  });

  return output;
}

/**
 * Format answer key and step-by-step solutions into clean text
 */
export function formatAnswersAsText(exam: GeneratedExam): string {
  let output = `========================================================\n`;
  output += `ĐÁP ÁN VÀ LỜI GIẢI CHI TIẾT - ${exam.title.toUpperCase()}\n`;
  output += `Cấp độ: ${exam.levelName}\n`;
  output += `========================================================\n\n`;

  output += `--- BẢNG ĐÁP ÁN NHANH ---\n`;
  const answersRow = exam.questions
    .map((q, idx) => `${q.number || idx + 1}: ${q.correctAnswer}`)
    .join(' | ');
  output += `${answersRow}\n\n`;

  output += `--- LỜI GIẢI CHI TIẾT TỪNG CÂU ---\n\n`;
  exam.questions.forEach((q, idx) => {
    output += `Câu ${q.number || idx + 1} [Đáp án: ${q.correctAnswer}] (${q.difficulty || 'Thông hiểu'}):\n`;
    if (q.solveSteps && q.solveSteps.length > 0) {
      q.solveSteps.forEach((step, sIdx) => {
        output += `  - Bước ${sIdx + 1}: ${step}\n`;
      });
    }
    if (q.explanation) {
      output += `  * Giải thích chi tiết: ${q.explanation}\n`;
    }
    if (q.changesFromOriginal) {
      output += `  * Biến thể so với đề gốc: ${q.changesFromOriginal}\n`;
    }
    output += `\n`;
  });

  return output;
}

/**
 * Helper tải file Word (.doc) về máy
 */
function downloadWordBlob(contentHtml: string, filename: string): void {
  const blob = new Blob(['\ufeff' + contentHtml], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const WORD_BASE_CSS = `
  @page { size: A4 portrait; margin: 2cm 2cm 2cm 2cm; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.4; color: #000000; }
  .header-table { width: 100%; border: none; margin-bottom: 15px; border-collapse: collapse; }
  .header-table td { vertical-align: top; padding: 2px 4px; }
  .title { text-align: center; font-size: 15pt; font-weight: bold; margin-top: 5px; margin-bottom: 4px; }
  .subtitle { text-align: center; font-size: 11pt; font-style: italic; margin-bottom: 15px; }
  .info-bar { margin-bottom: 15px; font-size: 12pt; border-bottom: 1px solid #000; padding-bottom: 5px; }
  .question { margin-bottom: 14px; page-break-inside: avoid; }
  .question-title { font-weight: bold; }
  .options-table { width: 100%; margin-top: 4px; margin-bottom: 8px; border-collapse: collapse; }
  .options-table td { width: 50%; padding: 3px 6px; vertical-align: top; }
  .essay-lines { margin-top: 8px; margin-bottom: 12px; color: #777; font-size: 11pt; }
  .page-break { page-break-before: always; }
  .answers-header { font-size: 14pt; font-weight: bold; text-align: center; margin-top: 25px; margin-bottom: 15px; border-top: 2px solid #000; padding-top: 15px; }
  .matrix-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; text-align: center; font-size: 11pt; }
  .matrix-table th, .matrix-table td { border: 1px solid #000; padding: 5px; }
  .matrix-table th { background-color: #f2f2f2; font-weight: bold; }
  .solution-item { margin-bottom: 14px; padding-bottom: 8px; border-bottom: 1px dashed #bbb; page-break-inside: avoid; }
`;

function renderExamQuestionsHtml(exam: GeneratedExam, isStudentMode = false): string {
  return exam.questions
    .map(
      (q, idx) => `
    <div class="question">
      <div class="question-title">Câu ${q.number || idx + 1}: ${q.questionText}</div>
      ${
        q.options && q.options.length > 0
          ? `
        <table class="options-table">
          <tr>
            ${q.options
              .slice(0, 2)
              .map((opt) => `<td><strong>${opt.label}.</strong> ${opt.text}</td>`)
              .join('')}
          </tr>
          ${
            q.options.length > 2
              ? `
            <tr>
              ${q.options
                .slice(2, 4)
                .map((opt) => `<td><strong>${opt.label}.</strong> ${opt.text}</td>`)
                .join('')}
            </tr>
          `
              : ''
          }
        </table>
      `
          : isStudentMode && q.type === 'essay'
          ? `
        <div class="essay-lines">
          <em>Bài làm:</em><br>
          ....................................................................................................................................................................<br>
          ....................................................................................................................................................................<br>
          ....................................................................................................................................................................
        </div>
      `
          : ''
      }
    </div>
  `
    )
    .join('');
}

function renderAnswersAndSolutionsHtml(exam: GeneratedExam): string {
  return `
    <div class="answers-header">ĐÁP ÁN VÀ HƯỚNG DẪN CHẤM CHI TIẾT</div>
    <p style="text-align: center; font-style: italic; margin-bottom: 15px;">
      Môn: ${exam.metadata.subject || 'Toán học'} • Khối: ${exam.metadata.grade || 'Lớp 10'} • Cấp độ: ${exam.levelName}
    </p>

    <p><strong>I. BẢNG ĐÁP ÁN NHANH</strong></p>
    <table class="matrix-table">
      <tr>
        ${exam.questions.map((q, idx) => `<th>Câu ${q.number || idx + 1}</th>`).join('')}
      </tr>
      <tr>
        ${exam.questions.map((q) => `<td><strong>${q.correctAnswer}</strong></td>`).join('')}
      </tr>
    </table>

    <p style="margin-top: 20px;"><strong>II. HƯỚNG DẪN GIẢI CHI TIẾT VÀ TIÊU CHÍ CHẤM</strong></p>
    <div>
      ${exam.questions
        .map(
          (q, idx) => `
        <div class="solution-item">
          <strong>Câu ${q.number || idx + 1} (Đáp án ${q.correctAnswer}):</strong>
          <p style="margin: 2px 0;"><em>Mức độ: ${q.difficulty || 'Thông hiểu'} | Chủ đề: ${q.topic || 'Trọng tâm bài học'}</em></p>
          ${
            q.solveSteps && q.solveSteps.length > 0
              ? `<p style="margin: 2px 0;"><strong>Các bước thực hiện:</strong></p><ul>${q.solveSteps
                  .map((s) => `<li>${s}</li>`)
                  .join('')}</ul>`
              : ''
          }
          <p style="margin: 2px 0;"><strong>Lời giải chi tiết:</strong> ${q.explanation || 'Đang cập nhật'}</p>
          <p style="margin: 2px 0; color: #444;"><em>Ghi chú biến thể:</em> ${q.changesFromOriginal || 'Bản tương đương đề gốc'}</p>
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

/**
 * 1. XUẤT ĐỀ THI CHO HỌC SINH LÀM BÀI (Không kèm đáp án)
 */
export function exportStudentExamDoc(exam: GeneratedExam): void {
  const contentHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>${exam.title} - Đề Thi Học Sinh</title><style>${WORD_BASE_CSS}</style></head>
    <body>
      <table class="header-table">
        <tr>
          <td style="text-align: center; width: 45%;">
            <strong>SỞ GD&ĐT / TRƯỜNG: ........................</strong><br>
            <em>Tổ Chuyên môn: ${exam.metadata.subject || 'Bộ môn'}</em>
          </td>
          <td style="text-align: center; width: 55%;">
            <strong>${exam.title.toUpperCase()}</strong><br>
            <strong>CẤP ĐỘ ${exam.level}: ${exam.levelName.toUpperCase()}</strong><br>
            <em>Thời gian làm bài: ${exam.metadata.durationMinutes || 45} phút</em>
          </td>
        </tr>
      </table>

      <div class="info-bar">
        Họ và tên thí sinh: .......................................................................... Lớp: ................. SBD: ....................
      </div>

      ${renderExamQuestionsHtml(exam, true)}

      <div style="text-align: center; margin-top: 30px; font-weight: bold;">
        ---------- HẾT ----------<br>
        <span style="font-size: 11pt; font-weight: normal; font-style: italic;">(Cán bộ coi thi không giải thích gì thêm)</span>
      </div>
    </body>
    </html>
  `;

  const sanitizedTitle = exam.title.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9]/g, '_');
  downloadWordBlob(contentHtml, `${sanitizedTitle}_DeHocSinh_CapDo${exam.level}.doc`);
}

/**
 * 2. XUẤT ĐÁP ÁN & HƯỚNG DẪN CHẤM CHI TIẾT DÀNH CHO GIÁO VIÊN
 */
export function exportTeacherAnswerDoc(exam: GeneratedExam): void {
  const contentHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>${exam.title} - Đáp Án & Hướng Dẫn Chấm</title><style>${WORD_BASE_CSS}</style></head>
    <body>
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 16pt;">${exam.title.toUpperCase()}</h2>
        <p style="margin: 4px 0; font-size: 13pt; font-weight: bold;">CẤP ĐỘ ${exam.level}: ${exam.levelName}</p>
      </div>

      ${renderAnswersAndSolutionsHtml(exam)}
    </body>
    </html>
  `;

  const sanitizedTitle = exam.title.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9]/g, '_');
  downloadWordBlob(contentHtml, `${sanitizedTitle}_DapAnChiTiet_CapDo${exam.level}.doc`);
}

/**
 * 3. XUẤT TRỌN GÓI: ĐỀ THI + ĐÁP ÁN (Full Bundle)
 */
export function exportToWordDoc(exam: GeneratedExam, includeAnswers = true): void {
  const contentHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>${exam.title}</title><style>${WORD_BASE_CSS}</style></head>
    <body>
      <table class="header-table">
        <tr>
          <td style="text-align: center; width: 45%;">
            <strong>SỞ GD&ĐT / TRƯỜNG: ........................</strong><br>
            <em>Tổ Chuyên môn: ${exam.metadata.subject || 'Bộ môn'}</em>
          </td>
          <td style="text-align: center; width: 55%;">
            <strong>${exam.title.toUpperCase()}</strong><br>
            <strong>CẤP ĐỘ ${exam.level}: ${exam.levelName.toUpperCase()}</strong><br>
            <em>Thời gian làm bài: ${exam.metadata.durationMinutes || 45} phút</em>
          </td>
        </tr>
      </table>

      <div class="info-bar">
        Họ và tên thí sinh: .......................................................................... Lớp: ................. SBD: ....................
      </div>

      ${renderExamQuestionsHtml(exam, false)}

      ${includeAnswers ? `<div class="page-break"></div>${renderAnswersAndSolutionsHtml(exam)}` : ''}
    </body>
    </html>
  `;

  const sanitizedTitle = exam.title.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9]/g, '_');
  downloadWordBlob(contentHtml, `${sanitizedTitle}_CapDo${exam.level}.doc`);
}

/**
 * 4. XUẤT TRỌN BỘ CẢ 3 CẤP ĐỘ BIẾN THỂ (Bộ 3 Đề)
 */
export function exportAllThreeVariantsDoc(
  exam1: GeneratedExam,
  exam2: GeneratedExam,
  exam3: GeneratedExam
): void {
  const contentHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Trọn Bộ 3 Cấp Độ Đề Thi Biến Thể</title><style>${WORD_BASE_CSS}</style></head>
    <body>
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px double #000; padding-bottom: 15px;">
        <h1 style="margin: 0; font-size: 18pt;">BỘ ĐỀ THI BIẾN THỂ 3 CẤP ĐỘ CHUẨN SƯ PHẠM</h1>
        <p style="margin: 5px 0; font-size: 13pt;">Môn: ${exam1.metadata.subject || 'Đa môn'} • Khối: ${exam1.metadata.grade || 'Toàn cấp'}</p>
        <p style="margin: 2px 0; font-size: 11pt; font-style: italic;">Hệ thống biên soạn & kiểm định độc lập 8 tiêu chí</p>
      </div>

      <h2 style="font-size: 16pt; color: #0284C7; margin-top: 10px;">PHẦN 1: ĐỀ BIẾN THỂ CẤP ĐỘ 1 (ĐỔI DỮ KIỆN & SỐ LIỆU)</h2>
      ${renderExamQuestionsHtml(exam1, false)}
      <div class="page-break"></div>
      ${renderAnswersAndSolutionsHtml(exam1)}

      <div class="page-break"></div>
      <h2 style="font-size: 16pt; color: #0284C7; margin-top: 20px;">PHẦN 2: ĐỀ BIẾN THỂ CẤP ĐỘ 2 (DẠNG BÀI TƯƠNG ĐƯƠNG)</h2>
      ${renderExamQuestionsHtml(exam2, false)}
      <div class="page-break"></div>
      ${renderAnswersAndSolutionsHtml(exam2)}

      <div class="page-break"></div>
      <h2 style="font-size: 16pt; color: #0284C7; margin-top: 20px;">PHẦN 3: ĐỀ BIẾN THỂ CẤP ĐỘ 3 (PHÂN HÓA & VẬN DỤNG SÂU)</h2>
      ${renderExamQuestionsHtml(exam3, false)}
      <div class="page-break"></div>
      ${renderAnswersAndSolutionsHtml(exam3)}
    </body>
    </html>
  `;

  const sanitizedTitle = (exam1.metadata.subject || 'Bo_De_3_Cap_Do')
    .replace(/[^a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9]/g, '_');
  downloadWordBlob(contentHtml, `TronBo_3_DeBienThe_${sanitizedTitle}.doc`);
}
