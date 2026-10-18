// Testes de hiw (lst_hiw) — PRD §9.2 e §5.1 (diff spoken×shown validado).

import { describe, expect, it } from "vitest";

import { deriveWrongTokens, gradeHiw, splitShownTokens } from "@/lib/pte/hiw";

describe("deriveWrongTokens", () => {
  it("mesma quantidade: marca só as palavras diferentes (pontuação à parte)", () => {
    const spoken = "The quick brown fox jumps over the lazy dog";
    const shown = "The quick brown fox jumps over the crazy dog.";
    const wrong = deriveWrongTokens(spoken, shown);
    expect(wrong).toEqual([7]); // "crazy" no lugar de "lazy"
  });

  it("caixa e pontuação não geram falso positivo", () => {
    const spoken = "She said, hello there";
    const shown = "she said Hello there!";
    expect(deriveWrongTokens(spoken, shown)).toEqual([]);
  });

  it("apóstrofo tipográfico igual ao reto", () => {
    expect(deriveWrongTokens("students’ books", "students' books")).toEqual([]);
  });

  it("tamanhos diferentes: alinhamento por LCS marca divergências", () => {
    const spoken = "the cat sat on the mat";
    const shown = "the cat on the mat";
    const wrong = deriveWrongTokens(spoken, shown);
    expect(wrong).toEqual([]);
  });

  it("token extra em shown é divergente", () => {
    const spoken = "the cat sat";
    const shown = "the black cat sat";
    expect(deriveWrongTokens(spoken, shown)).toEqual([1]);
  });
});

describe("gradeHiw", () => {
  const shown = splitShownTokens("The quick brown fox jumps over the lazy dog");
  // wrong: "brown" (2) e "lazy" (7)

  it("tudo certo → 100", () => {
    const result = gradeHiw([2, 7], [2, 7], shown);
    expect(result.score).toBe(100);
    expect(result.falsePositives).toBe(0);
  });

  it("falso positivo reduz: max(0, certos − falsos) / erradas", () => {
    const result = gradeHiw([2, 7, 0], [2, 7], shown);
    expect(result.hits).toBe(2);
    expect(result.falsePositives).toBe(1);
    expect(result.score).toBe(50); // (2−1)/2
  });

  it("falsos demais → piso 0", () => {
    const result = gradeHiw([2, 7, 0, 1, 3], [2, 7], shown);
    expect(result.score).toBe(0);
    expect(result.falseList).toEqual(["The", "quick", "fox"]);
  });

  it("sem marcar nada → 0 quando há erradas", () => {
    const result = gradeHiw([], [2, 7], shown);
    expect(result.score).toBe(0);
  });

  it("sem erradas no texto: marcar algo → 0; não marcar → 100", () => {
    expect(gradeHiw([0], [], ["hello"]).score).toBe(0);
    expect(gradeHiw([], [], ["hello"]).score).toBe(100);
  });
});
