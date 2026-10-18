// Pack studie-plus — configuração (PRD §13.1/§13.2).
// Três recursos independentes, todos false por padrão: as 8 combinações são válidas.
// Tradução = significado em pt-BR (texto escrito); áudio = pronúncia do inglês original.

export interface PlusSettings {
  wordTranslation: boolean;
  phraseTranslation: boolean;
  plusAudio: boolean;
}

export const DEFAULT_PLUS_SETTINGS: PlusSettings = {
  wordTranslation: false,
  phraseTranslation: false,
  plusAudio: false,
};

export const PLUS_TOGGLES: readonly {
  key: keyof PlusSettings;
  label: string;
  description: string;
}[] = [
  {
    key: "wordTranslation",
    label: "Tradução por palavra",
    description: "Toque em uma palavra para ver o significado em português (texto escrito).",
  },
  {
    key: "phraseTranslation",
    label: "Tradução por frase",
    description: "Toque em uma frase para ver a tradução literal e o sentido geral.",
  },
  {
    key: "plusAudio",
    label: "Áudio de pronúncia",
    description: "Botão 🔊 fala o inglês original — nunca a tradução.",
  },
];

export function normalizePlusSettings(raw: unknown): PlusSettings {
  if (typeof raw !== "object" || raw === null) return { ...DEFAULT_PLUS_SETTINGS };
  const obj = raw as Record<string, unknown>;
  return {
    wordTranslation: obj["wordTranslation"] === true,
    phraseTranslation: obj["phraseTranslation"] === true,
    plusAudio: obj["plusAudio"] === true,
  };
}

/** true quando qualquer recurso do pack está ativo (controla o carregamento dos dados). */
export function plusEnabled(p: PlusSettings): boolean {
  return p.wordTranslation || p.phraseTranslation || p.plusAudio;
}
