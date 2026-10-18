// Detector de template (local, sem IA) — PRD §9.4.
// Sinais: (a) taxa de 4-gramas repetidos > 0,15; (b) ≥ 3 frases com o mesmo
// início de 2 palavras; (c) ≥ 2 acertos de frases-modelo genéricas públicas.
// Ativo só com ≥ 40 palavras; ≥ 2 sinais → aviso. NUNCA altera o score.
// Módulo puro.

import { normalizeText, tokenizeWords } from "./coverage";

export const TEMPLATE_MIN_WORDS = 40;
export const NGRAM_SIZE = 4;
export const NGRAM_REPEAT_THRESHOLD = 0.15;
export const SAME_START_MIN = 3;
export const TEMPLATE_PHRASE_MIN_HITS = 2;

/** Lista curta e PÚBLICA de frases-modelo genéricas (§9.4c). */
export const TEMPLATE_PHRASES: readonly string[] = [
  "in today's world",
  "in this modern era",
  "plays a vital role",
  "plays a significant role",
  "it is important to note that",
  "first and foremost",
  "last but not least",
  "in conclusion",
  "to sum up",
  "on the one hand",
  "on the other hand",
  "every coin has two sides",
  "with the advent of technology",
  "in a nutshell",
];

export interface TemplateVerdict {
  likelyTemplate: boolean;
  reasons: string[];
  words: number;
  signals: number;
}

/** Taxa de 4-gramas repetidos: ocorrências além da 1ª / total de 4-gramas. */
export function ngramRepeatRate(tokens: readonly string[]): number {
  if (tokens.length < NGRAM_SIZE) return 0;
  const counts = new Map<string, number>();
  let total = 0;
  for (let i = 0; i + NGRAM_SIZE <= tokens.length; i += 1) {
    const gram = tokens.slice(i, i + NGRAM_SIZE).join(" ");
    counts.set(gram, (counts.get(gram) ?? 0) + 1);
    total += 1;
  }
  let repeated = 0;
  for (const count of counts.values()) {
    if (count > 1) repeated += count - 1;
  }
  return total === 0 ? 0 : repeated / total;
}

/** Maior grupo de frases que compartilham as 2 primeiras palavras. */
export function sameStartSentences(text: string): number {
  const sentences = text
    .split(/[.!?]+\s|\n+/)
    .map((part) => part.trim())
    .filter((part) => part !== "");
  const starts = new Map<string, number>();
  let max = 0;
  for (const sentence of sentences) {
    const tokens = tokenizeWords(sentence);
    if (tokens.length < 2) continue;
    const start = `${tokens[0]} ${tokens[1]}`;
    const count = (starts.get(start) ?? 0) + 1;
    starts.set(start, count);
    max = Math.max(max, count);
  }
  return max;
}

export function templatePhraseHits(text: string): string[] {
  const normalized = normalizeText(text);
  return TEMPLATE_PHRASES.filter((phrase) => normalized.includes(normalizeText(phrase)));
}

export function detectTemplate(text: string): TemplateVerdict {
  const tokens = tokenizeWords(text);
  const words = tokens.length;
  const reasons: string[] = [];
  let signals = 0;
  if (words >= TEMPLATE_MIN_WORDS) {
    const rate = ngramRepeatRate(tokens);
    if (rate > NGRAM_REPEAT_THRESHOLD) {
      signals += 1;
      reasons.push(`${Math.round(rate * 100)}% de 4-gramas repetidos`);
    }
    const startMax = sameStartSentences(text);
    if (startMax >= SAME_START_MIN) {
      signals += 1;
      reasons.push(`${startMax} frases começam com as mesmas 2 palavras`);
    }
    const hits = templatePhraseHits(text);
    if (hits.length >= TEMPLATE_PHRASE_MIN_HITS) {
      signals += 1;
      reasons.push(`${hits} frases-modelo genéricas`);
    }
  }
  return { likelyTemplate: signals >= 2, reasons, words, signals };
}
