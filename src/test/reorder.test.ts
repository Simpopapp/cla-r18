// Testes de reorder — PRD §9.2: pares adjacentes corretos / (n − 1).

import { describe, expect, it } from "vitest";

import { gradeReorder } from "@/lib/pte/reorder";

describe("gradeReorder", () => {
  it("ordem correta → 100", () => {
    expect(gradeReorder([0, 1, 2, 3]).score).toBe(100);
  });

  it("duas junções corretas em 4 parágrafos → 2/3 = 67", () => {
    const result = gradeReorder([2, 3, 0, 1]);
    expect(result.adjacentCorrect).toBe(2);
    expect(result.score).toBe(67);
    expect(result.brokenAt).toEqual([1]);
  });

  it("ordem invertida → 0", () => {
    expect(gradeReorder([3, 2, 1, 0]).score).toBe(0);
  });

  it("sem adjacências possíveis (n = 1) → 100", () => {
    expect(gradeReorder([0]).score).toBe(100);
  });

  it("vazio → 100 (nada a emparelhar)", () => {
    expect(gradeReorder([]).score).toBe(100);
  });
});
