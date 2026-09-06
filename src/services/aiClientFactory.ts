import type { GoogleGenAI } from '@google/genai';
import { AiProvider, ApiConfig } from '../types';

// ============================================================================
// HẰNG SỐ & MẪU VALIDATION (Tuân thủ api.md v4.1 & google-api skill)
// ============================================================================
export const GOOGLE_AI_API_KEY_PATTERN = /^(?:AIzaSy|AQ)\S{8,}$/;

export const isValidGoogleAiApiKey = (key: string): boolean => {
  if (!key) return false;
  return GOOGLE_AI_API_KEY_PATTERN.test(key.trim());
};

// Storage Keys
export const STORAGE_KEYS = {
  GEMINI_KEY: 'gemini_api_key',
  AGENT_PLATFORM_KEY: 'agent_platform_api_key',
  PROVIDER: 'google_ai_provider',
  MODEL: 'selected_ai_model',
  SELECTION_SOURCE: 'google_ai_provider_selection_source',
};

// Danh mục Model cho Gemini API (Google AI Studio) theo AI_INSTRUCTIONS.md & api.md v4.2
export const GEMINI_MODELS = [
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash (Mặc định - Flagship)',
    tag: 'Mặc định • Dynamic Thinking',
    description: 'Model flagship mới nhất (13/08/2026), hỗ trợ Dynamic Thinking Budget, xuất sắc về lý luận toán học và phân hóa đề thi',
    recommended: true,
  },
  {
    id: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash (Khuyên dùng)',
    tag: 'GA Mới nhất',
    description: 'Bản GA ổn định cao, tư duy sư phạm xuất sắc, phân tích sâu và tiết kiệm token',
    recommended: false,
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    tag: 'Dự phòng cao cấp',
    description: 'Chất lượng cao, lập luận logic và trích xuất câu hỏi chính xác',
    recommended: false,
  },
  {
    id: 'gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash Lite',
    tag: 'Tốc độ cao • Chi phí thấp',
    description: 'Xử lý nhanh, chi phí thấp, tối ưu cho tác vụ trích xuất và đọc hiểu',
    recommended: false,
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    tag: 'Ổn định cao',
    description: 'Model ổn định thế hệ 2.5, phù hợp xử lý đa tác vụ',
    recommended: false,
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    tag: 'Chuyên sâu',
    description: 'Suy luận toán học, khoa học phức tạp và giải thích cặn kẽ',
    recommended: false,
  },
] as const;

export const GEMINI_FALLBACK_MODELS = [
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
];

// Danh mục Model cho Agent Platform API (Express Mode)
export const AGENT_PLATFORM_MODELS = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash (Agent Platform)',
    tag: 'Mặc định',
    description: 'Model tiêu chuẩn cho Agent Platform API',
    recommended: true,
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    tag: 'Tốc độ cao',
    description: 'Phân tích tài liệu và sinh đề nhanh chóng',
    recommended: false,
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    tag: 'Chuyên sâu',
    description: 'Xử lý bài toán khó và phân hóa học sinh',
    recommended: false,
  },
] as const;

export const AGENT_PLATFORM_FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

// ============================================================================
// HÀM QUẢN LÝ CẤU HÌNH & LOCAL STORAGE
// ============================================================================
export const loadStoredApiConfig = (): ApiConfig => {
  try {
    for (const key of [STORAGE_KEYS.GEMINI_KEY, STORAGE_KEYS.AGENT_PLATFORM_KEY]) { const legacy = localStorage.getItem(key); if (legacy && !sessionStorage.getItem(key)) sessionStorage.setItem(key, legacy); localStorage.removeItem(key); }
    const rawProvider = localStorage.getItem(STORAGE_KEYS.PROVIDER);
    const provider: AiProvider = rawProvider === 'agent-platform' ? 'agent-platform' : 'gemini';

    // Đọc key từ storage hoặc biến môi trường VITE (nếu có)
    const storedGemini = sessionStorage.getItem(STORAGE_KEYS.GEMINI_KEY) || '';
    const storedAgent = sessionStorage.getItem(STORAGE_KEYS.AGENT_PLATFORM_KEY) || '';

    const defaultModel = provider === 'agent-platform' ? 'gemini-2.5-flash' : 'gemini-3.7-flash';
    let storedModel = localStorage.getItem(STORAGE_KEYS.MODEL) || defaultModel;
    // Tự động di chuyển nếu người dùng còn lưu model cũ đã bị Google đóng (shutdown)
    if (
      storedModel === 'gemini-3-flash-preview' ||
      storedModel === 'gemini-3-pro-preview' ||
      storedModel === 'gemini-2.0-flash'
    ) {
      storedModel = 'gemini-3.7-flash';
      localStorage.setItem(STORAGE_KEYS.MODEL, storedModel);
    }

    return {
      provider,
      geminiKey: storedGemini,
      agentPlatformKey: storedAgent,
      selectedModel: storedModel,
    };
  } catch (e) {
    return {
      provider: 'gemini',
      geminiKey: '',
      agentPlatformKey: '',
      selectedModel: 'gemini-3.7-flash',
    };
  }
};

export const saveStoredApiConfig = (config: Partial<ApiConfig>): void => {
  try {
    if (config.provider) {
      localStorage.setItem(STORAGE_KEYS.PROVIDER, config.provider);
      localStorage.setItem(STORAGE_KEYS.SELECTION_SOURCE, 'manual');
    }
    if (config.geminiKey !== undefined) {
      sessionStorage.setItem(STORAGE_KEYS.GEMINI_KEY, config.geminiKey.trim()); localStorage.removeItem(STORAGE_KEYS.GEMINI_KEY);
    }
    if (config.agentPlatformKey !== undefined) {
      sessionStorage.setItem(STORAGE_KEYS.AGENT_PLATFORM_KEY, config.agentPlatformKey.trim()); localStorage.removeItem(STORAGE_KEYS.AGENT_PLATFORM_KEY);
    }
    if (config.selectedModel) {
      localStorage.setItem(STORAGE_KEYS.MODEL, config.selectedModel);
    }
  } catch (e) {
    console.error('Không thể lưu cấu hình API vào localStorage:', e);
  }
};

export const getActiveApiKey = (config?: ApiConfig): string => {
  const current = config || loadStoredApiConfig();
  if (current.provider === 'agent-platform') {
    return current.agentPlatformKey;
  }
  return current.geminiKey;
};

// ============================================================================
// CLIENT FACTORY DÙNG CHUNG (Tuân thủ api.md Mục III)
// ============================================================================
export const createGoogleAiClient = (
  apiKey: string,
  provider: AiProvider = 'gemini'
): GoogleGenAI => {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    throw new Error('Vui lòng cấu hình API Key trước khi sử dụng tính năng này.');
  }

  return { models: { generateContent: async (request: any) => {
    const config = request.config || {};
    const response = await fetch('/api/ai', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Gemini-Key': trimmedKey },
      body: JSON.stringify({ provider, model: request.model, contents: request.contents, config: {
        systemInstruction: config.systemInstruction, responseMimeType: config.responseMimeType || 'application/json',
        responseJsonSchema: config.responseJsonSchema, maxOutputTokens: Math.min(config.maxOutputTokens || 16384, 32768),
      }}), signal: AbortSignal.timeout(270000),
    });
    const data = await response.json().catch(() => ({error:'Server AI không trả JSON. Kiểm tra cấu hình deployment.'}));
    if (!response.ok) throw Object.assign(new Error(data.error || 'Request AI thất bại.'), {status:response.status,code:data.code});
    if(typeof data.text !== 'string') throw new Error('Response AI thiếu nội dung.');
    return { text: data.text, usageMetadata: data.usage };
  }}} as unknown as GoogleGenAI;
};
