# Multimodal V2 — interim implementation and verification report

Status: **NOT DONE; production promotion blocked.** Evidence below is from the feature branch, not production. Real Gemini connection and compact structured text extraction passed on 2026-09-08; the complete acceptance matrix has not passed.

## A. Source audit

- Existing architecture: React 19, Vite 6, TypeScript 5.8, Tailwind 4; component state and browser storage; no application login/database observed. `lint` is TypeScript checking, not an ESLint suite.
- Google Gemini remains the default provider, centrally configured. Real connection and compact structured extraction using `gemini-3.7-flash` passed on the 2026-09-08 Preview.
- Legacy import used raw DOCX text and direct client AI requests; legacy Word export used HTML `.doc`. Existing three-level workflow remains accessible.
- Baseline: TypeScript and production build passed; there was no unit test script. Baseline production commit: `fc5fe75942bf4c81136ef2a8b154a9a5a1bd2983`.

## B. Implementation

- Versioned Zod document, question, visual and exam schemas; migrate-on-read adapter for old questions; IndexedDB workspace persistence and JSON backups.
- Added `src/engine/{schema,core,import,visual,variant,ai,storage,export,sample}.ts`, block question editor and multimodal workspace.
- Added Vercel `api/ai.ts`; retained legacy UI with a shared server-side AI facade. `VITE_ENABLE_MULTIMODAL_IMPORT=false` returns the default UI to the legacy workflow.

## C. Document engine

- Signature/MIME/size checking; native PDF text extraction, per-page scan fallback, OOXML paragraphs/tables/images/basic equations, PNG/JPEG/WebP input.
- Browser DOCX round-trip: two questions, two original image assets and one table found. Image/question association is explicitly marked for teacher review.
- Explicit `Đáp án:` / `Answer:` lines now separate answer and following explanation from options/content.
- Limitations: PDF native image/vector/table reconstruction, multi-column reading order, complex OOXML numbering/merged cells, and accurate scan extraction remain incomplete or need real vision verification.

## D. LaTeX engine

- Unicode power/subscript normalization; KaTeX with mhchem, trust disabled; MathJax SVG for export rasterization.
- Formula syntax tests cover fractions, roots, powers, subscripts, vectors, matrices, integral and Greek symbols. Syntax validity is not mathematical correctness.
- Low-confidence extracted formulas require review. Complex formula recognition needs real document/vision tests.

## E. Visual engine

- Safe generated SVG for geometry, coordinate/chart and generic diagrams; original image preservation.
- Tables are the chart source; dependencies invalidate stale visuals; explicit geometry coordinates and labels synchronize from variables.
- Broad visual domains share a diagram representation; this is not a complete music/map/circuit/biology engine.

## F. Variant engine

- Subject-policy registry, immutable facts, bounded numeric mutations, stable option IDs, deterministic basic numeric solvers and at most two AI repair passes.
- Manual mismatch reproduced in browser: text AB=6 with variable/figure AB=3 was incorrectly reviewable. Fix: constrained template validation rejects stale content, explanation and options; explicit synchronization replaces derived fields only on user action.
- Conservative template validation can reject alternative manual wording. General prose semantic correctness and arbitrary subject constraints are not proven by these validators.

## G. Export

- V2 produces real DOCX and A4 PDF; student/teacher/answer modes; Unicode font; typed tables and rasterized SVG/formulas at export.
- Browser-generated teacher DOCX/PDF were opened and all two pages of each visually inspected: Vietnamese, original figure, chart, table, question numbering and shuffled answer were readable, without observed clipping.
- Formulas are images in DOCX, not editable OMML. Legacy HTML `.doc` exporter still exists. Pagination and very large tables need more coverage.

## H. Tests and evidence

Test URL: `https://bien-the-de-lp22y9t4a-quoc-dat4.vercel.app` (initial feature Preview, commit `e822ab1`). A temporary Vercel share was used for authorized browser access; its token is intentionally omitted.

| Test | Input / expected | Observed | Status |
| --- | --- | --- | --- |
| Preview startup | Open feature Preview; editor loads | V2 import workspace loaded | PASS |
| Review and shuffle | Authored two-question demo; create 3 codes | 001/002/003, no unresolved reviews after teacher confirmation | PASS |
| Refresh | Reload after creating codes | All three codes restored, recovery notice visible | PASS |
| Word export | Code 001, teacher mode | Real DOCX downloaded; two pages rendered and inspected | PASS for fixture |
| PDF export | Code 001, teacher mode | Real PDF downloaded; two pages rendered and inspected | PASS for fixture |
| Download automation | Wait for download event | Browser event timed out, but actual nonempty files synchronized and opened | Tool limitation, not a missing file |
| DOCX upload | Downloaded DOCX: 2 questions, 2 images, 1 table | Counts matched; review required; explicit answers initially merged into content | PARTIAL; parser fix added |
| Intentional mismatch | Set text AB=6 while diagram says 3 | Original Preview allowed review | FAIL reproduced; regression fix added |
| Unit regression | Schema/formula/shuffle/dependencies/variant/security/import | 21 tests pass after fixes | PASS |
| TypeScript / lint | `pnpm typecheck`, `pnpm lint` | Pass; lint aliases `tsc --noEmit` | PASS |
| Production build | `pnpm build` | Pass; existing/new large-chunk warnings remain | PASS |
| Gemini real tests 1–7 | User-provided key, explicitly authorized | Connection and compact extraction PASS; variant metadata validation rejected three codes; vision/full repair matrix incomplete | PARTIAL |
| Full multi-subject E2E | Real import → AI → validate → export | Not completed | NOT RUN |
| Mobile browser | Actual mobile viewport | Not exposed by current browser surface | NOT RUN |
| App login | Application account flow | No app authentication observed | SKIPPED |
| Production smoke | Promoted version | Production not changed | NOT RUN |

Browser logs observed extension metadata errors with `chrome-extension://` sources; these are not attributed to the application. No claim of complete network-error coverage is made.

## I. Security

- Gemini requests now run server-side; BYOK remains session-local, not committed/bundled, and old persistent key storage is removed on migration.
- Secret-free error messages/logs; upload signature and limits; no macro execution; escaped generated SVG; untrusted-document prompt boundary.
- BYOK session storage is not a server secret vault and remains subject to same-origin script/XSS risk. Public multi-tenant rate limiting and stronger key storage are future hardening work.
- Gemini API key: configuration PASS; authentication PASS; real request PASS for connection and compact text extraction; model `gemini-3.7-flash`; code security review performed, full security PASS not claimed. No credential value is recorded here.

## J. Git

- Branch: `feature/multimodal-exam-engine-v2`.
- Initial implementation commit: `e822ab12bf448166a7586a61de2166f16cdcff2c`.
- Subsequent corrections and this report are recorded in the containing commit. Generated `dist` files are deliberately excluded.

## K. Deploy

- Initial feature Preview READY: deployment `dpl_CwXyjyqT1wPcDcrN71MNFAjQPT3k`.
- Production remains `https://bien-the-de-thi.vercel.app`; no promotion authorized by passing gates yet.

## L. Limitations / next phase

Retest this corrective commit on its new Preview; real Gemini connection and seven model tests; real scan/PDF/DOCX/vision matrix; broader semantic/numeric validators; native PDF image/table reconstruction; legacy export modernization; actual mobile verification; wider export QA and old-feature regression. Promote only after all critical gates pass. This report is a checkpoint, not an acceptance certificate.

## Corrective Preview retest — 2026-09-07

- Code commit `414bc9783698e04c2e7726aaaead7a37bfd50798`, deployment `dpl_C81rYoNL4TPYHvB5S76HJwxceXe9`, Vite, READY, build approximately 36 seconds. URL: `https://bien-the-de-dggeyhosb-quoc-dat4.vercel.app`.
- Mismatch retest PASS: changed only question text AB=3 → AB=6. Review button disabled and visible template/data mismatch error displayed.
- Explicit synchronization PASS: changed variable AB to 6, clicked synchronization; content and figure label became 6, answer became `7.21110255093`, explanation recalculated; errors cleared but teacher review still required. See [browser evidence](evidence-sync.jpg).
- Teacher DOCX retest PASS for answer separation: same downloaded fixture imported, answer field `5` and original explanation now populated separately; 2 questions, 2 images, 1 table retained. Caption remains part of content and question type/metadata still need review.
- Formula export integration PASS for fixture: generated actual DOCX/PDF from shared production exporters with a real SVG rasterizer, rendered all two pages of each. Fraction, root, power/subscript, vector and Greek alpha were rendered, not raw LaTeX; no observed clipping. These integration files were generated locally, separate from the earlier browser downloads.
- Real Gemini and full acceptance gates remain blocked/not complete. No production changes.

## Real Gemini corrective testing — 2026-09-08

- Preview: `https://bien-the-de-pxhrnb0w0-quoc-dat4.vercel.app`, deployment `dpl_5WpvhBD6V5PqBNXijG44AKqCTeUN`, commit `fca474c60af9ad87f78c24dd73947097f6db2852`, READY.
- Prior full QuestionModel extraction returned sanitized HTTP 400 INVALID_ARGUMENT; complex schema was a suspected cause, not a confirmed provider diagnostic. Compact AI drafts now map deterministically into the full Zod QuestionModel; invalid answer indices and unsafe/duplicate variable names fail closed.
- Connection: user-authorized session-local key; clicked real connection test. Actual status: `Kết nối thật thành công: gemini-3.7-flash`. PASS.
- Structured extraction: manually authored Vietnamese grade-9 fraction MCQ, 1/2 + 1/4, answer B=3/4, explicit explanation. Clicked AI source analysis. Actual: one question, two LaTeX formulas, four options, B selected, original explanation preserved, teacher review required. PASS for this text fixture, not the complete document matrix.
- Three variants: reviewed original, selected subject variants, created 001/002/003. Actual: generated fraction variants, but all three were rejected by metadata-preservation validation. FAIL; no silent export success claimed.
- Follow-up fixes: retain assessment metadata from the original rather than letting AI rewrite it; exclude formulas already belonging to explanation/answer/options from standalone question-body export to prevent answer-formula leakage. These fixes need new Preview retesting.
- Local regression now includes answer-index bounds, variable-name validation, source-owned metadata and solution-formula exclusion. Production unchanged.

## Latest Preview checkpoint — 2026-09-08

- Code commit `837dd95d64725e75563005947883fb602d198f39`; deployment `dpl_k5CHC3JE7TkmH7jrANKaTky7Feym`; Vite; READY. URL: `https://bien-the-de-nmen3q0wp-quoc-dat4.vercel.app/`.
- Local gates: 24 unit tests PASS; lint/typecheck PASS; production build PASS (large-chunk warnings remain). AI requests now include a per-variant seed to avoid reusing identical cached drafts across codes. The seed unit test uses a stub only to inspect request construction; real browser Gemini tests use the authorized real key.
- Structured extraction on latest Preview: first request returned 502 PROVIDER_ERROR after 10,836 ms; one manual retry succeeded (HTTP 200, 12,963 ms, 1,129 tokens). Original fraction MCQ and answer B preserved; six collected formulas rendered, including options and explanation; review still required.
- Three-code generation: one further request succeeded (HTTP 200, 8,780 ms, 2,395 tokens), then calls returned HTTP 429 QUOTA_EXCEEDED. All 001/002/003 displayed RESOURCE_EXHAUSTED, kept data, and were not accepted as valid variants. No additional AI calls were made after confirming quota exhaustion. This is not an invalid-key diagnosis.
- Current blocker: Gemini quota/rate limit prevents completing real variant/validation/vision testing. Metadata fix and solution-formula exclusion have unit coverage but their full real-user export workflow is still NOT VERIFIED. Production unchanged; do not promote.
