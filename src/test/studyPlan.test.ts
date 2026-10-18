import { describe, expect, it } from "vitest";

import { buildDailyPlan, PLAN_MIN_GOAL, planSummary, priorityOf } from "@/lib/pte/studyPlan";
import type { QuestionMeta } from "@/lib/pte/manifest";
import { emptyState } from "@/lib/storage";
import type { AppState } from "@/lib/storage";

const DAY_MS = 86_400_000;
const NOW = 1_800_000_000_000;

let seq = 0;
function meta(type: QuestionMeta["type"]): QuestionMeta {
  seq += 1;
  return {
    id: `p${seq}`,
    type,
    section: type === "wfd" ? "listening" : "speaking",
    domain: "teste",
    provenance: "verificada",
  };
}

function due(id: string): { id: string; lastScore: number; lastAttemptAt: number; dueAt: number } {
  return { id, lastScore: 50, lastAttemptAt: NOW - DAY_MS, dueAt: NOW - 1 };
}

describe("buildDailyPlan — metas especiais", () => {
  it("meta 0 → plano desligado com mensagem", () => {
    const state = emptyState();
    state.settings.dailyGoal = 0;
    const plan = buildDailyPlan(state, NOW, []);
    expect(plan.status).toBe("off");
    expect(plan.total).toBe(0);
    expect(plan.message).toBeTruthy();
  });

  it("meta < 4 → abaixo do mínimo, plano vazio", () => {
    const state = emptyState();
    state.settings.dailyGoal = PLAN_MIN_GOAL - 1;
    const plan = buildDailyPlan(state, NOW, []);
    expect(plan.status).toBe("below-min");
    expect(plan.counts).toEqual({});
    expect(plan.message).toContain(String(PLAN_MIN_GOAL));
  });
});

describe("buildDailyPlan — distribuição", () => {
  it("vencidas primeiro, com teto de 60% da meta", () => {
    const wfdItems = Array.from({ length: 8 }, () => meta("wfd"));
    const state = emptyState();
    state.settings.dailyGoal = 10;
    state.questions = {};
    for (const item of wfdItems) {
      state.questions[item.id] = {
        attempts: 1,
        bestScore: 50,
        lastScore: 50,
        lastAttemptAt: NOW - DAY_MS,
        strongAttempts: 0,
        box: 0,
        dueAt: NOW - 1,
      };
    }
    const plan = buildDailyPlan(state, NOW, wfdItems);
    expect(plan.status).toBe("ok");
    expect(plan.total).toBeLessThanOrEqual(10);
    // 8 vencidas em estoque, mas teto de 60% de 10 = 6; nenhuma nova disponível
    expect(plan.counts["wfd"]).toBe(6);
  });

  it("respeita o estoque real e o teto de 40% por tipo", () => {
    const items = Array.from({ length: 10 }, () => meta("wfd"));
    const state = emptyState();
    state.settings.dailyGoal = 20;
    const plan = buildDailyPlan(state, NOW, items);
    expect(plan.total).toBeLessThanOrEqual(10); // estoque
    expect(plan.counts["wfd"] ?? 0).toBeLessThanOrEqual(Math.floor(20 * 0.4));
  });

  it("mistura vencidas e novas de tipos diferentes", () => {
    const wfdItems = [meta("wfd"), meta("wfd"), meta("wfd")];
    const raItems = Array.from({ length: 5 }, () => meta("read_aloud"));
    const state = emptyState();
    state.settings.dailyGoal = 10;
    state.questions = {
      [wfdItems[0]!.id]: {
        attempts: 1,
        bestScore: 50,
        lastScore: 50,
        lastAttemptAt: NOW - DAY_MS,
        strongAttempts: 0,
        box: 0,
        dueAt: NOW - 1,
      },
    };
    const plan = buildDailyPlan(state, NOW, [...wfdItems, ...raItems]);
    expect(plan.status).toBe("ok");
    // estoque: wfd 3 (1 vencida + 2 novas/fracas) · read_aloud 5 → teto por tipo 4
    expect(plan.total).toBe(7);
    expect(plan.bySection.listening).toBe(3);
    expect(plan.bySection.speaking).toBe(4);
    // a vencida entra (prioridade máxima dentro do tipo)
    expect((plan.counts["wfd"] ?? 0) >= 1).toBe(true);
  });
});

describe("priorityOf", () => {
  it("sem dados usa o fator neutro 1,5", () => {
    const state: AppState = emptyState();
    const estimates = {
      speaking: { estimate: null, confidence: "baixa", trend: null, n: 0 },
      writing: { estimate: null, confidence: "baixa", trend: null, n: 0 },
      reading: { estimate: null, confidence: "baixa", trend: null, n: 0 },
      listening: { estimate: null, confidence: "baixa", trend: null, n: 0 },
    } as ReturnType<typeof import("@/lib/pte/estimate").skillEstimates>;
    expect(priorityOf("read_aloud", estimates, 65)).toBe(1.5);
    void state;
  });
});

describe("planSummary", () => {
  it("resume por seção com rótulos pt-BR", () => {
    const summary = planSummary({
      status: "ok",
      counts: { wfd: 2, read_aloud: 2 },
      bySection: { listening: 2, speaking: 2, writing: 0, reading: 0 },
      total: 4,
    });
    expect(summary).toContain("Hoje: 4 questões");
    expect(summary).toContain("Ouvir 2");
    expect(summary).toContain("Falar 2");
  });
  it("plano vazio tem resumo claro", () => {
    expect(
      planSummary({
        status: "off",
        counts: {},
        bySection: { speaking: 0, writing: 0, reading: 0, listening: 0 },
        total: 0,
      }),
    ).toBe("Hoje: sem plano");
  });
});
