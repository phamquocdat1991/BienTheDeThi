import React from 'react';
import {
  FileText,
  Cpu,
  Layers,
  GitCompare,
  Sparkles,
  CheckCircle2,
  Lock,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { ExamWorkflowState } from '../types';

interface StepperProps {
  workflowState: ExamWorkflowState;
  activeTab?: number;
  onSelectStep?: (stepIndex: number) => void;
  hasError?: boolean;
}

type StepStatus = 'pending' | 'processing' | 'completed' | 'locked' | 'error';

interface StepItem {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const Stepper: React.FC<StepperProps> = ({
  workflowState,
  activeTab = 1,
  onSelectStep,
  hasError = false,
}) => {
  const steps: StepItem[] = [
    {
      id: 1,
      title: '1. Đề gốc',
      subtitle: 'Nạp & trích xuất',
      icon: FileText,
    },
    {
      id: 2,
      title: '2. Phân tích',
      subtitle: 'Ma trận & bóc tách',
      icon: Cpu,
    },
    {
      id: 3,
      title: '3. Đề 1',
      subtitle: 'Đổi số & ngữ cảnh',
      icon: Layers,
    },
    {
      id: 4,
      title: '4. Đề 2',
      subtitle: 'Dạng tương đương',
      icon: GitCompare,
    },
    {
      id: 5,
      title: '5. Đề 3',
      subtitle: 'Phân hóa & vận dụng',
      icon: Sparkles,
    },
    {
      id: 6,
      title: '6. Hoàn tất',
      subtitle: 'Tổng hợp 3 bộ đề',
      icon: CheckCircle2,
    },
  ];

  // Precise status resolver based on the sequential workflow & AI_INSTRUCTIONS.md
  const getStepStatus = (stepId: number): StepStatus => {
    let baseStatus: StepStatus = 'locked';

    switch (stepId) {
      case 1: // Đề gốc
        baseStatus = workflowState === 'EMPTY' ? 'pending' : 'completed';
        break;

      case 2: // Phân tích
        if (workflowState === 'EMPTY') baseStatus = 'pending';
        else if (workflowState === 'ANALYZING') baseStatus = 'processing';
        else baseStatus = 'completed';
        break;

      case 3: // Đề 1
        if (workflowState === 'EMPTY' || workflowState === 'ANALYZING') baseStatus = 'locked';
        else if (workflowState === 'ANALYZED') baseStatus = 'pending';
        else if (workflowState === 'GENERATING_EXAM_1') baseStatus = 'processing';
        else baseStatus = 'completed';
        break;

      case 4: // Đề 2
        if (
          workflowState === 'EMPTY' ||
          workflowState === 'ANALYZING' ||
          workflowState === 'ANALYZED' ||
          workflowState === 'GENERATING_EXAM_1'
        ) {
          baseStatus = 'locked';
        } else if (workflowState === 'EXAM_1_COMPLETE') {
          baseStatus = 'pending';
        } else if (workflowState === 'GENERATING_EXAM_2') {
          baseStatus = 'processing';
        } else {
          baseStatus = 'completed';
        }
        break;

      case 5: // Đề 3
        if (
          workflowState === 'EMPTY' ||
          workflowState === 'ANALYZING' ||
          workflowState === 'ANALYZED' ||
          workflowState === 'GENERATING_EXAM_1' ||
          workflowState === 'EXAM_1_COMPLETE' ||
          workflowState === 'GENERATING_EXAM_2'
        ) {
          baseStatus = 'locked';
        } else if (workflowState === 'EXAM_2_COMPLETE') {
          baseStatus = 'pending';
        } else if (workflowState === 'GENERATING_EXAM_3') {
          baseStatus = 'processing';
        } else {
          baseStatus = 'completed';
        }
        break;

      case 6: // Hoàn tất
        if (workflowState === 'COMPLETE') baseStatus = 'completed';
        else if (workflowState === 'GENERATING_EXAM_3') baseStatus = 'processing';
        else baseStatus = 'locked';
        break;

      default:
        baseStatus = 'locked';
    }

    // Tuân thủ mục 3 của AI_INSTRUCTIONS.md:
    // Khi có lỗi, bước đang chạy/chờ phải chuyển thành 'error' ("Đã dừng do lỗi"),
    // tuyệt đối không hiển thị 'completed' hoặc checkmark xanh nếu quy trình bị gián đoạn.
    if (hasError) {
      if (activeTab === stepId || baseStatus === 'processing') {
        return 'error';
      }
      if (baseStatus === 'pending' && stepId >= activeTab) {
        return 'error';
      }
    }

    return baseStatus;
  };

  return (
    <nav
      aria-label="Tiến trình biên soạn đề thi"
      className="w-full bg-white border-b border-slate-200 shadow-xs py-3 px-4 sm:px-6 lg:px-8 relative z-20"
    >
      <div className="max-w-7xl mx-auto">
        <ol className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
          {steps.map((step) => {
            const status = getStepStatus(step.id);
            const isCurrentView = activeTab === step.id;
            const isClickable =
              (status === 'completed' || status === 'processing' || isCurrentView) && onSelectStep;
            const Icon = step.icon;

            return (
              <li
                key={step.id}
                role="button"
                tabIndex={isClickable ? 0 : -1}
                aria-disabled={!isClickable}
                aria-current={isCurrentView ? 'step' : undefined}
                onKeyDown={(e) => { if (isClickable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelectStep?.(step.id); } }}
                onClick={() => {
                  if (isClickable) {
                    onSelectStep(step.id);
                  }
                }}
                className={`relative flex items-center gap-2.5 p-2.5 rounded-xl border transition-all select-none ${
                  isClickable ? 'cursor-pointer' : 'cursor-not-allowed'
                } ${
                  status === 'error'
                    ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-300 shadow-xs'
                    : isCurrentView
                    ? 'bg-[#eefaf5] border-[#238773] ring-2 ring-[#238773]/20 shadow-xs'
                    : status === 'completed'
                    ? 'bg-[#fffbf7] border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    : status === 'processing'
                    ? 'bg-[#F0FDF4] border-[#10B981] animate-pulse'
                    : status === 'pending'
                    ? 'bg-white border-slate-200 hover:border-slate-300'
                    : 'bg-slate-50/70 border-slate-200/70 opacity-60'
                }`}
              >
                {/* Step Icon / Status Indicator */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-medium text-xs transition ${
                    status === 'error'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : status === 'completed'
                      ? 'bg-[#10B981] text-white shadow-xs'
                      : status === 'processing'
                      ? 'bg-[#238773] text-white shadow-xs'
                      : isCurrentView
                      ? 'bg-[#238773] text-white'
                      : status === 'locked'
                      ? 'bg-slate-200 text-slate-400'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {status === 'error' ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : status === 'processing' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : status === 'locked' ? (
                    <Lock className="w-3.5 h-3.5" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>

                {/* Text Labels */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p
                      className={`text-xs font-bold truncate ${
                        status === 'error'
                          ? 'text-rose-700'
                          : isCurrentView
                          ? 'text-[#176653]'
                          : status === 'completed'
                          ? 'text-[#386758]'
                          : status === 'processing'
                          ? 'text-[#238773]'
                          : status === 'locked'
                          ? 'text-slate-400'
                          : 'text-slate-700'
                      }`}
                    >
                      {step.title}
                    </p>

                    {/* Compact Status Pill */}
                    <span
                      className={`text-[9px] font-semibold px-1.5 py-0.2 rounded shrink-0 ${
                        status === 'error'
                          ? 'bg-rose-100 text-rose-800 font-bold'
                          : status === 'completed'
                          ? 'bg-[#DCFCE7] text-[#15803D]'
                          : status === 'processing'
                          ? 'bg-[#def3e9] text-[#176653]'
                          : status === 'locked'
                          ? 'bg-slate-100 text-slate-400'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {status === 'error'
                        ? 'Đã dừng do lỗi'
                        : status === 'completed'
                        ? 'Xong'
                        : status === 'processing'
                        ? 'Đang chạy'
                        : status === 'locked'
                        ? 'Khóa'
                        : 'Chờ'}
                    </span>
                  </div>

                  <p
                    className={`text-[11px] truncate leading-tight mt-0.5 ${
                      status === 'error'
                        ? 'text-rose-600 font-medium'
                        : isCurrentView
                        ? 'text-[#238773] font-medium'
                        : status === 'completed'
                        ? 'text-slate-500'
                        : 'text-slate-400'
                    }`}
                  >
                    {status === 'error' ? 'Vui lòng kiểm tra lại' : step.subtitle}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
};
