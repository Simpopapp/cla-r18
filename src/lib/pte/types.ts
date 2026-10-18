// Contratos de dados do banco — PRD §5. Fonte única de verdade dos tipos.
// Nada aqui importa runtime: módulo puro, seguro para SSR e testes.

export type Section = "speaking" | "writing" | "reading" | "listening";
export type Skill = Section; // mesmas 4 etiquetas; papéis distintos (onde treina × o que pontua)

export const SECTIONS: readonly Section[] = ["speaking", "writing", "reading", "listening"];

export type TaskType =
  | "read_aloud"
  | "repeat_sentence"
  | "describe_image"
  | "retell_lecture"
  | "answer_short"
  | "sgd"
  | "rts"
  | "swt"
  | "write_essay"
  | "read_fib_dropdown"
  | "read_mcq_multi"
  | "reorder_paragraphs"
  | "read_fib_drag"
  | "read_mcq_single"
  | "sst"
  | "lst_mcq_multi"
  | "lst_fib"
  | "lst_hcs"
  | "lst_mcq_single"
  | "lst_smw"
  | "lst_hiw"
  | "wfd";

export const TASK_TYPES = [
  "read_aloud",
  "repeat_sentence",
  "describe_image",
  "retell_lecture",
  "answer_short",
  "sgd",
  "rts",
  "swt",
  "write_essay",
  "read_fib_dropdown",
  "read_mcq_multi",
  "reorder_paragraphs",
  "read_fib_drag",
  "read_mcq_single",
  "sst",
  "lst_mcq_multi",
  "lst_fib",
  "lst_hcs",
  "lst_mcq_single",
  "lst_smw",
  "lst_hiw",
  "wfd",
] as const satisfies readonly TaskType[];

// Proveniência: "ia" não existe (R6/N2 — nenhuma questão gerada por IA).
export type Provenance = "verificada" | "comunitaria";

export interface SourceRef {
  domain: string;
  url?: string;
  license?: string;
  attribution?: string;
}

export interface QuestionBase {
  id: string;
  type: TaskType;
  topic?: string;
  source: SourceRef;
  provenance: Provenance;
}

// ---- `data` por tipo (§5.1): cada texto guardado uma única vez; o resto é derivado em catalog.ts ----

export interface ReadAloudData {
  text: string;
}
export interface RepeatSentenceData {
  transcript: string;
}
export interface DescribeImageData {
  image: string; // caminho em public/di/
  alt: string;
  facts: string[];
  keywords: string[];
  sample?: string;
}
export interface LectureRetellData {
  transcript: string;
  keywords: string[];
  sample?: string;
}
export interface AnswerShortData {
  question: string;
  answers: string[];
}
export interface SgdData {
  turns: { speaker: string; text: string }[];
  keywords: string[];
  sample?: string;
}
export interface RtsData {
  scenario: string;
  keywords?: string[];
  sample?: string;
}
export interface SwtData {
  text: string;
  keywords: string[];
  sample?: string;
}
export interface EssayData {
  prompt: string;
  keywords?: string[];
  sample?: string;
}
export interface WfdData {
  sentence: string;
}
export interface FibDropdownData {
  passage: string; // com marcadores {{1}}…
  blanks: { options: string[]; answer: number }[];
}
export interface FibDragData {
  passage: string; // com {{n}}
  bank: string[];
  answers: number[]; // índice no bank por lacuna
}
export interface ReadMcqData {
  passage: string;
  question: string;
  options: string[];
  answer: number | number[]; // single: number; multi: number[]
  explanation?: string;
  traps?: string[];
}
export interface ReorderData {
  paragraphs: string[]; // na ordem correta
}
export interface LstMcqData {
  transcript: string;
  question: string;
  options: string[];
  answer: number | number[];
  explanation?: string;
}
export interface LstFibData {
  template: string; // com {{n}}
  answers: string[];
}
export interface LstHcsData {
  transcript: string;
  options: string[]; // resumos
  answer: number;
  explanation?: string;
}
export interface LstSmwData {
  transcript: string; // até o bipe
  options: string[];
  answer: number;
}
export interface LstHiwData {
  spoken: string;
  shown: string; // texto na tela com discrepâncias
}

export interface QuestionMap {
  read_aloud: ReadAloudData;
  repeat_sentence: RepeatSentenceData;
  describe_image: DescribeImageData;
  retell_lecture: LectureRetellData;
  answer_short: AnswerShortData;
  sgd: SgdData;
  rts: RtsData;
  swt: SwtData;
  write_essay: EssayData;
  read_fib_dropdown: FibDropdownData;
  read_mcq_multi: ReadMcqData;
  reorder_paragraphs: ReorderData;
  read_fib_drag: FibDragData;
  read_mcq_single: ReadMcqData;
  sst: LectureRetellData;
  lst_mcq_multi: LstMcqData;
  lst_fib: LstFibData;
  lst_hcs: LstHcsData;
  lst_mcq_single: LstMcqData;
  lst_smw: LstSmwData;
  lst_hiw: LstHiwData;
  wfd: WfdData;
}

export type QuestionData = QuestionMap[TaskType];
export type Question = QuestionBase & { data: QuestionData };
