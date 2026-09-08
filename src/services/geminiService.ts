import {
  AiProvider,
  ApiConfig,
  ExamAnalysis,
  GeneratedExam,
  InputSource,
  OriginalQuestion,
  QuestionValidation,
  SingleQuestionEditPayload,
  VariantQuestion,
} from '../types';
import {
  createGoogleAiClient,
  loadStoredApiConfig,
  GEMINI_FALLBACK_MODELS,
  AGENT_PLATFORM_FALLBACK_MODELS,
} from './aiClientFactory';
import { normalizeAnalysis, validateQuestions, completeValidation, overallStatus } from '../utils/examIntegrity';
import { cleanAndParseJSON } from './fileExtractService';

// ============================================================================
// HÀM PHÂN TÍCH LỖI API CHUẨN (Tuân thủ api.md & gemini-model skill)
// ============================================================================
export type ApiErrorCategory =
  | 'MODEL_OVERLOADED'
  | 'QUOTA_EXCEEDED'
  | 'INVALID_API_KEY'
  | 'PERMISSION_DENIED'
  | 'INVALID_ARGUMENT'
  | 'UNKNOWN';

export const parseApiError = (error: any): ApiErrorCategory => {
  const message = error?.message || error?.toString() || '';
  const serialized = JSON.stringify(error) || '';
  const text = (message + ' ' + serialized).toLowerCase();

  if (
    text.includes('429') ||
    text.includes('resource_exhausted') ||
    text.includes('quota') ||
    text.includes('rate limit')
  ) {
    return 'QUOTA_EXCEEDED';
  }

  if (
    text.includes('503') ||
    text.includes('500') ||
    text.includes('504') ||
    text.includes('unavailable') ||
    text.includes('high demand') ||
    text.includes('overloaded') ||
    text.includes('temporarily unavailable') ||
    text.includes('not_found') ||
    text.includes('404')
  ) {
    return 'MODEL_OVERLOADED';
  }

  if (
    text.includes('api_key_invalid') ||
    text.includes('401') ||
    text.includes('invalid api key') ||
    text.includes('unauthenticated')
  ) {
    return 'INVALID_API_KEY';
  }

  if (text.includes('403') || text.includes('permission_denied')) {
    return 'PERMISSION_DENIED';
  }

  if (text.includes('400') || text.includes('invalid_argument')) {
    return 'INVALID_ARGUMENT';
  }

  return 'UNKNOWN';
};

export const getFriendlyErrorMessage = (error: any, provider: AiProvider): string => {
  const type = parseApiError(error);
  const rawMsg = error?.message || '';

  switch (type) {
    case 'INVALID_API_KEY':
      return '401 INVALID_API_KEY: API Key không hợp lệ hoặc đã hết hạn. Vui lòng bấm nút "Lấy API key để sử dụng app" hoặc "Cài đặt API" trên thanh điều hướng để nhập lại key.';
    case 'PERMISSION_DENIED':
      if (provider === 'agent-platform') {
        return `403 PERMISSION_DENIED: API Key chưa được cấp quyền gọi Agent Platform API hoặc model này. ${rawMsg}`;
      }
      return `403 PERMISSION_DENIED: API Key không có quyền truy cập dịch vụ Gemini API này. ${rawMsg}`;
    case 'QUOTA_EXCEEDED':
      return `429 RESOURCE_EXHAUSTED: Đã vượt hạn mức yêu cầu đối với toàn bộ các model AI trong chuỗi dự phòng. Chi tiết: ${rawMsg || 'Quota exceeded'}. Vui lòng thử lại sau giây lát hoặc đổi sang API Key khác.`;
    case 'MODEL_OVERLOADED':
      return `503 UNAVAILABLE / MODEL_OVERLOADED: Toàn bộ hệ thống các model dự phòng của Google AI đang quá tải. Chi tiết: ${rawMsg || 'High demand'}. Vui lòng thử lại sau ít phút.`;
    case 'INVALID_ARGUMENT':
      return `400 INVALID_ARGUMENT: ${rawMsg}`;
    default:
      return rawMsg || 'Đã xảy ra sự cố không xác định khi kết nối với AI.';
  }
};

// ============================================================================
// HÀM FALLBACK TỔNG QUÁT DUY NHẤT (Tuân thủ api.md Mục II & III)
// ============================================================================
export const getOrderedFallbackModels = (
  selectedModel: string,
  provider: AiProvider
): string[] => {
  const baseList = provider === 'agent-platform'
    ? AGENT_PLATFORM_FALLBACK_MODELS
    : GEMINI_FALLBACK_MODELS;

  if (!selectedModel) return [...baseList];

  // Đưa model người dùng chọn lên đầu, loại bỏ trùng lặp
  const filtered = baseList.filter((m) => m !== selectedModel);
  return [selectedModel, ...filtered];
};

interface FallbackCallOptions {
  systemInstruction?: string;
  contents: any;
  configOverride?: any;
  onModelFallback?: (fromModel: string, toModel: string, reason: string) => void;
}

export async function generateWithModelFallback(
  options: FallbackCallOptions,
  customConfig?: ApiConfig
): Promise<string> {
  const apiConfig = customConfig || loadStoredApiConfig();
  const apiKey = apiConfig.provider === 'agent-platform'
    ? apiConfig.agentPlatformKey
    : apiConfig.geminiKey;

  if (!apiKey || !apiKey.trim()) {
    throw new Error('Vui lòng cài đặt API Key trước khi sử dụng ứng dụng.');
  }

  const client = await createGoogleAiClient(apiKey, apiConfig.provider);
  const models = getOrderedFallbackModels(apiConfig.selectedModel, apiConfig.provider);

  let lastError: any = null;

  for (let i = 0; i < models.length; i++) {
    const currentModel = models[i];
    try {
      // Chuẩn bị payload config tuân thủ api.md (không gửi sampling params cho Gemini 3.6/3.5)
      // Chuẩn bị payload config tuân thủ api.md v4.2:
      // Tuyệt đối không gửi temperature, topP, topK cho Gemini 3.x
      const isGemini3 = currentModel.startsWith('gemini-3');
      const genConfig: any = {
        responseMimeType: 'application/json',
        maxOutputTokens: 32768,
        ...(options.systemInstruction ? { systemInstruction: options.systemInstruction } : {}),
        ...(options.configOverride || {}),
      };

      // Cấu hình Dynamic Thinking Budget chuẩn cho Gemini 3.7 / 3.x (api.md Mục IV)
      if (isGemini3) {
        genConfig.thinkingConfig = { thinkingBudget: 4096 };
        delete genConfig.temperature;
        delete genConfig.topP;
        delete genConfig.topK;
      }

      // Tích hợp Latency Timeout per attempt (gemini-resilience-gateway standard)
      const attemptTimeout = currentModel.includes('lite') ? 6000 : currentModel.includes('3.8') ? 12000 : 9000;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(new Error(`Timeout sau ${attemptTimeout}ms`)), attemptTimeout);
      genConfig.abortSignal = controller.signal;

      let response: any;
      try {
        response = await client.models.generateContent({
          model: currentModel,
          contents: options.contents,
          config: genConfig,
        });
      } finally {
        clearTimeout(timer);
      }

      if (response.text) {
        return response.text;
      }
      throw new Error('Mô hình trả về nội dung rỗng.');
    } catch (err: any) {
      lastError = err;
      const errType = parseApiError(err);

      // Nếu là lỗi Auth/Key hoặc Invalid Argument -> Dừng ngay báo lỗi
      if (errType === 'INVALID_API_KEY' || errType === 'INVALID_ARGUMENT') {
        throw new Error(getFriendlyErrorMessage(err, apiConfig.provider));
      }

      // Theo AI_INSTRUCTIONS.md Mục 1:
      // Tự động chuyển đổi nếu model hiện tại gặp lỗi/quá tải (503 UNAVAILABLE / 429 RESOURCE_EXHAUSTED / UNKNOWN)
      if (
        i < models.length - 1 &&
        (errType === 'MODEL_OVERLOADED' || errType === 'QUOTA_EXCEEDED' || errType === 'UNKNOWN')
      ) {
        const nextModel = models[i + 1];
        const reasonText =
          errType === 'QUOTA_EXCEEDED'
            ? '429 RESOURCE_EXHAUSTED (Hết quota model hiện tại)'
            : '503 UNAVAILABLE (Model hiện tại quá tải)';
        console.warn(`[Fallback] Model ${currentModel} gặp lỗi (${errType}), tự động chuyển sang ${nextModel}...`);
        if (options.onModelFallback) {
          options.onModelFallback(currentModel, nextModel, reasonText);
        }
        continue;
      }

      // Nếu tất cả các model đều thất bại -> Hiện thông báo lỗi màu đỏ kèm nguyên văn lỗi API per AI_INSTRUCTIONS.md
      throw new Error(getFriendlyErrorMessage(err, apiConfig.provider));
    }
  }

  throw lastError || new Error('Tất cả các model AI đều không phản hồi. Vui lòng thử lại.');
}

// ============================================================================
// 1. BƯỚC 1: PHÂN TÍCH & BÓC TÁCH MA TRẬN ĐỀ GỐC
// ============================================================================
export async function analyzeOriginalExam(
  source: InputSource,
  apiConfig?: ApiConfig,
  onFallback?: (from: string, to: string, reason: string) => void
): Promise<ExamAnalysis> {
  const systemInstruction = `Bạn là Chuyên gia Khảo thí và Đo lường Giáo dục hàng đầu tại Việt Nam (theo chương trình GDPT 2018 Bộ GD&ĐT).
Nhiệm vụ của bạn là tiếp nhận đề kiểm tra/đề thi gốc và thực hiện phân tích cấu trúc sâu sắc, bóc tách chính xác toàn bộ thành phần đề thi thành định dạng JSON chuẩn.

QUY TẮC PHÂN TÍCH QUAN TRỌNG:
1. Nhận diện chính xác: Tên bài thi (title), Môn học (subject), Khối lớp (grade: "Lớp 10", "Lớp 11", "Lớp 12"...), Thời gian làm bài (durationMinutes), Tổng điểm (totalPoints), Tổng số câu (totalQuestions).
2. Bóc tách từng câu hỏi (questions):
   - id: chuỗi duy nhất dạng "q1", "q2",...
   - number: số thứ tự (1, 2, 3...)
   - sectionId: phân loại phần (ví dụ: "sec_tracnghiem" cho Trắc nghiệm, "sec_tuluan" cho Tự luận)
   - questionText: nội dung câu hỏi đầy đủ, giữ chuẩn ký hiệu toán học / công thức LaTeX ($...$).
   - type: một trong ["multiple_choice", "essay", "true_false", "fill_in_blank", "short_answer", "matching"]
   - options: nếu là trắc nghiệm, tạo mảng các lựa chọn [{ "label": "A", "text": "..." }, { "label": "B", "text": "..." }, ...]
   - correctAnswer: đáp án đúng (VD: "A", hoặc kết quả số/lời giải vắn tắt)
   - explanation: lời giải chi tiết hoặc hướng dẫn chấm nếu có trong đề gốc (nếu không có, tự giải chi tiết)
   - points: điểm số mỗi câu (nếu không ghi, phân bổ đều theo tổng 10 điểm)
   - difficulty: một trong 4 mức độ chuẩn của Bộ GD&ĐT: ["Nhận biết", "Thông hiểu", "Vận dụng", "Vận dụng cao"]
   - topic: chủ đề kiến thức của câu
   - skills: mảng các kỹ năng cần có
   - formulas: mảng công thức/định lý/định luật liên quan
3. CÔNG THỨC TOÁN HỌC & KHOA HỌC: Bọc trong dấu $...$ (inline) hoặc $$...$$ (display), ví dụ: $\\frac{a}{b}$, $\\sqrt{x}$, $\\int_0^1 f(x)dx$.
4. Tổng hợp toàn diện:
   - examMetadata: { title, subject, grade, durationMinutes, totalPoints, totalQuestions }
   - difficultyLevels: { recognitionCount, comprehensionCount, applicationCount, advancedApplicationCount }
   - learningObjectives, knowledgeUnits, skills, formulas, laws, theorems, principles, constraints, warnings, scoringStructure.

Trả về DUY NHẤT một chuỗi JSON hợp lệ tuân thủ cấu trúc trên.`;

  let promptText = `Hãy phân tích chi tiết đề kiểm tra sau và trả về JSON cấu trúc:`;
  const contentsPayload: any[] = [];

  if (source.type === 'text') {
    promptText += `\n--- NỘI DUNG ĐỀ GỐC ---\n${source.rawText}`;
    contentsPayload.push({ text: promptText });
  } else if (source.type === 'image' && source.imageBase64) {
    contentsPayload.push({
      inlineData: {
        mimeType: source.mimeType || 'image/jpeg',
        data: source.imageBase64,
      },
    });
    contentsPayload.push({ text: promptText + `\n(Xem nội dung trong hình ảnh đề thi đính kèm)` });
  } else if (source.type === 'file' && source.pdfBase64) {
    contentsPayload.push({
      inlineData: {
        mimeType: 'application/pdf',
        data: source.pdfBase64,
      },
    });
    contentsPayload.push({ text: promptText + `\n(Xem nội dung trong file PDF đính kèm)` });
  } else {
    promptText += `\n--- NỘI DUNG ĐỀ GỐC ---\n${source.rawText || ''}`;
    contentsPayload.push({ text: promptText });
  }

  const rawJson = await generateWithModelFallback(
    {
      systemInstruction,
      contents: contentsPayload.length === 1 ? contentsPayload[0].text : { parts: contentsPayload },
      onModelFallback: onFallback,
    },
    apiConfig
  );

  const parsed = cleanAndParseJSON<ExamAnalysis>(rawJson);
  if (!parsed.questions || !Array.isArray(parsed.questions)) {
    throw new Error('Dữ liệu phân tích đề gốc không chứa danh sách câu hỏi hợp lệ.');
  }

  return normalizeAnalysis(parsed);
}

// ============================================================================
// 2. BƯỚC 2: SINH ĐỀ BIẾN THỂ (CẤP ĐỘ 1, 2, HOẶC 3) KÈM KIỂM ĐỊNH & TỰ SỬA
// ============================================================================
export async function generateExamVariant(
  level: 1 | 2 | 3,
  analysis: ExamAnalysis,
  previousVariants?: GeneratedExam[],
  apiConfig?: ApiConfig,
  onFallback?: (from: string, to: string, reason: string) => void
): Promise<GeneratedExam> {
  let levelTitle = '';
  let levelDescription = '';
  let levelInstruction = '';

  if (level === 1) {
    levelTitle = 'ĐỀ BIẾN THỂ 1: THAY ĐỔI DỮ KIỆN & SỐ LIỆU';
    levelDescription = 'Thay đổi số liệu, thông số, tên riêng và ngữ cảnh thực tế nhưng giữ nguyên mẫu bài, dạng câu hỏi và mục tiêu nhận thức.';
    levelInstruction = `YÊU CẦU CHO ĐỀ 1:
- Thay đổi số liệu / dữ kiện / tên riêng / ngữ cảnh nhưng GIỮ NGUYÊN dạng bài toán và mục tiêu học tập của từng câu.
- MỌI CÂU có dữ liệu thay đổi BẮT BUỘC mô hình phải tự giải lại từng bước (solveSteps), tính toán lại đáp án chính xác tuyệt đối.
- Kiểm tra nghiêm ngặt: điều kiện xác định, công thức áp dụng, định luật vật lý/hóa học/toán học, đơn vị đo lường, nghiệm (phải tròn số, hợp lý, không vô nghiệm trừ khi đề gốc yêu cầu), đáp án đúng và 3 phương án nhiễu (phải hợp lý và phản ánh lỗi sai phổ biến của học sinh).
- Ghi rõ "changesFromOriginal" cho từng câu mô tả chi tiết đã đổi số liệu/ngữ cảnh gì.`;
  } else if (level === 2) {
    levelTitle = 'ĐỀ BIẾN THỂ 2: DẠNG BÀI TƯƠNG ĐƯƠNG';
    levelDescription = 'Tạo dạng câu hỏi tương đương (isomorphic / paraphrased problems), giữ chuẩn kiến thức kỹ năng và độ khó tương đối, không chỉ đơn thuần thay số.';
    levelInstruction = `YÊU CẦU CHO ĐỀ 2:
- Tạo dạng bài / câu hỏi TƯƠNG ĐƯƠNG VỀ MẶT BẢN CHẤT KIẾN THỨC VÀ KỸ NĂNG (Isomorphic problems).
- Giữ: mục tiêu kiến thức, kỹ năng cần đo, mức nhận thức (Nhận biết/Thông hiểu/Vận dụng/Vận dụng cao), độ khó tương đối so với đề gốc.
- KHÔNG CHỈ ĐƠN THUẦN THAY SỐ. Hãy thay đổi cấu trúc hỏi, hướng tiếp cận (ví dụ: bài toán thuận đổi thành bài toán đảo, hỏi đại lượng liên đới, thay đổi mô hình hình học tương đương, ngữ cảnh hóa vấn đề).
- Tự giải lại chi tiết từng bước và tính toán đáp án chuẩn xác.
- Ghi rõ "changesFromOriginal" mô tả sự chuyển đổi dạng bài.`;
  } else {
    levelTitle = 'ĐỀ BIẾN THỂ 3: PHÂN HÓA & VẬN DỤNG SÂU';
    levelDescription = 'Tăng cường tính phân hóa học sinh, ưu tiên suy luận logic nhiều bước, vận dụng thực tế, giải thích hiện tượng và kết nối liên kiến thức.';
    levelInstruction = `YÊU CẦU CHO ĐỀ 3:
- Tăng khả năng PHÂN HÓA và chiều sâu tư duy của học sinh.
- Ưu tiên: suy luận logic nhiều bước, giải quyết tình huống thực tế, phát hiện và sửa lỗi sai trong giả định, giải thích bản chất hiện tượng, kết nối kiến thức liên bài học trong cùng chương trình.
- TUYỆT ĐỐI KHÔNG đưa kiến thức vượt khỏi cấp học / lớp học đã được xác định (${analysis.grade || 'chương trình chuẩn'}). Độ khó tăng về chiều sâu tư duy chứ không vượt quá khung chương trình.
- Tự giải lại chi tiết từng bước, cung cấp lời giải sư phạm mẫu mực.
- Ghi rõ "changesFromOriginal" giải thích điểm nâng cao phân hóa.`;
  }

  // --- GIAI ĐOẠN 1: SINH ĐỀ THI BIẾN THỂ ---
  const genSystemPrompt = `Bạn là Chuyên gia Biên soạn Đề thi và Sư phạm hàng đầu Việt Nam.
Nhiệm vụ của bạn là tạo một đề thi biến thể chuẩn mực dựa trên phân tích ma trận đề gốc.

${levelInstruction}

QUY TẮC CÔNG THỨC TOÁN HỌC: Bọc tất cả công thức trong $...$ (ví dụ: $\\frac{1}{2}$, $\\sqrt{3}$).

CẤU TRÚC JSON CẦN TRẢ VỀ:
{
  "level": ${level},
  "levelName": "${levelTitle}",
  "levelDescription": "${levelDescription}",
  "title": "${analysis.examMetadata?.title || 'Đề kiểm tra'} - Biến thể Cấp độ ${level}",
  "metadata": ${JSON.stringify(analysis.examMetadata || {})},
  "sections": ${JSON.stringify(analysis.sections || [])},
  "questions": [
    {
      "id": "v${level}_q1",
      "number": 1,
      "originalQuestionId": "q1",
      "sectionId": "sec_1",
      "questionText": "Nội dung câu hỏi mới...",
      "type": "multiple_choice",
      "options": [
        { "label": "A", "text": "..." },
        { "label": "B", "text": "..." },
        { "label": "C", "text": "..." },
        { "label": "D", "text": "..." }
      ],
      "correctAnswer": "A",
      "explanation": "Lời giải chi tiết từng bước...",
      "solveSteps": ["Bước 1...", "Bước 2..."],
      "points": 0.5,
      "difficulty": "Nhận biết",
      "topic": "...",
      "changesFromOriginal": "Mô tả cụ thể thay đổi so với đề gốc..."
    }
  ]
}

Đảm bảo số lượng câu hỏi và phân phối dạng câu hỏi tương ứng hoàn toàn với đề gốc (${analysis.questions?.length || 0} câu).
Trả về DUY NHẤT một chuỗi JSON hợp lệ.`;

  const genUserPrompt = `Đây là dữ liệu phân tích đề gốc để bạn tạo ĐỀ BIẾN THỂ CẤP ĐỘ ${level}:
${JSON.stringify(analysis, null, 2)}

${
  previousVariants && previousVariants.length > 0
    ? `\n(Lưu ý: Các đề biến thể đã tạo trước đó:\n${JSON.stringify(
        previousVariants.map((v) => ({ level: v.level, summary: v.levelName }))
      )} - Hãy đảm bảo Đề ${level} này có nét khác biệt rõ rệt theo đúng định hướng cấp độ ${level}!).`
    : ''
}

Hãy tạo toàn bộ câu hỏi cho ĐỀ ${level} ngay bây giờ.`;

  const rawGenJson = await generateWithModelFallback(
    {
      systemInstruction: genSystemPrompt,
      contents: genUserPrompt,
      onModelFallback: onFallback,
    },
    apiConfig
  );

  let generatedExam = cleanAndParseJSON<any>(rawGenJson);
  validateQuestions(generatedExam.questions);
  if (generatedExam.questions.length !== analysis.questions.length) throw new Error('Số câu biến thể không khớp đề gốc. Vui lòng tạo lại.');

  // --- GIAI ĐOẠN 2: ĐỘNG CƠ KIỂM ĐỊNH ĐỘC LẬP 8 TIÊU CHÍ ---
  const validationSystemPrompt = `Bạn là CHUYÊN GIA PHẢN BIỆN & KIỂM ĐỊNH ĐỘC LẬP các đề thi quốc gia.
Nhiệm vụ của bạn là kiểm tra khắt khe, độc lập, không khoan nhượng từng câu hỏi trong đề thi biến thể vừa được tạo ra.
KHÔNG ĐƯỢC MẶC ĐỊNH LÀ ĐỀ VỪA TẠO ĐÃ ĐÚNG.

Với MỖI CÂU HỎI, bạn phải thực hiện 8 tiêu chí kiểm tra:
1. knowledgeCheck: Kiến thức có chính xác về mặt khoa học, không gây tranh cãi?
2. formulaCheck: Các công thức toán/lý/hóa/ngữ pháp được áp dụng chính xác tuyệt đối?
3. lawOrRuleCheck: Có tuân thủ đúng định luật, quy tắc, định lý?
4. conditionCheck: Điều kiện xác định, điều kiện thực tế (số người, kích thước, nồng độ, dấu bằng...) có thỏa mãn?
5. solutionCheck: Từng bước giải trong lời giải có logic chặt chẽ, không bỏ bước, không ngụy biện?
6. answerCheck: Đáp án cuối cùng và các phương án trắc nghiệm A/B/C/D có duy nhất 1 đáp án đúng, các phương án nhiễu không bị trùng lặp hoặc cũng đúng?
7. difficultyCheck: Độ khó có đúng với mức độ đã khai báo và đúng tiêu chuẩn cấp độ ${level}?
8. gradeLevelCheck: Kiến thức có nằm trong phạm vi lớp ${analysis.grade || 'đã chỉ định'}, không vượt chuẩn chương trình?

Đánh giá status:
- "PASS": Câu hỏi hoàn toàn chính xác, sư phạm, không có lỗi.
- "FAIL": Có lỗi sai nghiêm trọng về kiến thức, tính toán sai đáp án, phương án nhiễu sai, thiếu điều kiện hoặc vô nghiệm.
- "WARNING": Câu hỏi chấp nhận được nhưng có thể diễn đạt tối nghĩa nhẹ hoặc cần giáo viên lưu ý khi in ấn.

CẤU TRÚC JSON TRẢ VỀ:
{
  "overallStatus": "PASS" | "WARNING" | "FAIL",
  "summary": "Nhận xét tổng quan của chuyên gia phản biện...",
  "evaluations": [
    {
      "questionId": "v${level}_q1",
      "questionNumber": 1,
      "status": "PASS" | "FAIL" | "WARNING",
      "knowledgeCheck": "Chính xác...",
      "formulaCheck": "Đúng công thức...",
      "lawOrRuleCheck": "Tuân thủ đúng...",
      "conditionCheck": "Đầy đủ điều kiện...",
      "solutionCheck": "Lời giải chuẩn...",
      "answerCheck": "Đáp án A chính xác...",
      "difficultyCheck": "Phù hợp mức Thông hiểu...",
      "gradeLevelCheck": "Đúng chuẩn Lớp ${analysis.grade || ''}...",
      "message": "Đánh giá chi tiết hoặc hướng dẫn sửa nếu có lỗi..."
    }
  ]
}`;

  const rawValJson = await generateWithModelFallback(
    {
      systemInstruction: validationSystemPrompt,
      contents: `Đề thi biến thể cần kiểm định:\n${JSON.stringify(
        generatedExam,
        null,
        2
      )}\n\nĐề gốc để đối chiếu:\n${JSON.stringify(analysis, null, 2)}`,
      onModelFallback: onFallback,
    },
    apiConfig
  );

  let validationResult = cleanAndParseJSON<any>(rawValJson);
  let evaluations: QuestionValidation[] = completeValidation(generatedExam.questions, validationResult.evaluations);

  // --- GIAI ĐOẠN 3: TỰ ĐỘNG SỬA CÁC CÂU BỊ FAIL ---
  let repairedCount = 0;
  const failingEvals = evaluations.filter((e) => e.status === 'FAIL');

  if (failingEvals.length > 0) {
    console.log(`[Auto-Repair] Phát hiện ${failingEvals.length} câu FAIL ở Đề ${level}, tiến hành tự sửa...`);

    const repairSystemPrompt = `Bạn là Chuyên gia Sửa Đề thi.
Chuyên gia phản biện đã phát hiện một số câu hỏi có lỗi trong Đề Biến Thể Cấp Độ ${level}.
Nhiệm vụ của bạn là sửa lại CHÍNH XÁC các câu hỏi bị lỗi theo góp ý của chuyên gia phản biện.

YÊU CẦU:
- Đọc kỹ lý do lỗi trong từng tiêu chí kiểm tra.
- Tính toán và giải lại chuẩn xác 100%.
- Giữ nguyên id câu hỏi và cấu trúc.

Trả về danh sách câu hỏi đã sửa dưới dạng JSON:
{
  "repairedQuestions": [
    {
      "id": "...",
      "number": 1,
      "originalQuestionId": "...",
      "sectionId": "...",
      "questionText": "Nội dung câu đã sửa...",
      "type": "...",
      "options": [...],
      "correctAnswer": "...",
      "explanation": "Lời giải mới chuẩn xác...",
      "solveSteps": [...],
      "points": 0.5,
      "difficulty": "...",
      "topic": "...",
      "changesFromOriginal": "..."
    }
  ]
}`;

    const repairPrompt = `Danh sách các câu bị FAIL và nhận xét của Chuyên gia phản biện:
${JSON.stringify(failingEvals, null, 2)}

Nội dung toàn bộ câu hỏi hiện tại:
${JSON.stringify(generatedExam.questions, null, 2)}`;

    try {
      const rawRepairJson = await generateWithModelFallback(
        {
          systemInstruction: repairSystemPrompt,
          contents: repairPrompt,
          onModelFallback: onFallback,
        },
        apiConfig
      );

      const repairData = cleanAndParseJSON<any>(rawRepairJson);
      if (repairData.repairedQuestions && Array.isArray(repairData.repairedQuestions)) {
        for (const repQ of repairData.repairedQuestions) {
          const idx = generatedExam.questions.findIndex(
            (q: any) => q.id === repQ.id
          );
          if (idx !== -1) {
            const repaired = { ...generatedExam.questions[idx], ...repQ, id: generatedExam.questions[idx].id, number: generatedExam.questions[idx].number };
            validateQuestions([repaired]);
            generatedExam.questions[idx] = repaired;
            repairedCount++;

            const evalIdx = evaluations.findIndex(
              (e) => e.questionId === repQ.id || e.questionNumber === repQ.number
            );
            if (evalIdx !== -1) {
              evaluations[evalIdx].status = 'WARNING';
              evaluations[evalIdx].message = 'Đã hiệu chỉnh; cần kiểm định lại trước khi xác nhận đạt.';
            }
          }
        }
      }
    } catch (repErr) {
      console.error('Lỗi khi tự sửa câu hỏi:', repErr);
    }
  }

  // A repair is not evidence of correctness. Independently validate the repaired exam.
  if (repairedCount > 0) {
    try {
      const recheck = await generateWithModelFallback({systemInstruction: validationSystemPrompt, contents: `Kiểm định lại đề sau sửa, đối chiếu đề gốc.\n${JSON.stringify(generatedExam)}\n${JSON.stringify(analysis)}`, onModelFallback:onFallback}, apiConfig);
      validationResult = cleanAndParseJSON<any>(recheck);
      evaluations = completeValidation(generatedExam.questions, validationResult.evaluations);
    } catch { /* Preserve WARNING/FAIL if revalidation cannot complete. */ }
  }
  const finalOverallStatus = overallStatus(evaluations);

  const finalExam: GeneratedExam = {
    level,
    levelName: levelTitle,
    levelDescription,
    title:
      generatedExam.title ||
      `${analysis.examMetadata?.title || 'Đề kiểm tra'} - Biến thể Cấp độ ${level}`,
    metadata: generatedExam.metadata || analysis.examMetadata,
    sections: generatedExam.sections || analysis.sections || [],
    questions: generatedExam.questions || [],
    validationReport: evaluations,
    overallValidationStatus: finalOverallStatus,
    validationSummary:
      validationResult.summary ||
      `Đã kiểm định độc lập toàn bộ ${generatedExam.questions?.length || 0} câu hỏi.`,
    repairedQuestionCount: repairedCount,
    createdAt: new Date().toISOString(),
  };

  return finalExam;
}

// ============================================================================
// 3. HIỆU CHỈNH / TỰ SỬA 1 CÂU HỎI DUY NHẤT (SINGLE QUESTION FIX)
// ============================================================================
export async function fixSingleQuestionWithAI(
  payload: SingleQuestionEditPayload,
  apiConfig?: ApiConfig
): Promise<{ repairedQuestion: VariantQuestion; validation: QuestionValidation }> {
  const systemInstruction = `Bạn là Chuyên gia Sư phạm Khảo thí. Nhiệm vụ của bạn là hiệu chỉnh lại một câu hỏi duy nhất trong đề thi biến thể cấp độ ${payload.level} theo yêu cầu cụ thể của giáo viên.
Đảm bảo tính chính xác khoa học, công thức LaTeX ($...$), điều kiện, đáp án và lời giải chi tiết.
Trả về JSON duy nhất:
{
  "repairedQuestion": {
    "id": "${payload.question.id}",
    "number": ${payload.question.number},
    "originalQuestionId": "${payload.question.originalQuestionId}",
    "sectionId": "${payload.question.sectionId || 'sec_1'}",
    "questionText": "...",
    "type": "${payload.question.type}",
    "options": [
      { "label": "A", "text": "..." },
      { "label": "B", "text": "..." },
      { "label": "C", "text": "..." },
      { "label": "D", "text": "..." }
    ],
    "correctAnswer": "A",
    "explanation": "...",
    "solveSteps": ["..."],
    "points": ${payload.question.points || 0.5},
    "difficulty": "${payload.question.difficulty}",
    "topic": "${payload.question.topic || ''}",
    "changesFromOriginal": "..."
  },
  "validation": {
    "questionId": "${payload.question.id}",
    "questionNumber": ${payload.question.number},
    "status": "PASS",
    "knowledgeCheck": "Chính xác",
    "formulaCheck": "Đúng công thức",
    "lawOrRuleCheck": "Tuân thủ",
    "conditionCheck": "Thỏa mãn",
    "solutionCheck": "Logic chặt chẽ",
    "answerCheck": "Chính xác tuyệt đối",
    "difficultyCheck": "Phù hợp",
    "gradeLevelCheck": "Đúng chuẩn chương trình",
    "message": "Đã hiệu chỉnh theo yêu cầu sư phạm của giáo viên."
  }
}`;

  const prompt = `Câu hỏi biến thể hiện tại:
${JSON.stringify(payload.question, null, 2)}

${payload.originalQuestion ? `Câu hỏi gốc đối chiếu:\n${JSON.stringify(payload.originalQuestion, null, 2)}` : ''}

Ghi chú/Yêu cầu chỉnh sửa của giáo viên:
${payload.teacherNote || 'Hãy giải lại và tối ưu hóa câu hỏi này đảm bảo tính chính xác khoa học tuyệt đối.'}`;

  const rawJson = await generateWithModelFallback(
    {
      systemInstruction,
      contents: prompt,
    },
    apiConfig
  );

  const parsed = cleanAndParseJSON<{
    repairedQuestion: VariantQuestion;
    validation: QuestionValidation;
  }>(rawJson);

  validateQuestions([parsed.repairedQuestion]);
  parsed.repairedQuestion = {...parsed.repairedQuestion, id:payload.question.id, number:payload.question.number, originalQuestionId:payload.question.originalQuestionId};
  return parsed;
}
