// Pack studie-plus — tokenização de palavras (PRD §13.2/§13.3).
// Splitting puro; sem lematização inventada — miss → tradução não disponível.

const WORD_RE = /^[a-z]+(-[a-z]+)*$/;

/** Normaliza apóstrofo tipográfico e remove pontuação externa. */
export function normalizeWordToken(raw: string): string {
  const cleaned = raw.replaceAll("\u2019", "'").toLowerCase();
  // pontuação externa ( vírgulas, aspas, hifens soltos… ) sem tocar apóstrofo interno
  const stripped = cleaned.replace(/^[^\w']+|[^\w']+$/g, "");
  return stripped;
}

/** Palavras do texto já normalizadas (minúsculas, sem pontuação externa). */
export function splitWords(text: string): string[] {
  return text
    .split(/\s+/)
    .map(normalizeWordToken)
    .filter((w) => WORD_RE.test(w) && w.length >= 2 && w.length <= 30);
}
