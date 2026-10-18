// Ditado (wfd) — PRD §9.2. Alinhamento por LCS de palavras: +1 por palavra
// correta; score = acertos/total; extras e omissões mapeadas; tags `missed:`.
// Módulo puro.

import { tokenizeWords } from "./coverage";

export const MISSED_TAGS_MAX = 5;

export type WordStatus = "hit" | "missed";

export interface DictationWord {
  word: string; // normalizado (minúsculas, sem pontuação)
  status: WordStatus;
}

export interface DictationResult {
  /** 0–100: acertos / palavras do alvo */
  score: number;
  hits: number;
  total: number;
  /** palavras na resposta que não pertencem ao alvo */
  extras: number;
  /** palavras do alvo omitidas ou erradas (ordem do alvo) */
  missed: string[];
  /** alvo com status por palavra (para destacar na UI) */
  words: DictationWord[];
  tags: string[];
}

interface LcsPath {
  /** índices do alvo casados, em ordem */
  targetHits: number[];
}

/** Backtracking de LCS: quais posições do alvo casam com a resposta, em ordem. */
function lcsTargetHits(answer: readonly string[], target: readonly string[]): LcsPath {
  const n = target.length;
  const m = answer.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      const diagonal =
        (target[i] ?? "") === (answer[j] ?? "\u0000") ? (dp[i + 1]?.[j + 1] ?? 0) + 1 : 0;
      dp[i]![j] = Math.max(diagonal, dp[i + 1]?.[j] ?? 0, dp[i]?.[j + 1] ?? 0);
    }
  }
  const targetHits: number[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    const diagonal =
      (target[i] ?? "") === (answer[j] ?? "\u0000") ? (dp[i + 1]?.[j + 1] ?? 0) + 1 : 0;
    if ((target[i] ?? "") === (answer[j] ?? "\u0000") && dp[i]?.[j] === diagonal) {
      targetHits.push(i);
      i += 1;
      j += 1;
    } else if ((dp[i + 1]?.[j] ?? 0) >= (dp[i]?.[j + 1] ?? 0)) {
      i += 1;
    } else {
      j += 1;
    }
  }
  return { targetHits };
}

export function gradeDictation(answer: string, target: string): DictationResult {
  const targetTokens = tokenizeWords(target);
  const answerTokens = tokenizeWords(answer);
  const { targetHits } = lcsTargetHits(answerTokens, targetTokens);
  const hitSet = new Set(targetHits);
  const words: DictationWord[] = targetTokens.map((token, index) => ({
    word: token,
    status: hitSet.has(index) ? "hit" : "missed",
  }));
  const missed = words.filter((w) => w.status === "missed").map((w) => w.word);
  const hits = targetHits.length;
  const extras = Math.max(0, answerTokens.length - hits);
  const score = targetTokens.length === 0 ? 0 : Math.round((hits / targetTokens.length) * 100);
  const tags = missed.slice(0, MISSED_TAGS_MAX).map((word) => `missed:${word}`);
  return { score, hits, total: targetTokens.length, extras, missed, words, tags };
}
