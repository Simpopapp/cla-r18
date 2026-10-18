// Testes de dictation (wfd) — PRD §9.2, aceites F4 (1): bordas de caixa,
// pontuação, apóstrofo, duplicatas de palavra e teto de tags.

import { describe, expect, it } from "vitest";

import { gradeDictation } from "@/lib/pte/dictation";

describe("gradeDictation", () => {
  it("idêntica → 100, sem extras nem omissões", () => {
    const result = gradeDictation(
      "Scientists are discovering new links between genes and diseases.",
      "Scientists are discovering new links between genes and diseases.",
    );
    expect(result.score).toBe(100);
    expect(result.hits).toBe(result.total);
    expect(result.extras).toBe(0);
    expect(result.missed).toEqual([]);
    expect(result.tags).toEqual([]);
  });

  it("caixa e pontuação não contam (normalização)", () => {
    const result = gradeDictation("scientists are discovering", "Scientists are discovering.");
    expect(result.score).toBe(100);
  });

  it("apóstrofo tipográfico = reto", () => {
    const result = gradeDictation("the students’ books", "the students' books");
    expect(result.score).toBe(100);
  });

  it("uma palavra omitida → score (n−1)/n, tag missed", () => {
    const result = gradeDictation(
      "Scientists are discovering links between genes",
      "Scientists are discovering new links between genes",
    );
    expect(result.total).toBe(7);
    expect(result.hits).toBe(6);
    expect(result.score).toBe(86); // round(6/7·100)
    expect(result.missed).toEqual(["new"]);
    expect(result.tags).toEqual(["missed:new"]);
  });

  it("LCS é sensível à ordem: troca total perde pares", () => {
    const result = gradeDictation("the cat sat", "sat the cat");
    expect(result.hits).toBe(2);
    expect(result.score).toBe(67);
    expect(result.extras).toBe(1);
  });

  it("palavra extra não derruba o score, mas aparece em extras", () => {
    const result = gradeDictation("the very very very very cat sat", "the cat sat");
    expect(result.hits).toBe(3);
    expect(result.extras).toBe(4);
    expect(result.score).toBe(100);
  });

  it("resposta vazia → 0", () => {
    const result = gradeDictation("", "the cat sat");
    expect(result.score).toBe(0);
    expect(result.missed).toEqual(["the", "cat", "sat"]);
  });

  it("duplicata omitida no alvo aparece em missed", () => {
    const result = gradeDictation("the cat", "the the cat");
    expect(result.total).toBe(3);
    expect(result.hits).toBe(2);
    expect(result.missed).toEqual(["the"]);
  });

  it("tags missed limitadas a 5, minúsculas e sem pontuação", () => {
    const target = "one two three four five six seven eight";
    const result = gradeDictation("", target);
    expect(result.tags).toHaveLength(5);
    expect(result.tags[0]).toBe("missed:one");
    expect(result.missed).toHaveLength(8);
  });

  it("palavras destacadas com status hit/missed na ordem do alvo", () => {
    const result = gradeDictation("the cat sat", "the big cat sat");
    expect(result.words.map((w) => w.status)).toEqual(["hit", "missed", "hit", "hit"]);
    expect(result.words[1]?.word).toBe("big");
  });
});
