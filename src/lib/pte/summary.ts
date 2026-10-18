// Sumários (swt e sst) — PRD §9.4. Validador de frase única (swt), zonas de
// tamanho e fator de forma do sst; conteúdo = cobertura de keywords.
// Módulo puro.

import { countWords, keywordCoverage } from "./coverage";

export const SWT_MIN_WORDS = 5;
export const SWT_MAX_WORDS = 75;
/** Forma inválida limita o score (§9.4). */
export const SWT_FORM_MAX_SCORE = 40;

export const SST_MIN_WORDS = 50;
export const SST_MAX_WORDS = 70;
export const SST_FORM_TOLERANCE = 10;
export const SST_NEAR_FACTOR = 0.8;
export const SST_FAR_FACTOR = 0.5;

export interface SentenceCheck {
  valid: boolean;
  reason: string | null;
}

/**
 * Validador de frase única do swt: exatamente 1 ponto final terminal
 * (. ! ?). Marcas de citação/parêntese após o terminador são aceitas.
 * (Validador simples e honesto: abreviações com ponto contam como terminador.)
 */
export function checkSingleSentence(text: string): SentenceCheck {
  const trimmed = text.trim();
  if (trimmed === "") return { valid: false, reason: "resposta vazia" };
  const terminators = trimmed.match(/[.!?]/g) ?? [];
  if (terminators.length !== 1) {
    return { valid: false, reason: `exatamente 1 ponto final (achados: ${terminators.length})` };
  }
  if (!/[.!?]["')\]]?$/.test(trimmed)) {
    return { valid: false, reason: "deve terminar com o ponto final" };
  }
  return { valid: true, reason: null };
}

export interface SummaryResult {
  /** null = sem keywords no banco → referência insuficiente, sem nota */
  score: number | null;
  /** cobertura de keywords (0–100) ou null */
  content: number | null;
  words: number;
  formValid: boolean;
  tags: string[];
  feedback?: string | undefined;
}

function coverageOrNullOr100(keywords: readonly string[], text: string): number | null {
  if (keywords.filter((k) => k.trim() !== "").length === 0) return null;
  return keywordCoverage(keywords, text).pct;
}

export function gradeSwt(text: string, keywords: readonly string[]): SummaryResult {
  const words = countWords(text);
  const sentence = checkSingleSentence(text);
  const inZone = words >= SWT_MIN_WORDS && words <= SWT_MAX_WORDS;
  const formValid = sentence.valid && inZone;
  const content = coverageOrNullOr100(keywords, text);
  const tags: string[] = [];
  if (!formValid) tags.push("forma");
  let score: number | null = null;
  if (content !== null) {
    const rounded = Math.round(content);
    score = formValid ? rounded : Math.min(rounded, SWT_FORM_MAX_SCORE);
  }
  const reasons: string[] = [];
  if (!sentence.valid) reasons.push(sentence.reason ?? "");
  if (!inZone) reasons.push(`${words} palavras (zona ${SWT_MIN_WORDS}–${SWT_MAX_WORDS})`);
  return {
    score,
    content,
    words,
    formValid,
    tags,
    feedback:
      formValid || reasons.length === 0
        ? undefined
        : `Forma inválida (${reasons.join("; ")}) — nota limitada a ${SWT_FORM_MAX_SCORE}.`,
  };
}

/** Fator de forma do sst: na zona 1,0 · ±10 palavras 0,8 · além disso 0,5. */
export function sstFormFactor(words: number): number {
  if (words >= SST_MIN_WORDS && words <= SST_MAX_WORDS) return 1;
  if (words >= SST_MIN_WORDS - SST_FORM_TOLERANCE && words <= SST_MAX_WORDS + SST_FORM_TOLERANCE) {
    return SST_NEAR_FACTOR;
  }
  return SST_FAR_FACTOR;
}

export function gradeSst(text: string, keywords: readonly string[]): SummaryResult {
  const words = countWords(text);
  const factor = sstFormFactor(words);
  const content = coverageOrNullOr100(keywords, text);
  const tags = factor === 1 ? [] : ["forma"];
  const score = content === null ? null : Math.round(content * factor);
  return {
    score,
    content,
    words,
    formValid: factor === 1,
    tags,
    feedback:
      factor === 1
        ? undefined
        : `Fora da zona de ${SST_MIN_WORDS}–${SST_MAX_WORDS} palavras (${words}) — fator de forma ${factor}.`,
  };
}
