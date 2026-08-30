/**
 * Core type definitions for AI BIẾN THỂ ĐỀ THI 3 CẤP ĐỘ
 */

export type ExamWorkflowState =
  | 'EMPTY'
  | 'ANALYZING'
  | 'ANALYZED'
  | 'GENERATING_EXAM_1'
  | 'EXAM_1_COMPLETE'
  | 'GENERATING_EXAM_2'
  | 'EXAM_2_COMPLETE'
  | 'GENERATING_EXAM_3'
  | 'COMPLETE';

export type QuestionType =
  | 'multiple_choice'
  | 'essay'
  | 'true_false'
  | 'fill_in_blank'
  | 'short_answer'
  | 'matching';

export type DifficultyLevel =
  | 'Nhận biết'
  | 'Thông hiểu'
  | 'Vận dụng'
  | 'Vận dụng cao';

export interface QuestionOption {
  label: string; // 'A', 'B', 'C', 'D', ...
  text: string;
}

export interface OriginalQuestion {
  id: string;
  number: number;
  sectionId?: string;
  questionText: string;
  type: QuestionType;
  options?: QuestionOption[];
  correctAnswer: string;
  explanation?: string;
  points?: number;
  difficulty: DifficultyLevel;
  topic?: string;
  skills?: string[];
  formulas?: string[];
}

export interface ExamMetadata {
  title: string;
  subject: string;
  grade: string;
  durationMinutes: number;
  totalPoints: number;
  totalQuestions: number;
  schoolOrOrg?: string;
  semesterOrExamType?: string;
  instructions?: string;
}

export interface ExamSection {
  id: string;
  title: string;
  description?: string;
  questionIds: string[];
}

export interface ExamAnalysis {
  examMetadata: ExamMetadata;
  subjects: string[];
  grade: string;
  topics: string[];
  sections: ExamSection[];
  questions: OriginalQuestion[];
  questionTypes: string[];
  difficultyLevels: {
    recognitionCount: number;      // Nhận biết
    comprehensionCount: number;    // Thông hiểu
    applicationCount: number;      // Vận dụng
    advancedApplicationCount: number; // Vận dụng cao
  };
  learningObjectives: string[];
  knowledgeUnits: string[];
  skills: string[];
  formulas: string[];
  laws: string[];
  theorems: string[];
  principles: string[];
  constraints: string[];
  answerInformation: string;
  warnings: string[];
  scoringStructure: {
    pointsPerQuestionType: Record<string, number>;
    total: number;
  };
}

export type ValidationStatus = 'PASS' | 'FAIL' | 'WARNING';

export interface QuestionValidation {
  questionId: string;
  questionNumber: number;
  status: ValidationStatus;
  knowledgeCheck: string;
  formulaCheck: string;
  lawOrRuleCheck: string;
  conditionCheck: string;
  solutionCheck: string;
  answerCheck: string;
  difficultyCheck: string;
  gradeLevelCheck: string;
  message: string;
}

export interface VariantQuestion {
  id: string;
  number: number;
  originalQuestionId: string;
  sectionId?: string;
  questionText: string;
  type: QuestionType;
  options?: QuestionOption[];
  correctAnswer: string;
  explanation: string;
  points?: number;
  difficulty: DifficultyLevel;
  topic?: string;
  changesFromOriginal: string;
  solveSteps?: string[];
}

export interface GeneratedExam {
  level: 1 | 2 | 3;
  levelName: string;
  levelDescription: string;
  title: string;
  metadata: ExamMetadata;
  sections: ExamSection[];
  questions: VariantQuestion[];
  validationReport: QuestionValidation[];
  overallValidationStatus: ValidationStatus;
  validationSummary: string;
  repairedQuestionCount?: number;
  createdAt: string;
}

export type AiProvider = 'gemini' | 'agent-platform';

export interface ApiConfig {
  provider: AiProvider;
  geminiKey: string;
  agentPlatformKey: string;
  selectedModel: string;
}

export interface SingleQuestionEditPayload {
  question: VariantQuestion;
  originalQuestion?: OriginalQuestion;
  level: 1 | 2 | 3;
  teacherNote?: string;
}

export interface InputSource {
  type: 'text' | 'file' | 'image';
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  rawText?: string;
  imageBase64?: string;
  pdfBase64?: string;
}

export interface GenerationStepProgress {
  stage: 'idle' | 'generating' | 'solving' | 'validating' | 'repairing' | 'complete' | 'error';
  message: string;
  currentQuestion?: number;
  totalQuestions?: number;
}


