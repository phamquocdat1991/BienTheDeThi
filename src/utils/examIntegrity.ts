import { ExamAnalysis, GeneratedExam, OriginalQuestion, QuestionValidation, VariantQuestion } from '../types';
const types = ['multiple_choice','essay','true_false','fill_in_blank','short_answer','matching'];
export function validateQuestions(value: unknown): asserts value is VariantQuestion[] {
  if (!Array.isArray(value) || !value.length) throw new Error('Đề thi không có câu hỏi hợp lệ.');
  const ids=new Set(), numbers=new Set();
  for(const q of value){
    if(!q||typeof q.id!=='string'||!q.id||ids.has(q.id)||!Number.isInteger(q.number)||q.number<1||numbers.has(q.number)||typeof q.questionText!=='string'||!q.questionText.trim()||typeof q.correctAnswer!=='string'||!q.correctAnswer.trim()||!types.includes(q.type)) throw new Error('Câu hỏi thiếu nội dung, đáp án hoặc có mã/số thứ tự trùng lặp.');
    ids.add(q.id);numbers.add(q.number);
    if(q.points!==undefined&&(!Number.isFinite(q.points)||q.points<0))throw new Error('Điểm câu hỏi không hợp lệ.');
    if(q.options!==undefined&&(!Array.isArray(q.options)||q.options.some((o:any)=>!o||typeof o.label!=='string'||typeof o.text!=='string')))throw new Error('Phương án trả lời không hợp lệ.');
    if(q.type==='multiple_choice'&&(!q.options||q.options.length<2||new Set(q.options.map((o:any)=>o.label)).size!==q.options.length||!q.options.some((o:any)=>o.label.trim().toUpperCase()===q.correctAnswer.trim().toUpperCase())))throw new Error('Đáp án trắc nghiệm phải khớp một phương án duy nhất.');
  }
}
export function normalizeAnalysis(value: any): ExamAnalysis {
  if(!value||!value.examMetadata||typeof value.examMetadata.title!=='string')throw new Error('Thiếu thông tin tiêu đề hoặc ma trận đề thi.');
  validateQuestions(value.questions);
  const result={...value, examMetadata:{...value.examMetadata,totalQuestions:value.questions.length}};
  for(const key of ['subjects','topics','sections','questionTypes','learningObjectives','knowledgeUnits','skills','formulas','laws','theorems','principles','constraints','warnings']) result[key]=Array.isArray(value[key])?value[key]:[];
  result.difficultyLevels=value.difficultyLevels||{recognitionCount:0,comprehensionCount:0,applicationCount:0,advancedApplicationCount:0};
  result.scoringStructure=value.scoringStructure||{pointsPerQuestionType:{},total:value.examMetadata.totalPoints||10};
  return result;
}
export function pendingValidation(q: OriginalQuestion, message='Câu hỏi chưa được kiểm định đầy đủ.'):QuestionValidation {
  return {questionId:q.id,questionNumber:q.number,status:'WARNING',knowledgeCheck:'Chưa xác nhận',formulaCheck:'Chưa xác nhận',lawOrRuleCheck:'Chưa xác nhận',conditionCheck:'Chưa xác nhận',solutionCheck:'Chưa xác nhận',answerCheck:'Chưa xác nhận',difficultyCheck:'Chưa xác nhận',gradeLevelCheck:'Chưa xác nhận',message};
}
export function completeValidation(questions:VariantQuestion[], evaluations:unknown):QuestionValidation[]{
  const list=Array.isArray(evaluations)?evaluations:[];
  const checks=['knowledgeCheck','formulaCheck','lawOrRuleCheck','conditionCheck','solutionCheck','answerCheck','difficultyCheck','gradeLevelCheck'];
  return questions.map(q=>{const matches=list.filter(v=>v?.questionId===q.id);const v=matches[0];return matches.length===1&&['PASS','FAIL','WARNING'].includes(v.status)&&checks.every(k=>typeof v[k]==='string'&&v[k].trim())?{...v,questionNumber:q.number}:pendingValidation(q);});
}
export function overallStatus(evaluations:QuestionValidation[]):GeneratedExam['overallValidationStatus']{
  return evaluations.some(v=>v.status==='FAIL')?'FAIL':!evaluations.length||evaluations.some(v=>v.status!=='PASS')?'WARNING':'PASS';
}
export function scorePractice(questions:VariantQuestion[],answers:Record<number,string>){
  const graded=questions.filter(q=>q.type==='multiple_choice'&&q.options?.some(o=>o.label.trim().toUpperCase()===q.correctAnswer.trim().toUpperCase()));
  const weight=(q:VariantQuestion)=>q.points??1;
  const possible=graded.reduce((n,q)=>n+weight(q),0);
  const correct=graded.filter(q=>(answers[q.number]||'').trim().toUpperCase()===q.correctAnswer.trim().toUpperCase());
  const earned=correct.reduce((n,q)=>n+weight(q),0);
  return {score:possible>0?Math.round(earned/possible*100)/10:null,correct:correct.length,graded:graded.length,manual:questions.length-graded.length};
}
