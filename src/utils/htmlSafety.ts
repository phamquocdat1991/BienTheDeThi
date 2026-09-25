/**
 * HTML Safety & Sanitization Utility for Exam Data
 * Đảm bảo các ký tự đặc biệt như <, >, &, ", ' trong công thức Toán ($x < 2$)
 * hoặc nội dung đề thi không bị phân tích nhầm thành thẻ HTML gây lỗi layout hoặc XSS.
 */

const HTML_ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escape chuỗi HTML an toàn
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return str.replace(/[&<>"']/g, (m) => HTML_ENTITY_MAP[m] || m);
}

/**
 * Escape đệ quy dữ liệu xuất (dành cho render HTML xuất Word hoặc xem trước)
 */
export function escapeExportData<T>(input: T): T {
  if (typeof input === 'string') {
    return escapeHtml(input) as unknown as T;
  }
  if (Array.isArray(input)) {
    return input.map((item) => escapeExportData(item)) as unknown as T;
  }
  if (input !== null && typeof input === 'object') {
    const output: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      output[key] = escapeExportData(value);
    }
    return output as T;
  }
  return input;
}
