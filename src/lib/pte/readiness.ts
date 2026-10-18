// Prontidão vs. alvo — PRD §9.5. Mesma escala da estimativa (10–90), nunca
// misturada com nota de exercício. Cobertura do banco NÃO entra no índice;
// "variedade" é indicador textual secundário. Módulo puro.

import { SKILLS_OF_TYPE } from "./estimate";
import type { Confidence } from "./estimate";
import type { Skill, TaskType } from "./types";

export type ReadinessLabel = "no-alvo" | "quase" | "em-progresso" | "distante" | "sem-dados";

export const READINESS_LABELS: Record<ReadinessLabel, string> = {
  "no-alvo": "No alvo",
  quase: "Quase lá",
  "em-progresso": "Em progresso",
  distante: "Distante",
  "sem-dados": "Dados insuficientes",
};

export interface Readiness {
  label: ReadinessLabel;
  /** estimate − target (escala 10–90); null sem dados. */
  gap: number | null;
}

/**
 * Gap ≥ 0 "No alvo" · −5 a 0 "Quase lá" · −15 a −5 "Em progresso" · < −15
 * "Distante". Confiança baixa → "Dados insuficientes" explícito.
 */
export function readinessOf(
  estimate: number | null,
  target: number,
  confidence: Confidence,
): Readiness {
  if (estimate === null || confidence === "baixa") return { label: "sem-dados", gap: null };
  const gap = estimate - target;
  if (gap >= 0) return { label: "no-alvo", gap };
  if (gap > -5) return { label: "quase", gap };
  if (gap > -15) return { label: "em-progresso", gap };
  return { label: "distante", gap };
}

/** Tipos que contribuem para uma habilidade (matriz oficial). */
export function typesOfSkill(skill: Skill): TaskType[] {
  return (Object.keys(SKILLS_OF_TYPE) as TaskType[]).filter((type) =>
    (SKILLS_OF_TYPE[type] as readonly Skill[]).includes(skill),
  );
}

export interface Variety {
  tried: number;
  total: number;
}

/**
 * Variedade (§9.5): tipos distintos tentados nos últimos 30 dias ÷ tipos da
 * habilidade. Indicador textual secundário — nunca entra na estimativa.
 */
export function varietyOf(typesAttemptedSince: ReadonlySet<TaskType>, skill: Skill): Variety {
  const relevant = typesOfSkill(skill);
  let tried = 0;
  for (const type of relevant) {
    if (typesAttemptedSince.has(type)) tried += 1;
  }
  return { tried, total: relevant.length };
}
