// Testes de coverage (stemLite/keywordCoverage) — PRD §9.3/§9.4, aceites F4 (1).

import { describe, expect, it } from "vitest";

import {
  countWords,
  keywordCoverage,
  normalizeText,
  stemLite,
  tokenizeWords,
} from "@/lib/pte/coverage";

describe("normalizeText", () => {
  it("minúsculas, apóstrofo tipográfico → reto e pontuação fora", () => {
    expect(normalizeText("The Students’ Progress: Faster!")).toBe("the students' progress faster");
  });

  it("colapsa espaços e hífens", () => {
    expect(normalizeText("  Well-known — modern-day  tech ")).toBe("well known modern day tech");
  });
});

describe("tokenizeWords", () => {
  it("vazio → lista vazia", () => {
    expect(tokenizeWords("")).toEqual([]);
    expect(tokenizeWords(" ... ")).toEqual([]);
  });

  it("mantém apóstrofo interno (don't → don't)", () => {
    expect(tokenizeWords("They don't know.")).toEqual(["they", "don't", "know"]);
  });
});

describe("stemLite", () => {
  it.each([
    ["running", "run"],
    ["played", "play"],
    ["studies", "study"],
    ["cities", "city"],
    ["changes", "chang"],
    ["progresses", "progress"],
    ["student's", "student"],
    ["students’", "student"],
    ["was", "was"],
    ["goes", "goe"],
    ["cat", "cat"],
    ["STUDENTS", "student"],
  ])("stemLite(%s) → %s", (input, expected) => {
    expect(stemLite(input)).toBe(expected);
  });
});

describe("keywordCoverage", () => {
  it("cobre por stem (plural/infinitivo)", () => {
    const result = keywordCoverage(["students", "learn"], "The students learned quickly");
    expect(result).toMatchObject({ covered: 2, total: 2, pct: 100, missing: [] });
  });

  it("keyword de duas palavras exige todas as palavras", () => {
    const result = keywordCoverage(["global warming"], "global temperatures rose, warming oceans");
    expect(result.covered).toBe(1);
    const partial = keywordCoverage(["global warming"], "global temperatures rose");
    expect(partial.covered).toBe(0);
    expect(partial.missing).toEqual(["global warming"]);
  });

  it("sem keywords → 100% e nenhuma faltante (chamador decide)", () => {
    const result = keywordCoverage([], "qualquer texto");
    expect(result).toMatchObject({ covered: 0, total: 0, pct: 100, missing: [] });
  });

  it("conta parcialmente coberto como faltante", () => {
    const result = keywordCoverage(
      ["climate change", "emissions"],
      "climate changed and emissions grew",
    );
    expect(result.covered).toBe(2);
  });
});

describe("countWords", () => {
  it("conta palavras ignorando pontuação", () => {
    expect(countWords("Hello, world! How are you?")).toBe(5);
    expect(countWords("")).toBe(0);
  });
});
