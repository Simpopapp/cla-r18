// Pack studie-plus — segmentação de frases (PRD §13.2).
// Splitting puro; marcadores de lacuna {{n}} permanecem presos à frase.

const ABBREVIATIONS = new Set(["e.g", "i.e", "etc", "vs", "Dr", "Mr", "Mrs", "Ms", "St"]);

/** Divide o texto em frases (., !, ? seguidos de espaço/fim). */
export function splitSentences(text: string): string[] {
  const trimmed = text.trim();
  if (trimmed === "") return [];
  const out: string[] = [];
  let current = "";
  const chars = [...trimmed];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    current += ch;
    if (ch === "." || ch === "!" || ch === "?") {
      // marcador de lacuna/abreviação não fecha frase
      if (ch === "." && /\{\{\d+\}\}$/.test(current)) continue;
      const next = chars[i + 1];
      const isBoundary = next === undefined || next === " " || next === "\n";
      if (isBoundary && !ABBREVIATIONS.has(lastWord(current))) {
        out.push(current.trim());
        current = "";
      }
    }
  }
  if (current.trim() !== "") out.push(current.trim());
  return out;
}

function lastWord(s: string): string {
  const m = /([\w]+)\.?$/.exec(s);
  return m?.[1] ?? "";
}

export function sentenceCount(text: string): number {
  return splitSentences(text).length;
}
