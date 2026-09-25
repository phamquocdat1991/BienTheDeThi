import React, { useState, useEffect } from 'react';
import {
  Key,
  ShieldCheck,
  ExternalLink,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Cpu,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { AiProvider, ApiConfig } from '../types';
import {
  GEMINI_MODELS,
  AGENT_PLATFORM_MODELS,
  isValidGoogleAiApiKey,
  loadStoredApiConfig,
  saveStoredApiConfig,
  testGoogleAiConnection,
  ConnectionTestResult,
  clearStoredApiKey,
} from '../services/aiClientFactory';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: (config: ApiConfig) => void;
  initialConfig?: ApiConfig;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
  initialConfig,
}) => {
  const [provider, setProvider] = useState<AiProvider>('gemini');
  const [geminiKey, setGeminiKey] = useState<string>('');
  const [agentPlatformKey, setAgentPlatformKey] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.8-flash');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [saveToSessionOnly, setSaveToSessionOnly] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Trạng thái kiểm tra kết nối thật
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      const config = initialConfig || loadStoredApiConfig();
      setProvider(config.provider);
      setGeminiKey(config.geminiKey);
      setAgentPlatformKey(config.agentPlatformKey);
      setSelectedModel(config.selectedModel || 'gemini-3.8-flash');
      setSavedSuccess(false);
      setErrorMessage(null);
      setTestResult(null);

      try {
        const storageType = sessionStorage.getItem('google_ai_storage_type');
        setSaveToSessionOnly(storageType === 'session');
      } catch {
        // ignore
      }
    }
  }, [isOpen, initialConfig]);

  if (!isOpen) return null;

  const currentKey = provider === 'agent-platform' ? agentPlatformKey : geminiKey;
  const isCurrentKeyValid = isValidGoogleAiApiKey(currentKey);

  const handleProviderChange = (newProvider: AiProvider) => {
    setProvider(newProvider);
    setErrorMessage(null);
    setTestResult(null);
    if (newProvider === 'agent-platform') {
      if (!AGENT_PLATFORM_MODELS.some((m) => m.id === selectedModel)) {
        setSelectedModel('gemini-2.5-flash');
      }
    } else {
      if (!GEMINI_MODELS.some((m) => m.id === selectedModel)) {
        setSelectedModel('gemini-3.8-flash');
      }
    }
  };

  const handleTestConnection = async () => {
    if (!currentKey.trim()) {
      setErrorMessage('Vui lòng nhập API Key trước khi kiểm tra kết nối.');
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setErrorMessage(null);

    const result = await testGoogleAiConnection(currentKey, provider);
    setIsTesting(false);
    setTestResult(result);
  };

  const handleSave = () => {
    setErrorMessage(null);

    if (!currentKey.trim()) {
      setErrorMessage('Vui lòng nhập API Key để tiếp tục sử dụng ứng dụng.');
      return;
    }

    if (!isCurrentKeyValid) {
      setErrorMessage('Độ dài API Key chưa hợp lệ (tối thiểu 8 ký tự, không chứa khoảng trắng).');
      return;
    }

    const newConfig: ApiConfig = {
      provider,
      geminiKey: geminiKey.trim(),
      agentPlatformKey: agentPlatformKey.trim(),
      selectedModel,
    };

    saveStoredApiConfig(newConfig, saveToSessionOnly);
    setSavedSuccess(true);
    onConfigSaved(newConfig);

    setTimeout(() => {
      onClose();
    }, 800);
  };

  const handleClearKey = () => {
    clearStoredApiKey();
    setGeminiKey('');
    setAgentPlatformKey('');
    setTestResult(null);
    setErrorMessage('Đã xóa API Key khỏi bộ nhớ trình duyệt.');
  };

  const modelsList = provider === 'agent-platform' ? AGENT_PLATFORM_MODELS : GEMINI_MODELS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="bg-[#204f43] text-white p-6 flex items-start justify-between border-b border-[#386758]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#238773] flex items-center justify-center text-white shadow-inner">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Cài Đặt API Key & Model AI
              </h3>
              <p className="text-xs text-slate-300">
                Cấu hình API Key Google để phân tích đề và tự động sinh 3 cấp độ đề thi biến thể
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Provider Selection Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              1. Chọn Dịch vụ AI (AI Provider):
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleProviderChange('gemini')}
                className={`p-3.5 rounded-2xl border text-left transition flex flex-col gap-1 cursor-pointer ${
                  provider === 'gemini'
                    ? 'border-[#238773] bg-[#eefaf5] ring-2 ring-[#238773]/20 shadow-xs'
                    : 'border-slate-200 bg-[#fffbf7] hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#238773]" />
                    Gemini API
                  </span>
                  {provider === 'gemini' && (
                    <CheckCircle2 className="w-4 h-4 text-[#238773]" />
                  )}
                </div>
                <span className="text-[11px] text-slate-500">
                  Google AI Studio (Khuyên dùng, miễn phí / trả phí)
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleProviderChange('agent-platform')}
                className={`p-3.5 rounded-2xl border text-left transition flex flex-col gap-1 cursor-pointer ${
                  provider === 'agent-platform'
                    ? 'border-[#238773] bg-[#eefaf5] ring-2 ring-[#238773]/20 shadow-xs'
                    : 'border-slate-200 bg-[#fffbf7] hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-[#7C3AED]" />
                    Agent Platform API
                  </span>
                  {provider === 'agent-platform' && (
                    <CheckCircle2 className="w-4 h-4 text-[#7C3AED]" />
                  )}
                </div>
                <span className="text-[11px] text-slate-500">
                  Google Cloud Agent Platform (Enterprise Express mode)
                </span>
              </button>
            </div>
          </div>

          {/* API Key Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="apiKeyInput" className="text-xs font-bold text-slate-700">
                2. Nhập API Key cho {provider === 'gemini' ? 'Gemini API' : 'Agent Platform'}:
              </label>
              <a
                href={
                  provider === 'gemini'
                    ? 'https://aistudio.google.com/api-keys'
                    : 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/start/api-keys'
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-[#238773] hover:underline flex items-center gap-1"
              >
                <span>Lấy API Key miễn phí tại đây</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="relative flex items-center">
              <input
                id="apiKeyInput"
                type={showKey ? 'text' : 'password'}
                value={currentKey}
                onChange={(e) => {
                  if (provider === 'agent-platform') {
                    setAgentPlatformKey(e.target.value);
                  } else {
                    setGeminiKey(e.target.value);
                  }
                  setErrorMessage(null);
                  setTestResult(null);
                }}
                placeholder={
                  provider === 'gemini'
                    ? 'Nhập Google AI Key (AIzaSy...)'
                    : 'Nhập Agent Platform API Key...'
                }
                className={`w-full px-4 py-3 pr-20 rounded-xl border text-xs sm:text-sm font-mono text-slate-800 focus:outline-hidden transition ${
                  currentKey && !isCurrentKeyValid
                    ? 'border-amber-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-200'
                    : isCurrentKeyValid
                    ? 'border-[#10B981] focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20'
                    : 'border-slate-300 focus:border-[#238773] focus:ring-2 focus:ring-[#238773]/20'
                }`}
              />

              <div className="absolute right-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                  title={showKey ? 'Ẩn khóa' : 'Hiện khóa'}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Test Connection Button & Result */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !currentKey}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-[#238773]' : ''}`} />
                <span>{isTesting ? 'Đang kiểm tra kết nối...' : 'Kiểm tra kết nối'}</span>
              </button>

              {currentKey && (
                <button
                  type="button"
                  onClick={handleClearKey}
                  className="text-xs text-rose-600 hover:underline cursor-pointer"
                >
                  Xóa Key khỏi máy
                </button>
              )}
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold">{testResult.message}</p>
                  {testResult.success && (
                    <p className="text-[11px] text-emerald-600 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Độ trễ mạng: {testResult.latencyMs}ms
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              3. Chọn Mô hình AI ưu tiên:
            </label>
            <div className="space-y-2">
              {modelsList.map((m) => (
                <label
                  key={m.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                    selectedModel === m.id
                      ? 'border-[#238773] bg-[#eefaf5] ring-1 ring-[#238773]'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="modelSelection"
                    value={m.id}
                    checked={selectedModel === m.id}
                    onChange={() => setSelectedModel(m.id)}
                    className="mt-1 text-[#238773] focus:ring-[#238773]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{m.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                        {m.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{m.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Session-only Storage Toggle */}
          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={saveToSessionOnly}
                onChange={(e) => setSaveToSessionOnly(e.target.checked)}
                className="mt-0.5 text-[#238773] rounded focus:ring-[#238773]"
              />
              <div>
                <span className="text-xs font-semibold text-slate-800">
                  Chỉ lưu trong phiên làm việc hiện tại (Tự xóa khi đóng trình duyệt)
                </span>
                <p className="text-[11px] text-slate-500">
                  Khuyên dùng khi bạn thao tác trên máy tính phòng tin học trường học hoặc thiết bị dùng chung.
                </p>
              </div>
            </label>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {savedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Đã lưu cấu hình API Key thành công! Đang tải lại...</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Key được lưu cục bộ trên thiết bị của bạn, không gửi qua máy chủ trung gian.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold text-white bg-[#238773] hover:bg-[#1b6b5b] rounded-xl transition shadow-sm cursor-pointer"
            >
              Lưu Cấu Hình
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
