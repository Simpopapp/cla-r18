// Espelho dev-time da matriz src/lib/plus/plusAudio.ts (PRD §13.3).
// Manter em sincronia — plus-audio.test.ts compara as duas fontes.
// Editar a matriz no TS primeiro; este espelho só orienta a extração.

export const POLICY = {
  read_aloud: { text: { phase: "pre", nativeAudio: true } },
  repeat_sentence: { transcript: { phase: "post", nativeAudio: true } },
  describe_image: { facts: { phase: "pre", nativeAudio: false } },
  retell_lecture: { transcript: { phase: "post", nativeAudio: true } },
  answer_short: {
    question: { phase: "pre", nativeAudio: true },
    answers: { phase: "post", nativeAudio: false },
  },
  sgd: {
    turns: { phase: "pre", nativeAudio: true },
    sample: { phase: "post", nativeAudio: false },
  },
  rts: {
    scenario: { phase: "pre", nativeAudio: true },
    sample: { phase: "post", nativeAudio: false },
  },
  swt: {
    text: { phase: "pre", nativeAudio: false },
    sample: { phase: "post", nativeAudio: false },
  },
  write_essay: {
    prompt: { phase: "pre", nativeAudio: false },
    sample: { phase: "post", nativeAudio: false },
  },
  read_fib_dropdown: { passage: { phase: "pre", nativeAudio: false } },
  read_mcq_multi: {
    passage: { phase: "pre", nativeAudio: false },
    question: { phase: "pre", nativeAudio: false },
    explanation: { phase: "post", nativeAudio: false },
  },
  reorder_paragraphs: { paragraphs: { phase: "pre", nativeAudio: false } },
  read_fib_drag: { passage: { phase: "pre", nativeAudio: false } },
  read_mcq_single: {
    passage: { phase: "pre", nativeAudio: false },
    question: { phase: "pre", nativeAudio: false },
    explanation: { phase: "post", nativeAudio: false },
  },
  sst: {
    transcript: { phase: "post", nativeAudio: true },
    sample: { phase: "post", nativeAudio: false },
  },
  lst_mcq_multi: {
    transcript: { phase: "post", nativeAudio: true },
    explanation: { phase: "post", nativeAudio: false },
  },
  lst_fib: { template: { phase: "pre", nativeAudio: true } },
  lst_hcs: {
    transcript: { phase: "post", nativeAudio: true },
    explanation: { phase: "post", nativeAudio: false },
  },
  lst_mcq_single: {
    transcript: { phase: "post", nativeAudio: true },
    explanation: { phase: "post", nativeAudio: false },
  },
  lst_smw: { transcript: { phase: "post", nativeAudio: true } },
  lst_hiw: {
    shown: { phase: "pre", nativeAudio: false },
    spoken: { phase: "post", nativeAudio: true },
  },
  wfd: { sentence: { phase: "post", nativeAudio: true } },
};

// Prioridade de cobertura das frases (PRD §13.3.5)
export const P1 = new Set([
  "read_fib_dropdown|passage",
  "read_mcq_multi|passage",
  "read_mcq_multi|question",
  "reorder_paragraphs|paragraphs",
  "read_fib_drag|passage",
  "read_mcq_single|passage",
  "read_mcq_single|question",
  "swt|text",
  "write_essay|prompt",
]);
export const P2 = new Set([
  "read_aloud|text",
  "repeat_sentence|transcript",
  "retell_lecture|transcript",
  "sst|transcript",
  "lst_mcq_multi|transcript",
  "lst_mcq_single|transcript",
  "lst_hcs|transcript",
  "lst_smw|transcript",
  "lst_hiw|spoken",
  "wfd|sentence",
]);
export function priorityOf(type, field) {
  if (P1.has(`${type}|${field}`)) return "P1";
  if (P2.has(`${type}|${field}`)) return "P2";
  return "P3";
}
