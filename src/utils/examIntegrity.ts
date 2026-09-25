import {
  ExamAnalysis,
  OriginalQuestion,
  QuestionValidation,
  ValidationStatus,
  VariantQuestion,
} from '../types';

/**
 * Kiểm tra tính toàn vẹn của danh sách câu hỏi
 */
export function validateQuestions(questions: VariantQuestion[] | OriginalQuestion[]): void {
  if (!questions || questions.length === 0) {
    throw new Error('Danh sách câu hỏi không được rỗng.');
  }

  const ids = new Set<string>();
  for (const q of questions) {
    if (ids.has(q.id)) {
      throw new Error(`Phát hiện câu hỏi trùng mã định danh: ${q.id}`);
    }
    ids.add(q.id);

    // Kiểm tra câu trắc nghiệm
    if (q.type === 'multiple_choice' && q.options && q.options.length > 0) {
      const validLabels = q.options.map((o) => o.label.trim().toUpperCase());
      const cleanAnswer = (q.correctAnswer || '').trim().toUpperCase();
      if (!validLabels.includes(cleanAnswer)) {
        throw new Error(
          `Đáp án đúng "${q.correctAnswer}" của câu ${q.number} không nằm trong các phương án [${validLabels.join(', ')}].`
        );
      }
    }
  }
}

/**
 * Điền đầy đủ báo cáo kiểm định nếu thiếu
 */
export function completeValidation(
  questions: VariantQuestion[],
  evaluations: Partial<QuestionValidation>[] = []
): QuestionValidation[] {
  const evalMap = new Map<string, Partial<QuestionValidation>>();
  for (const ev of evaluations) {
    if (ev.questionId) {
      evalMap.set(ev.questionId, ev);
    }
  }

  return questions.map((q) => {
    const existing = evalMap.get(q.id);
    if (existing && existing.status) {
      return {
        questionId: q.id,
        questionNumber: q.number,
        status: existing.status,
        knowledgeCheck: existing.knowledgeCheck || 'Đã kiểm tra kiến thức',
        formulaCheck: existing.formulaCheck || 'Đã kiểm tra công thức',
        lawOrRuleCheck: existing.lawOrRuleCheck || 'Tuân thủ định luật/quy tắc',
        conditionCheck: existing.conditionCheck || 'Đầy đủ điều kiện',
        solutionCheck: existing.solutionCheck || 'Lời giải logic',
        answerCheck: existing.answerCheck || 'Đáp án chính xác',
        difficultyCheck: existing.difficultyCheck || 'Phù hợp độ khó',
        gradeLevelCheck: existing.gradeLevelCheck || 'Đúng chuẩn lớp học',
        message: existing.message || 'Câu hỏi đạt tiêu chuẩn',
      };
    }

    return {
      questionId: q.id,
      questionNumber: q.number,
      status: 'WARNING' as ValidationStatus,
      knowledgeCheck: 'Chưa kiểm định chuyên sâu',
      formulaCheck: 'Chưa kiểm định chuyên sâu',
      lawOrRuleCheck: 'Chưa kiểm định chuyên sâu',
      conditionCheck: 'Chưa kiểm định chuyên sâu',
      solutionCheck: 'Chưa kiểm định chuyên sâu',
      answerCheck: 'Chưa kiểm định chuyên sâu',
      difficultyCheck: 'Chưa kiểm định chuyên sâu',
      gradeLevelCheck: 'Chưa kiểm định chuyên sâu',
      message: 'Cần giáo viên rà soát lại trước khi phát hành',
    };
  });
}

/**
 * Tính toán trạng thái kiểm định tổng thể
 */
export function overallStatus(evaluations: QuestionValidation[]): ValidationStatus {
  if (!evaluations || evaluations.length === 0) return 'WARNING';
  if (evaluations.some((e) => e.status === 'FAIL')) return 'FAIL';
  if (evaluations.some((e) => e.status === 'WARNING')) return 'WARNING';
  return 'PASS';
}

/**
 * Chấm điểm thi thử thông minh có xét trọng số điểm (points) từng câu
 * và loại bỏ điểm các câu tự luận (chờ giáo viên chấm) khỏi mẫu số tự động
 */
export function scorePractice(
  questions: VariantQuestion[],
  answers: Record<number, string>
): { score: number | null; totalPoints: number; correctPoints: number; manual: number } {
  if (!questions || questions.length === 0) {
    return { score: null, totalPoints: 0, correctPoints: 0, manual: 0 };
  }

  let totalPoints = 0;
  let autogradablePoints = 0;
  let correctPoints = 0;
  let manualCount = 0;

  for (const q of questions) {
    const qPoints = typeof q.points === 'number' && q.points > 0 ? q.points : 1;
    const studentAns = (answers[q.number] || '').trim();

    totalPoints += qPoints;

    if (q.type === 'essay') {
      manualCount++;
      continue; // Tự luận không tính vào điểm chấm tự động
    }

    autogradablePoints += qPoints;

    if (q.type === 'multiple_choice') {
      if (studentAns && studentAns.toUpperCase() === (q.correctAnswer || '').trim().toUpperCase()) {
        correctPoints += qPoints;
      }
    } else if (q.type === 'short_answer' || q.type === 'fill_in_blank') {
      const cleanStudent = studentAns.toLowerCase().replace(/\s+/g, '');
      const cleanCorrect = (q.correctAnswer || '').toLowerCase().replace(/\s+/g, '');
      if (cleanStudent && cleanStudent === cleanCorrect) {
        correctPoints += qPoints;
      }
    } else if (q.type === 'true_false') {
      if (studentAns && studentAns.toLowerCase() === (q.correctAnswer || '').trim().toLowerCase()) {
        correctPoints += qPoints;
      } else {
        const studentParts = studentAns.split(/[;,|]/).map((s) => s.trim().toLowerCase());
        const correctParts = (q.correctAnswer || '').split(/[;,|]/).map((s) => s.trim().toLowerCase());
        if (correctParts.length > 0 && studentParts.length > 0) {
          let matchedParts = 0;
          for (const sp of studentParts) {
            if (correctParts.includes(sp)) matchedParts++;
          }
          const ratio = matchedParts / correctParts.length;
          correctPoints += qPoints * ratio;
        }
      }
    } else {
      if (studentAns && studentAns.toUpperCase() === (q.correctAnswer || '').trim().toUpperCase()) {
        correctPoints += qPoints;
      }
    }
  }

  // Nếu tất cả câu đều là tự luận hoặc không có câu chấm tự động
  if (autogradablePoints <= 0) {
    return { score: null, totalPoints, correctPoints: 0, manual: manualCount };
  }

  const rawScore = (correctPoints / autogradablePoints) * 10;
  const roundedScore = Math.round(rawScore * 10) / 10;

  return {
    score: roundedScore,
    totalPoints,
    correctPoints: Math.round(correctPoints * 100) / 100,
    manual: manualCount,
  };
}

/**
 * Chuẩn hóa đối tượng phân tích đề gốc
 */
export function normalizeAnalysis(analysis: Partial<ExamAnalysis>): ExamAnalysis {
  return {
    examMetadata: {
      title: analysis.examMetadata?.title || 'Đề kiểm tra',
      subject: analysis.examMetadata?.subject || 'Toán học',
      grade: analysis.examMetadata?.grade || 'Lớp 10',
      durationMinutes: analysis.examMetadata?.durationMinutes || 45,
      totalPoints: analysis.examMetadata?.totalPoints || 10,
      totalQuestions: analysis.questions?.length || analysis.examMetadata?.totalQuestions || 0,
      instructions: analysis.examMetadata?.instructions || '',
      schoolOrOrg: analysis.examMetadata?.schoolOrOrg || '',
      semesterOrExamType: analysis.examMetadata?.semesterOrExamType || '',
    },
    subjects: analysis.subjects || [analysis.examMetadata?.subject || 'Toán học'],
    grade: analysis.grade || analysis.examMetadata?.grade || 'Lớp 10',
    topics: analysis.topics || [],
    sections: analysis.sections || [],
    questions: (analysis.questions || []) as OriginalQuestion[],
    questionTypes: analysis.questionTypes || ['multiple_choice'],
    difficultyLevels: analysis.difficultyLevels || {
      recognitionCount: 0,
      comprehensionCount: 0,
      applicationCount: 0,
      advancedApplicationCount: 0,
    },
    learningObjectives: analysis.learningObjectives || [],
    knowledgeUnits: analysis.knowledgeUnits || [],
    skills: analysis.skills || [],
    formulas: analysis.formulas || [],
    laws: analysis.laws || [],
    theorems: analysis.theorems || [],
    principles: analysis.principles || [],
    constraints: analysis.constraints || [],
    answerInformation: analysis.answerInformation || '',
    warnings: analysis.warnings || [],
    scoringStructure: analysis.scoringStructure || {
      pointsPerQuestionType: { multiple_choice: 0.25 },
      total: 10,
    },
  };
}
