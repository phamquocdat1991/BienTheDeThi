import React, { useMemo } from 'react';

interface MathContentProps {
  content: string;
  className?: string;
  inline?: boolean;
}

interface Segment {
  type: 'text' | 'math' | 'display-math';
  value: string;
}

/**
 * Tách nội dung thành các phân đoạn text và math ($...$ hoặc $$...$$)
 */
function parseMathSegments(text: string): Segment[] {
  if (!text) return [];

  const segments: Segment[] = [];
  // Regex khớp $$...$$ (display math) hoặc $...$ (inline math)
  const regex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Phần text trước match
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        value: text.substring(lastIndex, match.index),
      });
    }

    const matchedStr = match[0];
    if (matchedStr.startsWith('$$') && matchedStr.endsWith('$$')) {
      segments.push({
        type: 'display-math',
        value: matchedStr.slice(2, -2).trim(),
      });
    } else if (matchedStr.startsWith('$') && matchedStr.endsWith('$')) {
      segments.push({
        type: 'math',
        value: matchedStr.slice(1, -1).trim(),
      });
    }

    lastIndex = match.index + matchedStr.length;
  }

  // Phần text còn lại sau cùng
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      value: text.substring(lastIndex),
    });
  }

  return segments;
}

/**
 * Render một biểu thức LaTeX bằng KaTeX
 */
function renderKatexString(latex: string, displayMode = false): string | null {
  try {
    const katex = (window as any).katex;
    if (katex && typeof katex.renderToString === 'function') {
      return katex.renderToString(latex, {
        displayMode,
        throwOnError: false,
        strict: false,
        trust: true,
      });
    }
  } catch (err) {
    console.warn('Lỗi render KaTeX:', err);
  }
  return null;
}

export const MathContent: React.FC<MathContentProps> = ({
  content,
  className = '',
  inline = false,
}) => {
  const segments = useMemo(() => parseMathSegments(content || ''), [content]);

  if (!content) return null;

  // Nếu không có ký hiệu math nào
  if (segments.length === 1 && segments[0].type === 'text') {
    return <span className={className}>{content}</span>;
  }

  const Tag = inline ? 'span' : 'div';

  return (
    <Tag className={`math-content leading-relaxed ${className}`}>
      {segments.map((seg, idx) => {
        if (seg.type === 'text') {
          return <span key={idx}>{seg.value}</span>;
        }

        const isDisplay = seg.type === 'display-math';
        const html = renderKatexString(seg.value, isDisplay);

        if (html) {
          if (isDisplay) {
            return (
              <div
                key={idx}
                className="my-2 overflow-x-auto text-center"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          }
          return (
            <span
              key={idx}
              className="inline-block px-0.5"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }

        // Fallback nếu KaTeX chưa sẵn sàng
        return (
          <code
            key={idx}
            className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-xs text-sky-800"
          >
            ${seg.value}$
          </code>
        );
      })}
    </Tag>
  );
};
