import { GoogleGenAI } from '@google/genai';
import { AiProvider, ApiConfig } from '../types';

// ============================================================================
// HẰNG SỐ & MẪU VALIDATION
// ============================================================================
// Hỗ trợ kiểm tra cơ bản độ dài key (tối thiểu 8 ký tự, không chứa khoảng trắng)
export const isValidGoogleAiApiKey = (key: string): boolean => {
  if (!key) return false;
  const trimmed = key.trim();
  return trimmed.length >= 8 && !/\s/.test(trimmed);
};

// Storage Keys
export const STORAGE_KEYS = {
  GEMINI_KEY: 'gemini_api_key',
  AGENT_PLATFORM_KEY: 'agent_platform_api_key',
  PROVIDER: 'google_ai_provider',
  MODEL: 'selected_ai_model',
  STORAGE_TYPE: 'google_ai_storage_type', // 'session' | 'local'
};

// Danh mục Model cho Gemini API (Google AI Studio) theo chuẩn edtech & GDPT 2018
export const GEMINI_MODELS = [
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash (Mặc định - Flagship)',
    tag: 'Mặc định • Dynamic Thinking',
    description: 'Model flagship mới nhất, hỗ trợ Dynamic Thinking Budget, xuất sắc về lý luận toán học, sư phạm và phân hóa đề thi',
    recommended: true,
  },
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    tag: 'Dự phòng cao cấp',
    description: 'Model dự phòng thế hệ mới, ổn định cao trong phân tích và sinh đề',
    recommended: false,
  },
  {
    id: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash',
    tag: 'GA Ổn định',
    description: 'Bản GA ổn định cao, tư duy sư phạm chuẩn xác, tiết kiệm token',
    recommended: false,
  },
  {
    id: 'gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash Lite',
    tag: 'Tốc độ cao • Tiết kiệm',
    description: 'Xử lý nhanh, chi phí thấp, tối ưu cho tác vụ trích xuất và đọc hiểu',
    recommended: false,
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    tag: 'Dự phòng thế hệ 2.5',
    description: 'Model ổn định thế hệ 2.5, phù hợp xử lý đa tác vụ',
    recommended: false,
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    tag: 'Chuyên sâu lý luận',
    description: 'Suy luận toán học, khoa học phức tạp và giải thích cặn kẽ',
    recommended: false,
  },
] as const;

export const GEMINI_FALLBACK_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
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
] as const;

export const AGENT_PLATFORM_FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

// ============================================================================
// HÀM LẤY VÀ LƯU CẤU HÌNH API
// ============================================================================
function getStoredValue(key: string): string {
  try {
    return sessionStorage.getItem(key) || localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

export const loadStoredApiConfig = (): ApiConfig => {
  const provider = (getStoredValue(STORAGE_KEYS.PROVIDER) as AiProvider) || 'gemini';
  const geminiKey = getStoredValue(STORAGE_KEYS.GEMINI_KEY);
  const agentPlatformKey = getStoredValue(STORAGE_KEYS.AGENT_PLATFORM_KEY);
  const selectedModel = getStoredValue(STORAGE_KEYS.MODEL) || 'gemini-3.8-flash';

  return {
    provider,
    geminiKey,
    agentPlatformKey,
    selectedModel,
  };
};

export const saveStoredApiConfig = (
  config: ApiConfig,
  saveToSessionOnly: boolean = false
): void => {
  try {
    const targetStorage = saveToSessionOnly ? sessionStorage : localStorage;
    const alternateStorage = saveToSessionOnly ? localStorage : sessionStorage;

    targetStorage.setItem(STORAGE_KEYS.PROVIDER, config.provider);
    targetStorage.setItem(STORAGE_KEYS.MODEL, config.selectedModel);
    targetStorage.setItem(STORAGE_KEYS.STORAGE_TYPE, saveToSessionOnly ? 'session' : 'local');

    if (config.geminiKey) {
      targetStorage.setItem(STORAGE_KEYS.GEMINI_KEY, config.geminiKey.trim());
    } else {
      targetStorage.removeItem(STORAGE_KEYS.GEMINI_KEY);
    }

    if (config.agentPlatformKey) {
      targetStorage.setItem(STORAGE_KEYS.AGENT_PLATFORM_KEY, config.agentPlatformKey.trim());
    } else {
      targetStorage.removeItem(STORAGE_KEYS.AGENT_PLATFORM_KEY);
    }

    // Dọn dẹp storage đối ứng để tránh xung đột
    alternateStorage.removeItem(STORAGE_KEYS.GEMINI_KEY);
    alternateStorage.removeItem(STORAGE_KEYS.AGENT_PLATFORM_KEY);
  } catch (error) {
    console.warn('Lỗi khi lưu API config:', error);
  }
};

export const clearStoredApiKey = (): void => {
  try {
    sessionStorage.removeItem(STORAGE_KEYS.GEMINI_KEY);
    sessionStorage.removeItem(STORAGE_KEYS.AGENT_PLATFORM_KEY);
    localStorage.removeItem(STORAGE_KEYS.GEMINI_KEY);
    localStorage.removeItem(STORAGE_KEYS.AGENT_PLATFORM_KEY);
  } catch (error) {
    console.warn('Lỗi khi xóa API Key:', error);
  }
};

export const getActiveApiKey = (config: ApiConfig): string => {
  return config.provider === 'agent-platform'
    ? config.agentPlatformKey || ''
    : config.geminiKey || '';
};

// ============================================================================
// CLIENT FACTORY CHO GOOGLE GENAI SDK V5.0 (@google/genai)
// ============================================================================
export const createGoogleAiClient = (
  apiKey: string,
  provider: AiProvider = 'gemini'
): GoogleGenAI => {
  const trimmedKey = (apiKey || '').trim();
  if (!trimmedKey) {
    throw new Error('API Key không được để trống.');
  }

  if (provider === 'agent-platform') {
    return new GoogleGenAI({ vertexai: true, apiKey: trimmedKey });
  }

  return new GoogleGenAI({ apiKey: trimmedKey });
};

// ============================================================================
// KIỂM TRA KẾT NỐI THẬT (REAL PROBE TEST CONNECTION)
// ============================================================================
export interface ConnectionTestResult {
  success: boolean;
  latencyMs: number;
  modelCount: number;
  availableModels: string[];
  message: string;
}

export const testGoogleAiConnection = async (
  apiKey: string,
  provider: AiProvider = 'gemini'
): Promise<ConnectionTestResult> => {
  const startTime = Date.now();
  try {
    const client = createGoogleAiClient(apiKey, provider);
    const modelsResponse = await client.models.list();
    const latencyMs = Date.now() - startTime;

    const modelNames: string[] = [];
    if (modelsResponse && typeof (modelsResponse as any)[Symbol.asyncIterator] === 'function') {
      for await (const m of modelsResponse as any) {
        if (m.name) modelNames.push(m.name.replace('models/', ''));
      }
    } else if (Array.isArray((modelsResponse as any)?.models)) {
      modelNames.push(...(modelsResponse as any).models.map((m: any) => (m.name || '').replace('models/', '')));
    }

    return {
      success: true,
      latencyMs,
      modelCount: modelNames.length,
      availableModels: modelNames,
      message: `Kết nối thành công (${latencyMs}ms)! Tìm thấy ${modelNames.length} mô hình khả dụng.`,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const errMsg = err?.message || 'Không thể kết nối đến Google AI.';
    return {
      success: false,
      latencyMs,
      modelCount: 0,
      availableModels: [],
      message: errMsg,
    };
  }
};
