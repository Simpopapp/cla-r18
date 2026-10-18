// Pack studie-plus — glossário EN → pt-BR (PRD §13.2).
// Dados em src/data/plus/glossary.json, carregados só com recurso ativo.
// Lookup exato; sem lematização; miss → null ("Tradução não disponível").

export interface GlossaryEntry {
  /** 1–3 palavras pt-BR, minúsculas, ≤ 60 chars, sem pontuação final. */
  literal: string;
  /** ≤ 80 chars, ≠ literal, só quando acrescenta (colocação, falso amigo). */
  contextual?: string;
}

export type Glossary = Record<string, GlossaryEntry>;

export const GLOSSARY_MISS = "Tradução não disponível";

/** Normaliza a palavra consultada (apóstrofo tipográfico, pontuação externa). */
function normalizeLookup(word: string): string {
  return word
    .replaceAll("\u2019", "'")
    .toLowerCase()
    .replace(/^[^\w'-]+|[^\w'-]+$/g, "");
}

/** Tradução exata ou null — nunca tradução inventada. */
export function lookupWord(glossary: Glossary, word: string): GlossaryEntry | null {
  return glossary[normalizeLookup(word)] ?? null;
}
