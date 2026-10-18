// Estimativa 10–90 por habilidade — PRD §9.5. Rótulo obrigatório: "estimativa
// de treino". Cada tentativa pontua TODAS as habilidades do seu tipo (limitação
// declarada), com a mesma nota. Janela por habilidade: últimas 60 tentativas
// com score dos últimos 45 dias, peso exponencial por recência (meia-vida
// 14 dias) × peso de proveniência. Módulo puro.

import { TASK_MATRIX, ESTIMATE_SCALE } from "./skillMatrix";
import type { QuestionMeta } from "./manifest";
import type { Attempt, AppState } from "@/lib/storage";
import type { Skill, TaskType } from "./types";

export const ESTIMATE_WINDOW_ATTEMPTS = 60;
export const ESTIMATE_WINDOW_DAYS = 45;
export const ESTIMATE_HALF_LIFE_DAYS = 14;

/** Peso de proveniência na estimativa (PRD §6.2/§9.5). */
export const PROVENANCE_WEIGHT = { verificada: 1, comunitaria: 0.85 } as const;

export type Confidence = "baixa" | "media" | "alta";

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  baixa: "baixa",
  media: "média",
  alta: "alta",
};

export function confidenceOf(n: number): Confidence {
  if (n < 10) return "baixa";
  if (n < 30) return "media";
  return "alta";
}

/** Mapa monotônico 0–100 → 10–90 (§9.5): clamp(round(10 + 0,8·pct)). */
export function estimateSkill(pct: number): number {
  const raw = Math.round(10 + 0.8 * pct);
  return Math.min(ESTIMATE_SCALE.max, Math.max(ESTIMATE_SCALE.min, raw));
}

export const SKILLS_OF_TYPE: Record<TaskType, readonly Skill[]> = Object.fromEntries(
  TASK_MATRIX.map((row) => [row.slug, row.skills]),
) as unknown as Record<TaskType, readonly Skill[]>;

const DAY_MS = 86_400_000;
const HALF_LIFE_MS = ESTIMATE_HALF_LIFE_DAYS * DAY_MS;
const WINDOW_MS = ESTIMATE_WINDOW_DAYS * DAY_MS;

export interface SkillEstimate {
  /** null quando não há tentativas pontuadas na janela. */
  estimate: number | null;
  confidence: Confidence;
  /** média das 10 mais recentes − média das 10 anteriores; null se n < 20. */
  trend: number | null;
  n: number;
}

/** Média das 10 mais recentes − média das 10 anteriores (null se n < 20). */
export function trendOf(scoresInRecencyOrder: readonly number[]): number | null {
  if (scoresInRecencyOrder.length < 20) return null;
  const recent = scoresInRecencyOrder.slice(0, 10);
  const previous = scoresInRecencyOrder.slice(10, 20);
  const mean = (list: readonly number[]): number =>
    list.reduce((acc, v) => acc + v, 0) / list.length;
  return mean(recent) - mean(previous);
}

function weightedAverage(entries: readonly { score: number; weight: number }[]): number {
  let weightSum = 0;
  let valueSum = 0;
  for (const entry of entries) {
    weightSum += entry.weight;
    valueSum += entry.score * entry.weight;
  }
  return weightSum === 0 ? 0 : valueSum / weightSum;
}

/**
 * Estimativa por habilidade (§9.5). `meta` fornece tipo e proveniência por qid
 * (manifesto); tentativas de questões fora do manifesto são ignoradas — nunca
 * inventam habilidade.
 */
export function skillEstimates(
  state: AppState,
  now: number,
  meta: readonly QuestionMeta[],
): Record<Skill, SkillEstimate> {
  const metaById = new Map(meta.map((m) => [m.id, m]));
  const pools: Record<Skill, { score: number; weight: number }[]> = {
    speaking: [],
    writing: [],
    reading: [],
    listening: [],
  };
  const recentScores: Record<Skill, number[]> = {
    speaking: [],
    writing: [],
    reading: [],
    listening: [],
  };

  for (let i = state.attempts.length - 1; i >= 0; i -= 1) {
    const attempt: Attempt = state.attempts[i] as Attempt;
    if (attempt.score === null) continue;
    if (now - attempt.ts > WINDOW_MS) continue;
    const info = metaById.get(attempt.qid);
    if (!info) continue;
    const ageWeight = Math.pow(2, -(now - attempt.ts) / HALF_LIFE_MS);
    const weight = ageWeight * (PROVENANCE_WEIGHT[info.provenance] ?? 1);
    for (const skill of SKILLS_OF_TYPE[attempt.type]) {
      const pool = pools[skill];
      if (pool.length < ESTIMATE_WINDOW_ATTEMPTS) {
        pool.push({ score: attempt.score, weight });
        recentScores[skill].push(attempt.score);
      }
    }
  }

  const build = (skill: Skill): SkillEstimate => {
    const pool = pools[skill];
    if (pool.length === 0) {
      return { estimate: null, confidence: "baixa", trend: null, n: 0 };
    }
    return {
      estimate: estimateSkill(weightedAverage(pool)),
      confidence: confidenceOf(pool.length),
      trend: trendOf(recentScores[skill] as number[]),
      n: pool.length,
    };
  };

  return {
    speaking: build("speaking"),
    writing: build("writing"),
    reading: build("reading"),
    listening: build("listening"),
  };
}
