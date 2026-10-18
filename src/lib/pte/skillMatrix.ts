// Fase 0 — Verdade oficial do PTE Academic (PRD §4).
//
// Consulta realizada em 2026-10-17 (UTC).
//
// Fontes OFICIAIS (Pearson):
//  - https://www.pearsonpte.com/pte-updates-2025/  — 20 tipos originais mantidos + 2 novos tipos no
//    Speaking & Writing: Summarize Group Discussion e Respond to a Situation, válidos para provas a
//    partir de 07/08/2025. SGD: ~3 min de áudio, resposta de ~2 minutos.
//  - https://www.pearsonpte.com/articles/pte-changes-2025-everything-you-need-to-know/ — formatos
//    originais inalterados; dois novos tipos de speaking; sem mudança de preço/entrega.
//  - https://www.pearsonpte.com/content/dam/ELL/pte/pearsonpte/research-report-pdfs/2025-07--enhanced-pte-a-report.pdf
//    — "The Enhanced PTE Academic" (Clesham & Hughes): escala 10–90 (geral e habilidades), alinhada
//    ao CEFR; seção "Ensuring Test Integrity and Increasing Human Oversight" (revisão humana).
//
// CONFIRMADO NA FONTE OFICIAL:
//  - 22 task types pontuados (20 originais + sgd + rts), a partir de 07/08/2025.
//  - 3 partes em ordem fixa: Speaking & Writing → Reading → Listening; teste de ~2 horas.
//  - Escala 10–90 para score geral e por habilidade; o geral NÃO é a média das 4 habilidades.
//
// CONFIRMADO NA FONTE OFICIAL (contagem de questões por tipo, 2026-10-17):
//  - https://www.pearsonpte.com/content/dam/ELL/pte/pearsonpte/research-report-pdfs/2025-07--enhanced-pte-a-report.pdf
//    Tabela "The Enhanced PTE Academic Test Structure": contagens fixas por tipo (coluna
//    "PTE 2025 revisions"), TOTAL = 65 questões pontuadas em 22 tipos; ~2 horas.
//    Os valores oficiais são únicos (não intervalos): min = max = count = contagem oficial.
//
// ROTULADO "APROXIMADO" (não confirmado na oficial; pearsonpte.com/test-format renderiza por JS):
//  - Tempos por questão da §4.2 do PRD e tempos por parte — corroboração secundária:
//    https://www.masterenglish.com.au/knowledge-centre/pte/pte-test-format-scoring (30/09/2026)
//    https://ptenote.com/updates/pte-academic-exam-pattern-2/ (17/09/2026)
//    A Fase 7 reconfere o blueprint item a item antes do simulado ser rotulado "completo".
// Revisão humana: oficial confirma ao menos retell_lecture, swt, sst, sgd, rts; DI/WE incluídos por
// corroboração secundária (marcados abaixo).

import type { Section, Skill, TaskType } from "./types";

export interface TaskTiming {
  prepSeconds?: number;
  responseSeconds: number; // tempo máximo de resposta/fala/escrita por questão
  label: string; // rótulo pt-BR exibido (ex.: "prep 35 s · fala ≤ 40 s")
}

export interface MatrixRow {
  slug: TaskType;
  label: string;
  section: Section;
  skills: Skill[];
  timing: TaskTiming;
  /** true = tempo aproximado (rotulado na UI e no roadmap) */
  approx: boolean;
}

export const TASK_MATRIX: readonly MatrixRow[] = [
  {
    slug: "read_aloud",
    label: "Read Aloud",
    section: "speaking",
    skills: ["speaking"],
    timing: { prepSeconds: 35, responseSeconds: 40, label: "prep 35 s · fala ≤ 40 s" },
    approx: true, // Pearson: preparação 30–40 s e resposta variável; 35/40 são alocações de treino.
  },
  {
    slug: "repeat_sentence",
    label: "Repeat Sentence",
    section: "speaking",
    skills: ["listening", "speaking"],
    timing: { responseSeconds: 15, label: "fala ≤ 15 s" },
    approx: false,
  },
  {
    slug: "describe_image",
    label: "Describe Image",
    section: "speaking",
    skills: ["speaking"],
    timing: { prepSeconds: 25, responseSeconds: 40, label: "prep 25 s · fala 40 s" },
    approx: false,
  },
  {
    slug: "retell_lecture",
    label: "Re-tell Lecture",
    section: "speaking",
    skills: ["listening", "speaking"],
    timing: { prepSeconds: 10, responseSeconds: 40, label: "prep 10 s · fala 40 s" },
    approx: false,
  },
  {
    slug: "answer_short",
    label: "Answer Short Question",
    section: "speaking",
    skills: ["listening"],
    timing: { responseSeconds: 10, label: "resposta ≤ 10 s" },
    approx: false,
  },
  {
    slug: "sgd",
    label: "Summarize Group Discussion",
    section: "speaking",
    skills: ["listening", "speaking"],
    timing: { prepSeconds: 10, responseSeconds: 120, label: "prep 10 s · fala 120 s" },
    approx: false, // Pearson test-format: preparação 10 s, resposta 120 s.
  },
  {
    slug: "rts",
    label: "Respond to a Situation",
    section: "speaking",
    skills: ["speaking"],
    timing: { prepSeconds: 10, responseSeconds: 40, label: "prep 10 s · fala 40 s" },
    approx: false, // Pearson test-format: preparação 10 s, resposta 40 s.
  },
  {
    slug: "swt",
    label: "Summarize Written Text",
    section: "writing",
    skills: ["reading", "writing"],
    timing: { responseSeconds: 600, label: "10 min · 1 frase (5–75 palavras)" },
    approx: false,
  },
  {
    slug: "write_essay",
    label: "Write Essay",
    section: "writing",
    skills: ["writing"],
    timing: { responseSeconds: 1200, label: "20 min · ensaio 200–300 palavras" },
    approx: false,
  },
  {
    slug: "read_fib_dropdown",
    label: "Reading & Writing: Fill in the Blanks (dropdown)",
    section: "reading",
    skills: ["reading"],
    timing: { responseSeconds: 90, label: "≈ 90 s por questão" },
    approx: true,
  },
  {
    slug: "read_mcq_multi",
    label: "Multiple Choice, Multiple Answers (Reading)",
    section: "reading",
    skills: ["reading"],
    timing: { responseSeconds: 120, label: "≈ 120 s por questão" },
    approx: true,
  },
  {
    slug: "reorder_paragraphs",
    label: "Re-order Paragraphs",
    section: "reading",
    skills: ["reading"],
    timing: { responseSeconds: 120, label: "≈ 120 s por questão" },
    approx: true,
  },
  {
    slug: "read_fib_drag",
    label: "Reading: Fill in the Blanks (drag-and-drop)",
    section: "reading",
    skills: ["reading"],
    timing: { responseSeconds: 120, label: "≈ 120 s por questão" },
    approx: true,
  },
  {
    slug: "read_mcq_single",
    label: "Multiple Choice, Single Answer (Reading)",
    section: "reading",
    skills: ["reading"],
    timing: { responseSeconds: 120, label: "≈ 120 s por questão" },
    approx: true,
  },
  {
    slug: "sst",
    label: "Summarize Spoken Text",
    section: "listening",
    skills: ["listening", "writing"],
    timing: { responseSeconds: 600, label: "10 min · resumo 50–70 palavras" },
    approx: false,
  },
  {
    slug: "lst_mcq_multi",
    label: "Multiple Choice, Multiple Answers (Listening)",
    section: "listening",
    skills: ["listening"],
    timing: { responseSeconds: 120, label: "≈ 120 s por questão" },
    approx: true,
  },
  {
    slug: "lst_fib",
    label: "Fill in the Blanks (Listening, digitar)",
    section: "listening",
    skills: ["listening"],
    timing: { responseSeconds: 90, label: "≈ 90 s por questão" },
    approx: true,
  },
  {
    slug: "lst_hcs",
    label: "Highlight Correct Summary",
    section: "listening",
    skills: ["listening", "reading"],
    timing: { responseSeconds: 120, label: "≈ 120 s por questão" },
    approx: true,
  },
  {
    slug: "lst_mcq_single",
    label: "Multiple Choice, Single Answer (Listening)",
    section: "listening",
    skills: ["listening"],
    timing: { responseSeconds: 120, label: "≈ 120 s por questão" },
    approx: true,
  },
  {
    slug: "lst_smw",
    label: "Select Missing Word",
    section: "listening",
    skills: ["listening"],
    timing: { responseSeconds: 60, label: "≈ 60 s por questão" },
    approx: true,
  },
  {
    slug: "lst_hiw",
    label: "Highlight Incorrect Words",
    section: "listening",
    skills: ["listening", "reading"],
    timing: { responseSeconds: 120, label: "≈ 120 s por questão" },
    approx: true,
  },
  {
    slug: "wfd",
    label: "Write From Dictation",
    section: "listening",
    skills: ["listening", "writing"],
    timing: { responseSeconds: 25, label: "≈ 25 s por questão" },
    approx: true,
  },
] as const satisfies readonly MatrixRow[];

// ---- Pesos por habilidade (derivados da matriz; PRD §4.3, D10) ----
// SKILL_WEIGHTS[s] = contribuições(s) / total de contribuições (1 por par tipo×habilidade).
// Pesos numéricos oficiais são proprietários — rotulados "peso aproximado" na UI.

function computeSkillWeights(matrix: readonly MatrixRow[]): Record<Skill, number> {
  const counts: Record<Skill, number> = { speaking: 0, writing: 0, reading: 0, listening: 0 };
  let total = 0;
  for (const row of matrix) {
    for (const skill of row.skills) {
      counts[skill] += 1;
      total += 1;
    }
  }
  return {
    speaking: counts.speaking / total,
    writing: counts.writing / total,
    reading: counts.reading / total,
    listening: counts.listening / total,
  };
}

export const SKILL_WEIGHTS: Record<Skill, number> = computeSkillWeights(TASK_MATRIX);

// Percentuais arredondados apenas para exibição (soma ≈ 100%; a fonte da verdade é SKILL_WEIGHTS).
export const SKILL_WEIGHTS_PCT: Record<Skill, number> = {
  speaking: Math.round(SKILL_WEIGHTS.speaking * 100),
  writing: Math.round(SKILL_WEIGHTS.writing * 100),
  reading: Math.round(SKILL_WEIGHTS.reading * 100),
  listening: Math.round(SKILL_WEIGHTS.listening * 100),
};

// ---- Blueprint do simulado (PRD §4.4/§12) ----
// Blueprint de referência (Pearson, coluna "PTE 2025 revisions"): 65 itens;
// o relatório diz "approximately 65", não uma contagem garantida em toda prova.
// Reconfirmação 2026-10-17: páginas oficiais /pte-academic/test-format/
// speaking-writing/, reading/, listening/. Ordem SGD→RTS segue a página atual;
// tabela do relatório lista RTS→SGD. Tempos reading/listening são alocações de
// treino por questão (a prova usa tempo por parte); seconds não inclui áudio.
// seconds = tempo de partida por questão (prep + resposta quando houver prep), aproximado.
// Tempos totais não equivalem à duração oficial; SST inclui escuta nos 10 min.

export interface BlueprintRow {
  min: number;
  max: number;
  count: number;
  seconds: number;
}

function blueprintRow(min: number, max: number, row: MatrixRow): BlueprintRow {
  const seconds = (row.timing.prepSeconds ?? 0) + row.timing.responseSeconds;
  return { min, max, count: Math.round((min + max) / 2), seconds };
}

const MATRIX_BY_SLUG = new Map<TaskType, MatrixRow>(TASK_MATRIX.map((r) => [r.slug, r]));

function bp(slug: TaskType, min: number, max: number): BlueprintRow {
  const row = MATRIX_BY_SLUG.get(slug);
  if (!row) throw new Error(`blueprint: tipo desconhecido ${slug}`);
  return blueprintRow(min, max, row);
}

export const EXAM_BLUEPRINT: Record<TaskType, BlueprintRow> = {
  read_aloud: bp("read_aloud", 6, 6),
  repeat_sentence: bp("repeat_sentence", 10, 10),
  describe_image: bp("describe_image", 5, 5),
  retell_lecture: bp("retell_lecture", 2, 2),
  answer_short: bp("answer_short", 5, 5),
  sgd: bp("sgd", 2, 2),
  rts: bp("rts", 2, 2),
  swt: bp("swt", 2, 2),
  write_essay: bp("write_essay", 1, 1),
  read_fib_dropdown: bp("read_fib_dropdown", 5, 5),
  read_mcq_multi: bp("read_mcq_multi", 2, 2),
  reorder_paragraphs: bp("reorder_paragraphs", 2, 2),
  read_fib_drag: bp("read_fib_drag", 4, 4),
  read_mcq_single: bp("read_mcq_single", 2, 2),
  sst: bp("sst", 1, 1),
  lst_mcq_multi: bp("lst_mcq_multi", 2, 2),
  lst_fib: bp("lst_fib", 2, 2),
  lst_hcs: bp("lst_hcs", 2, 2),
  lst_mcq_single: bp("lst_mcq_single", 2, 2),
  lst_smw: bp("lst_smw", 1, 1),
  lst_hiw: bp("lst_hiw", 2, 2),
  wfd: bp("wfd", 3, 3),
};

// Partes do simulado, em ordem fixa. Tempos por parte "aproximados" (corroboração secundária).
export type ExamPart = "speaking-writing" | "reading" | "listening";

export interface ExamPartSpec {
  id: ExamPart;
  label: string;
  minSeconds: number;
  maxSeconds: number;
  types: TaskType[];
}

export const EXAM_PARTS: readonly ExamPartSpec[] = [
  {
    id: "speaking-writing",
    label: "Parte 1 — Speaking & Writing",
    minSeconds: 76 * 60,
    maxSeconds: 84 * 60,
    types: [
      "read_aloud",
      "repeat_sentence",
      "describe_image",
      "retell_lecture",
      "answer_short",
      "sgd",
      "rts",
      "swt",
      "write_essay",
    ],
  },
  {
    id: "reading",
    label: "Parte 2 — Reading",
    minSeconds: 23 * 60,
    maxSeconds: 30 * 60,
    types: [
      "read_fib_dropdown",
      "read_mcq_multi",
      "reorder_paragraphs",
      "read_fib_drag",
      "read_mcq_single",
    ],
  },
  {
    id: "listening",
    label: "Parte 3 — Listening",
    minSeconds: 31 * 60,
    maxSeconds: 39 * 60,
    types: [
      "sst",
      "lst_mcq_multi",
      "lst_fib",
      "lst_hcs",
      "lst_mcq_single",
      "lst_smw",
      "lst_hiw",
      "wfd",
    ],
  },
];

// Tipos com revisão humana de respostas sinalizadas (template/repetitivas).
// Oficial confirma ao menos: retell_lecture, swt, sst, sgd, rts. DI e WE: corroboração secundária.
export const HUMAN_REVIEW_TYPES: readonly TaskType[] = [
  "describe_image",
  "retell_lecture",
  "rts",
  "sgd",
  "write_essay",
  "sst",
  "swt",
];

// Escala de estimativa de treino (única escala comparada ao alvo; PRD §1.3, D3).
export const ESTIMATE_SCALE = { min: 10, max: 90 } as const;
