// Meta (data + alvo) — PRD §9.5. Sempre na escala 10–90; data por calendário
// local (hoje = 0; passado = null). Módulo puro.

import { dayKey, daysBetween } from "./dates";

/** Dias de calendário local até a prova. Hoje = 0; data passada/inválida = null. */
export function daysUntil(examDate: string, now: number): number | null {
  const diff = daysBetween(dayKey(now), examDate);
  if (Number.isNaN(diff)) return null;
  return diff < 0 ? null : diff;
}

/**
 * Rótulo do countdown: "Faltam N dias — alvo X" · "A prova é hoje!" ·
 * null sem data (ou data já passada — o rótulo some, nunca vira negativo).
 */
export function countdownLabel(
  examDate: string | null,
  targetScore: number,
  now: number,
): string | null {
  if (!examDate) return null;
  const days = daysUntil(examDate, now);
  if (days === null) return null;
  if (days === 0) return "A prova é hoje!";
  return `Faltam ${days} ${days === 1 ? "dia" : "dias"} — alvo ${targetScore}`;
}

/** Veredito vs. alvo, sempre na escala 10–90 (nunca nota oficial). */
export function targetVerdict(estimate: number | null, target: number): string {
  if (estimate === null) return "sem estimativa ainda — pratique para gerar a primeira";
  const gap = estimate - target;
  if (gap >= 0) return `${gap} ponto${gap === 1 ? "" : "s"} acima do alvo`;
  return `${-gap} ponto${gap === -1 ? "" : "s"} abaixo do alvo`;
}
