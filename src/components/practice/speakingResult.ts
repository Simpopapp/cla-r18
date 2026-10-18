// Painel de fala — resultado compartilhado dos 7 tipos — PRD §9.3.
// SEMPRE mostra: Conteúdo · Fluência (proxy rotulado) · "Pronúncia: não
// avaliada" + aviso fixo sobre o otimismo do reconhecedor do navegador.

import type { ScoreResultView } from "./ScorePanel";
import { speakingScore } from "@/lib/pte/speaking";

/** Aviso fixo do painel de fala (PRD §9.3). */
export const SPEAKING_HONESTY_NOTE =
  "O reconhecedor do navegador pode corrigir palavras para as mais prováveis — a nota tende a ficar otimista.";

export interface SpeakingResultInput {
  /** 0–100; null = sem nota (treino sem nota / referência insuficiente) */
  content: number | null;
  /** proxy de fluência 0–100; null = sem transcrição suficiente */
  fluency: number | null;
  /** motivo exibido quando não há nota (sempre explicado, nunca erro mudo) */
  noScoreReason?: string | undefined;
  /** linhas de explicação das penalidades */
  details?: string[];
}

export function buildSpeakingResult({
  content,
  fluency,
  noScoreReason,
  details = [],
}: SpeakingResultInput): ScoreResultView {
  const score = content !== null && fluency !== null ? speakingScore(content, fluency) : null;
  const parts = [...details];
  if (noScoreReason) parts.push(noScoreReason);
  parts.push(SPEAKING_HONESTY_NOTE);
  return {
    score,
    subscores: [
      { label: "Conteúdo", value: content },
      { label: "Fluência (proxy)", value: fluency },
      { label: "Pronúncia", value: null },
    ],
    feedback: parts.join(" "),
  };
}
