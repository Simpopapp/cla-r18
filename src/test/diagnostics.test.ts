import { describe, expect, it } from "vitest";

import {
  errorBreakdown,
  errorTrend,
  failedAttempts,
  tagFamily,
  topMissedWords,
  worstTopics,
} from "@/lib/pte/diagnostics";
import type { QuestionMeta } from "@/lib/pte/manifest";
import { emptyState } from "@/lib/storage";
import type { Attempt } from "@/lib/storage";

const DAY_MS = 86_400_000;
const NOW = 1_800_000_000_000;

function attempt(
  qid: string,
  type: Attempt["type"],
  score: number | null,
  ageDays: number,
  tags?: string[],
): Attempt {
  return {
    id: `a-${qid}-${ageDays}-${score ?? "x"}`,
    qid,
    type,
    ts: NOW - ageDays * DAY_MS,
    score,
    mode: "practice",
    ...(tags ? { tags } : {}),
  };
}

const META: QuestionMeta[] = [
  {
    id: "q1",
    type: "wfd",
    section: "listening",
    domain: "educação",
    topic: "escola",
    provenance: "verificada",
  },
  {
    id: "q2",
    type: "wfd",
    section: "listening",
    domain: "educação",
    topic: "escola",
    provenance: "verificada",
  },
  {
    id: "q3",
    type: "read_aloud",
    section: "speaking",
    domain: "ciência",
    provenance: "verificada",
  },
];

describe("errorBreakdown", () => {
  it("conta só notas abaixo do passScore, por tag e por tipo", () => {
    const state = emptyState();
    state.attempts = [
      attempt("q1", "wfd", 50, 0, ["missed:however", "missed:theory"]),
      attempt("q2", "wfd", 90, 0), // aprovada — fora
      attempt("q3", "read_aloud", 60, 0, ["conteudo", "fluencia"]),
      attempt("q3", "read_aloud", null, 0), // sem score — fora
      attempt("q1", "wfd", 10, 30, ["forma"]), // fora da janela de 14 dias
    ];
    const breakdown = errorBreakdown(state, NOW, 14);
    expect(breakdown.total).toBe(2);
    expect(breakdown.byType["wfd"]).toBe(1);
    expect(breakdown.byType["read_aloud"]).toBe(1);
    expect(breakdown.byTag["missed"]).toBe(2);
    expect(breakdown.byTag["conteudo"]).toBe(1);
    expect(breakdown.byTag["forma"]).toBeUndefined();
  });
});

describe("tagFamily", () => {
  it("agrupa prefixos em famílias", () => {
    expect(tagFamily("missed:casa")).toBe("missed");
    expect(tagFamily("trap:2")).toBe("trap");
    expect(tagFamily("template")).toBe("template");
  });
});

describe("topMissedWords", () => {
  it("rankeia palavras por frequência no log inteiro", () => {
    const state = emptyState();
    state.attempts = [
      attempt("q1", "wfd", 50, 1, ["missed:however", "missed:theory"]),
      attempt("q2", "wfd", 55, 2, ["missed:however"]),
      attempt("q3", "read_aloud", 60, 0, ["conteudo"]),
    ];
    const top = topMissedWords(state, 5);
    expect(top[0]).toEqual({ word: "however", count: 2 });
    expect(top[1]).toEqual({ word: "theory", count: 1 });
    expect(top).toHaveLength(2);
  });
});

describe("errorTrend", () => {
  it("média diária de erros na janela", () => {
    const state = emptyState();
    state.attempts = [attempt("q1", "wfd", 40, 0), attempt("q2", "wfd", 45, 0)];
    expect(errorTrend(state, NOW, 14)).toBeCloseTo(2 / 14, 10);
  });
});

describe("worstTopics", () => {
  it("usa topic ?? domain e ordena pela pior média", () => {
    const state = emptyState();
    state.attempts = [
      attempt("q1", "wfd", 30, 0),
      attempt("q2", "wfd", 90, 0),
      attempt("q3", "read_aloud", 60, 0),
    ];
    const worst = worstTopics(state, 5, META);
    expect(worst[0]?.topic).toBe("escola"); // média 60
    expect(worst[1]?.topic).toBe("ciência"); // média 60, desempate por n
    expect(worst[0]?.avg).toBe(60);
  });
});

describe("failedAttempts", () => {
  it("filtra por janela e passScore", () => {
    const state = emptyState();
    state.attempts = [
      attempt("q1", "wfd", 84, 0), // abaixo de 85 → falha
      attempt("q1", "wfd", 85, 0), // no limite → aprova
      attempt("q1", "wfd", 50, 20), // fora da janela
    ];
    expect(failedAttempts(state, NOW, 14)).toHaveLength(1);
  });
});
