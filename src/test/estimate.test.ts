import { describe, expect, it } from "vitest";

import {
  confidenceOf,
  estimateSkill,
  PROVENANCE_WEIGHT,
  skillEstimates,
  trendOf,
} from "@/lib/pte/estimate";
import { ESTIMATE_SCALE } from "@/lib/pte/skillMatrix";
import type { QuestionMeta } from "@/lib/pte/manifest";
import { emptyState } from "@/lib/storage";
import type { AppState, Attempt } from "@/lib/storage";

const DAY_MS = 86_400_000;
const NOW = 1_800_000_000_000;

function meta(
  id: string,
  type: "read_aloud",
  provenance: QuestionMeta["provenance"],
): QuestionMeta {
  return { id, type, section: "speaking", domain: "teste", provenance };
}

function attempt(id: string, score: number, ageDays: number): Attempt {
  return {
    id: `a-${id}-${ageDays}`,
    qid: id,
    type: "read_aloud",
    ts: NOW - ageDays * DAY_MS,
    score,
    mode: "practice",
  };
}

describe("estimateSkill", () => {
  it("é monotônica e presa à escala 10–90", () => {
    expect(estimateSkill(0)).toBe(10);
    expect(estimateSkill(100)).toBe(90);
    expect(estimateSkill(50)).toBe(50);
    for (let pct = 0; pct <= 100; pct += 5) {
      const value = estimateSkill(pct);
      expect(value).toBeGreaterThanOrEqual(ESTIMATE_SCALE.min);
      expect(value).toBeLessThanOrEqual(ESTIMATE_SCALE.max);
      expect(value).toBeGreaterThanOrEqual(estimateSkill(Math.max(0, pct - 5)));
    }
  });
});

describe("confidenceOf", () => {
  it("n < 10 baixa · 10–29 média · ≥ 30 alta", () => {
    expect(confidenceOf(0)).toBe("baixa");
    expect(confidenceOf(9)).toBe("baixa");
    expect(confidenceOf(10)).toBe("media");
    expect(confidenceOf(29)).toBe("media");
    expect(confidenceOf(30)).toBe("alta");
  });
});

describe("trendOf", () => {
  it("null com n < 20; diferença das 10 recentes vs. 10 anteriores", () => {
    expect(trendOf([80, 80, 80])).toBeNull();
    const flat = Array.from({ length: 20 }, () => 70);
    expect(trendOf(flat)).toBe(0);
    const rising = [
      ...Array.from({ length: 10 }, () => 50),
      ...Array.from({ length: 10 }, () => 90),
    ];
    // ordem de recência: as 10 primeiras são as mais recentes
    expect(trendOf(rising)).toBe(-40);
  });
});

describe("skillEstimates", () => {
  it("n < 10 → confiança baixa e estimativa presente", () => {
    const items = [meta("m1", "read_aloud", "verificada")];
    const state = emptyState();
    state.attempts = [attempt("m1", 75, 1)];
    const result = skillEstimates(state, NOW, items);
    expect(result.speaking.n).toBe(1);
    expect(result.speaking.confidence).toBe("baixa");
    expect(result.speaking.estimate).toBe(estimateSkill(75));
    expect(result.writing.estimate).toBeNull();
  });

  it("janela de 45 dias: tentativa mais antiga não entra", () => {
    const items = [meta("m1", "read_aloud", "verificada")];
    const state = emptyState();
    state.attempts = [attempt("m1", 90, 46), attempt("m1", 50, 5)];
    const result = skillEstimates(state, NOW, items);
    expect(result.speaking.n).toBe(1);
    expect(result.speaking.estimate).toBe(estimateSkill(50));
  });

  it("peso de proveniência: comunitária pesa menos que verificada", () => {
    const items = [
      meta("ver", "read_aloud", "verificada"),
      meta("com", "read_aloud", "comunitaria"),
    ];
    const base = emptyState();
    base.attempts = [attempt("ver", 100, 0)];
    const withCommunity = emptyState();
    withCommunity.attempts = [attempt("ver", 100, 0), attempt("com", 0, 0)];
    const only = skillEstimates(withCommunity, NOW, items);
    const pure = skillEstimates(base, NOW, items);
    const w = PROVENANCE_WEIGHT.comunitaria;
    const expected = estimateSkill((100 * 1 + 0 * w) / (1 + w));
    expect(only.speaking.estimate).toBe(expected);
    expect(only.speaking.estimate).toBeLessThan(pure.speaking.estimate!);
  });

  it("tenta fora do manifesto → ignorada (nunca inventa habilidade)", () => {
    const state = emptyState();
    state.attempts = [attempt("fantasma", 80, 0)];
    const result = skillEstimates(state, NOW, []);
    expect(result.speaking.estimate).toBeNull();
    expect(result.speaking.n).toBe(0);
  });
});
