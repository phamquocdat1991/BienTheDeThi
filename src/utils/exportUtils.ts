import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  WidthType,
  BorderStyle,
} from 'docx';
import { GeneratedExam } from '../types';
import { escapeHtml } from './htmlSafety';

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
 * Helper tải tệp Blob về máy tính
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// XUẤT TỆP WORD (.DOCX) CHUẨN NGHỊ ĐỊNH 30/2020/NĐ-CP
// ============================================================================
const BORDER_NONE = {
  style: BorderStyle.NONE,
  size: 0,
  color: 'auto',
};

const CELL_BORDER_THIN = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: '888888',
};

export async function exportExamToDocx(
  exam: GeneratedExam,
  includeAnswers: boolean = true
): Promise<void> {
  const meta = exam.metadata;
  const filename = `${(exam.title || 'de_thi').replace(/[^a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9]/g, '_')}_CapDo${exam.level}.docx`;

  const sectionsList: any[] = [];

  // Bảng Header chuẩn Bộ GD&ĐT
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: BORDER_NONE,
      bottom: BORDER_NONE,
      left: BORDER_NONE,
      right: BORDER_NONE,
      insideHorizontal: BORDER_NONE,
      insideVertical: BORDER_NONE,
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: (meta.schoolOrOrg || 'SỞ GIÁO DỤC VÀ ĐÀO TẠO').toUpperCase(), bold: true, size: 22, font: 'Times New Roman' }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'TRƯỜNG THPT CHUYÊN / THPT', bold: true, size: 22, font: 'Times New Roman' }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: '-----------------------', size: 20, font: 'Times New Roman' }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'KỲ THI KIỂM TRA ĐỊNH KỲ', bold: true, size: 22, font: 'Times New Roman' }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: `MÔN: ${(meta.subject || 'TOÁN HỌC').toUpperCase()} - ${meta.grade || 'LỚP 10'}`, bold: true, size: 22, font: 'Times New Roman' }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: `Thời gian: ${meta.durationMinutes || 45} phút (không kể thời gian phát đề)`, italics: true, size: 20, font: 'Times New Roman' }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  sectionsList.push(headerTable);

  // Tiêu đề bài thi
  sectionsList.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({
          text: exam.title.toUpperCase(),
          bold: true,
          size: 26,
          font: 'Times New Roman',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `(Cấp độ: ${exam.levelName} - ${exam.levelDescription})`,
          italics: true,
          size: 20,
          font: 'Times New Roman',
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 250 },
      children: [
        new TextRun({
          text: 'Họ và tên thí sinh: ............................................................................ Số báo danh: ........................ Mã đề: 001',
          size: 22,
          font: 'Times New Roman',
        }),
      ],
    })
  );

  // Danh sách câu hỏi
  exam.questions.forEach((q, idx) => {
    sectionsList.push(
      new Paragraph({
        spacing: { before: 150, after: 80 },
        children: [
          new TextRun({
            text: `Câu ${q.number || idx + 1}: `,
            bold: true,
            size: 24,
            font: 'Times New Roman',
          }),
          new TextRun({
            text: q.questionText,
            size: 24,
            font: 'Times New Roman',
          }),
        ],
      })
    );

    // Phương án trắc nghiệm
    if (q.options && q.options.length > 0) {
      const optionsText = q.options
        .map((opt) => `${opt.label}. ${opt.text}`)
        .join('          ');

      sectionsList.push(
        new Paragraph({
          indent: { left: 400 },
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: optionsText,
              size: 22,
              font: 'Times New Roman',
            }),
          ],
        })
      );
    } else if (q.type === 'essay') {
      sectionsList.push(
        new Paragraph({
          indent: { left: 400 },
          spacing: { after: 150 },
          children: [
            new TextRun({
              text: '....................................................................................................................................................................................',
              italics: true,
              size: 20,
              color: '888888',
              font: 'Times New Roman',
            }),
          ],
        })
      );
    }
  });

  // Nếu xuất bản dành cho Giáo viên (kèm lời giải chi tiết)
  if (includeAnswers) {
    sectionsList.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 200 },
        children: [
          new TextRun({
            text: '-------------------------------------------------------------------------------------------------------------',
            size: 20,
            font: 'Times New Roman',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 150 },
        children: [
          new TextRun({
            text: 'ĐÁP ÁN VÀ HƯỚNG DẪN GIẢI CHI TIẾT',
            bold: true,
            size: 26,
            font: 'Times New Roman',
          }),
        ],
      })
    );

    // Bảng đáp án nhanh
    const answerCells = exam.questions.map(
      (q, idx) =>
        new TableCell({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: `C${q.number || idx + 1}`, bold: true, size: 20, font: 'Times New Roman' }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: q.correctAnswer || '-', bold: true, size: 22, color: '204f43', font: 'Times New Roman' }),
              ],
            }),
          ],
          borders: {
            top: CELL_BORDER_THIN,
            bottom: CELL_BORDER_THIN,
            left: CELL_BORDER_THIN,
            right: CELL_BORDER_THIN,
          },
        })
    );

    const answerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({ children: answerCells })],
    });

    sectionsList.push(answerTable);

    // Lời giải chi tiết
    exam.questions.forEach((q, idx) => {
      sectionsList.push(
        new Paragraph({
          spacing: { before: 180, after: 60 },
          children: [
            new TextRun({
              text: `Câu ${q.number || idx + 1} [Đáp án: ${q.correctAnswer}]: `,
              bold: true,
              size: 22,
              font: 'Times New Roman',
            }),
            new TextRun({
              text: `(${q.difficulty || 'Thông hiểu'} - ${q.points || 0.5}đ)`,
              italics: true,
              size: 20,
              font: 'Times New Roman',
            }),
          ],
        })
      );

      if (q.solveSteps && q.solveSteps.length > 0) {
        q.solveSteps.forEach((s, sIdx) => {
          sectionsList.push(
            new Paragraph({
              indent: { left: 300 },
              children: [
                new TextRun({
                  text: `- Bước ${sIdx + 1}: ${s}`,
                  size: 21,
                  font: 'Times New Roman',
                }),
              ],
            })
          );
        });
      }

      if (q.explanation) {
        sectionsList.push(
          new Paragraph({
            indent: { left: 300 },
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: `* Lời giải: ${q.explanation}`,
                size: 21,
                font: 'Times New Roman',
              }),
            ],
          })
        );
      }
    });
  }

  // Khởi tạo tài liệu Word chuẩn A4 theo Nghị định 30/2020/NĐ-CP
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134, // 2.0 cm
              bottom: 1134, // 2.0 cm
              left: 1701, // 3.0 cm (đóng gáy bài thi)
              right: 1134, // 2.0 cm
            },
          },
        },
        children: sectionsList,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, filename);
}

// ============================================================================
// XUẤT TỆP WORD (.DOC) TƯƠNG THÍCH CAO & AN TOÀN HTML ESCAPED
// ============================================================================
const WORD_BASE_CSS = `
  @page { size: A4 portrait; margin: 2cm 2cm 2cm 3cm; }
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
      <div class="question-title">Câu ${q.number || idx + 1}: ${escapeHtml(q.questionText)}</div>
      ${
        q.options && q.options.length > 0
          ? `
        <table class="options-table">
          <tr>
            ${q.options
              .slice(0, 2)
              .map((opt) => `<td><strong>${opt.label}.</strong> ${escapeHtml(opt.text)}</td>`)
              .join('')}
          </tr>
          ${
            q.options.length > 2
              ? `
            <tr>
              ${q.options
                .slice(2, 4)
                .map((opt) => `<td><strong>${opt.label}.</strong> ${escapeHtml(opt.text)}</td>`)
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
      Môn: ${escapeHtml(exam.metadata.subject || 'Toán học')} • Khối: ${escapeHtml(exam.metadata.grade || 'Lớp 10')} • Cấp độ: ${escapeHtml(exam.levelName)}
    </p>

    <p><strong>I. BẢNG ĐÁP ÁN NHANH</strong></p>
    <table class="matrix-table">
      <tr>
        ${exam.questions.map((q, idx) => `<th>Câu ${q.number || idx + 1}</th>`).join('')}
      </tr>
      <tr>
        ${exam.questions.map((q) => `<td><strong>${escapeHtml(q.correctAnswer)}</strong></td>`).join('')}
      </tr>
    </table>

    <p style="margin-top: 20px;"><strong>II. HƯỚNG DẪN GIẢI CHI TIẾT</strong></p>
    <div>
      ${exam.questions
        .map(
          (q, idx) => `
        <div class="solution-item">
          <strong>Câu ${q.number || idx + 1} (Đáp án ${escapeHtml(q.correctAnswer)}):</strong>
          <p style="margin: 2px 0;"><em>Mức độ: ${escapeHtml(q.difficulty || 'Thông hiểu')} | Chủ đề: ${escapeHtml(q.topic || 'Trọng tâm bài học')}</em></p>
          ${
            q.solveSteps && q.solveSteps.length > 0
              ? `<p style="margin: 2px 0;"><strong>Các bước thực hiện:</strong></p><ul>${q.solveSteps
                  .map((s) => `<li>${escapeHtml(s)}</li>`)
                  .join('')}</ul>`
              : ''
          }
          <p style="margin: 2px 0;"><strong>Lời giải chi tiết:</strong> ${escapeHtml(q.explanation || 'Đang cập nhật')}</p>
          <p style="margin: 2px 0; color: #444;"><em>Ghi chú biến thể:</em> ${escapeHtml(q.changesFromOriginal || 'Bản tương đương đề gốc')}</p>
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

/**
 * Xuất file Word (.docx hoặc .doc tương thích)
 */
export async function exportToWordDoc(exam: GeneratedExam, includeSolutions = true): Promise<void> {
  // Thử xuất file DOCX chuẩn trước
  try {
    await exportExamToDocx(exam, includeSolutions);
    return;
  } catch (err) {
    console.warn('Xuất DOCX thất bại, chuyển sang định dạng Word HTML tương thích:', err);
  }

  // Fallback xuất Word HTML .doc an toàn
  const contentHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>${escapeHtml(exam.title)}</title><style>${WORD_BASE_CSS}</style></head>
    <body>
      <div class="title">${escapeHtml(exam.title.toUpperCase())}</div>
      <div class="subtitle">(${escapeHtml(exam.levelName)} - ${escapeHtml(exam.levelDescription)})</div>
      ${renderExamQuestionsHtml(exam, !includeSolutions)}
      ${includeSolutions ? renderAnswersAndSolutionsHtml(exam) : ''}
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + contentHtml], { type: 'application/msword;charset=utf-8' });
  const filename = `${(exam.title || 'de_thi').replace(/[^a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9]/g, '_')}_CapDo${exam.level}.doc`;
  downloadBlob(blob, filename);
}

/**
 * Xuất cả 3 cấp độ đề thi vào 1 file
 */
export async function exportAllThreeVariantsDoc(
  exam1: GeneratedExam,
  exam2: GeneratedExam,
  exam3: GeneratedExam
): Promise<void> {
  const contentHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Trọn Bộ 3 Cấp Độ Đề Thi Biến Thể</title><style>${WORD_BASE_CSS}</style></head>
    <body>
      <div class="title">BỘ 03 CẤP ĐỘ ĐỀ THI BIẾN THỂ CHUẨN SƯ PHẠM</div>
      <div class="subtitle">${escapeHtml(exam1.title)}</div>

      <div style="border-top: 2px solid #204f43; margin: 20px 0;"></div>
      <h2 style="color: #204f43;">I. ${escapeHtml(exam1.levelName)}</h2>
      ${renderExamQuestionsHtml(exam1)}
      ${renderAnswersAndSolutionsHtml(exam1)}

      <div class="page-break"></div>
      <h2 style="color: #204f43;">II. ${escapeHtml(exam2.levelName)}</h2>
      ${renderExamQuestionsHtml(exam2)}
      ${renderAnswersAndSolutionsHtml(exam2)}

      <div class="page-break"></div>
      <h2 style="color: #204f43;">III. ${escapeHtml(exam3.levelName)}</h2>
      ${renderExamQuestionsHtml(exam3)}
      ${renderAnswersAndSolutionsHtml(exam3)}
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + contentHtml], { type: 'application/msword;charset=utf-8' });
  downloadBlob(blob, `Bo_3_De_Thi_Bien_The_Tron_Goi.doc`);
}

/**
 * Xuất đề thi cho Học sinh (không kèm đáp án)
 */
export function exportStudentExamDoc(exam: GeneratedExam): void {
  exportToWordDoc(exam, false);
}

/**
 * Xuất đề thi kèm đáp án và hướng dẫn chấm cho Giáo viên
 */
export function exportTeacherExamDoc(exam: GeneratedExam): void {
  exportToWordDoc(exam, true);
}

export const exportTeacherAnswerDoc = exportTeacherExamDoc;

