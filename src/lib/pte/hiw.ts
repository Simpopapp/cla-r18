// Highlight Incorrect Words (lst_hiw) — PRD §9.2/§5.1.
// `wrong` = divergências spoken×shown (diff por tokens, validado em teste);
// clique marca suspeita; score = max(0, certos − falsos) / nº de erradas.
// Módulo puro.

import { normalizeText, tokenizeWords } from "./coverage";

/** Tokens exibidos (com pontuação para renderizar) — divididos por espaço. */
export function splitShownTokens(shown: string): string[] {
  return shown.split(/\s+/).filter(Boolean);
}

/** LCS entre tokens de duas listas já normalizadas; devolve pares casados. */
function lcsPairs(
  a: readonly string[],
  b: readonly string[],
): { aIndex: number; bIndex: number }[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      const diagonal = (a[i] ?? "") === (b[j] ?? "\u0000") ? (dp[i + 1]?.[j + 1] ?? 0) + 1 : 0;
      dp[i]![j] = Math.max(diagonal, dp[i + 1]?.[j] ?? 0, dp[i]?.[j + 1] ?? 0);
    }
  }
  const pairs: { aIndex: number; bIndex: number }[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    const diagonal = (a[i] ?? "") === (b[j] ?? "\u0000") ? (dp[i + 1]?.[j + 1] ?? 0) + 1 : 0;
    if ((a[i] ?? "") === (b[j] ?? "\u0000") && dp[i]?.[j] === diagonal) {
      pairs.push({ aIndex: i, bIndex: j });
      i += 1;
      j += 1;
    } else if ((dp[i + 1]?.[j] ?? 0) >= (dp[i]?.[j + 1] ?? 0)) {
      i += 1;
    } else {
      j += 1;
    }
  }
  return pairs;
}

/**
 * Índices (em `shown`) dos tokens que DIFEREM do áudio (`spoken`).
 * Mesma quantidade de tokens → comparação par a par; caso raro de quantidade
 * diferente → alinhamento por LCS e todo token de `shown` não casado (ou
 * casado com palavra diferente) é marcado como divergente.
 */
export function deriveWrongTokens(spoken: string, shown: string): number[] {
  const shownTokens = splitShownTokens(shown);
  const spokenTokens = tokenizeWords(spoken);
  const shownNormalized = shownTokens.map((token) => normalizeText(token));
  if (spokenTokens.length === shownNormalized.length) {
    return shownNormalized
      .map((token, index) => (token !== spokenTokens[index] ? index : -1))
      .filter((index) => index >= 0);
  }
  const matchedShown = new Set<number>();
  const spokenByShown = new Map<number, string>();
  for (const pair of lcsPairs(shownNormalized, spokenTokens)) {
    matchedShown.add(pair.aIndex);
    spokenByShown.set(pair.aIndex, spokenTokens[pair.bIndex] ?? "");
  }
  return shownNormalized
    .map((token, index) => {
      if (!matchedShown.has(index)) return index;
      return spokenByShown.get(index) !== token ? index : -1;
    })
    .filter((index) => index >= 0);
}

export interface HiwResult {
  /** 0–100: max(0, certos − falsos) / nº de erradas */
  score: number;
  hits: number;
  falsePositives: number;
  wrongCount: number;
  /** palavras marcadas sem ser divergência (falsos, na ordem marcada) */
  falseList: string[];
}

export function gradeHiw(
  selected: readonly number[],
  wrong: readonly number[],
  shownTokens: readonly string[],
): HiwResult {
  const wrongSet = new Set(wrong);
  let hits = 0;
  const falseList: string[] = [];
  for (const index of selected) {
    if (wrongSet.has(index)) {
      hits += 1;
    } else {
      falseList.push(shownTokens[index] ?? `#${index}`);
    }
  }
  const falsePositives = falseList.length;
  const wrongCount = wrong.length;
  const raw =
    wrongCount === 0
      ? falsePositives === 0
        ? 100
        : 0
      : (Math.max(0, hits - falsePositives) / wrongCount) * 100;
  return {
    score: Math.round(raw),
    hits,
    falsePositives,
    wrongCount,
    falseList,
  };
}
