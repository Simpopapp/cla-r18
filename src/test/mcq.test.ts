// Testes de mcq (single/multi) — PRD §9.2.

import { describe, expect, it } from "vitest";

import { gradeMcqMulti, gradeMcqSingle } from "@/lib/pte/mcq";

describe("gradeMcqSingle", () => {
  it("correto → 100", () => {
    expect(gradeMcqSingle(2, 2).score).toBe(100);
  });

  it("errado → 0; sem traps não gera tag", () => {
    const result = gradeMcqSingle(0, 2);
    expect(result.score).toBe(0);
    expect(result.tags).toEqual([]);
    expect(result.trapText).toBeNull();
  });

  it("errado em armadilha com explicação → tag trap:<i> com texto", () => {
    const result = gradeMcqSingle(1, 2, ["", "armadilha clássica", "resposta correta"]);
    expect(result.score).toBe(0);
    expect(result.tags).toEqual(["trap:1"]);
    expect(result.trapText).toBe("armadilha clássica");
  });

  it("trap com texto vazio não gera tag", () => {
    const result = gradeMcqSingle(1, 2, ["", "  ", "ok"]);
    expect(result.tags).toEqual([]);
  });

  it("nada selecionado → 0 sem tag", () => {
    expect(gradeMcqSingle(null, 2).score).toBe(0);
  });
});

describe("gradeMcqMulti", () => {
  it("todas certas → 100", () => {
    const result = gradeMcqMulti([0, 2], [0, 2]);
    expect(result.score).toBe(100);
    expect(result.missed).toBe(0);
  });

  it("certa + errada → (1−1)/2 = 0", () => {
    const result = gradeMcqMulti([0, 1], [0, 2]);
    expect(result.score).toBe(0);
    expect(result.wrongSelected).toBe(1);
  });

  it("erradas além das certas não descem abaixo de 0", () => {
    const result = gradeMcqMulti([0, 1, 3], [0]);
    expect(result.score).toBe(0);
  });

  it("parcial: 1 certa de 2 → 50", () => {
    expect(gradeMcqMulti([0], [0, 1]).score).toBe(50);
  });

  it("errada em armadilha gera tag e texto (cada errada marcada)", () => {
    const result = gradeMcqMulti([1, 3], [2], ["", "distrator comum", "", "por que erram"]);
    expect(result.tags).toEqual(["trap:1", "trap:3"]);
    expect(result.trapTexts).toEqual(["distrator comum", "por que erram"]);
  });
});
