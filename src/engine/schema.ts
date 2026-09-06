import { z } from 'zod';

export const confidence = z.number().min(0).max(1);
export const SourceSchema = z.object({ documentId: z.string(), page: z.number().int().positive().optional(), blockId: z.string().optional(), boundingBox: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional() });
export const FormulaSchema = z.object({ id: z.string(), rawSource: z.string(), latex: z.string(), confidence, needsReview: z.boolean(), kind: z.enum(['math', 'chemistry']).default('math') });
export const TableSchema = z.object({ id: z.string(), headers: z.array(z.string()), rows: z.array(z.array(z.string())), caption: z.string().default(''), units: z.string().default(''), mergedCells: z.array(z.object({ row: z.number().int().nonnegative(), column: z.number().int().nonnegative(), rowSpan: z.number().int().positive(), colSpan: z.number().int().positive() })).default([]) });
export const VariableSchema = z.object({ value: z.number().finite(), policy: z.enum(['IMMUTABLE', 'MUTABLE', 'DERIVED']), min: z.number().optional(), max: z.number().optional(), unit: z.string().default('') });
const baseVisual = { id: z.string(), description: z.string(), dependencies: z.array(z.string()).default([]), dependencyHash: z.string().default(''), hidden: z.boolean().default(false), confidence, needsReview: z.boolean(), source: SourceSchema.optional() };
const position = z.object({ id: z.string(), x: z.number().finite(), y: z.number().finite(), label: z.string(), xVariable: z.string().optional(), yVariable: z.string().optional() });
export const VisualSchema = z.discriminatedUnion('kind', [
  z.object({ ...baseVisual, kind: z.literal('geometry'), points: z.array(position), edges: z.array(z.object({ from: z.string(), to: z.string(), label: z.string().default(''), variable: z.string().optional() })), constraints: z.array(z.object({ type: z.enum(['perpendicular', 'parallel', 'equal']), evidence: z.string().min(1), refs: z.array(z.string()) })).default([]) }),
  z.object({ ...baseVisual, kind: z.literal('chart'), tableId: z.string(), chartType: z.enum(['bar', 'line']), labelColumn: z.number().int().nonnegative(), valueColumn: z.number().int().nonnegative() }),
  z.object({ ...baseVisual, kind: z.literal('coordinate'), points: z.array(position), lines: z.array(z.array(z.tuple([z.number(), z.number()]))).default([]) }),
  z.object({ ...baseVisual, kind: z.literal('diagram'), domain: z.enum(['physics','chemistry','biology','map','timeline','flowchart','technical','music','generic']), nodes: z.array(position), edges: z.array(z.object({ from: z.string(), to: z.string(), label: z.string().default('') })) }),
  z.object({ ...baseVisual, kind: z.literal('asset'), classification: z.enum(['ORIGINAL_ASSET','SCIENTIFIC_DIAGRAM','PHOTO','ARTWORK','MAP','UNKNOWN']), dataUrl: z.string().regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/), originalDataUrl: z.string().optional(), regenerationPolicy: z.literal('preserve') }),
]);
export const QuestionSchema = z.object({
  id: z.string().min(1), version: z.literal(2), number: z.number().int().positive(), subject: z.string(), grade: z.string(), topic: z.string().default(''), difficulty: z.string().default(''),
  type: z.enum(['single_choice','multiple_choice','true_false','short_answer','essay','fill_blank','matching','ordering','reading_comprehension','image_based','table_based','graph_based','compound_question','other']),
  source: SourceSchema, sectionId: z.string().default(''), content: z.string(), originalContent: z.string(),
  variables: z.record(z.string(), VariableSchema).default({}),
  templates: z.object({ content: z.string(), answer: z.string(), explanation: z.string(), options: z.record(z.string(), z.string()).default({}) }).optional(),
  solver: z.object({ kind: z.enum(['sum','product','ratio','pythagoras','linear']), inputs: z.array(z.string()) }).optional(),
  formulas: z.array(FormulaSchema).default([]), tables: z.array(TableSchema).default([]), visuals: z.array(VisualSchema).default([]),
  options: z.array(z.object({ id: z.string(), text: z.string() })).default([]),
  correctAnswer: z.object({ optionIds: z.array(z.string()).default([]), text: z.string().default('') }), explanation: z.string().default(''),
  immutableFacts: z.array(z.string()).default([]), dependencies: z.array(z.string()).default([]),
  validation: z.object({ status: z.enum(['pending','processing','ready','failed','needs_review']), errors: z.array(z.string()).default([]), warnings: z.array(z.string()).default([]), reviewed: z.boolean().default(false), extractionConfidence: confidence.default(0), answerConfidence: confidence.default(0) }),
});
export type QuestionModel = z.infer<typeof QuestionSchema>;
export type VisualData = z.infer<typeof VisualSchema>;
export type TableData = z.infer<typeof TableSchema>;
export const BlockSchema = z.object({ id: z.string(), type: z.enum(['text','heading','table','formula','image']), text: z.string(), source: SourceSchema, table: TableSchema.optional(), asset: VisualSchema.optional(), fontSize: z.number().optional(), bold: z.boolean().optional() });
export const DocumentSchema = z.object({ id: z.string(), version: z.literal(2), metadata: z.object({ title: z.string(), subject: z.string().default(''), grade: z.string().default(''), duration: z.string().default(''), school: z.string().default(''), academicYear: z.string().default(''), teacher: z.string().default('') }), sections: z.array(z.object({ id: z.string(), title: z.string() })), questions: z.array(QuestionSchema), assets: z.array(VisualSchema), sourcePages: z.array(z.object({ page: z.number(), width: z.number(), height: z.number(), method: z.enum(['native','vision','ooxml']) })), blocks: z.array(BlockSchema), warnings: z.array(z.string()) });
export type DocumentModel = z.infer<typeof DocumentSchema>;
export type DocumentBlock = z.infer<typeof BlockSchema>;
export const ExamSchema = z.object({ version: z.literal(2), code: z.string(), metadata: DocumentSchema.shape.metadata, sections: DocumentSchema.shape.sections, questions: z.array(QuestionSchema), answerKey: z.record(z.string(), z.string()), exportMode: z.enum(['student','with_answers','answers','teacher']).default('student') });
export type ExamModel = z.infer<typeof ExamSchema>;
