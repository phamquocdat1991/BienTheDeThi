import { InputSource } from '../types';

/**
 * Trích xuất nội dung file trực tiếp trên trình duyệt (Client-Side).
 * Hỗ trợ: Microsoft Word (.docx), PDF, Ảnh (.png, .jpg, .webp), Text (.txt).
 */
export async function extractFileContentInBrowser(file: File): Promise<InputSource> {
  const lowerName = file.name.toLowerCase();
  const mimeType = file.type || '';

  if (file.size === 0 || file.size > 25 * 1024 * 1024) throw new Error('Tệp rỗng hoặc vượt giới hạn 25 MB.');
  if (lowerName.endsWith('.doc')) throw new Error('Hãy chuyển tệp .doc sang .docx hoặc PDF.');
  // 1. File Word DOCX
  if (
    mimeType.includes('wordprocessingml') ||
    lowerName.endsWith('.docx')
  ) {
    const arrayBuffer = await file.arrayBuffer();
    try {
      const { default: mammoth } = await import('mammoth');
      const result = await mammoth.extractRawText({ arrayBuffer });
      if (!result.value.trim()) throw new Error('Word không chứa văn bản đọc được. Hãy xuất PDF để giữ hình và công thức.');
      return {
        type: 'text',
        fileName: file.name,
        fileSize: file.size,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        rawText: result.value,
      };
    } catch (e: any) {
      throw new Error('Không thể đọc tệp Word. Hãy kiểm tra tệp .docx hoặc xuất sang PDF, không đổi đuôi tệp trực tiếp.');
    }
  }

  // 2. File Plain Text (.txt)
  if (mimeType.includes('text') || lowerName.endsWith('.txt')) {
    const text = await file.text();
    return {
      type: 'text',
      fileName: file.name,
      fileSize: file.size,
      mimeType: 'text/plain',
      rawText: text,
    };
  }

  // 3. File PDF
  if (mimeType === 'application/pdf' || lowerName.endsWith('.pdf')) {
    const base64 = await fileToBase64(file);
    return {
      type: 'file',
      fileName: file.name,
      fileSize: file.size,
      mimeType: 'application/pdf',
      pdfBase64: base64,
    };
  }

  // 4. File Hình ảnh (PNG, JPG, JPEG, WEBP)
  if (mimeType.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(lowerName)) {
    const base64 = await fileToBase64(file);
    const detectedMime = mimeType || (lowerName.endsWith('.png') ? 'image/png' : lowerName.endsWith('.webp') ? 'image/webp' : 'image/jpeg');
    return {
      type: 'image',
      fileName: file.name,
      fileSize: file.size,
      mimeType: detectedMime,
      imageBase64: base64,
    };
  }

  // Fallback: đọc text
  const text = await file.text();
  return {
    type: 'text',
    fileName: file.name,
    fileSize: file.size,
    rawText: text,
  };
}

/**
 * Chuyển đổi File sang chuỗi Base64 (bỏ phần data URL prefix)
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * SANITIZE LATEX TRONG CHUỖI JSON TRƯỚC KHI GỌI JSON.parse()
 * (Tuân thủ SKILL-MATH-ONLINE-EXAM: Chống lỗi \f thành formfeed, \b thành backspace, \t thành tab)
 */
export function sanitizeLatexInJson(jsonText: string): string {
  // Thay thế các ký tự \ trước chữ cái LaTeX thành \\ nếu chưa được escape đúng cách
  return jsonText.replace(/(?<!\\)\\([a-zA-Z])/g, '\\\\$1');
}

/**
 * Bộ làm sạch và phân tích cú pháp JSON từ phản hồi của AI
 */
export function cleanAndParseJSON<T>(rawText: string): T {
  if (!rawText) {
    throw new Error('Dữ liệu phản hồi từ AI rỗng.');
  }

  let cleaned = rawText.trim();

  // Bóc tách markdown code block nếu có
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  cleaned = cleaned.trim();

  // Preserve valid JSON escapes (newlines, Unicode) before repairing malformed LaTeX.
  try { return JSON.parse(cleaned) as T; } catch {}
  const sanitized = sanitizeLatexInJson(cleaned);

  // Thử parse trực tiếp
  try {
    return JSON.parse(sanitized) as T;
  } catch (err1) {
    // Thử parse cleaned ban đầu nếu sanitize lỗi
    try {
      return JSON.parse(cleaned) as T;
    } catch (err2) {
      // Tìm cặp ngoặc { ... } hoặc [ ... ] ngoài cùng
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const slice = cleaned.substring(firstBrace, lastBrace + 1);
        try {
          return JSON.parse(sanitizeLatexInJson(slice)) as T;
        } catch (e3) {
          try {
            return JSON.parse(slice) as T;
          } catch (e4) {
            // Fall through
          }
        }
      }
      throw new Error(`Không thể chuyển đổi dữ liệu từ AI sang định dạng JSON hợp lệ: ${(err1 as Error).message}\nNội dung AI: ${rawText.slice(0, 250)}...`);
    }
  }
}
