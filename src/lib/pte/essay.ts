// Write Essay — PRD §9.4. Estrutura (≥ 3 parágrafos), cobertura de keywords
// e ajuste de tamanho: round(100·(0,5·cobertura + 0,3·estrutura + 0,2·ajuste)).
// Rotulado "estimativa de forma/conteúdo" — gramática e ortografia não avaliadas.
// Módulo puro.

import { countWords, keywordCoverage } from "./coverage";

export const ESSAY_MIN_WORDS = 200;
export const ESSAY_MAX_WORDS = 300;
/** Tolerância do ajuste de tamanho (0,5 dentro dela, 0 além). */
export const ESSAY_NEAR_MARGIN = 30;

export const ESSAY_MIN_PARAGRAPHS = 3;
/** Parágrafos ≥ 3 → 100 · 2 → 50 · 1 → 20 (§9.4: estrutura ≥ 3 parágrafos). */
export const STRUCTURE_FULL = 100;
export const STRUCTURE_TWO = 50;
export const STRUCTURE_ONE = 20;

export const WEIGHT_CONTENT = 0.5;
export const WEIGHT_STRUCTURE = 0.3;
export const WEIGHT_SIZE = 0.2;

export interface EssayResult {
  /** null = prompt sem keywords → referência insuficiente, sem nota */
  score: number | null;
  /** cobertura de keywords (0–100) ou null */
  content: number | null;
  /** nota de estrutura (0–100) */
  structure: number;
  paragraphs: number;
  words: number;
  /** fator de ajuste de tamanho (1 · 0,5 · 0) */
  sizeFactor: number;
  tags: string[];
  feedback?: string | undefined;
}

export function essayParagraphs(text: string): number {
  return text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter((part) => part !== "").length;
}

export function essayStructureScore(paragraphs: number): number {
  if (paragraphs >= ESSAY_MIN_PARAGRAPHS) return STRUCTURE_FULL;
  if (paragraphs === 2) return STRUCTURE_TWO;
  return STRUCTURE_ONE;
}

export function essaySizeFactor(words: number): number {
  if (words >= ESSAY_MIN_WORDS && words <= ESSAY_MAX_WORDS) return 1;
  if (
    (words >= ESSAY_MIN_WORDS - ESSAY_NEAR_MARGIN && words < ESSAY_MIN_WORDS) ||
    (words > ESSAY_MAX_WORDS && words <= ESSAY_MAX_WORDS + ESSAY_NEAR_MARGIN)
  ) {
    return 0.5;
  }
  return 0;
}

export function gradeEssay(text: string, keywords?: readonly string[]): EssayResult {
  const words = countWords(text);
  const paragraphs = essayParagraphs(text);
  const structure = essayStructureScore(paragraphs);
  const sizeFactor = essaySizeFactor(words);
  const activeKeywords = (keywords ?? []).filter((k) => k.trim() !== "");
  const content = activeKeywords.length === 0 ? null : keywordCoverage(activeKeywords, text).pct;
  const tags: string[] = [];
  if (words < ESSAY_MIN_WORDS || words > ESSAY_MAX_WORDS) tags.push("forma");
  let score: number | null = null;
  let feedback: string | undefined;
  if (content !== null) {
    const weighted =
      WEIGHT_CONTENT * (content / 100) +
      WEIGHT_STRUCTURE * (structure / 100) +
      WEIGHT_SIZE * sizeFactor;
    score = Math.round(100 * weighted);
  } else {
    feedback = "Referência insuficiente — sem nota.";
  }
  return {
    score,
    content,
    structure,
    paragraphs,
    words,
    sizeFactor,
    tags,
    feedback:
      feedback ??
      (tags.includes("forma")
        ? `Fora da zona de ${ESSAY_MIN_WORDS}–${ESSAY_MAX_WORDS} palavras (${words}) — ajuste de tamanho reduz a nota.`
        : undefined),
  };
}
