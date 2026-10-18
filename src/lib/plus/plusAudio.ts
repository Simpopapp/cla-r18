// Pack studie-plus — matriz campo × tipo × fase (PRD §13.1.4/§13.2).
// A matriz decide onde o pack atua; nenhum componente decide por conta própria.
// Regras: só campos visíveis ao aluno naquela fase; campo que é chave da resposta
// (transcript do ditado, answers do answer_short) só no resultado; áudio de frase
// nunca duplica o áudio nativo do mesmo campo (transcrições tocadas 1×, turnos do
// sgd, pergunta falada do answer_short, spoken do lst_hiw, sentence do wfd).

import type { TaskType } from "@/lib/pte/types";

export type PlusPhase = "pre" | "post";

export interface PlusFieldPolicy {
  /** tradução por frase habilitada neste campo nesta fase */
  phraseTranslation: boolean;
  /** áudio de pronúncia da frase em inglês (nunca em campo com áudio nativo) */
  phraseAudio: boolean;
}

interface FieldRule {
  phase: PlusPhase;
  /** o app já reproduz este texto em áudio → sem áudio de frase */
  nativeAudio: boolean;
}

// campo → regra, por tipo (campos derivados/curtos — keywords, options, alt —
// ficam fora do pack por decisão registrada: fragmentos curtos, cobertos pelo
// glossário quando renderizados com PlusWordText).
const POLICY: Record<TaskType, Record<string, FieldRule>> = {
  // read_aloud/rts: o app oferece o modelo TTS do texto completo (mesma
  // granularidade) → sem áudio de frase; lst_fib: o template é tocado em áudio.
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

/** Política do campo na fase — all-false quando o campo não existe na fase.
 *  Campos de array usam índice: "turns[0]", "paragraphs[2]" → base "turns". */
export function plusFieldPolicy(type: TaskType, field: string, phase: PlusPhase): PlusFieldPolicy {
  const rule = POLICY[type]?.[baseField(field)];
  if (!rule || rule.phase !== phase) return { phraseTranslation: false, phraseAudio: false };
  return { phraseTranslation: true, phraseAudio: !rule.nativeAudio };
}

/** true se o campo existe na matriz para a fase (habilita bolha de palavra). */
export function plusWordPolicy(type: TaskType, field: string, phase: PlusPhase): boolean {
  const rule = POLICY[type]?.[baseField(field)];
  return rule !== undefined && rule.phase === phase;
}

/** "turns[3]" → "turns" (o índice identifica o item, não muda a política). */
function baseField(field: string): string {
  return field.replace(/\[\d+\]$/, "");
}

/** Campos elegíveis por tipo (para os pipelines de extração). */
export function eligibleFields(
  type: TaskType,
): { field: string; phase: PlusPhase; nativeAudio: boolean }[] {
  return Object.entries(POLICY[type] ?? {}).map(([field, rule]) => ({
    field,
    phase: rule.phase,
    nativeAudio: rule.nativeAudio,
  }));
}
