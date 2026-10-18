// Cobertura de palavras-chave e normalização de tokens — PRD §9.3/§9.4.
// Módulo puro: sem I/O, seguro para SSR e testes (C1).

const APOSTROPHES = /[\u2018\u2019\u02BC]/g;

/** C6: minúsculas, apóstrofo tipográfico → reto, pontuação → espaço, espaços colapsados. */
export function normalizeText(text: string): string {
  return text
    .replace(APOSTROPHES, "'")
    .toLowerCase()
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Tokens de palavras (sem pontuação), na ordem original. */
export function tokenizeWords(text: string): string[] {
  const normalized = normalizeText(text);
  if (normalized === "") return [];
  return normalized.split(" ");
}

/**
 * stemLite — redução simples de inflexão (§9.3): possessivo, -ing, -ed e
 * plurais simples (-ies → -y, -sses → -ss, -s final). Nunca inventa raízes:
 * só corta sufixos com regras nomeadas e deduplica consoante dupla.
 */
export function stemLite(word: string): string {
  let w = word
    .replace(APOSTROPHES, "'")
    .toLowerCase()
    .replace(/[^a-z']/g, "");
  w = w.replace(/'s$/, "").replace(/'+$/, "").replace(/^'+/, "");
  const dedupDouble = () => {
    if (w.length >= 3 && w[w.length - 1] === w[w.length - 2]) w = w.slice(0, -1);
  };
  if (w.length > 5 && w.endsWith("ing")) {
    w = w.slice(0, -3);
    dedupDouble();
  } else if (w.length > 4 && w.endsWith("ed")) {
    w = w.slice(0, -2);
    dedupDouble();
  }
  if (w.endsWith("ies") && w.length > 4) {
    w = `${w.slice(0, -3)}y`;
  } else if (w.length > 5 && w.endsWith("sses")) {
    w = w.slice(0, -2);
  } else if (w.length > 3 && w.endsWith("s")) {
    w = w.slice(0, -1);
  }
  // "-e" mudo final: só em palavras longas terminadas em consoante + e
  // (change→chang, house→hous). Palavras curtas (the, one, have) ficam intactas.
  if (
    w.length > 4 &&
    w.endsWith("e") &&
    w[w.length - 2] !== undefined &&
    !"aeiou".includes(w[w.length - 2] ?? "")
  ) {
    w = w.slice(0, -1);
  }
  return w;
}

export interface KeywordCoverage {
  covered: number;
  total: number;
  /** 0–100; keywords vazias → 100 (nada a cobrir) */
  pct: number;
  missing: string[];
}

/**
 * Cobertura de keywords no texto: cada keyword (frase ou palavra) conta como
 * coberta quando TODAS as suas palavras (com stemLite) aparecem no texto.
 * keywords vazias → 100% e nenhuma faltante (chamador decide o que isso significa).
 */
export function keywordCoverage(keywords: readonly string[], text: string): KeywordCoverage {
  const stems = new Set(tokenizeWords(text).map(stemLite));
  let covered = 0;
  const missing: string[] = [];
  for (const keyword of keywords) {
    const parts = tokenizeWords(keyword).map(stemLite);
    if (parts.length === 0) continue;
    const hit = parts.every((part) => stems.has(part));
    if (hit) covered += 1;
    else missing.push(keyword);
  }
  const total = keywords.filter((k) => tokenizeWords(k).length > 0).length;
  return {
    covered,
    total,
    pct: total === 0 ? 100 : Math.round((covered / total) * 100),
    missing,
  };
}

/** Contagem de palavras (tokens normalizados). */
export function countWords(text: string): number {
  return tokenizeWords(text).length;
}
