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
  Layers,
  HelpCircle,
} from 'lucide-react';
import { AiProvider, ApiConfig } from '../types';
import {
  GEMINI_MODELS,
  AGENT_PLATFORM_MODELS,
  isValidGoogleAiApiKey,
  loadStoredApiConfig,
  saveStoredApiConfig,
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
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.7-flash');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const config = initialConfig || loadStoredApiConfig();
      setProvider(config.provider);
      setGeminiKey(config.geminiKey);
      setAgentPlatformKey(config.agentPlatformKey);
      setSelectedModel(config.selectedModel);
      setSavedSuccess(false);
      setErrorMessage(null);
    }
  }, [isOpen, initialConfig]);

  if (!isOpen) return null;

  const currentKey = provider === 'agent-platform' ? agentPlatformKey : geminiKey;
  const isCurrentKeyValid = isValidGoogleAiApiKey(currentKey);

  const handleProviderChange = (newProvider: AiProvider) => {
    setProvider(newProvider);
    setErrorMessage(null);
    // Chọn model mặc định phù hợp với provider
    if (newProvider === 'agent-platform') {
      if (!AGENT_PLATFORM_MODELS.some((m) => m.id === selectedModel)) {
        setSelectedModel('gemini-2.5-flash');
      }
    } else {
      if (!GEMINI_MODELS.some((m) => m.id === selectedModel)) {
        setSelectedModel('gemini-3.7-flash');
      }
    }
  };

  const handleSave = () => {
    setErrorMessage(null);

    if (!currentKey.trim()) {
      setErrorMessage('Vui lòng nhập API Key để tiếp tục sử dụng ứng dụng.');
      return;
    }

    if (!isCurrentKeyValid) {
      setErrorMessage(
        'Định dạng API Key không hợp lệ. Khóa API Google hợp lệ thường bắt đầu bằng AIzaSy... hoặc AQ... (tối thiểu 10 ký tự).'
      );
      return;
    }

    const newConfig: ApiConfig = {
      provider,
      geminiKey: geminiKey.trim(),
      agentPlatformKey: agentPlatformKey.trim(),
      selectedModel,
    };

    saveStoredApiConfig(newConfig);
    setSavedSuccess(true);
    onConfigSaved(newConfig);

    setTimeout(() => {
      onClose();
    }, 800);
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
                Nhập API Key Google của bạn để phân tích đề và tự động sinh 3 cấp độ biến thể
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
                }}
                placeholder={
                  provider === 'gemini'
                    ? 'Nhập key bắt đầu bằng AIzaSy... hoặc AQ...'
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

            {/* Key format hint & validation status */}
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">
                Hỗ trợ cả 2 định dạng khóa: <code className="font-mono text-slate-700">AIzaSy...</code> và <code className="font-mono text-slate-700">AQ...</code>
              </span>
              {currentKey && (
                <span>
                  {isCurrentKeyValid ? (
                    <span className="text-[#15803D] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                      Định dạng hợp lệ
                    </span>
                  ) : (
                    <span className="text-amber-600 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                      Chưa đúng định dạng
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              3. Chọn Mô hình AI Ưu tiên:
            </label>
            <div className="space-y-2">
              {modelsList.map((m) => {
                const isSelected = selectedModel === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedModel(m.id)}
                    className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'border-[#238773] bg-[#eefaf5] ring-2 ring-[#238773]/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{m.name}</span>
                        {m.recommended && (
                          <span className="px-2 py-0.2 rounded-md bg-[#DCFCE7] text-[#15803D] text-[10px] font-bold border border-[#86EFAC]">
                            Khuyên dùng
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">{m.description}</p>
                    </div>

                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? 'border-[#238773] bg-[#238773]'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Privacy & Storage Guarantee */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Bảo mật tuyệt đối:</strong> API Key được lưu an toàn duy nhất trên trình duyệt của bạn (<code className="bg-slate-200 px-1 py-0.5 rounded">localStorage</code>) và chỉ được gửi trực tiếp tới máy chủ Google API để tạo nội dung.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Saved Success Badge */}
          {savedSuccess && (
            <div className="p-3 rounded-xl bg-[#DCFCE7] border border-[#86EFAC] text-[#15803D] text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#10B981]" />
              <span>Đã lưu cấu hình API thành công! Đang đóng cửa sổ...</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-6 bg-[#fffbf7] border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#238773] hover:bg-[#176653] text-white text-xs font-bold shadow-md shadow-[#238773]/20 transition cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Lưu Cấu Hình</span>
          </button>
        </div>
      </div>
    </div>
  );
};
