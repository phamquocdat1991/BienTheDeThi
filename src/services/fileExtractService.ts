import mammoth from 'mammoth';
import { InputSource } from '../types';

/**
 * Trích xuất nội dung file trực tiếp trên trình duyệt (Client-Side).
 * Hỗ trợ: Microsoft Word (.docx), PDF, Ảnh (.png, .jpg, .webp), Text (.txt).
 */
export async function extractFileContentInBrowser(file: File): Promise<InputSource> {
  if (!file || file.size === 0) {
    throw new Error('Tệp tải lên rỗng (0 bytes). Vui lòng chọn tệp có nội dung.');
  }

  const lowerName = file.name.toLowerCase();
  const mimeType = file.type || '';

  // Chặn tệp .doc nhị phân cũ (Word 97-2003 OLE2)
  if (lowerName.endsWith('.doc') && !lowerName.endsWith('.docx')) {
    throw new Error(
      'Định dạng .doc cũ không được hỗ trợ trực tiếp. Vui lòng mở tệp bằng Word và chọn "Save As" sang định dạng .docx hiện đại.'
    );
  }

  // 1. File Word DOCX
  if (
    mimeType.includes('wordprocessingml') ||
    mimeType.includes('msword') ||
    lowerName.endsWith('.docx')
  ) {
    const arrayBuffer = await file.arrayBuffer();
    try {
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = (result.value || '').trim();
      if (!text) {
        throw new Error('Không thể đọc được văn bản trong tệp DOCX (có thể tệp bị mã hóa hoặc chỉ chứa hình ảnh).');
      }
      return {
        type: 'text',
        fileName: file.name,
        fileSize: file.size,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        rawText: text,
      };
    } catch (e: any) {
      throw new Error(`Lỗi khi đọc tệp Word (.docx): ${e?.message || 'Tệp có thể bị hỏng hoặc định dạng không chuẩn.'}`);
    }
  }

  // 2. File Plain Text (.txt)
  if (mimeType.includes('text') || lowerName.endsWith('.txt')) {
    const text = await file.text();
    if (!text.trim()) {
      throw new Error('Tệp văn bản .txt không có nội dung.');
    }
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
    if (file.size > 20 * 1024 * 1024) {
      throw new Error('Dung lượng tệp PDF vượt quá 20MB. Vui lòng nén hoặc giảm bớt số trang.');
    }
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
    if (file.size > 15 * 1024 * 1024) {
      throw new Error('Dung lượng ảnh vượt quá 15MB. Vui lòng giảm độ phân giải.');
    }
    const base64 = await fileToBase64(file);
    const detectedMime = mimeType || (lowerName.endsWith('.png') ? 'image/png' : 'image/jpeg');
    return {
      type: 'image',
      fileName: file.name,
      fileSize: file.size,
      mimeType: detectedMime,
      imageBase64: base64,
    };
  }

  // Fallback: đọc text thuần
  const text = await file.text();
  return {
    type: 'text',
    fileName: file.name,
    fileSize: file.size,
    rawText: text,
  };
}

/**
 * Chuyển đổi File sang chuỗi Base64
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
 * Sanitize LaTeX trong chuỗi JSON mà không phá hủy ký tự hợp lệ
 */
export function sanitizeLatexInJson(jsonText: string): string {
  // Chỉ nhân đôi dấu \ khi \ đi liền trước các lệnh LaTeX phổ biến (\sqrt, \frac, \alpha...)
  // mà không phải các escape chuẩn của JSON (\", \\, \/, \b, \f, \n, \r, \t, \uXXXX)
  return jsonText.replace(/(?<!\\)\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})([a-zA-Z]+)/g, '\\\\$1');
}

/**
 * Bộ làm sạch và phân tích cú pháp JSON an toàn từ phản hồi của AI
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

  // Thử parse trực tiếp trước (bảo tồn nguyên vẹn Unicode và newlines)
  try {
    return JSON.parse(cleaned) as T;
  } catch (directErr) {
    // Nếu lỗi do LaTeX escape, áp dụng sanitizeLatexInJson
    try {
      const sanitized = sanitizeLatexInJson(cleaned);
      return JSON.parse(sanitized) as T;
    } catch {
      // Tìm cặp ngoặc { ... } hoặc [ ... ] ngoài cùng
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const slice = cleaned.substring(firstBrace, lastBrace + 1);
        try {
          return JSON.parse(slice) as T;
        } catch {
          try {
            return JSON.parse(sanitizeLatexInJson(slice)) as T;
          } catch {
            // Thất bại
          }
        }
      }
      throw new Error(
        `Không thể chuyển đổi dữ liệu từ AI sang định dạng JSON hợp lệ: ${(directErr as Error).message}\nNội dung AI: ${rawText.slice(0, 250)}...`
      );
    }
  }
}
