// Plano do dia — PRD §9.6. Distribui a meta diária: vencidas primeiro (teto
// 60% da meta), rateadas por prioridade; novas/fracas no restante. Teto de 40%
// da meta por tipo e do estoque real. Módulo puro.

import { skillEstimates, SKILLS_OF_TYPE } from "./estimate";
import { SKILL_WEIGHTS } from "./skillMatrix";
import { isDue, PASS_SCORE_BY_TYPE } from "./srs";
import { SECTIONS, TASK_TYPES } from "./types";
import type { TaskType } from "./types";
import type { QuestionMeta } from "./manifest";
import type { AppState } from "@/lib/storage";
import type { Section, Skill } from "./types";

export const PLAN_MIN_GOAL = 4;
export const PLAN_DUE_CAP_RATIO = 0.6;
export const PLAN_TYPE_CAP_RATIO = 0.4;
/** Fator de prioridade quando a habilidade ainda não tem estimativa. */
export const PLAN_NO_DATA_FACTOR = 1.5;

export const SECTION_LABELS: Record<Section, string> = {
  speaking: "Falar",
  writing: "Escrever",
  reading: "Ler",
  listening: "Ouvir",
};

export interface DailyPlan {
  status: "off" | "below-min" | "ok";
  counts: Partial<Record<TaskType, number>>;
  bySection: Record<Section, number>;
  total: number;
  message?: string | undefined;
}

/**
 * Prioridade do tipo (§9.6): média sobre suas habilidades de
 * SKILL_WEIGHTS[h] × (1 + max(0, alvo − estimativa[h]) / 80); sem dados → 1,5.
 */
export function priorityOf(
  type: TaskType,
  estimates: ReturnType<typeof skillEstimates>,
  target: number,
): number {
  const skills = SKILLS_OF_TYPE[type] as readonly Skill[] | undefined;
  if (!skills || skills.length === 0) return PLAN_NO_DATA_FACTOR;
  let sum = 0;
  for (const skill of skills) {
    const est = estimates[skill];
    if (!est || est.estimate === null) {
      sum += PLAN_NO_DATA_FACTOR;
      continue;
    }
    sum += SKILL_WEIGHTS[skill] * (1 + Math.max(0, target - est.estimate) / 80);
  }
  return sum / skills.length;
}

/** Alocação inteira por maiores restos (empate: maior peso → ordem do catálogo). */
function allocateLargestRemainders(
  budget: number,
  weights: Partial<Record<TaskType, number>>,
  caps: Partial<Record<TaskType, number>>,
): Partial<Record<TaskType, number>> {
  const active = TASK_TYPES.filter((t) => (weights[t] ?? 0) > 0 && (caps[t] ?? 0) > 0);
  const totalWeight = active.reduce((acc, t) => acc + (weights[t] ?? 0), 0);
  const out: Partial<Record<TaskType, number>> = {};
  if (totalWeight <= 0 || budget <= 0) return out;
  let allocated = 0;
  const remainders: { type: TaskType; remainder: number }[] = [];
  for (const type of active) {
    const raw = (budget * (weights[type] ?? 0)) / totalWeight;
    const base = Math.min(Math.floor(raw), caps[type] ?? 0);
    out[type] = base;
    allocated += base;
    remainders.push({ type, remainder: raw - Math.floor(raw) });
  }
  const headroom = active.reduce((acc, t) => acc + (caps[t] ?? 0) - (out[t] ?? 0), 0);
  let left = Math.min(budget - allocated, headroom);
  remainders.sort(
    (a, b) => b.remainder - a.remainder || (weights[b.type] ?? 0) - (weights[a.type] ?? 0),
  );
  for (const { type } of remainders) {
    if (left <= 0) break;
    const current = out[type] ?? 0;
    const cap = caps[type] ?? 0;
    if (current < cap) {
      out[type] = current + 1;
      left -= 1;
    }
  }
  return out;
}

/**
 * Constrói o plano (§9.6). Meta 0 → desligado; 1–3 → abaixo do mínimo (plano
 * vazio com mensagem); ≥ 4 → distribui. Respeita `onlyVerified` e o estoque.
 */
export function buildDailyPlan(
  state: AppState,
  now: number,
  items: readonly QuestionMeta[],
): DailyPlan {
  const emptySections: Record<Section, number> = {
    speaking: 0,
    writing: 0,
    reading: 0,
    listening: 0,
  };
  const goal = state.settings.dailyGoal;
  if (goal <= 0) {
    return {
      status: "off",
      counts: {},
      bySection: emptySections,
      total: 0,
      message: "Plano desligado — defina uma meta diária em Ajustes.",
    };
  }
  if (goal < PLAN_MIN_GOAL) {
    return {
      status: "below-min",
      counts: {},
      bySection: emptySections,
      total: 0,
      message: `Meta abaixo do mínimo de ${PLAN_MIN_GOAL} questões — aumente em Ajustes para ativar o plano.`,
    };
  }

  const visible = items.filter(
    (m) => !(state.settings.onlyVerified && m.provenance !== "verificada"),
  );
  const estimates = skillEstimates(state, now, visible);
  const target = state.settings.targetScore;
  const typeCap = Math.floor(goal * PLAN_TYPE_CAP_RATIO);

  // Estoque por tipo, dividido em vencidas e novas/fracas.
  const dueStock: Partial<Record<TaskType, number>> = {};
  const restStock: Partial<Record<TaskType, number>> = {};
  for (const type of TASK_TYPES_LOCAL) {
    const pool = visible.filter((m) => m.type === type);
    const passScore = PASS_SCORE_BY_TYPE[type] ?? 75;
    let due = 0;
    let rest = 0;
    for (const item of pool) {
      const snap = state.questions[item.id];
      if (!snap || snap.attempts === 0) {
        rest += 1;
        continue;
      }
      if (isDue(snap, now)) {
        due += 1;
      } else if (snap.lastScore !== null && snap.lastScore < passScore) {
        rest += 1;
      } else {
        continue; // em dia e sem lapso — não entra no plano
      }
    }
    if (due > 0) dueStock[type] = due;
    if (rest > 0) restStock[type] = rest;
  }

  const priorities: Partial<Record<TaskType, number>> = {};
  for (const type of TASK_TYPES_LOCAL) {
    priorities[type] = priorityOf(type, estimates, target);
  }

  // 1) Vencidas primeiro, teto de 60% da meta, rateadas por prioridade.
  const dueTotal = Object.values(dueStock).reduce<number>((acc, v) => acc + (v ?? 0), 0);
  const dueBudget = Math.min(dueTotal, Math.floor(goal * PLAN_DUE_CAP_RATIO));
  const dueAlloc = allocateLargestRemainders(dueBudget, priorities, dueStock);

  // 2) Novas/fracas no restante, teto de 40% da meta por tipo (total acumulado).
  const allocatedDue = Object.values(dueAlloc).reduce<number>((acc, v) => acc + (v ?? 0), 0);
  const remaining = goal - allocatedDue;
  const restCaps: Partial<Record<TaskType, number>> = {};
  for (const type of TASK_TYPES_LOCAL) {
    const cap = Math.max(0, typeCap - (dueAlloc[type] ?? 0));
    restCaps[type] = Math.min(cap, restStock[type] ?? 0);
  }
  const restAlloc = allocateLargestRemainders(remaining, priorities, restCaps);

  const counts: Partial<Record<TaskType, number>> = {};
  const bySection: Record<Section, number> = { ...emptySections };
  let total = 0;
  for (const type of TASK_TYPES_LOCAL) {
    const n = (dueAlloc[type] ?? 0) + (restAlloc[type] ?? 0);
    if (n <= 0) continue;
    counts[type] = n;
    total += n;
    const section = SECTION_OF_TYPE[type];
    if (section) bySection[section] += n;
  }
  return { status: "ok", counts, bySection, total };
}

/** "Hoje: N questões — Falar X · Escrever Y · Ler Z · Ouvir W" (seções ativas). */
export function planSummary(plan: DailyPlan): string {
  if (plan.status !== "ok" || plan.total === 0) return "Hoje: sem plano";
  const parts = SECTIONS.filter((s) => plan.bySection[s] > 0).map(
    (s) => `${SECTION_LABELS[s]} ${plan.bySection[s]}`,
  );
  return `Hoje: ${plan.total} questões — ${parts.join(" · ")}`;
}

// ---- tipo → seção (convenção do catálogo; cada tipo pertence a uma seção) ----

const TASK_TYPES_LOCAL = TASK_TYPES;

const SECTION_OF_TYPE: Partial<Record<TaskType, Section>> = {
  read_aloud: "speaking",
  repeat_sentence: "speaking",
  describe_image: "speaking",
  retell_lecture: "speaking",
  answer_short: "speaking",
  sgd: "speaking",
  rts: "speaking",
  swt: "writing",
  write_essay: "writing",
  read_fib_dropdown: "reading",
  read_mcq_multi: "reading",
  reorder_paragraphs: "reading",
  read_fib_drag: "reading",
  read_mcq_single: "reading",
  sst: "listening",
  lst_mcq_multi: "listening",
  lst_fib: "listening",
  lst_hcs: "listening",
  lst_mcq_single: "listening",
  lst_smw: "listening",
  lst_hiw: "listening",
  wfd: "listening",
};
