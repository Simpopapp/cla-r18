// Testes de essay — PRD §9.4: estrutura, cobertura e ajuste de tamanho.

import { describe, expect, it } from "vitest";

import { essayParagraphs, essaySizeFactor, essayStructureScore, gradeEssay } from "@/lib/pte/essay";

describe("essayParagraphs", () => {
  it("separa por linha em branco", () => {
    expect(essayParagraphs("A\n\nB\n\nC")).toBe(3);
    expect(essayParagraphs("A\n\n\n\nB")).toBe(2);
    expect(essayParagraphs("Um parágrafo só")).toBe(1);
  });
});

describe("essayStructureScore", () => {
  it.each([
    [3, 100],
    [4, 100],
    [2, 50],
    [1, 20],
  ])("%i parágrafos → %s", (paragraphs, expected) => {
    expect(essayStructureScore(paragraphs)).toBe(expected);
  });
});

describe("essaySizeFactor", () => {
  it.each([
    [200, 1],
    [250, 1],
    [300, 1],
    [180, 0.5],
    [320, 0.5],
    [100, 0],
    [400, 0],
  ])("%i palavras → fator %s", (words, expected) => {
    expect(essaySizeFactor(words)).toBe(expected);
  });
});

describe("gradeEssay", () => {
  const keywords = ["students", "technology", "education"];
  // total alvo de palavras distribuído entre os parágrafos (blocos de 5)
  function essayOf(words: number, paragraphs: number): string {
    const perPara = Math.max(1, Math.round(words / paragraphs / 5));
    const body = "students learn with technology today ".repeat(perPara).trim();
    const paras = Array.from({ length: paragraphs }, (_, i) =>
      i === 0 ? `${body} education` : body,
    );
    return paras.join("\n\n");
  }

  it("na zona, 3 parágrafos e keywords todas cobertas → 100", () => {
    const result = gradeEssay(essayOf(210, 3), keywords);
    expect(result.paragraphs).toBe(3);
    expect(result.sizeFactor).toBe(1);
    expect(result.content).toBe(100);
    expect(result.score).toBe(100);
    expect(result.tags).toEqual([]);
  });

  it("fórmula ponderada: estrutura 50 e tamanho 0,5 derrubam a nota", () => {
    // content 100, structure 50, size 0,5 → 100·(0,5 + 0,15 + 0,1) = 75
    const result = gradeEssay(essayOf(180, 2), keywords);
    expect(result.structure).toBe(50);
    expect(result.sizeFactor).toBe(0.5);
    expect(result.score).toBe(75);
    expect(result.tags).toContain("forma");
  });

  it("fora da zona por muito → ajuste 0 e tag forma", () => {
    // content 100, structure 100, size 0 → 100·(0,5 + 0,3) = 80
    const result = gradeEssay(essayOf(120, 3), keywords);
    expect(result.sizeFactor).toBe(0);
    expect(result.score).toBe(80);
    expect(result.tags).toEqual(["forma"]);
  });

  it("cobertura parcial entra na fórmula", () => {
    const partial = gradeEssay(essayOf(220, 3), ["education", "medicine", "future"]);
    expect(partial.content).toBe(33);
    expect(partial.score).toBe(67);
  });

  it("prompt sem keywords → sem nota com feedback honesto", () => {
    const result = gradeEssay(essayOf(220, 3), []);
    expect(result.score).toBeNull();
    expect(result.feedback).toContain("Referência insuficiente");
  });
});
