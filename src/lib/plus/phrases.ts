// Pack studie-plus — frases traduzidas por questão (PRD §13.2).
// src/data/plus/phrases/<tipo>.json: { [qid]: { [campo]: (PhraseEntry|null)[] } }
// índice = posição em splitSentences(question[campo]);
// h = hash curto da frase normalizada de origem (detecta tradução obsoleta);
// null = frase sem tradução (estado honesto no card).

export interface PhraseEntry {
  /** hash curto (8 hex) da frase normalizada de origem. */
  h: string;
  /** tradução literal ≤ 400 chars. */
  l: string;
  /** sentido geral ≤ 200 chars. */
  c: string;
}

export type PhrasesFile = Record<string, Record<string, (PhraseEntry | null)[]>>;

/** Normalização canônica compartilhada com scripts/plus/merge-phrases.mjs. */
export function normalizeSentenceForHash(s: string): string {
  return s
    .replaceAll("\u2019", "'")
    .replaceAll("{{", " ")
    .replaceAll("}}", " ")
    .replace(/\d+/g, "#")
    .toLowerCase()
    .replace(/[^\w'-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** FNV-1a 32 bits → 8 hex. */
export function hashSentence(sentence: string): string {
  const normalized = normalizeSentenceForHash(sentence);
  let hash = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export interface PhraseLookupResult {
  literal: string;
  contextual: string;
}

/**
 * Tradução da frase no índice `index` ou null (ausente ou origem mudou — h não bate).
 * Nunca devolve tradução de outra frase.
 */
export function lookupPhrase(
  file: PhrasesFile | null,
  qid: string,
  field: string,
  index: number,
  sourceSentence: string,
): PhraseLookupResult | null {
  const entries = file?.[qid]?.[field];
  if (!entries) return null;
  const entry = entries[index];
  if (!entry) return null;
  if (entry.h !== hashSentence(sourceSentence)) return null;
  return { literal: entry.l, contextual: entry.c };
}
