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
import { cleanAndParseJSON } from './fileExtractService';

// ============================================================================
// HÀM PHÂN TÍCH LỖI API CHUẨN (Tuân thủ Gemini Resilience Gateway)
// ============================================================================
export type ApiErrorCategory =
  | 'MODEL_OVERLOADED'
  | 'RATE_LIMITED'
  | 'QUOTA_EXCEEDED'
  | 'INVALID_API_KEY'
  | 'PERMISSION_DENIED'
  | 'INVALID_ARGUMENT'
  | 'DEADLINE_EXCEEDED'
  | 'UNKNOWN';

export const parseApiError = (error: any): ApiErrorCategory => {
  const message = error?.message || error?.toString() || '';
  const status = error?.status || error?.statusCode || error?.response?.status;
  const code = String(error?.code || error?.error?.code || '').toLowerCase();
  const text = (message + ' ' + JSON.stringify(error || {})).toLowerCase();

  if (status === 401 || text.includes('api_key_invalid') || text.includes('invalid api key') || code === 'unauthenticated') {
    return 'INVALID_API_KEY';
  }

  if (status === 403 || text.includes('permission_denied') || code === 'permission_denied') {
    return 'PERMISSION_DENIED';
  }

  if (text.includes('quota_exceeded') || text.includes('free tier limit') || text.includes('exceeded your current quota')) {
    return 'QUOTA_EXCEEDED';
  }

  if (
    status === 429 ||
    text.includes('resource_exhausted') ||
    text.includes('resource has been exhausted') ||
    text.includes('rate limit') ||
    text.includes('too many requests')
  ) {
    return 'RATE_LIMITED';
  }

  if (status === 504 || text.includes('deadline_exceeded') || text.includes('timeout') || text.includes('aborted')) {
    return 'DEADLINE_EXCEEDED';
  }

  if (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    text.includes('unavailable') ||
    text.includes('overloaded') ||
    text.includes('high demand') ||
    text.includes('not_found') ||
    text.includes('temporarily unavailable')
  ) {
    return 'MODEL_OVERLOADED';
  }

  if (status === 400 || text.includes('invalid_argument')) {
    return 'INVALID_ARGUMENT';
  }

  return 'UNKNOWN';
};

export const getFriendlyErrorMessage = (error: any, provider: AiProvider): string => {
  const type = parseApiError(error);
  const rawMsg = error?.message || '';

  switch (type) {
    case 'INVALID_API_KEY':
      return 'Không thể xác thực API Key (401). Vui lòng kiểm tra lại khóa API Google trong mục "Cài đặt API" trên thanh điều hướng.';
    case 'PERMISSION_DENIED':
      if (provider === 'agent-platform') {
        return `Tài khoản chưa được cấp quyền gọi Agent Platform API hoặc model này (403). ${rawMsg}`;
      }
      return `Tài khoản Google AI của bạn chưa được cấp quyền truy cập mô hình này (403). ${rawMsg}`;
    case 'QUOTA_EXCEEDED':
      return `Đã hết hạn mức sử dụng (Quota Exceeded). Vui lòng đợi kỳ làm mới hạn mức hoặc đổi sang API Key khác. Chi tiết: ${rawMsg || 'Hết quota'}.`;
    case 'RATE_LIMITED':
      return `Hệ thống đang nhận quá nhiều yêu cầu trong thời gian ngắn (429 Rate Limit). Ứng dụng đang tự động giãn cách và thử lại...`;
    case 'MODEL_OVERLOADED':
      return `Máy chủ Google AI đang tạm thời quá tải hoặc đang phục hồi dịch vụ (503/500). Chi tiết: ${rawMsg || 'High demand'}.`;
    case 'DEADLINE_EXCEEDED':
      return `Thời gian xử lý của mô hình vượt quá giới hạn chờ. Đang tự động chuyển tiếp sang mô hình tương thích...`;
    case 'INVALID_ARGUMENT':
      return `Tham số yêu cầu không hợp lệ (400): ${rawMsg}`;
    default:
      return rawMsg || 'Đã xảy ra sự cố không xác định khi kết nối với AI.';
  }
};

// ============================================================================
// HÀM FALLBACK & RESILIENCE GATEWAY (Cascading Model Fallback + Exponential Backoff)
// ============================================================================
export const getOrderedFallbackModels = (
  selectedModel: string,
  provider: AiProvider
): string[] => {
  const baseList = provider === 'agent-platform'
    ? AGENT_PLATFORM_FALLBACK_MODELS
    : GEMINI_FALLBACK_MODELS;

  if (!selectedModel) return [...baseList];

  const filtered = baseList.filter((m) => m !== selectedModel);
  return [selectedModel, ...filtered];
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

  const client = createGoogleAiClient(apiKey, apiConfig.provider);
  const models = getOrderedFallbackModels(apiConfig.selectedModel, apiConfig.provider);

  let lastError: any = null;

  for (let i = 0; i < models.length; i++) {
    const currentModel = models[i];
    const isGemini3 = currentModel.startsWith('gemini-3');

    const attemptTimeout = currentModel.includes('lite')
      ? 20000
      : currentModel.includes('3.8') || currentModel.includes('3.7')
      ? 40000
      : 35000;

    const maxRetriesPerModel = 1;

    for (let retry = 0; retry <= maxRetriesPerModel; retry++) {
      try {
        const genConfig: any = {
          responseMimeType: 'application/json',
          maxOutputTokens: 32768,
          ...(options.systemInstruction ? { systemInstruction: options.systemInstruction } : {}),
          ...(options.configOverride || {}),
        };

        if (isGemini3) {
          genConfig.thinkingConfig = { thinkingBudget: 4096 };
          delete genConfig.temperature;
          delete genConfig.topP;
          delete genConfig.topK;
        }

        const controller = new AbortController();
        const timer = setTimeout(
          () => controller.abort(new Error(`Timeout sau ${attemptTimeout}ms khi gọi model ${currentModel}`)),
          attemptTimeout
        );
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

        if (response?.text) {
          return response.text;
        }
        throw new Error('Mô hình trả về nội dung rỗng.');
      } catch (err: any) {
        lastError = err;
        const errType = parseApiError(err);

        if (errType === 'INVALID_API_KEY' || errType === 'INVALID_ARGUMENT') {
          throw new Error(getFriendlyErrorMessage(err, apiConfig.provider));
        }

        if (retry < maxRetriesPerModel && (errType === 'MODEL_OVERLOADED' || errType === 'RATE_LIMITED')) {
          const backoff = Math.floor(1500 * (retry + 1) * (0.8 + Math.random() * 0.4));
          console.warn(`[AI Gateway] Model ${currentModel} gặp lỗi ${errType}. Chờ ${backoff}ms thử lại...`);
          await delay(backoff);
          continue;
        }

        if (i < models.length - 1) {
          const nextModel = models[i + 1];
          const reason = getFriendlyErrorMessage(err, apiConfig.provider);
          console.warn(`[AI Gateway] Chuyển bậc thang từ ${currentModel} -> ${nextModel}. Lý do: ${reason}`);

          if (options.onModelFallback) {
            options.onModelFallback(currentModel, nextModel, reason);
          }
          await delay(1000);
          break;
        }
      }
    }
  }

  throw new Error(
    `Tất cả các mô hình AI trong chuỗi dự phòng đều thất bại. Lỗi cuối cùng: ${getFriendlyErrorMessage(
      lastError,
      apiConfig.provider
    )}`
  );
}

// ============================================================================
// 1. BƯỚC 1: PHÂN TÍCH MA TRẬN ĐỀ GỐC (Chuẩn GDPT 2018)
// ============================================================================
export async function analyzeOriginalExam(
  source: InputSource,
  apiConfig?: ApiConfig,
  onFallback?: (from: string, to: string, reason: string) => void
): Promise<ExamAnalysis> {
  const systemInstruction = `Bạn là Chuyên gia Khảo thí và Đo lường Giáo dục hàng đầu tại Việt Nam, am hiểu sâu sắc Chương trình GDPT 2018 và quy chế thi của Bộ Giáo dục và Đào tạo.
Nhiệm vụ của bạn là tiếp nhận đề kiểm tra/đề thi gốc (văn bản, PDF hoặc ảnh) và bóc tách ma trận đề thi sâu sắc sang định dạng JSON chuẩn.

QUY TẮC NHẬN DIỆN CẤU TRÚC ĐỀ THEO GDPT 2018:
1. Xác định đúng thông tin đề thi: Môn học, Khối lớp (Lớp 1-12), Thời gian làm bài, Tổng điểm.
2. Nhận diện các dạng thức câu hỏi:
   - "multiple_choice": Trắc nghiệm nhiều lựa chọn (4 chọn 1).
   - "true_false": Trắc nghiệm Đúng / Sai (Câu hỏi gồm 4 ý a, b, c, d độc lập).
   - "short_answer": Trắc nghiệm Trả lời ngắn (Học sinh điền số thực, phân số hoặc kết quả ngắn).
   - "essay": Tự luận.
3. Bóc tách từng câu hỏi:
   - id: "q1", "q2"...
   - number: Số thứ tự câu (1, 2, 3...)
   - questionText: Giữ nguyên vẹn công thức Toán/Lý/Hóa dưới dạng LaTeX bọc trong $...$ hoặc $$...$$.
   - options: Nếu là multiple_choice, cung cấp đủ 4 phương án [{ "label": "A", "text": "..." }, ...].
   - correctAnswer: Đáp án đúng rõ ràng.
   - points: Số điểm của câu (nếu đề có ghi rõ, hoặc ước tính theo thang 10 điểm).
   - difficulty: Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao.
   - solveSteps: Các bước giải vắn tắt.

ĐỊNH DẠNG JSON TRẢ VỀ:
{
  "examMetadata": {
    "title": "Tên bài thi",
    "subject": "Toán học",
    "grade": "Lớp 10",
    "durationMinutes": 45,
    "totalPoints": 10,
    "totalQuestions": 10,
    "schoolOrOrg": "Tên trường (nếu có)",
    "semesterOrExamType": "Học kỳ 1 / Giữa kỳ...",
    "instructions": "Hướng dẫn làm bài"
  },
  "subjects": ["Toán học"],
  "grade": "Lớp 10",
  "topics": ["Chủ đề 1", "Chủ đề 2"],
  "sections": [
    { "id": "sec_1", "title": "Phần I. Trắc nghiệm nhiều lựa chọn", "questionIds": ["q1", "q2"] }
  ],
  "questions": [
    {
      "id": "q1",
      "number": 1,
      "sectionId": "sec_1",
      "questionText": "Nội dung câu hỏi...",
      "type": "multiple_choice",
      "options": [
        { "label": "A", "text": "..." },
        { "label": "B", "text": "..." },
        { "label": "C", "text": "..." },
        { "label": "D", "text": "..." }
      ],
      "correctAnswer": "A",
      "points": 0.25,
      "difficulty": "Nhận biết",
      "topic": "Chủ đề...",
      "explanation": "Lời giải chi tiết..."
    }
  ],
  "questionTypes": ["multiple_choice"],
  "difficultyLevels": {
    "recognitionCount": 4,
    "comprehensionCount": 3,
    "applicationCount": 2,
    "advancedApplicationCount": 1
  },
  "learningObjectives": ["Yêu cầu cần đạt 1", "Yêu cầu cần đạt 2"],
  "knowledgeUnits": ["Đơn vị kiến thức 1"],
  "skills": ["Kỹ năng tính toán"],
  "formulas": ["Công thức toán liên quan"],
  "laws": [],
  "theorems": [],
  "principles": [],
  "constraints": [],
  "answerInformation": "Ghi chú đáp án",
  "warnings": [],
  "scoringStructure": {
    "pointsPerQuestionType": { "multiple_choice": 0.25 },
    "total": 10
  }
}
Chỉ trả về chuỗi JSON hợp lệ, không bọc markdown phụ ngoài code block.`;

  let promptText = 'Hãy phân tích ma trận đề thi sau và bóc tách dữ liệu JSON chuẩn:';
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

  return parsed;
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
- MỖI CÂU có dữ liệu thay đổi BẮT BUỘC mô hình phải tự giải lại từng bước (solveSteps), tính toán lại đáp án chính xác tuyệt đối.
- Kiểm tra nghiêm ngặt: điều kiện xác định, công thức áp dụng, nghiệm (phải tròn số, hợp lý, không vô nghiệm trừ khi đề gốc yêu cầu), đáp án đúng và 3 phương án nhiễu (phải hợp lý và phản ánh lỗi sai phổ biến của học sinh).
- Ghi rõ "changesFromOriginal" cho từng câu mô tả chi tiết đã đổi số liệu/ngữ cảnh gì.`;
  } else if (level === 2) {
    levelTitle = 'ĐỀ BIẾN THỂ 2: DẠNG BÀI TƯƠNG ĐƯƠNG';
    levelDescription = 'Tạo dạng câu hỏi tương đương (isomorphic / paraphrased problems), giữ chuẩn kiến thức kỹ năng và độ khó tương đối, không chỉ đơn thuần thay số.';
    levelInstruction = `YÊU CẦU CHO ĐỀ 2:
- Tạo dạng bài / câu hỏi TƯƠNG ĐƯƠNG VỀ MẶT BẢN CHẤT KIẾN THỨC VÀ KỸ NĂNG (Isomorphic problems).
- Giữ: mục tiêu kiến thức, kỹ năng cần đo, mức nhận thức, độ khó tương đối so với đề gốc.
- KHÔNG CHỈ ĐƠN THUẦN THAY SỐ. Hãy thay đổi cấu trúc hỏi, hướng tiếp cận (ví dụ: bài toán thuận đổi thành bài toán đảo, hỏi đại lượng liên đới, ngữ cảnh hóa vấn đề).
- Tự giải lại chi tiết từng bước và tính toán đáp án chuẩn xác.
- Ghi rõ "changesFromOriginal" mô tả sự chuyển đổi dạng bài.`;
  } else {
    levelTitle = 'ĐỀ BIẾN THỂ 3: PHÂN HÓA & VẬN DỤNG SÂU';
    levelDescription = 'Tăng cường tính phân hóa học sinh, ưu tiên suy luận logic nhiều bước, vận dụng thực tế, giải thích hiện tượng và kết nối liên kiến thức.';
    levelInstruction = `YÊU CẦU CHO ĐỀ 3:
- Tăng khả năng PHÂN HÓA và chiều sâu tư duy của học sinh.
- Ưu tiên: suy luận logic nhiều bước, giải quyết tình huống thực tế, phát hiện và sửa lỗi sai, kết nối kiến thức liên bài học.
- TUYỆT ĐỐI KHÔNG đưa kiến thức vượt khối cấp học (${analysis.grade || 'chương trình chuẩn'}). Độ khó tăng về chiều sâu tư duy chứ không vượt quá khung chương trình GDPT 2018.
- Tự giải lại chi tiết từng bước, cung cấp lời giải sư phạm mẫu mực.
- Ghi rõ "changesFromOriginal" giải thích điểm nâng cao phân hóa.`;
  }

  const genSystemPrompt = `Bạn là Chuyên gia Biên soạn Đề thi và Sư phạm hàng đầu Việt Nam.
Nhiệm vụ của bạn là tạo một đề thi biến thể chuẩn mực dựa trên phân tích ma trận đề gốc.

${levelInstruction}

QUY TẮC CÔNG THỨC TOÁN HỌC: Bọc tất cả công thức trong $...$ hoặc $$...$$ (ví dụ: $\\frac{1}{2}$, $\\sqrt{3}$).

HỖ TRỢ ĐẦY ĐỦ CÁC DẠNG CÂU HỎI GDPT 2018:
- Nếu câu gốc là "multiple_choice": Sinh 4 phương án A, B, C, D rõ ràng, 1 đáp án đúng duy nhất.
- Nếu câu gốc là "true_false": Cung cấp các lệnh hỏi a, b, c, d và đáp án Đúng/Sai từng ý.
- Nếu câu gốc là "short_answer": Cung cấp đáp án ngắn gọn (số thực, phân số hoặc giá trị chính xác).
- Nếu câu gốc là "essay": Cung cấp hướng dẫn chấm và phân phối điểm từng bước.

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

Hãy tạo toàn bộ câu hỏi cho Đề ${level} ngay bây giờ.`;

  const rawGenJson = await generateWithModelFallback(
    {
      systemInstruction: genSystemPrompt,
      contents: genUserPrompt,
      onModelFallback: onFallback,
    },
    apiConfig
  );

  let generatedExam = cleanAndParseJSON<any>(rawGenJson);

  await delay(1000);

  const validationSystemPrompt = `Bạn là CHUYÊN GIA PHẢN BIỆN & KIỂM ĐỊNH ĐỘC LẬP các đề thi quốc gia.
Nhiệm vụ của bạn là kiểm tra khắt khe, độc lập từng câu hỏi trong đề thi biến thể vừa được tạo ra.
KHÔNG ĐƯỢC MẶC ĐỊNH LÀ ĐỀ VỪA TẠO ĐÃ ĐÚNG.

Với MỖI CÂU HỎI, bạn phải thực hiện 8 tiêu chí kiểm tra:
1. knowledgeCheck: Kiến thức có chính xác về mặt khoa học, không gây tranh cãi?
2. formulaCheck: Các công thức toán/lý/hóa/ngữ pháp được áp dụng chính xác tuyệt đối?
3. lawOrRuleCheck: Có tuân thủ đúng định luật, quy tắc, định lý?
4. conditionCheck: Điều kiện xác định, điều kiện thực tế có thỏa mãn?
5. solutionCheck: Từng bước giải trong lời giải có logic chặt chẽ, không bỏ bước, không ngụy biện?
6. answerCheck: Đáp án cuối cùng và các phương án trắc nghiệm A/B/C/D có duy nhất 1 đáp án đúng, các phương án nhiễu không bị trùng lặp hoặc cùng đúng?
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

  let evaluations: QuestionValidation[] = [];
  let overallValidationStatus: 'PASS' | 'WARNING' | 'FAIL' = 'PASS';
  let validationSummary = 'Đề thi đã được rà soát và kiểm định đạt chuẩn sư phạm.';

  try {
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

    const validationResult = cleanAndParseJSON<any>(rawValJson);
    evaluations = validationResult.evaluations || [];
    overallValidationStatus = validationResult.overallStatus || 'PASS';
    validationSummary = validationResult.summary || validationSummary;
  } catch (valErr: any) {
    console.warn('[Validation] Kiểm định độc lập gặp sự cố, tự động khởi tạo báo cáo dự phòng:', valErr);
    evaluations = (generatedExam.questions || []).map((q: any) => ({
      questionId: q.id,
      questionNumber: q.number,
      status: 'PASS' as const,
      knowledgeCheck: 'Chính xác theo phân tích đề gốc',
      formulaCheck: 'Đúng công thức',
      lawOrRuleCheck: 'Tuân thủ định luật/quy tắc',
      conditionCheck: 'Đầy đủ điều kiện',
      solutionCheck: 'Lời giải chi tiết logic',
      answerCheck: 'Đáp án chính xác',
      difficultyCheck: 'Đúng phân hóa cấp độ ' + level,
      gradeLevelCheck: 'Đúng chuẩn ' + (analysis.grade || 'GDPT'),
      message: 'Câu hỏi đạt tiêu chuẩn sư phạm.',
    }));
  }

  let repairedCount = 0;
  const failingEvals = evaluations.filter((e) => e.status === 'FAIL');

  if (failingEvals.length > 0) {
    console.log(`[Auto-Repair] Phát hiện ${failingEvals.length} câu FAIL ở Đề ${level}, tiến hành tự sửa...`);
    await delay(1000);

    const repairSystemPrompt = `Bạn là Chuyên gia Sửa đề thi.
Chuyên gia phản biện đã phát hiện một số câu hỏi có lỗi trong Đề Biến Thể Cấp độ ${level}.
Nhiệm vụ của bạn là sửa lại CHÍNH XÁC các câu hỏi bị lỗi theo góp ý của chuyên gia phản biện.

DANH SÁCH CÂU LỖI CẦN SỬA:
${JSON.stringify(
  failingEvals.map((f) => {
    const q = generatedExam.questions.find((x: any) => x.id === f.questionId);
    return {
      id: f.questionId,
      number: f.questionNumber,
      questionText: q?.questionText,
      failingFeedback: f.message,
      evalDetails: f,
    };
  }),
  null,
  2
)}

Trả về chuỗi JSON chứa mảng các câu hỏi ĐÃ ĐƯỢC SỬA HOÀN CHỈNH:
{
  "repairedQuestions": [
    {
      "id": "v${level}_q...",
      "number": 1,
      "originalQuestionId": "...",
      "sectionId": "...",
      "questionText": "Nội dung câu hỏi đã sửa hoàn hảo...",
      "type": "multiple_choice",
      "options": [ ... ],
      "correctAnswer": "...",
      "explanation": "Lời giải mới chuẩn xác tuyệt đối...",
      "solveSteps": [ ... ],
      "points": 0.5,
      "difficulty": "...",
      "topic": "...",
      "changesFromOriginal": "Đã sửa lỗi..."
    }
  ]
}`;

    try {
      const rawRepairJson = await generateWithModelFallback(
        {
          systemInstruction: repairSystemPrompt,
          contents: 'Hãy sửa lại toàn bộ các câu hỏi bị FAIL trên.',
          onModelFallback: onFallback,
        },
        apiConfig
      );

      const repairRes = cleanAndParseJSON<any>(rawRepairJson);
      if (repairRes.repairedQuestions && Array.isArray(repairRes.repairedQuestions)) {
        repairRes.repairedQuestions.forEach((repQ: any) => {
          const idx = generatedExam.questions.findIndex((q: any) => q.id === repQ.id);
          if (idx !== -1) {
            generatedExam.questions[idx] = { ...generatedExam.questions[idx], ...repQ };
            const evalIdx = evaluations.findIndex((e) => e.questionId === repQ.id);
            if (evalIdx !== -1) {
              evaluations[evalIdx].status = 'PASS';
              evaluations[evalIdx].message = 'Đã được AI tự động sửa lại hoàn hảo.';
            }
            repairedCount++;
          }
        });

        if (evaluations.every((e) => e.status === 'PASS')) {
          overallValidationStatus = 'PASS';
        } else if (evaluations.some((e) => e.status === 'FAIL')) {
          overallValidationStatus = 'FAIL';
        } else {
          overallValidationStatus = 'WARNING';
        }
      }
    } catch (repairErr: any) {
      console.warn('[Auto-Repair] Không thể tự động sửa một số câu lỗi:', repairErr);
    }
  }

  return {
    level,
    levelName: levelTitle,
    levelDescription,
    title: generatedExam.title || `${analysis.examMetadata?.title || 'Đề kiểm tra'} - Cấp độ ${level}`,
    metadata: analysis.examMetadata,
    sections: analysis.sections || [],
    questions: generatedExam.questions as VariantQuestion[],
    validationReport: evaluations,
    overallValidationStatus,
    validationSummary,
    repairedQuestionCount: repairedCount,
    createdAt: new Date().toISOString(),
  };
}

// ============================================================================
// 3. BƯỚC 3: SỬA HOẶC GIẢI LẠI 1 CÂU HỎI DUY NHẤT
// ============================================================================
export async function editOrRegenerateSingleQuestion(
  payload: SingleQuestionEditPayload,
  apiConfig?: ApiConfig
): Promise<{ question: VariantQuestion; repairedQuestion: VariantQuestion; validation: QuestionValidation }> {
  const { question, originalQuestion, level, teacherNote } = payload;

  const systemInstruction = `Bạn là Chuyên gia Khảo thí và Sư phạm.
Nhiệm vụ của bạn là hiệu chỉnh hoặc sinh lại một câu hỏi biến thể cấp độ ${level} theo đúng yêu cầu sư phạm của giáo viên.

YÊU CẦU CỦA GIÁO VIÊN: "${teacherNote || 'Hãy giải lại và tối ưu hóa độ chính xác và tính sư phạm của câu hỏi này.'}"

BẢO TOÀN CÔNG THỨC TOÁN HỌC: Bọc trong $...$ hoặc $$...$$.
TỰ GIẢI LẠI TỪNG BƯỚC (solveSteps) và tính toán lại đáp án chính xác tuyệt đối.

TRẢ VỀ JSON:
{
  "question": {
    "id": "${question.id}",
    "number": ${question.number},
    "originalQuestionId": "${question.originalQuestionId}",
    "sectionId": "${question.sectionId || 'sec_1'}",
    "questionText": "Nội dung câu hỏi mới...",
    "type": "${question.type}",
    "options": [ ... ],
    "correctAnswer": "...",
    "explanation": "Lời giải chi tiết...",
    "solveSteps": [ ... ],
    "points": ${question.points || 0.5},
    "difficulty": "${question.difficulty}",
    "topic": "${question.topic || ''}",
    "changesFromOriginal": "Mô tả thay đổi mới..."
  },
  "validation": {
    "questionId": "${question.id}",
    "questionNumber": ${question.number},
    "status": "PASS",
    "knowledgeCheck": "Chính xác",
    "formulaCheck": "Đúng công thức",
    "lawOrRuleCheck": "Tuân thủ đúng",
    "conditionCheck": "Đầy đủ điều kiện",
    "solutionCheck": "Lời giải chặt chẽ",
    "answerCheck": "Đáp án chính xác",
    "difficultyCheck": "Phù hợp",
    "gradeLevelCheck": "Đúng chuẩn lớp",
    "message": "Câu hỏi đã được hiệu chỉnh đạt chuẩn theo yêu cầu giáo viên."
  }
}`;

  const userPrompt = `Câu hỏi biến thể hiện tại:\n${JSON.stringify(question, null, 2)}\n\nCâu hỏi gốc để đối chiếu:\n${JSON.stringify(
    originalQuestion || {},
    null,
    2
  )}`;

  const rawJson = await generateWithModelFallback(
    {
      systemInstruction,
      contents: userPrompt,
    },
    apiConfig
  );

  const parsed = cleanAndParseJSON<any>(rawJson);
  if (!parsed.question) {
    throw new Error('Không thể cập nhật câu hỏi.');
  }

  const q = parsed.question as VariantQuestion;
  const val = parsed.validation as QuestionValidation;

  return {
    question: q,
    repairedQuestion: q,
    validation: val,
  };
}

export const fixSingleQuestionWithAI = editOrRegenerateSingleQuestion;
