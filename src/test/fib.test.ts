// Testes de fib (dropdown/drag/digitação) — PRD §9.2.

import { describe, expect, it } from "vitest";

import { gradeFibChoices, gradeFibTyped } from "@/lib/pte/fib";

describe("gradeFibTyped", () => {
  const expected = ["increase", "affect", "release"];

  it("tolerante a caixa e espaços", () => {
    const result = gradeFibTyped(expected, ["  Increase ", "affect", null]);
    expect(result.correct).toBe(2);
    expect(result.score).toBe(67);
    expect(result.wrongBlanks).toEqual([2]);
    expect(result.tags).toEqual(["missed:release"]);
  });

  it("pontuação e apóstrofo tipográfico ignorados", () => {
    const result = gradeFibTyped(["students' books"], ["students’ books,"]);
    expect(result.score).toBe(100);
  });

  it("em branco conta como erro", () => {
    const result = gradeFibTyped(expected, [null, null, null]);
    expect(result.score).toBe(0);
    expect(result.wrongBlanks).toEqual([0, 1, 2]);
  });

  it("texto vazio não conta como acerto", () => {
    const result = gradeFibTyped(expected, ["", " ", "release"]);
    expect(result.correct).toBe(1);
  });

  it("tags limitadas a 5", () => {
    const many = ["a", "b", "c", "d", "e", "f", "g"];
    const result = gradeFibTyped(many, [null, null, null, null, null, null, null]);
    expect(result.tags).toHaveLength(5);
    expect(result.score).toBe(0);
  });

  it("sem lacunas → 0 (evita NaN)", () => {
    expect(gradeFibTyped([], []).score).toBe(0);
  });
});

describe("gradeFibChoices", () => {
  const expected = [2, 0, 1];

  it("acertos por índice", () => {
    const result = gradeFibChoices(expected, [2, 0, 1]);
    expect(result.score).toBe(100);
  });

  it("índice errado ou null → erro", () => {
    const result = gradeFibChoices(expected, [2, null, 0]);
    expect(result.correct).toBe(1);
    expect(result.score).toBe(33);
    expect(result.wrongBlanks).toEqual([1, 2]);
  });

  it("resposta extra fora do comprimento é ignorada", () => {
    const result = gradeFibChoices(expected, [2, 0, 1, 3]);
    expect(result.score).toBe(100);
  });
});
