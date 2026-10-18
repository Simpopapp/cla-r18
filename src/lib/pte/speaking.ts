// Correção de fala — Motor A — PRD §9.3. Módulo puro: sem I/O, seguro para
// SSR e testes (C1). Toda heurística é rotulada na UI (proxy de fluência;
// pronúncia nunca é avaliada — D5). Constantes nomeadas: cada penalidade é
// explicável no painel de resultado.

import { keywordCoverage, tokenizeWords } from "./coverage";

// Penalidades do alinhamento (PRD §9.3, constantes nomeadas).
export const EXTRA_PENALTY = 0.25; // por palavra extra no falado
export const REPEAT_PENALTY = 0.1; // por repetição adjacente no falado
export const NEAR_SUBSTITUTION_RATIO = 0.75; // razão de Levenshtein p/ substituição
export const CREDIT_HIT = 1;
export const CREDIT_SUBSTITUTED = 0.5;
export const CREDIT_MOVED = 0.5;

// Conteúdo por cobertura exige referência mínima (PRD §9.3): abaixo disso,
// "referência insuficiente — sem nota".
export const MIN_KEYWORDS_FOR_CONTENT = 4;

// Proxy de fluência (PRD §9.3): 100 − 15·pausas longas − 10·repetições − ritmo.
export const FLUENCY_LONG_PAUSE_PENALTY = 15;
export const FLUENCY_REPETITION_PENALTY = 10;
export const FLUENCY_PACE_MIN_WPM = 120;
export const FLUENCY_PACE_MAX_WPM = 160;
export const FLUENCY_PACE_PENALTY_PER_WPM = 0.5;
export const FLUENCY_PACE_PENALTY_CAP = 30;

// Nota do exercício = média de conteúdo e fluência (rotulada "estimativa").
export const SPEAKING_CONTENT_WEIGHT = 0.5;
export const SPEAKING_FLUENCY_WEIGHT = 0.5;

export type WordStatus = "hit" | "missed" | "substituted" | "moved";

export interface AlignedWord {
  word: string;
  status: WordStatus;
}

export interface AlignmentResult {
  /** cada palavra da referência com o status no alinhamento */
  words: AlignedWord[];
  total: number;
  credits: number;
  extras: number;
  repetitions: number;
  /** 0–100 com penalidades aplicadas e piso 0 */
  content: number;
}

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min((prev[j] ?? 0) + 1, (curr[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
    }
    prev = curr;
  }
  return prev[b.length] ?? 0;
}

/** 1 − distância/max(len) — 1 = idênticas. */
export function levenshteinRatio(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - levenshteinDistance(a, b) / max;
}

/**
 * Alinhamento referência × falado (read_aloud, repeat_sentence): LCS exato
 * primeiro; sobras emparelhadas em ordem (substituição próxima); depois
 * "moved" (a palavra existe, mas fora de posição). Créditos: hit 1,0 ·
 * substituição 0,5 · moved 0,5; extras e repetições penalizam; piso 0.
 */
export function alignSpeech(reference: string, spoken: string): AlignmentResult {
  const ref = tokenizeWords(reference);
  const spokenTokens = tokenizeWords(spoken);
  const words: AlignedWord[] = ref.map((word) => ({ word, status: "missed" }));
  const spokenUsed = Array.from<boolean>({ length: spokenTokens.length }).fill(false);

  // 1) LCS exato → hits
  const m = ref.length;
  const n = spokenTokens.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array.from<number>({ length: n + 1 }).fill(0),
  );
  for (let i = 1; i <= m; i++) {
    const row = dp[i];
    if (!row) continue;
    for (let j = 1; j <= n; j++) {
      const rTok = ref[i - 1] ?? "";
      const sTok = spokenTokens[j - 1] ?? "";
      row[j] =
        rTok === sTok
          ? (dp[i - 1]?.[j - 1] ?? 0) + 1
          : Math.max(dp[i - 1]?.[j] ?? 0, dp[i]?.[j - 1] ?? 0);
    }
  }
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    const rTok = ref[i - 1] ?? "";
    const sTok = spokenTokens[j - 1] ?? "";
    if (rTok === sTok && dp[i]?.[j] === (dp[i - 1]?.[j - 1] ?? 0) + 1) {
      const hitWord = words[i - 1];
      if (hitWord) hitWord.status = "hit";
      spokenUsed[j - 1] = true;
      i--;
      j--;
    } else if ((dp[i - 1]?.[j] ?? 0) >= (dp[i]?.[j - 1] ?? 0)) {
      i--;
    } else {
      j--;
    }
  }

  // 2) sobras em ordem: substituição próxima (razão ≥ 0,75)
  let refRest = words.map((w, idx) => (w.status === "missed" ? idx : -1)).filter((idx) => idx >= 0);
  let spokenRest = spokenUsed.map((used, idx) => (used ? -1 : idx)).filter((idx) => idx >= 0);
  const pairs = Math.min(refRest.length, spokenRest.length);
  for (let t = 0; t < pairs; t++) {
    const rIdx = refRest[t];
    const sIdx = spokenRest[t];
    if (rIdx === undefined || sIdx === undefined) continue;
    if (levenshteinRatio(ref[rIdx] ?? "", spokenTokens[sIdx] ?? "") >= NEAR_SUBSTITUTION_RATIO) {
      const target = words[rIdx];
      if (target) target.status = "substituted";
      spokenUsed[sIdx] = true;
    }
  }

  // 3) "moved": palavra da referência presente nas sobras do falado, fora de posição
  refRest = words.map((w, idx) => (w.status === "missed" ? idx : -1)).filter((idx) => idx >= 0);
  spokenRest = spokenUsed.map((used, idx) => (used ? -1 : idx)).filter((idx) => idx >= 0);
  for (const rIdx of refRest) {
    const sIdx = spokenRest.find((s) => !spokenUsed[s] && spokenTokens[s] === ref[rIdx]);
    if (sIdx !== undefined) {
      const target = words[rIdx];
      if (target) target.status = "moved";
      spokenUsed[sIdx] = true;
    }
  }

  // 4) extras = palavras do falado não consumidas
  const extras = spokenUsed.filter((used) => !used).length;

  // 5) repetições adjacentes no falado ("the the") — reconhecedor tropeça
  let repetitions = 0;
  for (let t = 1; t < spokenTokens.length; t++) {
    if ((spokenTokens[t] ?? "") === (spokenTokens[t - 1] ?? "") && spokenTokens[t] !== undefined) {
      repetitions++;
    }
  }

  const credits = words.reduce((sum, w) => {
    if (w.status === "hit") return sum + CREDIT_HIT;
    if (w.status === "substituted") return sum + CREDIT_SUBSTITUTED;
    if (w.status === "moved") return sum + CREDIT_MOVED;
    return sum;
  }, 0);

  const raw = credits - EXTRA_PENALTY * extras - REPEAT_PENALTY * repetitions;
  const content =
    ref.length === 0 ? 0 : Math.max(0, Math.round((Math.max(0, raw) / ref.length) * 100));

  return { words, total: ref.length, credits, extras, repetitions, content };
}

export interface FluencyInput {
  /** palavras por minuto; null = sem transcrição suficiente (fluência não avaliada) */
  wpm: number | null;
  longPauses: number;
  repetitions: number;
}

/**
 * Proxy de fluência rotulado (PRD §9.3, D5): penalidade fixa por pausa longa
 * e repetição + penalidade proporcional de ritmo fora de 120–160 wpm (cap).
 */
export function fluencyProxy({ wpm, longPauses, repetitions }: FluencyInput): number | null {
  if (wpm === null) return null;
  let pace = 0;
  if (wpm < FLUENCY_PACE_MIN_WPM) {
    pace = (FLUENCY_PACE_MIN_WPM - wpm) * FLUENCY_PACE_PENALTY_PER_WPM;
  } else if (wpm > FLUENCY_PACE_MAX_WPM) {
    pace = (wpm - FLUENCY_PACE_MAX_WPM) * FLUENCY_PACE_PENALTY_PER_WPM;
  }
  pace = Math.min(FLUENCY_PACE_PENALTY_CAP, Math.round(pace));
  const value = Math.round(
    100 - FLUENCY_LONG_PAUSE_PENALTY * longPauses - FLUENCY_REPETITION_PENALTY * repetitions - pace,
  );
  return Math.max(0, value);
}

/** Nota do exercício (0–100): média de conteúdo e fluência — rotulada estimativa. */
export function speakingScore(content: number, fluency: number): number {
  return Math.max(
    0,
    Math.round(SPEAKING_CONTENT_WEIGHT * content + SPEAKING_FLUENCY_WEIGHT * fluency),
  );
}

export interface ContentCoverage {
  /** 0–100 de cobertura das keywords */
  content: number;
  missing: string[];
}

/**
 * Conteúdo por cobertura de keywords (retell_lecture, sgd, rts, describe_image).
 * null = referência insuficiente (< 4 keywords) — "sem nota", nunca inventar.
 */
export function contentFromKeywords(
  keywords: readonly string[],
  spoken: string,
): ContentCoverage | null {
  const effective = keywords.filter((k) => tokenizeWords(k).length > 0);
  if (effective.length < MIN_KEYWORDS_FOR_CONTENT) return null;
  const coverage = keywordCoverage(effective, spoken);
  return { content: coverage.pct, missing: coverage.missing };
}

/**
 * answer_short: resposta reconhecida contém uma das respostas (sequência de
 * palavras normalizada, cobrindo sinônimos da lista) → true. Hesitação/vazio
 * → false (o motor informa "resposta não capturada").
 */
export function answerShortMatch(recognized: string, answers: readonly string[]): boolean {
  const spoken = tokenizeWords(recognized);
  if (spoken.length === 0) return false;
  for (const answer of answers) {
    const target = tokenizeWords(answer);
    if (target.length === 0) continue;
    for (let start = 0; start + target.length <= spoken.length; start++) {
      if (target.every((word, k) => spoken[start + k] === word)) return true;
    }
  }
  return false;
}

/** Repetições adjacentes no falado ("the the") — entra no proxy de fluência. */
export function countAdjacentRepetitions(text: string): number {
  const tokens = tokenizeWords(text);
  let count = 0;
  for (let i = 1; i < tokens.length; i++) {
    if (tokens[i] === tokens[i - 1]) count++;
  }
  return count;
}
